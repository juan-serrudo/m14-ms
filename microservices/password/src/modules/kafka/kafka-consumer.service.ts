import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { UserEvent } from 'src/interfaces/user-events.interface';
import { UserCacheService } from '../user-cache/user-cache.service';

/**
 * Servicio Kafka Consumer para consumir eventos de usuarios
 * Implementa el patrón Event-Driven: password-service consume eventos de usuarios
 * y mantiene un cache local para demostrar eventual consistency
 */
@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private readonly topic: string;
  private readonly groupId: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly userCacheService: UserCacheService,
  ) {
    const broker = this.configService.get<string>('KAFKA_BROKER') || 'kafka-broker:9092';
    const clientId = this.configService.get<string>('KAFKA_CLIENT_ID') || 'password-service';
    this.topic = this.configService.get<string>('KAFKA_USER_EVENTS_TOPIC') || 'user-events';
    this.groupId = this.configService.get<string>('KAFKA_GROUP_ID') || 'password-service-group';

    this.kafka = new Kafka({
      clientId: clientId,
      brokers: [broker],
    });

    this.consumer = this.kafka.consumer({ groupId: this.groupId });
  }

  async onModuleInit() {
    // Retry para conectar a Kafka (puede tardar en estar disponible)
    const maxRetries = 10;
    const retryDelay = 3000; // 3 segundos

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`Intentando conectar a Kafka (intento ${attempt}/${maxRetries})...`);
        
        // Conectar el consumer
        await this.consumer.connect();
        this.logger.log(`Kafka Consumer conectado. Topic: ${this.topic}, Group: ${this.groupId}`);

        // Suscribirse al topic
        await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });

        // Procesar mensajes
        await this.consumer.run({
          eachMessage: async (payload: EachMessagePayload) => {
            await this.handleMessage(payload);
          },
        });

        this.logger.log(`✅ Kafka Consumer escuchando eventos en topic: ${this.topic}`);
        return; // Éxito, salir del loop
      } catch (error) {
        this.logger.warn(`Error al conectar a Kafka (intento ${attempt}/${maxRetries}): ${error.message}`);
        
        if (attempt < maxRetries) {
          this.logger.log(`Reintentando en ${retryDelay / 1000} segundos...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          this.logger.error(`❌ No se pudo conectar a Kafka después de ${maxRetries} intentos`);
          // No lanzar error para que el servicio pueda iniciar sin Kafka (degradación elegante)
          this.logger.warn('El servicio continuará sin Kafka. Los eventos se perderán hasta que Kafka esté disponible.');
        }
      }
    }
  }

  async onModuleDestroy() {
    try {
      await this.consumer.disconnect();
      this.logger.log('Kafka Consumer desconectado');
    } catch (error) {
      this.logger.error(`Error al desconectar Kafka Consumer: ${error.message}`, error.stack);
    }
  }

  /**
   * Procesa cada mensaje recibido del topic
   */
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    try {
      const messageValue = payload.message.value?.toString();
      if (!messageValue) {
        this.logger.warn('Mensaje recibido sin valor');
        return;
      }

      const event: UserEvent = JSON.parse(messageValue);
      this.logger.log(`Evento recibido: ${event.type} para usuario ID: ${event.payload.id}`);

      // Procesar el evento según su tipo
      switch (event.type) {
        case 'USER_CREATED':
          await this.userCacheService.addUser(event.payload);
          this.logger.log(`Usuario agregado al cache local: ID ${event.payload.id}`);
          break;

        case 'USER_UPDATED':
          await this.userCacheService.updateUser(event.payload);
          this.logger.log(`Usuario actualizado en cache local: ID ${event.payload.id}`);
          break;

        case 'USER_DELETED':
          await this.userCacheService.removeUser(event.payload.id);
          this.logger.log(`Usuario eliminado del cache local: ID ${event.payload.id}`);
          break;

        default:
          this.logger.warn(`Tipo de evento desconocido: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Error al procesar mensaje de Kafka: ${error.message}`, error.stack);
      // En producción, aquí podrías implementar un dead letter queue
    }
  }
}

