import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { TokenService } from "src/shared/services/token.service";
import { REQUEST_USER_KEY } from "../constant/auth.constant";

@Injectable()
export class AccessTokenGuard implements CanActivate {
   constructor(private readonly tokenService: TokenService) {}

   async canActivate(context: ExecutionContext) {
      const request = context.switchToHttp().getRequest();
      const accessToken = request.headers['authorization']?.split(' ')[1];
      if(!accessToken) return false;

      try {
         const decodedAccesstoken = await this.tokenService.verifyAccessToken(accessToken);
         request[REQUEST_USER_KEY] = decodedAccesstoken;
         return true
      } catch {
         // return false
         throw new UnauthorizedException();
      }
   }
}
