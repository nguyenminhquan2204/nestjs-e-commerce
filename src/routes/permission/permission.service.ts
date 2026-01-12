import { Injectable } from "@nestjs/common";
import { PermissionRepo } from "./permission.repo";
import { CreatePermissionBodyType, GetPermissionsQueryType, UpdatePermissionBodyType } from "./permission.model";
import { NotFoundRecordException } from "src/shared/error";
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from "src/shared/helpers";
import { PermissionAlreadyExistException } from "./permission.error";

@Injectable()
export class PermissionService {
   constructor(
      private readonly permissionRepo: PermissionRepo
   ) {}

   async list(pagination: GetPermissionsQueryType) {
      const data = await this.permissionRepo.list(pagination);
      return data;
   }

   async findById(id: number) {
      const permission = await this.permissionRepo.findById(id);
      if(!permission) throw NotFoundRecordException
      return permission;
   }

   async create({ data, createdById }: { data: CreatePermissionBodyType, createdById: number }) {
      try {
         return await this.permissionRepo.create({ createdById, data })
      } catch (error) {
         if(isUniqueConstraintPrismaError(error)) throw PermissionAlreadyExistException;
         throw error;
      }
   }

   async update({ id, data, updatedById }: { id: number, data: UpdatePermissionBodyType, updatedById: number }) {
      try {
         const permission = await this.permissionRepo.update({ id, updatedById, data })
         return permission;
      } catch (error) {
         if(isNotFoundPrismaError(error)) throw NotFoundRecordException;
         if(isUniqueConstraintPrismaError(error)) throw PermissionAlreadyExistException;
         throw error;
      }
   }

   async delete({id, userId}: {id: number, userId: number}) {
      try {
         await this.permissionRepo.delete(id, userId);
         return { message: 'Delete successfully!' }
      } catch (error) {
         if(isNotFoundPrismaError(error)) throw NotFoundRecordException;
         throw error;
      }
   }
}