import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ContactTypeEnum } from '../types/contact-type.enum.js';
import { PhraseModeEnum } from '../types/phrase-mode.enum.js';
import { SectorLabelEnum } from '../types/sector-label.enum.js';

export class RuleOutputsDTO {
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
}
