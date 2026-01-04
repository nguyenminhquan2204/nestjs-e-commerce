import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Post, Query, Req, Res } from '@nestjs/common'
import { AuthService } from 'src/routes/auth/auth.service'
import { RegisterBodyDTO, RegisterResDTO } from './auth.dto'
import { ZodSerializerDto } from 'nestjs-zod'
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  @ZodSerializerDto(RegisterResDTO)
  async register(@Body() body: RegisterBodyDTO) {
    return await this.authService.register(body)
  }

  // @Post('login')
  // async login(@Body() body: any) {
  //   return this.authService.login(body);
  // }

  // @Post('refresh-token')
  // @HttpCode(HttpStatus.OK)
  // async refreshToken(@Body() body: any) {
  //   return this.authService.refreshToken(body.refreshToken);
  // }

  // @Post('logout')
  //  async logout(@Body() body: any) {
  //     // return new LogoutResDTO(await this.authService.logout(body.refreshToken));
  //  }
}
