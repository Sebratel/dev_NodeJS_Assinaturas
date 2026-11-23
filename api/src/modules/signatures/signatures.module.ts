import { Module } from '@nestjs/common';
import { DirectoryModule } from '../directory/directory.module.js';
import { PhraseProfilesModule } from '../phrase-profiles/phrase-profiles.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { SignatureRulesModule } from '../signature-rules/signature-rules.module.js';
import { SignatureTemplatesModule } from '../signature-templates/signature-templates.module.js';
import { CollaboratorsController } from './collaborators.controller.js';
import { PhraseSimulationsController } from './phrase-simulations.controller.js';
import { ReportsController } from './reports.controller.js';
import { SignatureEngineService } from './signature-engine.service.js';
import { SignaturesService } from './signatures.service.js';
import { SimulationsController } from './simulations.controller.js';
import { TemplatePreviewsController } from './template-previews.controller.js';

@Module({
  imports: [DirectoryModule, SignatureRulesModule, SettingsModule, SignatureTemplatesModule, PhraseProfilesModule],
  controllers: [CollaboratorsController, ReportsController, SimulationsController, TemplatePreviewsController, PhraseSimulationsController],
  providers: [SignatureEngineService, SignaturesService],
  exports: [SignaturesService],
})
export class SignaturesModule {}
