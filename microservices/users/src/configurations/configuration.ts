import { join } from 'path';

export default () => {
  const locatePackagejson = process.cwd();
  let pm2 = false;
  if (locatePackagejson.includes('dist')) {
    pm2 = true;
  }

  return {
    packageJson: require(join(process.cwd(), pm2 ? '../package.json' : 'package.json')),
    port: process.env.PORT || 3001,
    appMaxSize: process.env.APP_MAX_SIZE || '10mb',
    ENV_ENTORNO: process.env.ENV_ENTORNO || 'dev',
    ENV_CORS: process.env.ENV_CORS || '',
    ENV_SWAGGER_SHOW: process.env.ENV_SWAGGER_SHOW === 'true' || false,
    ENV_SYNCHRONIZE: process.env.ENV_SYNCHRONIZE === 'true' || false,
    KAFKA_BROKER: process.env.KAFKA_BROKER || 'kafka-broker:9092',
    KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID || 'users-service',
    KAFKA_USER_EVENTS_TOPIC: process.env.KAFKA_USER_EVENTS_TOPIC || 'user-events',
  };
};

