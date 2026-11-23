import { ContactTypeEnum } from '../signature-rules/types/contact-type.enum.js';
import { TemplateRenderHelper } from '../signature-templates/template-render.helper.js';
import { SignatureContent } from './types/signature-evaluation.types.js';

/** Limite do Gmail para a assinatura. */
export const GMAIL_SIGNATURE_MAX_LENGTH = 10_000;

/** Liga o conteúdo decidido pelas regras às variáveis do modelo e gera o HTML final. */
export class SignatureTemplateHelper {
  static toVariables(content: SignatureContent, imageBaseUrl: string): Record<string, string> {
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
