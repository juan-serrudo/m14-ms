import { Inject, Injectable, Logger } from '@nestjs/common';
import { ResponseDTO } from 'src/dto/response.dto';
import { CreatePasswordManagerDto, UpdatePasswordManagerDto, DecryptPasswordDto } from 'src/dto/password-manager.dto';
import { PasswordManager } from 'src/entitys/password-manager.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as CryptoJS from 'crypto-js';
import { UserClientService } from '../user-client/user-client.service';
import { UserCacheService } from '../user-cache/user-cache.service';

@Injectable()
export class PasswordManagerService {
  private readonly saltRounds = 12;
  private readonly logger = new Logger(PasswordManagerService.name);

  constructor(
    @Inject('PASSWORD_MANAGER_REPOSITORY')
    private passwordManagerRepository: Repository<PasswordManager>,
    private readonly userClientService: UserClientService,
    private readonly userCacheService: UserCacheService,
  ) {}

  // Método para cifrar contraseña usando AES
  private encryptPassword(password: string, masterKey: string): string {
    const encrypted = CryptoJS.AES.encrypt(password, masterKey).toString();
    return encrypted;
  }

  // Método para descifrar contraseña usando AES
  private decryptPasswordInternal(encryptedPassword: string, masterKey: string): string {
    const decrypted = CryptoJS.AES.decrypt(encryptedPassword, masterKey);
    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  // Método para generar hash de la clave maestra
  private async hashMasterKey(masterKey: string): Promise<string> {
    return await bcrypt.hash(masterKey, this.saltRounds);
  }

  // Método para verificar clave maestra
  private async verifyMasterKey(masterKey: string, hashedMasterKey: string): Promise<boolean> {
    return await bcrypt.compare(masterKey, hashedMasterKey);
  }

  async findAll(): Promise<ResponseDTO> {
    let response: ResponseDTO = {
      error: true,
      message: 'Error en el servicio',
      response: [],
      status: 422
    };

    try {
      const passwords = await this.passwordManagerRepository.find({
        select: ['id', 'title', 'description', 'username', 'url', 'category', 'notes', 'createdAt', 'updateAt', 'userId']
      });

      response.error = false;
      response.message = 'Consulta realizada correctamente.';
      response.response = passwords;
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
      const password = await this.passwordManagerRepository.findOne({
        where: { id },
        select: ['id', 'title', 'description', 'username', 'url', 'category', 'notes', 'createdAt', 'updateAt', 'userId']
      });

      if (!password) {
        response.error = true;
        response.message = 'Entrada no encontrada.';
        response.response = [];
        response.status = 404;
        return response;
      }

      response.error = false;
      response.message = 'Entrada encontrada.';
      response.response = password;
      response.status = 200;

    } catch (error) {
      response.error = true;
      response.message = 'Error en la consulta.';
      response.response = error;
      response.status = 502;
    }

    return response;
  }

  async save(passwordData: CreatePasswordManagerDto): Promise<ResponseDTO> {
    let response: ResponseDTO = {
      error: true,
      message: 'Error en el servicio',
      response: [],
      status: 422
    };

    try {
      // VALIDACIÓN DE USUARIO: Eventual Consistency + Fallback HTTP
      // 1. Primero intenta usar el cache local (eventual consistency desde Kafka)
      // 2. Si no está en cache, usa validación HTTP síncrona como fallback
      let userExists = await this.userCacheService.userExists(passwordData.userId);
      
      if (!userExists) {
        this.logger.debug(`Usuario ${passwordData.userId} no encontrado en cache, validando vía HTTP...`);
        // Fallback: validación HTTP síncrona (con Retry y Circuit Breaker)
        try {
          userExists = await this.userClientService.userExists(passwordData.userId);
          if (userExists) {
            // Si existe vía HTTP pero no en cache, puede ser que el evento aún no llegó
            // Esto demuestra eventual consistency
            this.logger.warn(`Usuario ${passwordData.userId} existe vía HTTP pero no en cache local (eventual consistency)`);
          }
        } catch (httpError) {
          this.logger.error(`Error al validar usuario vía HTTP: ${httpError.message}`);
        }
      } else {
        this.logger.debug(`Usuario ${passwordData.userId} encontrado en cache local (eventual consistency)`);
      }

      if (!userExists) {
        response.error = true;
        response.message = `El usuario con ID ${passwordData.userId} no existe.`;
        response.response = [];
        response.status = 404;
        return response;
      }

      // Cifrar la contraseña
      const encryptedPassword = this.encryptPassword(passwordData.password, passwordData.masterKey);
      
      // Generar hash de la clave maestra
      const masterKeyHash = await this.hashMasterKey(passwordData.masterKey);

      const newPassword = this.passwordManagerRepository.create({
        title: passwordData.title,
        description: passwordData.description || '',
        username: passwordData.username,
        encryptedPassword: encryptedPassword,
        url: passwordData.url || '',
        category: passwordData.category,
        notes: passwordData.notes || '',
        masterKeyHash: masterKeyHash,
        userId: passwordData.userId
      });

      const savedPassword = await this.passwordManagerRepository.save(newPassword);

      // No devolver la contraseña cifrada ni el hash de la clave maestra
      const { encryptedPassword: _, masterKeyHash: __, ...safePassword } = savedPassword;

      response.error = false;
      response.message = 'Contraseña guardada exitosamente.';
      response.response = safePassword;
      response.status = 201;

    } catch (error) {
      response.error = true;
      response.message = 'Error al guardar la contraseña.';
      response.response = error;
      response.status = 502;
    }

    return response;
  }

  async update(id: number, passwordData: UpdatePasswordManagerDto): Promise<ResponseDTO> {
    let response: ResponseDTO = {
      error: true,
      message: 'Error en el servicio',
      response: [],
      status: 422
    };

    try {
      const existingPassword = await this.passwordManagerRepository.findOne({ where: { id } });

      if (!existingPassword) {
        response.error = true;
        response.message = 'Entrada no encontrada.';
        response.response = [];
        response.status = 404;
        return response;
      }

      // Verificar la clave maestra
      const isMasterKeyValid = await this.verifyMasterKey(passwordData.masterKey, existingPassword.masterKeyHash);
      
      if (!isMasterKeyValid) {
        response.error = true;
        response.message = 'Clave maestra incorrecta.';
        response.response = [];
        response.status = 401;
        return response;
      }

      // Si se actualiza el userId, validar que el nuevo usuario existe
      const userIdToValidate = passwordData.userId !== undefined ? passwordData.userId : existingPassword.userId;
      if (passwordData.userId !== undefined && passwordData.userId !== existingPassword.userId) {
        // Validación con eventual consistency + fallback HTTP
        let userExists = await this.userCacheService.userExists(passwordData.userId);
        
        if (!userExists) {
          this.logger.debug(`Usuario ${passwordData.userId} no encontrado en cache, validando vía HTTP...`);
          try {
            userExists = await this.userClientService.userExists(passwordData.userId);
          } catch (httpError) {
            this.logger.error(`Error al validar usuario vía HTTP: ${httpError.message}`);
          }
        }

        if (!userExists) {
          response.error = true;
          response.message = `El usuario con ID ${passwordData.userId} no existe.`;
          response.response = [];
          response.status = 404;
          return response;
        }
      }

      const updateData: any = {};

      if (passwordData.title !== undefined) updateData.title = passwordData.title;
      if (passwordData.description !== undefined) updateData.description = passwordData.description;
      if (passwordData.username !== undefined) updateData.username = passwordData.username;
      if (passwordData.url !== undefined) updateData.url = passwordData.url;
      if (passwordData.category !== undefined) updateData.category = passwordData.category;
      if (passwordData.notes !== undefined) updateData.notes = passwordData.notes;
      if (passwordData.userId !== undefined) updateData.userId = passwordData.userId;

      // Si se proporciona una nueva contraseña, cifrarla
      if (passwordData.password !== undefined) {
        updateData.encryptedPassword = this.encryptPassword(passwordData.password, passwordData.masterKey);
      }

      await this.passwordManagerRepository.update(id, updateData);

      response.error = false;
      response.message = 'Contraseña actualizada exitosamente.';
      response.response = { id };
      response.status = 200;

    } catch (error) {
      response.error = true;
      response.message = 'Error al actualizar la contraseña.';
      response.response = error;
      response.status = 502;
    }

    return response;
  }

  async delete(id: number, masterKey: string): Promise<ResponseDTO> {
    let response: ResponseDTO = {
      error: true,
      message: 'Error en el servicio',
      response: [],
      status: 422
    };

    try {
      const existingPassword = await this.passwordManagerRepository.findOne({ where: { id } });

      if (!existingPassword) {
        response.error = true;
        response.message = 'Entrada no encontrada.';
        response.response = [];
        response.status = 404;
        return response;
      }

      // Verificar la clave maestra
      const isMasterKeyValid = await this.verifyMasterKey(masterKey, existingPassword.masterKeyHash);
      
      if (!isMasterKeyValid) {
        response.error = true;
        response.message = 'Clave maestra incorrecta.';
        response.response = [];
        response.status = 401;
        return response;
      }

      await this.passwordManagerRepository.delete(id);

      response.error = false;
      response.message = 'Contraseña eliminada exitosamente.';
      response.response = { id };
      response.status = 200;

    } catch (error) {
      response.error = true;
      response.message = 'Error al eliminar la contraseña.';
      response.response = error;
      response.status = 502;
    }

    return response;
  }

  async decryptPassword(id: number, decryptData: DecryptPasswordDto): Promise<ResponseDTO> {
    let response: ResponseDTO = {
      error: true,
      message: 'Error en el servicio',
      response: [],
      status: 422
    };

    try {
      const passwordEntry = await this.passwordManagerRepository.findOne({ where: { id } });

      if (!passwordEntry) {
        response.error = true;
        response.message = 'Entrada no encontrada.';
        response.response = [];
        response.status = 404;
        return response;
      }

      // Verificar la clave maestra
      const isMasterKeyValid = await this.verifyMasterKey(decryptData.masterKey, passwordEntry.masterKeyHash);
      
      if (!isMasterKeyValid) {
        response.error = true;
        response.message = 'Clave maestra incorrecta.';
        response.response = [];
        response.status = 401;
        return response;
      }

      // Descifrar la contraseña
      const decryptedPassword = this.decryptPasswordInternal(passwordEntry.encryptedPassword, decryptData.masterKey);

      response.error = false;
      response.message = 'Contraseña descifrada exitosamente.';
      response.response = {
        id: passwordEntry.id,
        title: passwordEntry.title,
        username: passwordEntry.username,
        decryptedPassword: decryptedPassword
      };
      response.status = 200;

    } catch (error) {
      response.error = true;
      response.message = 'Error al descifrar la contraseña.';
      response.response = error;
      response.status = 502;
    }

    return response;
  }

  async findByCategory(category: string): Promise<ResponseDTO> {
    let response: ResponseDTO = {
      error: true,
      message: 'Error en el servicio',
      response: [],
      status: 422
    };

    try {
      const passwords = await this.passwordManagerRepository.find({
        where: { category },
        select: ['id', 'title', 'description', 'username', 'url', 'category', 'notes', 'createdAt', 'updateAt', 'userId']
      });

      response.error = false;
      response.message = 'Consulta realizada correctamente.';
      response.response = passwords;
      response.status = 200;

    } catch (error) {
      response.error = true;
      response.message = 'Error en la consulta.';
      response.response = error;
      response.status = 502;
    }

    return response;
  }

  async findByUserId(userId: number): Promise<ResponseDTO> {
    let response: ResponseDTO = {
      error: true,
      message: 'Error en el servicio',
      response: [],
      status: 422
    };

    try {
      // VALIDACIÓN DE USUARIO: Eventual Consistency + Fallback HTTP
      // 1. Primero intenta usar el cache local (eventual consistency desde Kafka)
      // 2. Si no está en cache, usa validación HTTP síncrona como fallback
      let userExists = await this.userCacheService.userExists(userId);
      
      if (!userExists) {
        this.logger.debug(`Usuario ${userId} no encontrado en cache, validando vía HTTP...`);
        try {
          userExists = await this.userClientService.userExists(userId);
        } catch (httpError) {
          this.logger.error(`Error al validar usuario vía HTTP: ${httpError.message}`);
        }
      } else {
        this.logger.debug(`Usuario ${userId} encontrado en cache local (eventual consistency)`);
      }

      if (!userExists) {
        response.error = true;
        response.message = `El usuario con ID ${userId} no existe.`;
        response.response = [];
        response.status = 404;
        return response;
      }

      const passwords = await this.passwordManagerRepository.find({
        where: { userId },
        select: ['id', 'title', 'description', 'username', 'url', 'category', 'notes', 'createdAt', 'updateAt', 'userId']
      });

      response.error = false;
      response.message = 'Consulta realizada correctamente.';
      response.response = passwords;
      response.status = 200;

    } catch (error: any) {
      response.error = true;
      response.message = error.message || 'Error en la consulta.';
      response.response = error;
      response.status = 502;
    }

    return response;
  }
}
