import { describe, expect, it } from 'vitest';
import { DEFAULT_TEMPLATE } from './default-signature-template.js';
import { TemplateRenderHelper } from './template-render.helper.js';

describe('TemplateRenderHelper', () => {
  it('escapa o texto vindo do AD (nunca vira HTML)', () => {
    expect(TemplateRenderHelper.render('<b>{{nome}}</b>', { nome: '<script>x</script> & "y"' })).toBe(
      '<b>&lt;script&gt;x&lt;/script&gt; &amp; &quot;y&quot;</b>',
    );
  });

  it('mostra bloco {{#x}} só com valor e {{^x}} só sem valor, inclusive aninhados', () => {
    const tpl = '{{setor}}{{#setor}}{{#cargo}} | {{/cargo}}{{/setor}}{{cargo}}{{^frase}}-sem frase-{{/frase}}';
    expect(TemplateRenderHelper.render(tpl, { setor: 'Suporte', cargo: 'Operador', frase: '' })).toBe('Suporte | Operador-sem frase-');
    expect(TemplateRenderHelper.render(tpl, { setor: '', cargo: 'Operador', frase: 'Oi' })).toBe('Operador');
  });

  it('qualquer nome de variável vale; sem valor vira vazio; variablesOf lista as do modelo sem {{img}}', () => {
    expect(TemplateRenderHelper.render('[{{TESTE}}]', {})).toBe('[]');
    expect(TemplateRenderHelper.validate('{{TESTE}} {{#cargo}}{{cargo}}{{/cargo}}')).toEqual([]);
    expect(TemplateRenderHelper.variablesOf('<img src="{{img}}x.png">{{#cargo}}{{cargo}}{{/cargo}} {{TESTE}}')).toEqual(['cargo', 'TESTE']);
  });

  it('annotate marca a variável que cai em texto (vazia também) e deixa atributo intacto', () => {
    const tpl = '<a href="mailto:{{email}}">{{email}}</a>{{#cargo}}<b>{{cargo}}</b>{{/cargo}}<i>{{setor}}</i>';
    expect(TemplateRenderHelper.render(tpl, { email: 'a@b', cargo: 'Analista', setor: '' }, { annotate: true })).toBe(
      '<a href="mailto:a@b"><span data-sig-var="email">a@b</span></a><b><span data-sig-var="cargo">Analista</span></b>' +
        '<i><span data-sig-var="setor" data-sig-empty="1"></span></i>',
    );
  });

  it('acusa bloco aberto sem fechar e fechamento trocado', () => {
    expect(TemplateRenderHelper.validate('{{#frase}}a')).toContain('Bloco {{#frase}} sem {{/frase}}.');
    expect(TemplateRenderHelper.validate('{{#frase}}{{/nome}}').length).toBeGreaterThan(0);
  });

  it('recusa script e eventos', () => {
    expect(TemplateRenderHelper.validate('<img src=x onerror=alert(1)>').length).toBe(1);
    expect(TemplateRenderHelper.validate('<script>alert(1)</script>').length).toBe(1);
  });

  it('o modelo padrão é válido e não deixa marcação sobrando', () => {
    expect(TemplateRenderHelper.validate(DEFAULT_TEMPLATE.html)).toEqual([]);
    const html = TemplateRenderHelper.render(DEFAULT_TEMPLATE.html, {
      nome: 'Fulano',
      cargo: 'Analista',
      setor: 'Suporte',
      contato_ramal: 'Ramal 4021',
      frase: 'Oi',
      telefone_0800: '0800 655 1000',
      img: 'https://x/',
    });
    expect(html).not.toMatch(/\{\{|\}\}/);
    expect(html).toContain('Ramal 4021');
    expect(html).not.toContain('icone-whatsapp');
    expect(html).toContain('https://x/assinatura-email_logo-com-slogan_layout1.png');
  });
});
