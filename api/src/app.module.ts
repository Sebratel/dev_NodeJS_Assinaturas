import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDatabaseConfig } from './config/database.config.js';
import { DirectoryModule } from './modules/directory/directory.module.js';
import { GoogleIntegrationModule } from './modules/google-integration/google-integration.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { SignatureRulesModule } from './modules/signature-rules/signature-rules.module.js';
import { SignaturesModule } from './modules/signatures/signatures.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: buildDatabaseConfig }),
    SettingsModule,
    DirectoryModule,
    SignatureRulesModule,
    SignaturesModule,
    GoogleIntegrationModule,
    HealthModule,
  ],
})
export class AppModule {}
