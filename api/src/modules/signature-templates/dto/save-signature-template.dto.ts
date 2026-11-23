import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveSignatureTemplateDTO {
  @IsString()
  @IsNotEmpty({ message: 'name é obrigatório.' })
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsString()
  @IsNotEmpty({ message: 'html é obrigatório.' })
  @MaxLength(30_000)
  html: string;

  @IsBoolean()
  isDefault: boolean;
}
