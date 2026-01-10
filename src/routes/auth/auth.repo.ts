import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";
import { DeviceType, RefreshTokenType, RegisterBodyType, RoleType } from "./auth.model";
import { UserType } from "src/shared/models/share-user.model";
import { VerificationCodeType } from "./auth.model";
import { TypeOfVerificationCodeType } from "src/shared/constant/auth.constant";

@Injectable()
export class AuthRepository {
   constructor(
      private readonly prismaService: PrismaService,
   ) {}

   async createUser(user: Pick<UserType, 'name' | 'password' | 'email' | 'phoneNumber' | 'roleId'>): Promise<Omit<UserType, 'password' | 'totpSecret'>> {
      return this.prismaService.user.create({
         data: user,
         omit: {
            password: true,
            totpSecret: true,
         }
      })
   }

   async createUserIncludeRole(user: Pick<UserType, 'name' | 'password' | 'email' | 'phoneNumber' | 'avatar' | 'roleId'>): Promise<(UserType & { role: RoleType })> {
      return this.prismaService.user.create({
         data: user,
         include: {
            role: true
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

   async createRefreshToken(data: {token: string; userId: number; expiresAt: Date; deviceId: number}) {
      return this.prismaService.refreshToken.create({ data });
   }

   async createDevice(data: Pick<DeviceType, 'userId' | 'userAgent' | 'ip'> & 
      Partial<Pick<DeviceType, 'lastActive' | 'isActive'>>
   ) {
      return this.prismaService.device.create({ data });
   }

   async findUniqueIncludeRole(uniqueObject: { email: string} | { id: number}): Promise<UserType & { role: RoleType } | null> {
      return this.prismaService.user.findUnique({
         where: uniqueObject,
         include: {
            role: true
         }
      })
   }

   async findUniqueRefreshTokenIncludeUserRole(uniqueObject: { token: string }) {
      return this.prismaService.refreshToken.findUnique({
         where: uniqueObject,
         include: {
            user: {
               include: {
                  role: true
               }
            }
         }
      })
   }

   async updateDevice(deviceId: number, data: Partial<DeviceType>) {
      return this.prismaService.device.update({
         where: {
            id: deviceId
         },
         data
      })
   }

   async deleteRefreshToken(uniqueObject: { token: string }) {
      return this.prismaService.refreshToken.delete({
         where: uniqueObject
      })
   }

   async updateUser(where: { id: number} | { email: string }, data: Partial<Omit<UserType, 'id'>>): Promise<UserType> {
      return this.prismaService.user.update({
         where,
         data
      })
   }

   async deleteVerificationCode(uniqueValue: { email: string } | { id: number } | { email: string, code: string, type: TypeOfVerificationCodeType }): Promise<VerificationCodeType> {
      return this.prismaService.verificationCode.delete({
         where: uniqueValue
      })
   }
}
