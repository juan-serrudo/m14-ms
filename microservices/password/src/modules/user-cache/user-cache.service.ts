import { Injectable, Logger } from '@nestjs/common';

/**
 * Servicio de cache local de usuarios
 * Demuestra eventual consistency: password-service mantiene una copia local
 * de usuarios conocidos basada en eventos de Kafka, sin necesidad de
 * llamadas HTTP síncronas para validar usuarios existentes
 */
interface CachedUser {
  id: number;
  email: string;
  name?: string;
  status?: string;
  lastUpdated: Date;
}

@Injectable()
export class UserCacheService {
  private readonly logger = new Logger(UserCacheService.name);
  private readonly userCache: Map<number, CachedUser> = new Map();

  /**
   * Agrega un usuario al cache local
   */
  async addUser(user: { id: number; email: string; name?: string; status?: string }): Promise<void> {
    this.userCache.set(user.id, {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      lastUpdated: new Date(),
    });
    this.logger.debug(`Usuario agregado al cache: ID ${user.id}, Email: ${user.email}`);
  }

  /**
   * Actualiza un usuario en el cache local
   */
  async updateUser(user: { id: number; email: string; name?: string; status?: string }): Promise<void> {
    const existing = this.userCache.get(user.id);
    if (existing) {
      this.userCache.set(user.id, {
        ...existing,
        email: user.email,
        name: user.name ?? existing.name,
        status: user.status ?? existing.status,
        lastUpdated: new Date(),
      });
      this.logger.debug(`Usuario actualizado en cache: ID ${user.id}`);
    } else {
      // Si no existe, lo agregamos (puede pasar si el consumer se conecta después de la creación)
      await this.addUser(user);
    }
  }

  /**
   * Elimina un usuario del cache local
   */
  async removeUser(userId: number): Promise<void> {
    const removed = this.userCache.delete(userId);
    if (removed) {
      this.logger.debug(`Usuario eliminado del cache: ID ${userId}`);
    }
  }

  /**
   * Verifica si un usuario existe en el cache local
   */
  async userExists(userId: number): Promise<boolean> {
    const exists = this.userCache.has(userId);
    this.logger.debug(`Verificación de usuario ID ${userId} en cache: ${exists ? 'EXISTE' : 'NO EXISTE'}`);
    return exists;
  }

  /**
   * Obtiene un usuario del cache local
   */
  async getUser(userId: number): Promise<CachedUser | null> {
    return this.userCache.get(userId) || null;
  }

  /**
   * Obtiene todos los usuarios del cache local
   */
  async getAllUsers(): Promise<CachedUser[]> {
    return Array.from(this.userCache.values());
  }

  /**
   * Obtiene estadísticas del cache
   */
  getCacheStats(): { totalUsers: number; userIds: number[] } {
    return {
      totalUsers: this.userCache.size,
      userIds: Array.from(this.userCache.keys()),
    };
  }
}

