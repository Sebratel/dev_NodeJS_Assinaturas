import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PreviewTemplateDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30_000)
  html: string;

  @IsString()
  @IsNotEmpty({ message: 'Escolha um colaborador para a prévia.' })
  collaboratorId: string;
}
