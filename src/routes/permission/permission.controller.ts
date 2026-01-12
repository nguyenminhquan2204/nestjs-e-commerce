import { Controller, Get, Query, Param, Body, Post, Put, Delete } from "@nestjs/common";
import { PermissionService } from "./permission.service";
import { ZodSerializerDto } from "nestjs-zod";
import { CreatePermissionBodyDTO, GetPermissionDetailResDTO, GetPermissionParamsDTO, GetPermissionsQueryDTO, GetPermissionsResDTO, UpdatePermissionBodyDTO } from "./permission.dto";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";
import { MessageResDTO } from "src/shared/dto/response.dto";

@Controller('permissions')
export class PermissionController {
   constructor(private readonly permissionService: PermissionService) {}

   @Get()
   @ZodSerializerDto(GetPermissionsResDTO)
   list(@Query() query: GetPermissionsQueryDTO) {
      return this.permissionService.list({ 
         page: query.page,
         limit: query.limit
      })
   }

   @Get(':permissionId')
   @ZodSerializerDto(GetPermissionDetailResDTO)
   findById(@Param() params: GetPermissionParamsDTO) {
      console.log(typeof params.permissionId);
      console.log(params.permissionId);
      return this.permissionService.findById(params.permissionId);
   }

   @Post()
   @ZodSerializerDto(GetPermissionDetailResDTO)
   create(@Body() body: CreatePermissionBodyDTO, @ActiveUser('userId') userId: number) {
      return this.permissionService.create({
         data: body,
         createdById: userId
      })
   }

   @Put(':permissionId')
   @ZodSerializerDto(GetPermissionDetailResDTO)
   update(@Body() body: UpdatePermissionBodyDTO, @Param() params: GetPermissionParamsDTO, @ActiveUser('userId') userId: number) {
      return this.permissionService.update({
         id: params.permissionId,
         data: body,
         updatedById: userId
      })
   }

   @Delete(':permissionId')
   @ZodSerializerDto(MessageResDTO)
   delete(@Param() params: GetPermissionParamsDTO, @ActiveUser('userId') userId: number) {
      return this.permissionService.delete({ id: params.permissionId, userId})
   }
}