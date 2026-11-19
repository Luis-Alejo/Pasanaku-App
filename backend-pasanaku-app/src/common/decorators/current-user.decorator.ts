import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/** Usuario adjuntado a la request por JwtAuthGuard. */
export interface AuthenticatedUser {
  id: string;
  phone: string;
}

/**
 * Uso en resolvers GraphQL:
 *   @UseGuards(JwtAuthGuard)
 *   me(@CurrentUser() user: AuthenticatedUser) {}
 *   me(@CurrentUser('id') userId: string) {}
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, context: ExecutionContext) => {
    const { req } = GqlExecutionContext.create(context).getContext();
    const user = req?.user as AuthenticatedUser | undefined;
    return field ? user?.[field] : user;
  },
);
