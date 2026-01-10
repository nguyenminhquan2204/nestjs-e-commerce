import { ConflictException, Injectable, UnauthorizedException, BadRequestException, UnprocessableEntityException, HttpException } from '@nestjs/common'
import { HashingService } from 'src/shared/services/hashing.service'
import { addMilliseconds } from 'date-fns'
import { RolesService } from './roles.service'
import { isUniqueConstraintPrismaError, isNotFoundPrismaError, generateOTP } from 'src/shared/helpers'
import { ForgotPasswordBodyType, LoginBodyType, RefreshTokenBodyType, RegisterBodyType, SendOTPBodyType } from './auth.model'
import { AuthRepository } from './auth.repo'
import { ShareUserRepository } from 'src/shared/repositories/share-user.repo'
import envConfig from 'src/shared/config'
import ms from 'ms'
import { TypeOfVerificationCode, TypeOfVerificationCodeType } from 'src/shared/constant/auth.constant'
import { EmailService } from 'src/shared/services/email.service'
import { TokenService } from 'src/shared/services/token.service'
import { EmailAlreadyExistsException, EmailNotFoundException, FailedToSendOTPException, InvalidOTPException, OTPExpiredException } from './error.model'

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

  async validateVerificationCode({ email, code, type }: { email: string, code: string, type: TypeOfVerificationCodeType}) {
    const verificationCode = await this.authRepository.findUniqueVerificationCode(email, code, type);
    if(!verificationCode) throw InvalidOTPException;
    if(verificationCode.expiresAt < new Date()) throw OTPExpiredException;

    return verificationCode;
  }

  async register(body: RegisterBodyType) {
    try {
      await this.validateVerificationCode({ email: body.email, code: body.code, type: TypeOfVerificationCode.REGISTER });
      const clientRoleId = await this.rolesService.getClientRoleId()
      const hashedPassword = await this.hashingService.hash(body.password)
      const [user] =  await Promise.all([
        this.authRepository.createUser({
          email: body.email,
          phoneNumber: body.phoneNumber,
          name: body.name,
          password: hashedPassword,
          roleId: clientRoleId,
        }),
        this.authRepository.deleteVerificationCode({
          email: body.email,
          code: body.code,
          type: TypeOfVerificationCode.REGISTER
        })
      ]); 
      return user;
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) throw EmailAlreadyExistsException;
      throw error
    }
  }

  async sendOTP(body: SendOTPBodyType) {
    const user = await this.sharedUserRepository.findUnique({ email: body.email });

    if(body.type === TypeOfVerificationCode.REGISTER && user) throw EmailAlreadyExistsException;
    if(body.type === TypeOfVerificationCode.FORGOT_PASSWORD && !user) throw EmailNotFoundException;

    const code = generateOTP();
    await this.authRepository.createVerificationCode({
      email: body.email,
      code,
      type: body.type,
      expiresAt: addMilliseconds(new Date(), ms(envConfig.OTP_EXPIRES_IN as ms.StringValue))
    })

    const { error } = await this.emailService.sendOTP({
      email: body.email,
      code
    })
    if(error) throw FailedToSendOTPException;

    return { message: 'Send OTP successfully!. Plz check email.' };
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

  async logout(refreshToken: string) {
    try {
        await this.tokenService.verifyRefreshToken(refreshToken);
        
        const deletedRefreshToken = await this.authRepository.deleteRefreshToken({
          token: refreshToken
        })
        
        await this.authRepository.updateDevice(deletedRefreshToken.deviceId, {
          isActive: false
        })

        return { message: 'Logout successful' };
    } catch (error) {
        if(isNotFoundPrismaError(error)) {
          throw new UnauthorizedException('Refresh token has been revoked');
        }
        throw new UnauthorizedException();
    }
  }

  async forgotPassword(body: ForgotPasswordBodyType) {
    const { email, code, newPassword } = body;
    // check email
    const user = await this.sharedUserRepository.findUnique({ email });
    if(!user) throw EmailNotFoundException;

    // check otp invalid
    await this.validateVerificationCode({ email: body.email, code: body.code, type: TypeOfVerificationCode.FORGOT_PASSWORD });

    // update password
    const hashedPassword = await this.hashingService.hash(newPassword);
    await Promise.all([
      this.authRepository.updateUser({ id: user.id }, {
        password: hashedPassword
      }),
      this.authRepository.deleteVerificationCode({
        email,
        code,
        type: TypeOfVerificationCode.FORGOT_PASSWORD
      })
    ])

    return {
      message: 'Update password successfully!'
    }
  }
}
