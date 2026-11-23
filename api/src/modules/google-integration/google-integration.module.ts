import { Module } from '@nestjs/common';
import { GmailSignatureClient } from './gmail-signature.client.js';
import { GoogleCredentialsService } from './google-credentials.service.js';
import { GoogleIntegrationController } from './google-integration.controller.js';

@Module({
  controllers: [GoogleIntegrationController],
  providers: [GoogleCredentialsService, GmailSignatureClient],
  exports: [GoogleCredentialsService, GmailSignatureClient],
})
export class GoogleIntegrationModule {}
