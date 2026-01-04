import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import { UserType } from '../models/share-user.model';

@Injectable()
export class ShareUserRepository {
   constructor(private readonly prismaService: PrismaService) {}

   async findUnique(uniqueObject: { email: string} | { id: number}): Promise<UserType | null> {
      return this.prismaService.user.findUnique({
         where: uniqueObject
      })
   }
}