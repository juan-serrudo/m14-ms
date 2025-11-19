import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UserClientService } from './user-client.service';
import { OAuth2Module } from '../oauth2/oauth2.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 2000,
      maxRedirects: 5,
    }),
    OAuth2Module,
  ],
  providers: [UserClientService],
  exports: [UserClientService],
})
export class UserClientModule {}

