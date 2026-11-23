import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhraseProfileEntity } from './entities/phrase-profile.entity.js';
import { PhraseProfilesController } from './phrase-profiles.controller.js';
import { PhraseProfilesService } from './phrase-profiles.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([PhraseProfileEntity])],
  controllers: [PhraseProfilesController],
  providers: [PhraseProfilesService],
  exports: [PhraseProfilesService],
})
export class PhraseProfilesModule {}
