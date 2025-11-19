import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UserClientService } from './user-client.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 2000,
      maxRedirects: 5,
    }),
  ],
  providers: [UserClientService],
  exports: [UserClientService],
})
export class UserClientModule {}

