import { ConflictException, Injectable, UnauthorizedException, BadRequestException, UnprocessableEntityException, HttpException } from '@nestjs/common'
import { HashingService } from 'src/shared/services/hashing.service'
import { addMilliseconds } from 'date-fns'
import { RolesService } from './roles.service'
import { isUniqueConstraintPrismaError, isNotFoundPrismaError, generateOTP } from 'src/shared/helpers'
import { LoginBodyType, RefreshTokenBodyType, RegisterBodyType, SendOTPBodyType } from './auth.model'
import { AuthRepository } from './auth.repo'
import { ShareUserRepository } from 'src/shared/repositories/share-user.repo'
import envConfig from 'src/shared/config'
import ms from 'ms'
import { TypeOfVerificationCode } from 'src/shared/constant/auth.constant'
import { EmailService } from 'src/shared/services/email.service'
import { TokenService } from 'src/shared/services/token.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly hashingService: HashingService,
    private readonly rolesService: RolesService,
    private readonly authRepository: AuthRepository,
    private readonly sharedUserRepository: ShareUserRepository,
    private readonly emailService: EmailService,
    private readonly tokenService: TokenService
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

  async login(body: LoginBodyType & { userAgent: string; ip: string }) {
    const user = await this.authRepository.findUniqueIncludeRole({
      email: body.email
    })
    if(!user) {
      throw new UnprocessableEntityException([
        {
          message: 'Email is not found!',
          path: 'email'
        }
      ])
    }

    const isPasswordMatch = await this.hashingService.compare(body.password, user.password);
    if(!isPasswordMatch) {
      throw new UnprocessableEntityException([
        {
          message: 'Password is incorrect!',
          path: 'password'
        }
      ])
    }

    const device = await this.authRepository.createDevice({
      userId: user.id,
      userAgent: body.userAgent,
      ip: body.ip
    })

    const tokens = await this.generateTokens({ 
      userId: user.id,
      deviceId: device.id,
      roleId: user.roleId,
      roleName: user.role.name
     });

    return tokens;
  }

  async generateTokens(payload: { userId: number; deviceId: number; roleId: number; roleName: string; }) {
    const [accessToken, refreshToken] = await Promise.all([
        this.tokenService.signAccessToken({
          userId: payload.userId,
          deviceId: payload.deviceId,
          roleId: payload.roleId,
          roleName: payload.roleName
        }),
        this.tokenService.signRefeshToken({ userId: payload.userId })
    ])
    const decodedRefreshToken = await this.tokenService.verifyRefreshToken(refreshToken);
    await this.authRepository.createRefreshToken({
      token: refreshToken,
      userId: payload.userId,
      expiresAt: new Date(decodedRefreshToken.exp * 1000),
      deviceId: payload.deviceId
    })

    return { accessToken, refreshToken}
  }

  async refreshToken({ refreshToken, ip, userAgent }: RefreshTokenBodyType & { userAgent: string; ip: string}) {
    try {
        const { userId } = await this.tokenService.verifyRefreshToken(refreshToken);
        const refreshTokenInDb = await this.authRepository.findUniqueRefreshTokenIncludeUserRole({
          token: refreshToken
        })
        if(!refreshTokenInDb) {
          throw new UnauthorizedException('Refresh token not found!');
        }
        const { deviceId, user: { roleId, name: roleName} } = refreshTokenInDb;
        const $updateDevice = this.authRepository.updateDevice(deviceId, {
          ip: ip,
          userAgent: userAgent
        })

        const $deleteRefreshToken = this.authRepository.deleteRefreshToken({
          token: refreshToken
        })
    
        const $tokens = this.generateTokens({ userId, roleId, roleName, deviceId });

        const [, , tokens] = await Promise.all([$updateDevice, $deleteRefreshToken, $tokens]);

        return tokens;
    } catch (error) {
      if(error instanceof HttpException) {
        throw error;
      }
      throw new UnauthorizedException();
    }
  }

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
