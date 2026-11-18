import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedUser } from '../decorators/current-user.decorator.js';

export interface JwtPayload {
  sub: string;
  phone: string;
}

/**
 * Valida el header `Authorization: Bearer <token>` en GraphQL y HTTP.
 * Requiere JwtService disponible (JwtModule global, que se registrará en auth/)
 * y que GraphQLModule exponga `req` en el contexto: context: ({ req }) => ({ req }).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = this.getRequest(context);
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const user: AuthenticatedUser = { id: payload.sub, phone: payload.phone };
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private getRequest(context: ExecutionContext) {
    if (context.getType<GqlContextType>() === 'graphql') {
      return GqlExecutionContext.create(context).getContext().req;
    }
    return context.switchToHttp().getRequest();
  }

  private extractToken(request: {
    headers?: Record<string, string | string[] | undefined>;
  }): string | undefined {
    const header = request?.headers?.authorization;
    if (typeof header !== 'string') return undefined;
    const [type, token] = header.split(' ');
    return type === 'Bearer' && token ? token : undefined;
  }
}
