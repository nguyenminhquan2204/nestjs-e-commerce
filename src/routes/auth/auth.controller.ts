import { Body, Controller, HttpCode, HttpStatus, Ip, Post } from '@nestjs/common'
import { AuthService } from 'src/routes/auth/auth.service'
import { LoginBodyDTO, LogoutBodyDTO, LoginResDTO, RefreshTokenBodyDTO, RefreshTokenResDTO, RegisterBodyDTO, RegisterResDTO, SendOTPBodyDTO } from './auth.dto'
import { ZodSerializerDto } from 'nestjs-zod'
import { UserAgent } from 'src/shared/decorators/user-agent.decorator'
import { MessageResDTO } from 'src/shared/dto/response.dto'
import { IsPublic } from 'src/shared/decorators/auth.decorator'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  @IsPublic()
  @ZodSerializerDto(RegisterResDTO)
  async register(@Body() body: RegisterBodyDTO) {
    return await this.authService.register(body)
  }

  @Post('otp')
  @IsPublic()
  @ZodSerializerDto(MessageResDTO)
  async sendOTP(@Body() body: SendOTPBodyDTO) {
    return await this.authService.sendOTP(body);
  }

  @Post('login')
  @IsPublic()
  @ZodSerializerDto(LoginResDTO)
  async login(@Body() body: LoginBodyDTO, @UserAgent() userAgent: string, @Ip() ip: string) {
    return this.authService.login({
      ...body,
      userAgent,
      ip
    });
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(RefreshTokenResDTO)
  async refreshToken(@Body() body: RefreshTokenBodyDTO, @UserAgent() userAgent: string, @Ip() ip: string) {
    return this.authService.refreshToken({
      ...body,
      userAgent,
      ip
    });
  }

  @Post('logout')
  @ZodSerializerDto(MessageResDTO)
  async logout(@Body() body: LogoutBodyDTO) {
    return this.authService.logout(body.refreshToken);
  }
}
