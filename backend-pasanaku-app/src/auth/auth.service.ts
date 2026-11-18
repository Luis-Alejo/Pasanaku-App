import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { JwtPayload } from '../common/guards/jwt-auth.guard.js';
import { AuthPayload, LoginInput, RegisterInput } from './dto/index.js';

const BCRYPT_ROUNDS = 12;

// Hash de relleno: se compara aunque el usuario no exista para igualar tiempos de respuesta
const DUMMY_HASH = bcrypt.hashSync('pasanaku-dummy-password', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterInput): Promise<AuthPayload> {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await this.users.createUser({
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      passwordHash,
    });
    return this.buildPayload(user);
  }

  async login(input: LoginInput): Promise<AuthPayload> {
    let user: User | null = null;
    try {
      user = await this.users.findByPhoneForAuth(input.phone);
    } catch (error) {
      // Celular con formato inválido: misma respuesta que credenciales incorrectas
      if (!(error instanceof BadRequestException)) throw error;
    }

    const valid = await bcrypt.compare(
      input.password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.buildPayload(user);
  }

  private async buildPayload(user: User): Promise<AuthPayload> {
    const payload: JwtPayload = { sub: user.id, phone: user.phone };
    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken, user };
  }
}
