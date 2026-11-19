import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import {
  CreateGroupInput,
  InviteMemberInput,
  PayArrearsInput,
  SetTurnOrderInput,
} from './dto/group.inputs.js';
import {
  GroupDetailType,
  GroupSummaryType,
  TxResultType,
} from './dto/group.types.js';
import { GroupsService } from './groups.service.js';

const GroupId = () => Args('groupId', { type: () => ID }, ParseUUIDPipe);

@Resolver()
@UseGuards(JwtAuthGuard)
export class GroupsResolver {
  constructor(private readonly groups: GroupsService) {}

  @Query(() => [GroupSummaryType])
  publicGroups(
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
  ) {
    return this.groups.listPublicGroups(limit, offset);
  }

  @Query(() => [GroupSummaryType])
  myGroups(@CurrentUser('id') userId: string) {
    return this.groups.listMyGroups(userId);
  }

  @Query(() => GroupDetailType)
  groupDetail(@CurrentUser('id') userId: string, @GroupId() groupId: string) {
    return this.groups.getGroupDetail(userId, groupId);
  }

  @Mutation(() => GroupSummaryType)
  createGroup(
    @CurrentUser('id') userId: string,
    @Args('input') input: CreateGroupInput,
  ) {
    return this.groups.createGroup(userId, input);
  }

  @Mutation(() => GroupSummaryType)
  retryGroupSetup(
    @CurrentUser('id') userId: string,
    @GroupId() groupId: string,
  ) {
    return this.groups.retryGroupSetup(userId, groupId);
  }

  @Mutation(() => TxResultType)
  inviteMember(
    @CurrentUser('id') userId: string,
    @Args('input') input: InviteMemberInput,
  ) {
    return this.groups.inviteMember(userId, input);
  }

  @Mutation(() => TxResultType)
  joinGroup(@CurrentUser('id') userId: string, @GroupId() groupId: string) {
    return this.groups.joinGroup(userId, groupId);
  }

  @Mutation(() => TxResultType)
  setTurnOrder(
    @CurrentUser('id') userId: string,
    @Args('input') input: SetTurnOrderInput,
  ) {
    return this.groups.setTurnOrder(userId, input);
  }

  @Mutation(() => TxResultType)
  startGroup(@CurrentUser('id') userId: string, @GroupId() groupId: string) {
    return this.groups.startGroup(userId, groupId);
  }

  @Mutation(() => TxResultType)
  payRound(@CurrentUser('id') userId: string, @GroupId() groupId: string) {
    return this.groups.payRound(userId, groupId);
  }

  @Mutation(() => TxResultType)
  payArrears(
    @CurrentUser('id') userId: string,
    @Args('input') input: PayArrearsInput,
  ) {
    return this.groups.payArrears(userId, input);
  }
}
