import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaProducerService } from './kafka-producer.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_PRODUCER',
        useFactory: (configService: ConfigService) => {
          const broker = configService.get<string>('KAFKA_BROKER') || 'kafka-broker:9092';
          const clientId = configService.get<string>('KAFKA_CLIENT_ID') || 'users-service';
          return {
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: clientId,
                brokers: [broker],
              },
              consumer: {
                groupId: clientId + '-group',
              },
            },
          };
        },
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [KafkaProducerService],
  exports: [KafkaProducerService],
})
export class KafkaModule {}

