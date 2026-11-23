import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ContactTypeEnum } from '../types/contact-type.enum.js';
import { Phone0800ModeEnum } from '../types/phone0800-mode.enum.js';
import { PhraseModeEnum } from '../types/phrase-mode.enum.js';
import { SectorLabelEnum } from '../types/sector-label.enum.js';

export class RuleOutputsDTO {
  @IsOptional()
  @IsEnum(Phone0800ModeEnum)
  phone0800Mode?: Phone0800ModeEnum | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone0800?: string | null;

  @IsOptional()
  @IsEnum(ContactTypeEnum)
  contact?: ContactTypeEnum | null;

  @IsOptional()
  @IsEnum(SectorLabelEnum)
  sectorLabel?: SectorLabelEnum | null;

  @IsOptional()
  @IsEnum(PhraseModeEnum)
  phraseMode?: PhraseModeEnum | null;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  phraseText?: string | null;

  @IsOptional()
  @IsUUID('all')
  templateId?: string | null;
}
