import { Injectable } from '@nestjs/common';
import { GMAIL_SETTINGS_SCOPE, GoogleCredentialsService } from './google-credentials.service.js';

export interface SendAsAddress {
  sendAsEmail: string;
  isPrimary: boolean;
  signature: string;
}

const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs';

/** Lê e grava a assinatura do Gmail agindo como o próprio colaborador (delegação em todo o domínio). */
@Injectable()
export class GmailSignatureClient {
  constructor(private readonly credentials: GoogleCredentialsService) {}

  async listSendAs(userEmail: string): Promise<SendAsAddress[]> {
    const client = this.credentials.clientFor(userEmail, GMAIL_SETTINGS_SCOPE);
    const response = await client.request<{ sendAs?: Array<{ sendAsEmail: string; isPrimary?: boolean; signature?: string }> }>({ url: BASE });
    return (response.data.sendAs ?? []).map((s) => ({ sendAsEmail: s.sendAsEmail, isPrimary: Boolean(s.isPrimary), signature: s.signature ?? '' }));
  }

  async getPrimary(userEmail: string): Promise<SendAsAddress> {
    const list = await this.listSendAs(userEmail);
    const primary = list.find((s) => s.isPrimary) ?? list.find((s) => s.sendAsEmail.toLowerCase() === userEmail.toLowerCase());
    if (!primary) throw new Error(`Gmail não devolveu o endereço principal de ${userEmail}.`);
    return primary;
  }

  /** Devolve a assinatura como o Gmail gravou (ele normaliza o HTML). */
  async updateSignature(userEmail: string, sendAsEmail: string, signature: string): Promise<string> {
    const client = this.credentials.clientFor(userEmail, GMAIL_SETTINGS_SCOPE);
    const response = await client.request<{ signature?: string }>({
      url: `${BASE}/${encodeURIComponent(sendAsEmail)}`,
      method: 'PATCH',
      data: { signature },
    });
    return response.data.signature ?? '';
  }
}
