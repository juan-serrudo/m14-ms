import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KafkaConsumerService } from './kafka-consumer.service';
import { UserCacheModule } from '../user-cache/user-cache.module';

@Module({
  imports: [UserCacheModule],
  providers: [KafkaConsumerService],
  exports: [KafkaConsumerService],
})
export class KafkaModule {}

