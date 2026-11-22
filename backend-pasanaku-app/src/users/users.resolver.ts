import { BadRequestException, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import {
  PublicUserType,
  RequestReferenceInput,
  RespondReferenceInput,
  SubmitKycInput,
} from './dto/index.js';
import { UserReference } from './entities/user-reference.entity.js';
import { User } from './entities/user.entity.js';
import { UsersService } from './users.service.js';

@Resolver()
@UseGuards(JwtAuthGuard)
export class UsersResolver {
  constructor(private readonly users: UsersService) {}

  @Query(() => User, { name: 'me' })
  me(@CurrentUser('id') userId: string): Promise<User> {
    return this.users.getByIdOrFail(userId);
  }

  @Query(() => [UserReference], { name: 'myReferences' })
  myReferences(@CurrentUser('id') userId: string): Promise<UserReference[]> {
    return this.users.listMyReferences(userId);
  }

  @Query(() => PublicUserType, { name: 'userByPhone', nullable: true })
  userByPhone(@Args('phone') phone: string): Promise<User | null> {
    return this.users.findByPhone(phone);
  }

  @Query(() => PublicUserType, { name: 'publicUser', nullable: true })
  publicUser(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<User | null> {
    return this.users.findById(id);
  }

  @Query(() => [UserReference], { name: 'defaulterReferences' })
  defaulterReferences(
    @CurrentUser('id') userId: string,
    @Args(
      'groupId',
      { type: () => ID },
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException('Identificador inválido'),
      }),
    )
    groupId: string,
    @Args(
      'memberId',
      { type: () => ID },
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException('Identificador inválido'),
      }),
    )
    memberId: string,
  ): Promise<UserReference[]> {
    return this.users.getDefaulterReferences(userId, groupId, memberId);
  }

  @Mutation(() => User)
  submitKyc(
    @CurrentUser('id') userId: string,
    @Args('input') input: SubmitKycInput,
  ): Promise<User> {
    return this.users.submitKyc(userId, input.ciNumber);
  }

  @Mutation(() => UserReference)
  requestReference(
    @CurrentUser('id') userId: string,
    @Args('input') input: RequestReferenceInput,
  ): Promise<UserReference> {
    return this.users.requestReference(userId, input);
  }

  @Mutation(() => UserReference)
  respondReference(
    @CurrentUser('id') userId: string,
    @Args('input') input: RespondReferenceInput,
  ): Promise<UserReference> {
    return this.users.respondReference(userId, input.referenceId, input.accept);
  }

  @Mutation(() => UserReference)
  revokeReference(
    @CurrentUser('id') userId: string,
    @Args(
      'referenceId',
      { type: () => ID },
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException('Identificador inválido'),
      }),
    )
    referenceId: string,
  ): Promise<UserReference> {
    return this.users.revokeReference(userId, referenceId);
  }
}
