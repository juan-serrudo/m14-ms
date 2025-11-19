import { DataSource } from 'typeorm';

export const databaseProviders = [
  {
    provide: 'DATA_SOURCE',
    useFactory: async () => {
      const dataSource = new DataSource({
        type: 'sqlite',
        database: process.env.DATABASE_PATH || 'data/users.sqlite',
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: Boolean(process.env.ENV_SYNCHRONIZE) || true,
      });

      return dataSource.initialize();
    },
  },
];

