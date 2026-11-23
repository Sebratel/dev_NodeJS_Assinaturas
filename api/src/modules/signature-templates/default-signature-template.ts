/**
 * Modelo inicial: o layout do protótipo "Assinaturas Sebratel" (logo + 0800 | nome, setor e cargo, contato,
 * frase, redes | selo GPTW). Tabelas e estilo inline porque é o que o Gmail respeita.
 */
const FONT = "font-family:'Poppins','Arial Rounded MT Bold',Verdana,Arial,Helvetica,sans-serif;";
const BAR =
  '<td width="2" style="width:2px; background-color:#FDE852; padding:0; font-size:0; line-height:0;"><div style="width:2px; min-height:120px; background-color:#FDE852; font-size:0; line-height:0;">&#8203;</div></td>';
const PHONE = `font-size:13px; color:#7F8081; ${FONT} vertical-align:middle; white-space:nowrap;`;
const link = (icon: string, href: string, label: string, last = false) =>
  `<td style="padding-right:4px; vertical-align:middle;"><img src="{{img}}${icon}.png" width="9" height="9" alt="" style="display:block; width:9px; height:9px;"></td><td style="${last ? '' : 'padding-right:14px; '}vertical-align:middle;"><a href="${href}" style="font-size:11px; color:#BFBFBE; ${FONT} text-decoration:none;">${label}</a></td>`;

export const DEFAULT_TEMPLATE = {
  name: 'Padrão Sebratel com selo GPTW',
  description: 'Layout do protótipo: logo e 0800 à esquerda, dados no meio, selo GPTW à direita.',
  html: [
    `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; ${FONT}"><tr>`,
    `<td style="padding:0 22px 0 0; vertical-align:middle;"><table cellpadding="0" cellspacing="0" border="0">`,
    `<tr><td align="center"><img src="{{img}}assinatura-email_logo-com-slogan_layout1.png" width="150" alt="Sebratel" style="display:block; width:150px; margin:0 auto;"></td></tr>`,
    `{{#telefone_0800}}<tr><td align="center" style="text-align:center; padding-top:8px; font-size:16px; font-weight:800; color:#636361; ${FONT} white-space:nowrap;">{{telefone_0800}}</td></tr>{{/telefone_0800}}`,
    `</table></td>`,
    BAR,
    `<td style="padding:0 24px; vertical-align:middle;"><table cellpadding="0" cellspacing="0" border="0">`,
    `<tr><td style="font-size:24px; font-weight:800; color:#636361; ${FONT} padding-bottom:2px; white-space:nowrap;">{{nome}}</td></tr>`,
    `<tr><td style="font-size:14px; font-weight:bold; color:#7F8081; ${FONT} padding-bottom:10px;">{{setor}}{{#setor}}{{#cargo}} &nbsp;|&nbsp; {{/cargo}}{{/setor}}{{cargo}}</td></tr>`,
    `{{#contato_celular}}<tr><td style="padding-bottom:8px;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right:6px; vertical-align:middle;"><img src="{{img}}assinatura-email_icone-whatsapp.png" width="13" height="13" alt="" style="display:block; width:13px; height:13px;"></td><td style="${PHONE}">{{contato_celular}}</td></tr></table></td></tr>{{/contato_celular}}`,
    `{{#contato_ramal}}<tr><td style="padding-bottom:8px;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="${PHONE}">{{contato_ramal}}</td></tr></table></td></tr>{{/contato_ramal}}`,
    `{{#frase}}<tr><td style="padding-bottom:10px; font-size:14px; font-weight:bold; color:#7F8081; ${FONT} max-width:320px;">{{frase}}</td></tr>{{/frase}}`,
    `<tr><td style="padding-top:4px;"><table cellpadding="0" cellspacing="0" border="0"><tr>`,
    link('assinatura-email_icone-site', 'https://www.sebratel.com.br', 'sebratel.com.br'),
    link('assinatura-email_icone-instagram', 'https://www.instagram.com/sebrateltelecom', 'sebrateltelecom'),
    link('assinatura-email_icone-linkedin', 'https://www.linkedin.com/company/sebratel-empresas', 'sebratel', true),
    `</tr></table></td></tr></table></td>`,
    BAR,
    `<td style="padding:0 0 0 22px; vertical-align:middle;"><img src="{{img}}assinatura-email_selo-gptw_layout1.png" width="128" alt="GPTW" style="display:block; width:128px;"></td>`,
    `</tr></table>`,
  ].join('\n'),
};
