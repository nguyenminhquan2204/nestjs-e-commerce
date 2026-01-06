import { ConflictException, Injectable, UnauthorizedException, BadRequestException, UnprocessableEntityException } from '@nestjs/common'
import { HashingService } from 'src/shared/services/hashing.service'
import { addMilliseconds } from 'date-fns'
import { RolesService } from './roles.service'
import { isUniqueConstraintPrismaError, isNotFoundPrismaError, generateOTP } from 'src/shared/helpers'
import { RegisterBodyType, SendOTPBodyType } from './auth.model'
import { AuthRepository } from './auth.repo'
import { ShareUserRepository } from 'src/shared/repositories/share-user.repo'
import envConfig from 'src/shared/config'
import ms from 'ms'
import { TypeOfVerificationCode } from 'src/shared/constant/auth.constant'
import { EmailService } from 'src/shared/services/email.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly hashingService: HashingService,
    private readonly rolesService: RolesService,
    private readonly authRepository: AuthRepository,
    private readonly sharedUserRepository: ShareUserRepository,
    private readonly emailService: EmailService,
  ) {}

  async register(body: RegisterBodyType) {
    try {
      const verificationCode = await this.authRepository.findUniqueVerificationCode(body.email, body.code, TypeOfVerificationCode.REGISTER);
      if(!verificationCode) {
        throw new UnprocessableEntityException([
          {
            message: 'OTP invalid',
            path: 'code'
          }
        ])
      }

      if(verificationCode.expiresAt < new Date()) {
        throw new UnprocessableEntityException([
          {
            message: 'OTP has expired',
            path: 'code'
          }
        ])
      }

      const clientRoleId = await this.rolesService.getClientRoleId()
      const hashedPassword = await this.hashingService.hash(body.password)

      return await this.authRepository.createUser({
         email: body.email,
         phoneNumber: body.phoneNumber,
         name: body.name,
         password: hashedPassword,
         roleId: clientRoleId,
      })
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new UnprocessableEntityException([
          {
            path: 'email',
            message: 'Email is already!'
          }
        ])
      }
      throw error
    }
  }

  async sendOTP(body: SendOTPBodyType) {
    const user = await this.sharedUserRepository.findUnique({ email: body.email });
    if(user) {
      throw new UnprocessableEntityException([
        {
          path: 'email',
          message: 'Email is already!'
        }
      ])
    }

    const code = generateOTP();
    const verificationCode = await this.authRepository.createVerificationCode({
      email: body.email,
      code,
      type: body.type,
      expiresAt: addMilliseconds(new Date(), ms(envConfig.OTP_EXPIRES_IN as ms.StringValue))
    })

    const { data, error } = await this.emailService.sendOTP({
      email: body.email,
      code
    })
    if(error) {
      console.log('Error sending OTP email:', error);
      throw new UnprocessableEntityException([
        {
          message: 'Failed to send OTP email',
          path: 'code'
        }
      ])
    }

    return verificationCode;
  }

//   async login(body: any) {
//       const user = await this.prismaService.user.findFirstOrThrow({
//          where: {
//             email: body.email
//          }
//       });
//       if(!user) throw new UnauthorizedException('Account is not exist');

//       const isPasswordMatch = await this.hashingService.compare(body.password, user.password);
//       if(!isPasswordMatch) throw new UnprocessableEntityException([{ field: 'password', message: 'Password is incorrect' }]);

//       const tokens = await this.generateTokens({ userId: user.id });
//       return tokens;
//    }

//    async generateTokens(payload: { userId: number }) {
//       // const [accessToken, refreshToken] = await Promise.all([
//       //    this.tokenService.signAccessToken(payload),
//       //    this.tokenService.signRefeshToken(payload)
//       // ])
//       // const decodedRefreshToken = await this.tokenService.verifyRefreshToken(refreshToken);
//       // await this.prismaService.refreshToken.create({
//       //    data: {
//       //       token: refreshToken,
//       //       userId: payload.userId,
//       //       expiresAt: new Date(decodedRefreshToken.exp * 1000)
//       //    }
//       // })
//       // return { accessToken, refreshToken}
//    }

//    async refreshToken(refreshToken: string) {
//       try {
//          const { userId } = await this.tokenService.verifyRefreshToken(refreshToken);
//          await this.prismaService.refreshToken.findUniqueOrThrow({
//             where: {
//                token: refreshToken
//             }
//          })

//          await this.prismaService.refreshToken.delete({
//             where: {
//                token: refreshToken
//             }
//          })
//          return await this.generateTokens({ userId });
//       } catch (error) {
//          // case refresh token notify user
//          if(isNotFoundPrismaError(error)) {
//             throw new UnauthorizedException('Refresh token has been revoked');
//          }
//          throw new UnauthorizedException();
//       }
//    }

//    async logout(refreshToken: string) {
//       try {
//          await this.tokenService.verifyRefreshToken(refreshToken);
//          await this.prismaService.refreshToken.delete({
//             where: {
//                token: refreshToken
//             }
//          })
//          return { message: 'Logout successful' };
//       } catch (error) {
//          if(isNotFoundPrismaError(error)) {
//             throw new UnauthorizedException('Refresh token has been revoked');
//          }
//          throw new UnauthorizedException();
//       }
//    }
}
