import { Module } from '@nestjs/common';
import { DirectoryModule } from '../directory/directory.module.js';
import { GoogleIntegrationModule } from '../google-integration/google-integration.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { SignatureApplicationsModule } from '../signature-applications/signature-applications.module.js';
import { SignaturesModule } from '../signatures/signatures.module.js';
import { AutoApplyService } from './auto-apply.service.js';
import { AutomationController } from './automation.controller.js';

@Module({
  imports: [DirectoryModule, SignaturesModule, SignatureApplicationsModule, SettingsModule, GoogleIntegrationModule],
  controllers: [AutomationController],
  providers: [AutoApplyService],
})
export class AutomationModule {}
