import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { KycStatus, ReferenceStatus } from '../common/enums/index.js';
import { CryptoService } from '../common/crypto/crypto.service.js';
import { normalizeCi, normalizePhone } from '../common/utils/identity.util.js';
import { EnvVars } from '../config/env.validation.js';
import { RequestReferenceInput } from './dto/index.js';
import { UserReference } from './entities/user-reference.entity.js';
import { User } from './entities/user.entity.js';
import {
  GROUP_OBLIGATIONS_PORT,
  type GroupObligationsPort,
} from './ports/group-obligations.port.js';
import { UserWalletService } from './user-wallet.service.js';

export interface CreateUserData {
  fullName: string;
  phone: string;
  email?: string | null;
  passwordHash: string;
}

/** Devuelve el nombre de la columna si el error es una violación de unicidad (23505). */
function uniqueViolationColumn(error: unknown): string | null {
  if (!(error instanceof QueryFailedError)) return null;
  const driver = error.driverError as
    { code?: string; detail?: string } | undefined;
  if (driver?.code !== '23505') return null;
  return /^Key \("?(\w+)"?\)=/.exec(driver.detail ?? '')?.[1] ?? 'unknown';
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly autoApproveKyc: boolean;

  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(UserReference)
    private readonly referencesRepo: Repository<UserReference>,
    private readonly crypto: CryptoService,
    private readonly wallets: UserWalletService,
    config: ConfigService<EnvVars, true>,
    @Optional()
    @Inject(GROUP_OBLIGATIONS_PORT)
    private readonly obligations?: GroupObligationsPort,
  ) {
    this.autoApproveKyc = config.get('KYC_AUTO_APPROVE', { infer: true });
  }

  // ---------------------------------------------------------------- búsquedas

  findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async getByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    return user;
  }

  findByPhone(phone: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { phone: this.toPhone(phone) } });
  }

  findByCiHash(ciHash: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { ciHash } });
  }

  /** Solo para login: incluye passwordHash (select: false por defecto). */
  findByPhoneForAuth(phone: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.phone = :phone', { phone: this.toPhone(phone) })
      .getOne();
  }

  computeCiHash(ciNumber: string): string {
    return this.crypto.hmac(normalizeCi(ciNumber));
  }

  // ---------------------------------------------------------------- registro

  async createUser(data: CreateUserData): Promise<User> {
    const phone = this.toPhone(data.phone);
    const email = data.email?.trim() ? data.email.trim().toLowerCase() : null;

    if (await this.usersRepo.exists({ where: { phone } })) {
      throw new ConflictException('Este celular ya está registrado');
    }
    if (email && (await this.usersRepo.exists({ where: { email } }))) {
      throw new ConflictException('Este correo ya está registrado');
    }

    const wallet = await this.wallets.createCustodialWallet();
    const user = this.usersRepo.create({
      fullName: data.fullName.trim(),
      phone,
      email,
      passwordHash: data.passwordHash,
      stellarPublicKey: wallet.stellarPublicKey,
      encryptedPrivateKey: wallet.encryptedPrivateKey,
      reputationScore: 100,
    });

    try {
      return await this.usersRepo.save(user);
    } catch (error) {
      const column = uniqueViolationColumn(error);
      if (column === 'phone')
        throw new ConflictException('Este celular ya está registrado');
      if (column === 'email')
        throw new ConflictException('Este correo ya está registrado');
      throw error;
    }
  }

  // ---------------------------------------------------------------- KYC

  async submitKyc(userId: string, ciNumber: string): Promise<User> {
    const user = await this.getByIdOrFail(userId);
    if (user.kycStatus === KycStatus.VERIFIED) {
      throw new ConflictException('Tu identidad ya fue verificada');
    }

    const normalized = normalizeCi(ciNumber);
    const ciHash = this.crypto.hmac(normalized);

    const duplicate = await this.findByCiHash(ciHash);
    if (duplicate && duplicate.id !== userId) {
      throw new ConflictException('Este CI ya está asociado a otra cuenta');
    }

    user.encryptedCi = this.crypto.encrypt(normalized);
    user.ciHash = ciHash;
    user.kycStatus = this.autoApproveKyc
      ? KycStatus.VERIFIED
      : KycStatus.PENDING;

    try {
      return await this.usersRepo.save(user);
    } catch (error) {
      if (uniqueViolationColumn(error) === 'ciHash') {
        throw new ConflictException('Este CI ya está asociado a otra cuenta');
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------- referencias

  async requestReference(
    requesterId: string,
    input: RequestReferenceInput,
  ): Promise<UserReference> {
    const { contactPhone, contactCi, relationship } = input;
    if (Boolean(contactPhone) === Boolean(contactCi)) {
      throw new BadRequestException(
        'Indica el celular o el CI del contacto (solo uno)',
      );
    }

    const contact = contactPhone
      ? await this.findByPhone(contactPhone)
      : await this.findByCiHash(this.computeCiHash(contactCi as string));

    // Mensaje genérico para no confirmar qué datos están registrados
    if (!contact)
      throw new NotFoundException('No se encontró un usuario con esos datos');
    if (contact.id === requesterId) {
      throw new BadRequestException(
        'No puedes agregarte como tu propia referencia',
      );
    }

    const existing = await this.referencesRepo.findOne({
      where: { requesterId, contactUserId: contact.id },
    });

    let reference: UserReference;
    if (existing) {
      if (
        [ReferenceStatus.PENDING, ReferenceStatus.ACCEPTED].includes(
          existing.status,
        )
      ) {
        throw new ConflictException(
          'Ya existe una solicitud activa con este contacto',
        );
      }
      // DECLINED / REVOKED: el par es único, se reutiliza la fila
      existing.status = ReferenceStatus.PENDING;
      existing.relationship = relationship;
      reference = existing;
    } else {
      reference = this.referencesRepo.create({
        requesterId,
        contactUserId: contact.id,
        relationship,
        status: ReferenceStatus.PENDING,
      });
    }

    const saved = await this.referencesRepo.save(reference);
    // TODO(notifications): emitir NotificationType.REFERENCE_REQUEST al contacto
    return this.loadReference(saved.id);
  }

  async respondReference(
    userId: string,
    referenceId: string,
    accept: boolean,
  ): Promise<UserReference> {
    const reference = await this.referencesRepo.findOne({
      where: { id: referenceId, contactUserId: userId },
    });
    if (!reference) throw new NotFoundException('Solicitud no encontrada');
    if (reference.status !== ReferenceStatus.PENDING) {
      throw new ConflictException('La solicitud ya fue respondida');
    }

    reference.status = accept
      ? ReferenceStatus.ACCEPTED
      : ReferenceStatus.DECLINED;
    await this.referencesRepo.save(reference);
    return this.loadReference(reference.id);
  }

  async revokeReference(
    userId: string,
    referenceId: string,
  ): Promise<UserReference> {
    const reference = await this.referencesRepo.findOne({
      where: [
        { id: referenceId, requesterId: userId },
        { id: referenceId, contactUserId: userId },
      ],
    });
    if (!reference) throw new NotFoundException('Referencia no encontrada');

    if (reference.status === ReferenceStatus.PENDING) {
      if (reference.contactUserId === userId) {
        throw new BadRequestException(
          'Para rechazar una solicitud usa respondReference',
        );
      }
    } else if (reference.status !== ReferenceStatus.ACCEPTED) {
      throw new ConflictException('La referencia ya no está activa');
    }

    // Evita que un deudor "borre" a sus referencias justo antes de incumplir
    if (
      reference.status === ReferenceStatus.ACCEPTED &&
      this.obligations &&
      (await this.obligations.hasActiveObligations(reference.requesterId))
    ) {
      throw new ForbiddenException(
        'No se puede revocar mientras el usuario tenga obligaciones activas en un grupo',
      );
    }

    reference.status = ReferenceStatus.REVOKED;
    await this.referencesRepo.save(reference);
    return this.loadReference(reference.id);
  }

  /** Referencias enviadas y recibidas por el usuario. */
  listMyReferences(userId: string): Promise<UserReference[]> {
    return this.referencesRepo.find({
      where: [{ requesterId: userId }, { contactUserId: userId }],
      relations: { requester: true, contactUser: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Referencias ACEPTADAS de un miembro en incumplimiento. Solo si el solicitante
   * administra el grupo y el miembro tiene un incumplimiento activo (lo decide groups/).
   * Sin implementación del puerto: se deniega (cerrado por defecto).
   */
  async getDefaulterReferences(
    requesterId: string,
    groupId: string,
    memberId: string,
  ): Promise<UserReference[]> {
    const allowed = this.obligations
      ? await this.obligations.canViewDefaulterReferences({
          requesterId,
          groupId,
          memberId,
        })
      : false;

    if (!allowed) {
      throw new ForbiddenException(
        'No autorizado para consultar las referencias de este miembro',
      );
    }

    this.logger.log(
      `Referencias consultadas: admin=${requesterId} grupo=${groupId} miembro=${memberId}`,
    );

    return this.referencesRepo.find({
      where: { requesterId: memberId, status: ReferenceStatus.ACCEPTED },
      relations: { requester: true, contactUser: true },
      order: { createdAt: 'ASC' },
    });
  }

  // ---------------------------------------------------------------- helpers

  private async loadReference(id: string): Promise<UserReference> {
    return this.referencesRepo.findOneOrFail({
      where: { id },
      relations: { requester: true, contactUser: true },
    });
  }

  private toPhone(phone: string): string {
    try {
      return normalizePhone(phone);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }
}
