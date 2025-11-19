import { Inject, Injectable } from '@nestjs/common';
import { ResponseDTO } from 'src/dto/response.dto';
import { CreateUserDto, UpdateUserDto } from 'src/dto/user.dto';
import { User } from 'src/entitys/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @Inject('USER_REPOSITORY')
    private userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<ResponseDTO> {
    let response: ResponseDTO = {
      error: true,
      message: 'Error en el servicio',
      response: [],
      status: 422
    };

    try {
      const users = await this.userRepository.find({
        order: { id: 'ASC' }
      });

      response.error = false;
      response.message = 'Consulta realizada correctamente.';
      response.response = users;
      response.status = 200;

    } catch (error) {
      response.error = true;
      response.message = 'Error en la consulta.';
      response.response = error;
      response.status = 502;
    }

    return response;
  }

  async findOne(id: number): Promise<ResponseDTO> {
    let response: ResponseDTO = {
      error: true,
      message: 'Error en el servicio',
      response: [],
      status: 422
    };

    try {
      const user = await this.userRepository.findOne({
        where: { id }
      });

      if (!user) {
        response.error = true;
        response.message = 'Usuario no encontrado.';
        response.response = [];
        response.status = 404;
        return response;
      }

      response.error = false;
      response.message = 'Usuario encontrado.';
      response.response = user;
      response.status = 200;

    } catch (error) {
      response.error = true;
      response.message = 'Error en la consulta.';
      response.response = error;
      response.status = 502;
    }

    return response;
  }

  async exists(id: number): Promise<ResponseDTO> {
    let response: ResponseDTO = {
      error: true,
      message: 'Error en el servicio',
      response: [],
      status: 422
    };

    try {
      const user = await this.userRepository.findOne({
        where: { id },
        select: ['id']
      });

      response.error = false;
      response.message = 'Consulta realizada correctamente.';
      response.response = { exists: !!user };
      response.status = 200;

    } catch (error) {
      response.error = true;
      response.message = 'Error en la consulta.';
      response.response = error;
      response.status = 502;
    }

    return response;
  }

  async save(userData: CreateUserDto): Promise<ResponseDTO> {
    let response: ResponseDTO = {
      error: true,
      message: 'Error en el servicio',
      response: [],
      status: 422
    };

    try {
      // Verificar si el email ya existe
      const existingUser = await this.userRepository.findOne({
        where: { email: userData.email }
      });

      if (existingUser) {
        response.error = true;
        response.message = 'El email ya está registrado.';
        response.response = [];
        response.status = 409;
        return response;
      }

      const newUser = this.userRepository.create({
        email: userData.email,
        name: userData.name,
        status: userData.status || 'active'
      });

      const savedUser = await this.userRepository.save(newUser);

      response.error = false;
      response.message = 'Usuario creado exitosamente.';
      response.response = savedUser;
      response.status = 201;

    } catch (error) {
      response.error = true;
      response.message = 'Error al crear el usuario.';
      response.response = error;
      response.status = 502;
    }

    return response;
  }

  async update(id: number, userData: UpdateUserDto): Promise<ResponseDTO> {
    let response: ResponseDTO = {
      error: true,
      message: 'Error en el servicio',
      response: [],
      status: 422
    };

    try {
      const existingUser = await this.userRepository.findOne({ where: { id } });

      if (!existingUser) {
        response.error = true;
        response.message = 'Usuario no encontrado.';
        response.response = [];
        response.status = 404;
        return response;
      }

      // Si se actualiza el email, verificar que no esté en uso
      if (userData.email && userData.email !== existingUser.email) {
        const emailExists = await this.userRepository.findOne({
          where: { email: userData.email }
        });

        if (emailExists) {
          response.error = true;
          response.message = 'El email ya está registrado.';
          response.response = [];
          response.status = 409;
          return response;
        }
      }

      const updateData: any = {};

      if (userData.email !== undefined) updateData.email = userData.email;
      if (userData.name !== undefined) updateData.name = userData.name;
      if (userData.status !== undefined) updateData.status = userData.status;

      await this.userRepository.update(id, updateData);

      response.error = false;
      response.message = 'Usuario actualizado exitosamente.';
      response.response = { id };
      response.status = 200;

    } catch (error) {
      response.error = true;
      response.message = 'Error al actualizar el usuario.';
      response.response = error;
      response.status = 502;
    }

    return response;
  }

  async delete(id: number): Promise<ResponseDTO> {
    let response: ResponseDTO = {
      error: true,
      message: 'Error en el servicio',
      response: [],
      status: 422
    };

    try {
      const existingUser = await this.userRepository.findOne({ where: { id } });

      if (!existingUser) {
        response.error = true;
        response.message = 'Usuario no encontrado.';
        response.response = [];
        response.status = 404;
        return response;
      }

      await this.userRepository.delete(id);

      response.error = false;
      response.message = 'Usuario eliminado exitosamente.';
      response.response = { id };
      response.status = 200;

    } catch (error) {
      response.error = true;
      response.message = 'Error al eliminar el usuario.';
      response.response = error;
      response.status = 502;
    }

    return response;
  }
}

