import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodResponse, ZodSerializerDto } from 'nestjs-zod'
import {
  CreateRoleBodyDTO,
  CreateRoleResDTO,
  GetRoleDetailResDTO,
  GetRoleParamsDTO,
  GetRolesQueryDTO,
  GetRolesResDTO,
  UpdateRoleBodyDTO,
} from './role.dto'
import { RoleService } from 'src/routes/role/role.service'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { MessageResDTO } from 'src/shared/dto/response.dto'

@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
//   @ZodResponse({ type: GetRolesResDTO })
   @ZodSerializerDto(GetRolesResDTO)
  list(@Query() query: GetRolesQueryDTO) {
    return this.roleService.list({
      page: query.page,
      limit: query.limit,
    })
  }

  @Get(':roleId')
//   @ZodResponse({ type: GetRoleDetailResDTO })
  @ZodSerializerDto(GetRoleDetailResDTO)
  findById(@Param() params: GetRoleParamsDTO) {
    return this.roleService.findById(params.roleId)
  }

  @Post()
//   @ZodResponse({ type: CreateRoleResDTO })
  @ZodSerializerDto(CreateRoleResDTO)
  create(@Body() body: CreateRoleBodyDTO, @ActiveUser('userId') userId: number) {
    return this.roleService.create({
      data: body,
      createdById: userId,
    })
  }

  @Put(':roleId')
//   @ZodResponse({ type: GetRoleDetailResDTO })
  @ZodSerializerDto(GetRoleDetailResDTO)
  update(@Body() body: UpdateRoleBodyDTO, @Param() params: GetRoleParamsDTO, @ActiveUser('userId') userId: number) {
    return this.roleService.update({
      data: body,
      id: params.roleId,
      updatedById: userId,
    })
  }

  @Delete(':roleId')
//   @ZodResponse({ type: MessageResDTO })
  @ZodSerializerDto(MessageResDTO)
  delete(@Param() params: GetRoleParamsDTO, @ActiveUser('userId') userId: number) {
    return this.roleService.delete({
      id: params.roleId,
      deletedById: userId,
    })
  }
}
