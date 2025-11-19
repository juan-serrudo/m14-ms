import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { UserEvent } from 'src/interfaces/user-events.interface';

/**
 * Servicio Kafka Producer para publicar eventos de usuarios
 * Implementa el patrón Event-Driven: users-service publica eventos cuando
 * se crean, actualizan o eliminan usuarios
 */
@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly topic: string;

  constructor(
    @Inject('KAFKA_PRODUCER') private readonly kafkaClient: ClientKafka,
    private readonly configService: ConfigService,
  ) {
    this.topic = this.configService.get<string>('KAFKA_USER_EVENTS_TOPIC') || 'user-events';
  }

  async onModuleInit() {
    // Retry para conectar a Kafka (puede tardar en estar disponible)
    const maxRetries = 10;
    const retryDelay = 3000; // 3 segundos

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`Intentando conectar Kafka Producer (intento ${attempt}/${maxRetries})...`);
        await this.kafkaClient.connect();
        this.logger.log(`✅ Kafka Producer conectado. Topic: ${this.topic}`);
        return; // Éxito, salir del loop
      } catch (error) {
        this.logger.warn(`Error al conectar Kafka Producer (intento ${attempt}/${maxRetries}): ${error.message}`);
        
        if (attempt < maxRetries) {
          this.logger.log(`Reintentando en ${retryDelay / 1000} segundos...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          this.logger.error(`❌ No se pudo conectar Kafka Producer después de ${maxRetries} intentos`);
          this.logger.warn('El servicio continuará sin Kafka. Los eventos no se publicarán hasta que Kafka esté disponible.');
        }
      }
    }
  }

  async onModuleDestroy() {
    // Desconectar el cliente al destruir el módulo
    await this.kafkaClient.close();
    this.logger.log('Kafka Producer desconectado');
  }

  /**
   * Publica un evento de usuario creado
   */
  async publishUserCreated(user: { id: number; email: string; name: string; status: string }): Promise<void> {
    const event: UserEvent = {
      type: 'USER_CREATED',
      payload: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
      },
      occurredAt: new Date().toISOString(),
    };

    try {
      await this.kafkaClient.emit(this.topic, JSON.stringify(event));
      this.logger.log(`Evento USER_CREATED publicado para usuario ID: ${user.id}`);
    } catch (error) {
      this.logger.error(`Error al publicar evento USER_CREATED: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Publica un evento de usuario actualizado
   */
  async publishUserUpdated(user: { id: number; email: string; name?: string; status?: string }): Promise<void> {
    const event: UserEvent = {
      type: 'USER_UPDATED',
      payload: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
      },
      occurredAt: new Date().toISOString(),
    };

    try {
      await this.kafkaClient.emit(this.topic, JSON.stringify(event));
      this.logger.log(`Evento USER_UPDATED publicado para usuario ID: ${user.id}`);
    } catch (error) {
      this.logger.error(`Error al publicar evento USER_UPDATED: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Publica un evento de usuario eliminado
   */
  async publishUserDeleted(userId: number, email: string): Promise<void> {
    const event: UserEvent = {
      type: 'USER_DELETED',
      payload: {
        id: userId,
        email: email,
      },
      occurredAt: new Date().toISOString(),
    };

    try {
      await this.kafkaClient.emit(this.topic, JSON.stringify(event));
      this.logger.log(`Evento USER_DELETED publicado para usuario ID: ${userId}`);
    } catch (error) {
      this.logger.error(`Error al publicar evento USER_DELETED: ${error.message}`, error.stack);
      throw error;
    }
  }
}

