import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AUTH_TYPE_KEY } from "../decorators/auth.decorator";
import { AccessTokenGuard } from "./access-token.guard";
import { APIKeyGuard } from "./api-key.guard";
import { AuthType, ConditionGuard } from "../constant/auth.constant";
import { AuthTypeDecoratorPayload } from "../decorators/auth.decorator";

@Injectable()
export class AuthenticationGuard implements CanActivate {
   private readonly authTypeGuardMap: Record<string, CanActivate>;
   constructor(
    private readonly reflector: Reflector,
    private readonly accessTokenGuard: AccessTokenGuard,
    private readonly apiKeyGuard: APIKeyGuard,
  ) {
    this.authTypeGuardMap = {
      [AuthType.Bearer]: this.accessTokenGuard,
      [AuthType.ApiKey]: this.apiKeyGuard,
      [AuthType.None]: { canActivate: () => true },
    };
  }
   async canActivate(context: ExecutionContext): Promise<boolean> {
      const authTypeValue = this.reflector.getAllAndOverride<AuthTypeDecoratorPayload | undefined>(AUTH_TYPE_KEY, [
         context.getHandler(),
         context.getClass(),
      ]) ?? { authTypes: [AuthType.None], options: { condition: ConditionGuard.AND } };

      // console.log('authTypeValue', authTypeValue);
      const guards = authTypeValue.authTypes.map(((authType) => this.authTypeGuardMap[authType]));
      if(authTypeValue.options.condition === ConditionGuard.OR) {
         for(const instance of guards) {
            const canActivate = await instance.canActivate(context);
            if(canActivate) return true;
         }
         throw new UnauthorizedException();
      } else {
         for(const instance of guards) {
            const canActivate = await instance.canActivate(context);
            if(!canActivate) throw new UnauthorizedException();
         }
         return true;
      }
   }
}