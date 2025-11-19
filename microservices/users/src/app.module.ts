import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './configurations/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserController } from './modules/user/user.controller';
import { UserService } from './modules/user/user.service';
import { databaseProviders } from './providers/database.providers';
import { userProviders } from './providers/user.providers';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      expandVariables: true,
      isGlobal: true
    }),
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
  ],
  exports: [
    ...databaseProviders,
    ...userProviders,
  ],
})
export class AppModule {}

