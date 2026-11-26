import { IMAGE_VARIABLE, TemplateRenderHelper } from '../signature-templates/template-render.helper.js';
import { SignatureContent } from './types/signature-evaluation.types.js';

/** Limite do Gmail para a assinatura. */
export const GMAIL_SIGNATURE_MAX_LENGTH = 10_000;

/** Liga os valores decididos pelas regras às variáveis do modelo e gera o HTML final. */
export class SignatureTemplateHelper {
  /** Valores das variáveis + {{img}} (endereço base das imagens, sempre terminando em /). */
  static toVariables(content: SignatureContent, imageBaseUrl: string): Record<string, string> {
    return { ...content.values, [IMAGE_VARIABLE]: imageBaseUrl.replace(/\/?$/, '/') };
  }

  /** `annotate`: marca onde cada variável cai (só para a tela; ver TemplateRenderHelper.render). */
  static render(content: SignatureContent, imageBaseUrl: string, templateHtml: string, options: { annotate?: boolean } = {}): string {
    return SignatureTemplateHelper.minify(
      TemplateRenderHelper.render(templateHtml, SignatureTemplateHelper.toVariables(content, imageBaseUrl), options),
    );
  }

  /**
   * Mapa do modelo: cada variável aparece com o próprio nome ({{cargo}}) no lugar onde fica, com todos os blocos
   * {{#…}} abertos. Mostra a estrutura sem depender de uma pessoa.
   */
  static renderMap(imageBaseUrl: string, templateHtml: string): string {
    const values = Object.fromEntries(TemplateRenderHelper.variablesOf(templateHtml).map((key) => [key, `{{${key}}}`]));
    return SignatureTemplateHelper.render({ values, fieldsUsed: [] }, imageBaseUrl, templateHtml, { annotate: true });
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
