import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class APIKeyGuard implements CanActivate {

   canActivate(context: ExecutionContext) {
      const request = context.switchToHttp().getRequest();
      const xAPIKey = request.headers['x-api-key'];

      if(xAPIKey !== process.env.SECRET_API_KEY)  {
         throw new UnauthorizedException('Invalid API Key');
      }
      return true;
   }
}
