import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OAuth2Service } from './oauth2.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  providers: [OAuth2Service],
  exports: [OAuth2Service],
})
export class OAuth2Module {}

