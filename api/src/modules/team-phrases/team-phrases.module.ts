import { Module } from '@nestjs/common';
import { DirectoryModule } from '../directory/directory.module.js';
import { PhraseImportsController } from './phrase-imports.controller.js';

@Module({
  imports: [DirectoryModule],
  controllers: [PhraseImportsController],
})
export class TeamPhrasesModule {}
