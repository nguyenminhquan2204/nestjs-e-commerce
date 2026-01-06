import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";
import { RegisterBodyType } from "./auth.model";
import { UserType } from "src/shared/models/share-user.model";
import { VerificationCodeType } from "./auth.model";
import { VerificationCode } from "@prisma/client";
import { TypeOfVerificationCodeType } from "src/shared/constant/auth.constant";

@Injectable()
export class AuthRepository {
   constructor(
      private readonly prismaService: PrismaService,
   ) {}

   async createUser(user: Omit<RegisterBodyType, 'confirmPassword' | 'code'> & Pick<UserType, 'roleId'>): Promise<Omit<UserType, 'password' | 'totpSecret'>> {
      return this.prismaService.user.create({
         data: user,
         omit: {
            password: true,
            totpSecret: true,
         }
      })
   }

   async createVerificationCode(payload: Pick<VerificationCodeType, 'email' | 'code' | 'type' | 'expiresAt'>): Promise<VerificationCodeType>  {
      return this.prismaService.verificationCode.upsert({
         where: {
            email_type: {
               email: payload.email,
               type: payload.type,
            },
         },
         create: payload,
         update: {
            code: payload.code,
            expiresAt: payload.expiresAt
         }
      })
   }

   async findUniqueVerificationCode(email: string, code: string, type: TypeOfVerificationCodeType) {
      return this.prismaService.verificationCode.findFirst({
         where: {
            email: email,
            code: code,
            type: type
         }
      })
   }
}
