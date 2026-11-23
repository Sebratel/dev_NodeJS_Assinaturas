import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { VALUELESS_OPERATORS } from '../signature-rules/types/rule-operator.enum.js';
import { SavePhraseProfileDTO } from './dto/save-phrase-profile.dto.js';
import { PhraseProfileEntity } from './entities/phrase-profile.entity.js';
import { PhraseProfile } from './types/phrase-profile.types.js';

@Injectable()
export class PhraseProfilesService {
  constructor(@InjectRepository(PhraseProfileEntity) private readonly profileRepository: Repository<PhraseProfileEntity>) {}

  findAll(): Promise<PhraseProfileEntity[]> {
    return this.profileRepository.find({ order: { priority: 'DESC', name: 'ASC' } });
  }

  async findAllForEngine(): Promise<PhraseProfile[]> {
    return (await this.findAll()).map(({ id, name, priority, active, conditions, phrase }) => ({ id, name, priority, active, conditions, phrase }));
  }

  async findOne(id: string): Promise<PhraseProfileEntity> {
    const profile = await this.profileRepository.findOneBy({ id });
    if (!profile) throw new BusinessException('PHRASE_PROFILE_NOT_FOUND', 'Perfil de frase não encontrado.', HttpStatus.NOT_FOUND);
    return profile;
  }

  async create(dto: SavePhraseProfileDTO): Promise<PhraseProfileEntity> {
    return this.profileRepository.save(this.profileRepository.create(PhraseProfilesService.clean(dto)));
  }

  async update(id: string, dto: SavePhraseProfileDTO): Promise<PhraseProfileEntity> {
    const profile = await this.findOne(id);
    return this.profileRepository.save(Object.assign(profile, PhraseProfilesService.clean(dto)));
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.profileRepository.softDelete({ id });
  }

  /** Valida o que o formato não pega e normaliza. Também usada pela simulação. */
  static clean(dto: SavePhraseProfileDTO): Omit<PhraseProfile, 'id'> {
    const problems: Array<{ field?: string; message: string }> = [];
    dto.conditions.forEach((c, i) => {
      if (!VALUELESS_OPERATORS.includes(c.operator) && !c.values.some((v) => v.trim())) {
        problems.push({ field: `conditions[${i}].values`, message: 'informe pelo menos um valor.' });
      }
    });
    if (!dto.phrase.trim()) problems.push({ field: 'phrase', message: 'a frase é obrigatória.' });
    if (problems.length) throw new BusinessException('PHRASE_PROFILE_INVALID', 'Perfil de frase inconsistente.', HttpStatus.BAD_REQUEST, problems);
    return {
      name: dto.name.trim(),
      priority: dto.priority,
      active: dto.active,
      conditions: dto.conditions.map((c) => ({
        field: c.field,
        operator: c.operator,
        values: VALUELESS_OPERATORS.includes(c.operator) ? [] : c.values.map((v) => v.trim()).filter(Boolean),
      })),
      phrase: dto.phrase.trim(),
    };
  }
}
