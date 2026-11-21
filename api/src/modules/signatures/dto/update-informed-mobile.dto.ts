import { IsString, MaxLength } from 'class-validator';

export class UpdateInformedMobileDTO {
  /** Vazio apaga o celular informado. */
  @IsString()
  @MaxLength(20)
  informedMobile: string;
}
