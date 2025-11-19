import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './configurations/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserController } from './modules/user/user.controller';
import { UserService } from './modules/user/user.service';
import { databaseProviders } from './providers/database.providers';
import { userProviders } from './providers/user.providers';
import { KafkaModule } from './modules/kafka/kafka.module';
import { JwtAuthModule } from './guards/jwt-auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      expandVariables: true,
      isGlobal: true
    }),
    KafkaModule,
    JwtAuthModule,
  ],
  controllers: [
    AppController,
    UserController,
  ],
  providers: [
    AppService,
    UserService,
    ...databaseProviders,
    ...userProviders,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [
    ...databaseProviders,
    ...userProviders,
  ],
})
export class AppModule {}

