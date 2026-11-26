import { ContactTypeEnum } from '../signature-rules/types/contact-type.enum.js';
import { VariableModeEnum } from '../signature-rules/types/variable-mode.enum.js';
import { OVERRIDABLE_VARIABLE_KEYS, TemplateRenderHelper } from '../signature-templates/template-render.helper.js';
import { SignatureContent } from './types/signature-evaluation.types.js';

/** Limite do Gmail para a assinatura. */
export const GMAIL_SIGNATURE_MAX_LENGTH = 10_000;

/** Liga o conteúdo decidido pelas regras às variáveis do modelo e gera o HTML final. */
export class SignatureTemplateHelper {
  /** Valores das variáveis, já com o que as regras esconderam ou trocaram. */
  static toVariables(content: SignatureContent, imageBaseUrl: string): Record<string, string> {
    const base = SignatureTemplateHelper.baseVariables(content, imageBaseUrl);
    const result = { ...base };
    for (const [key, choice] of Object.entries(content.overrides ?? {})) {
      if (!OVERRIDABLE_VARIABLE_KEYS.includes(key)) continue;
      // Texto da regra usa os valores originais: a ordem das trocas não muda o resultado.
      result[key] = choice.mode === VariableModeEnum.HIDE ? '' : TemplateRenderHelper.renderText(choice.text ?? '', base);
    }
    return result;
  }

  private static baseVariables(content: SignatureContent, imageBaseUrl: string): Record<string, string> {
    const isMobile = content.contactType === ContactTypeEnum.CORPORATE_MOBILE || content.contactType === ContactTypeEnum.INFORMED_MOBILE;
    return {
      nome: content.name,
      email: content.email,
      cargo: content.title,
      setor: content.sectorText,
      area: content.area,
      time: content.team,
      contato: content.contactText,
      contato_celular: isMobile ? content.contactText : '',
      contato_ramal: content.contactType === ContactTypeEnum.EXTENSION ? content.contactText : '',
      frase: content.phrase,
      telefone_0800: content.phone0800,
      empresa: content.company ?? '',
      departamento: content.department ?? '',
      segmento: content.segment ?? '',
      estado: content.state ?? '',
      escritorio: content.office ?? '',
      img: imageBaseUrl.replace(/\/?$/, '/'),
    };
  }

  static render(content: SignatureContent, imageBaseUrl: string, templateHtml: string): string {
    return SignatureTemplateHelper.minify(
      TemplateRenderHelper.render(templateHtml, SignatureTemplateHelper.toVariables(content, imageBaseUrl)),
    );
  }

  /**
   * Tira a indentação do modelo organizado (quebras de linha entre tags e nas bordas das células).
   * Espaço sem quebra de linha é mantido, então o que aparece na assinatura não muda; só não gasta o limite do Gmail.
   */
  static minify(html: string): string {
    return html
      .replace(/>\s*\n\s*</g, '><')
      .replace(/>\s*\n\s*/g, '>')
      .replace(/\s*\n\s*</g, '<')
      .replace(/\s*\n\s*/g, ' ')
      .trim();
  }
}
