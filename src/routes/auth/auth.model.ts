import { TypeOfVerificationCode } from 'src/shared/constant/auth.constant';
import { UserSchema } from 'src/shared/models/share-user.model';
import { z } from 'zod';

export const RegisterBodySchema = UserSchema.pick({
   email: true,
   password: true,
   name: true,
   phoneNumber: true
}).extend({
   confirmPassword: z.string().min(6).max(100),
   code: z.string().length(6)
}).strict().superRefine(({ confirmPassword, password }, ctx) => {
   if(confirmPassword !== password) {
      ctx.addIssue({
         code: 'custom',
         message: 'Password and confirm password must match',
         path: ['confirmPassword']
      })
   }
})

export type RegisterBodyType = z.infer<typeof RegisterBodySchema>;

export const RegisterResSchema = UserSchema.omit({
   password: true,
   totpSecret: true,
})

export type RegisterResType = z.infer<typeof RegisterResSchema>;

export const VerificationCode = z.object({
   id: z.number(),
   email: z.string(),
   code: z.string().length(6),
   type: z.enum([TypeOfVerificationCode.REGISTER, TypeOfVerificationCode.FORGOT_PASSWORD, TypeOfVerificationCode.LOGIN, TypeOfVerificationCode.DISABLE_2FA]),
   expiresAt: z.date(),
   createdAt: z.date()
})

export type VerificationCodeType = z.infer<typeof VerificationCode>

export const SendOTPBodySchema = VerificationCode.pick({
   email: true,
   type: true,
}).strict()

export type SendOTPBodyType = z.infer<typeof SendOTPBodySchema>;