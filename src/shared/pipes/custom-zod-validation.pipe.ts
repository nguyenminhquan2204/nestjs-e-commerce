import { UnprocessableEntityException } from '@nestjs/common';
import { createZodValidationPipe } from 'nestjs-zod';
import { ZodError } from 'zod';

const CustomZodValidationPipe = createZodValidationPipe({
  createValidationException: (zodError: ZodError) => {
    return new UnprocessableEntityException(
      zodError.issues.map((err) => ({
        ...err,
        path: err.path.join('.'),
      })),
    );
  },
}) as any;

export default CustomZodValidationPipe;
