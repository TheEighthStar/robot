import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import conf from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(conf.port);
  Logger.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap().catch((err) => {
  Logger.error(err);
});
