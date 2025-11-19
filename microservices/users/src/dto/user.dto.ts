import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  IsOptional,
  IsEmail,
  IsIn,
} from 'class-validator';

export class CreateUserDto {
  @Expose()
  @IsEmail({}, { message: 'El campo "Email" debe ser un email válido.' })
  @IsNotEmpty({ message: 'El campo "Email" es obligatorio.' })
  @ApiProperty({
    description: 'Email del usuario (único)',
    example: 'usuario@example.com',
    required: true,
  })
  email: string;

  @Expose()
  @IsString({ message: 'El campo "Nombre" debe ser un texto válido.' })
  @MaxLength(200, { message: 'El campo "Nombre" no puede tener más de 200 caracteres.' })
  @MinLength(1, { message: 'El campo "Nombre" debe tener al menos 1 carácter.' })
  @IsNotEmpty({ message: 'El campo "Nombre" es obligatorio.' })
  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan Pérez',
    required: true,
  })
  name: string;

  @Expose()
  @IsString({ message: 'El campo "Estado" debe ser un texto válido.' })
  @IsIn(['active', 'inactive'], { message: 'El campo "Estado" debe ser "active" o "inactive".' })
  @IsOptional()
  @ApiProperty({
    description: 'Estado del usuario',
    example: 'active',
    required: false,
    enum: ['active', 'inactive'],
  })
  status?: string;
}

export class UpdateUserDto {
  @Expose()
  @IsEmail({}, { message: 'El campo "Email" debe ser un email válido.' })
  @IsOptional()
  @ApiProperty({
    description: 'Email del usuario (único)',
    example: 'usuario@example.com',
    required: false,
  })
  email?: string;

  @Expose()
  @IsString({ message: 'El campo "Nombre" debe ser un texto válido.' })
  @MaxLength(200, { message: 'El campo "Nombre" no puede tener más de 200 caracteres.' })
  @MinLength(1, { message: 'El campo "Nombre" debe tener al menos 1 carácter.' })
  @IsOptional()
  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan Pérez',
    required: false,
  })
  name?: string;

  @Expose()
  @IsString({ message: 'El campo "Estado" debe ser un texto válido.' })
  @IsIn(['active', 'inactive'], { message: 'El campo "Estado" debe ser "active" o "inactive".' })
  @IsOptional()
  @ApiProperty({
    description: 'Estado del usuario',
    example: 'active',
    required: false,
    enum: ['active', 'inactive'],
  })
  status?: string;
}

