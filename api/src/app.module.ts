import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDatabaseConfig } from './config/database.config.js';
import { DirectoryModule } from './modules/directory/directory.module.js';
import { GoogleIntegrationModule } from './modules/google-integration/google-integration.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { SignatureApplicationsModule } from './modules/signature-applications/signature-applications.module.js';
import { SignatureRulesModule } from './modules/signature-rules/signature-rules.module.js';
import { SignatureTemplatesModule } from './modules/signature-templates/signature-templates.module.js';
import { SignaturesModule } from './modules/signatures/signatures.module.js';
import { TeamPhrasesModule } from './modules/team-phrases/team-phrases.module.js';
import { PhraseProfilesModule } from './modules/phrase-profiles/phrase-profiles.module.js';
import { AutomationModule } from './modules/automation/automation.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: buildDatabaseConfig }),
    SettingsModule,
    DirectoryModule,
    SignatureTemplatesModule,
    SignatureRulesModule,
    SignaturesModule,
    GoogleIntegrationModule,
    SignatureApplicationsModule,
    TeamPhrasesModule,
    PhraseProfilesModule,
    AutomationModule,
    HealthModule,
  ],
})
export class AppModule {}
