import { ConflictException, Injectable, UnauthorizedException, BadRequestException, UnprocessableEntityException } from '@nestjs/common'
import { HashingService } from 'src/shared/services/hashing.service'
import { TokenService } from 'src/shared/services/token.service'
import { PrismaService } from 'src/shared/services/prisma.service'
import { RolesService } from './roles.service'
import { isUniqueConstraintPrismaError, isNotFoundPrismaError } from 'src/shared/helpers'
import { RegisterBodyType } from './auth.model'
import { AuthRepository } from './auth.repo'

@Injectable()
export class AuthService {
  constructor(
    private readonly hashingService: HashingService,
    private readonly tokenService: TokenService,
    private readonly rolesService: RolesService,
    private readonly prismaService: PrismaService,
    private readonly authRepository: AuthRepository,
  ) {}

  async register(body: RegisterBodyType) {
    try {
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
        throw new ConflictException('Email already exists')
      }
      throw error
    }
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
