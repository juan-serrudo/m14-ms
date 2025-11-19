import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
import { ResponseDTO } from 'src/dto/response.dto';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from 'src/dto/user.dto';

@ApiTags('GESTIÓN DE USUARIOS')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/')
  @ApiOperation({
    summary: 'Obtener todos los usuarios',
    description: 'Retorna una lista de todos los usuarios registrados'
  })
  async findAll(): Promise<ResponseDTO> {
    return this.userService.findAll();
  }

  @Get('/:id')
  @ApiOperation({
    summary: 'Obtener un usuario específico',
    description: 'Retorna los detalles de un usuario por su ID'
  })
  @ApiParam({ name: 'id', description: 'ID del usuario', type: 'number' })
  async findOne(@Param('id') id: number): Promise<ResponseDTO> {
    return this.userService.findOne(id);
  }

  @Get('/exists/:id')
  @ApiOperation({
    summary: 'Verificar si un usuario existe',
    description: 'Retorna { exists: boolean } indicando si el usuario existe'
  })
  @ApiParam({ name: 'id', description: 'ID del usuario a verificar', type: 'number' })
  async exists(@Param('id') id: number): Promise<ResponseDTO> {
    return this.userService.exists(id);
  }

  @Post('/')
  @ApiOperation({
    summary: 'Crear nuevo usuario',
    description: 'Crea un nuevo usuario en el sistema'
  })
  async save(@Body() userData: CreateUserDto): Promise<ResponseDTO> {
    return this.userService.save(userData);
  }

  @Put('/:id')
  @ApiOperation({
    summary: 'Actualizar usuario',
    description: 'Actualiza los datos de un usuario existente'
  })
  @ApiParam({ name: 'id', description: 'ID del usuario a actualizar', type: 'number' })
  async update(@Param('id') id: number, @Body() userData: UpdateUserDto): Promise<ResponseDTO> {
    return this.userService.update(id, userData);
  }

  @Delete('/:id')
  @ApiOperation({
    summary: 'Eliminar usuario',
    description: 'Elimina un usuario del sistema'
  })
  @ApiParam({ name: 'id', description: 'ID del usuario a eliminar', type: 'number' })
  async delete(@Param('id') id: number): Promise<ResponseDTO> {
    return this.userService.delete(id);
  }
}

