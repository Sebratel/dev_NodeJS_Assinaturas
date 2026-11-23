import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module.js';
import { GmailSignatureClient } from './gmail-signature.client.js';
import { GoogleCredentialsService } from './google-credentials.service.js';
import { GoogleIntegrationController } from './google-integration.controller.js';

@Module({
  imports: [SettingsModule],
  controllers: [GoogleIntegrationController],
  providers: [GoogleCredentialsService, GmailSignatureClient],
  exports: [GoogleCredentialsService, GmailSignatureClient],
})
export class GoogleIntegrationModule {}
