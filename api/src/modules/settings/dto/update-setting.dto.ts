import { IsDefined } from 'class-validator';

export class UpdateSettingDTO {
  /** Formato depende da chave; a validação por chave fica no SettingsService. */
  @IsDefined({ message: 'value é obrigatório.' })
  value: unknown;
}
