import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';

function printBanner(port: number | string) {
  const banner = `
\x1b[35m   ____       _ _ ____                 
  / ___|_   _| (_)  _ \\  _____   _____ 
 | |  _| | | | | | | | |/ _ \\ \\ / / __|
 | |_| | |_| | | | |_| |  __/\\ V /\\__ \\
  \\____|\\__,_|_|_|____/ \\___| \\_/ |___/\x1b[0m
\x1b[36m    PASANAKU ON-CHAIN :D\x1b[0m

  GraphQL Playground: \x1b[32mhttp://localhost:${port}/graphql\x1b[0m
  Stellar Network:    \x1b[33m${process.env.STELLAR_NETWORK ?? 'TESTNET'}\x1b[0m
`;
  console.log(banner);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  printBanner(port);
}
await bootstrap();
