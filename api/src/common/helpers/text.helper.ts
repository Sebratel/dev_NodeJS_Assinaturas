/** Funções puras de texto usadas para comparar valores vindos do AD (grafias variam muito). */
export class TextHelper {
  /** Minúsculas, sem acento e com espaços colapsados: "Suporte  Técnico" → "suporte tecnico". */
  static normalize(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  static isBlank(value: unknown): boolean {
    return TextHelper.normalize(value) === '';
  }

  /** Telefone brasileiro: 11 dígitos → (51) 99999-0000; 10 dígitos → (51) 3333-0000; senão devolve como veio. */
  static formatPhone(value: unknown): string {
    const raw = String(value ?? '').trim();
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length > 11) digits = digits.slice(2);
    if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return raw;
  }

  static escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
