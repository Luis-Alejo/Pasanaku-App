import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

/** ThrottlerGuard compatible con GraphQL (y con REST, p. ej. el webhook). */
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext): {
    req: Record<string, any>;
    res: Record<string, any>;
  } {
    if (context.getType<string>() === 'graphql') {
      const ctx = GqlExecutionContext.create(context).getContext<{
        req: Record<string, any>;
        res?: Record<string, any>;
      }>();
      // Si el contexto de GraphQL no expone `res`, un stub evita que el guard falle al poner cabeceras.
      return { req: ctx.req, res: ctx.res ?? { header: () => undefined } };
    }
    const http = context.switchToHttp();
    return { req: http.getRequest(), res: http.getResponse() };
  }
}
