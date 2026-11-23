import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsString, MaxLength, ValidateNested } from 'class-validator';

export class PhraseImportRowDTO {
  @IsString()
  @MaxLength(160)
  team: string;

  @IsString()
  @MaxLength(300)
  phrase: string;
}

export class PreviewPhraseImportDTO {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => PhraseImportRowDTO)
  rows: PhraseImportRowDTO[];
}
