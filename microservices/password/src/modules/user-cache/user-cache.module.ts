import { Module } from '@nestjs/common';
import { UserCacheService } from './user-cache.service';
import { UserCacheController } from './user-cache.controller';

@Module({
  controllers: [UserCacheController],
  providers: [UserCacheService],
  exports: [UserCacheService],
})
export class UserCacheModule {}

