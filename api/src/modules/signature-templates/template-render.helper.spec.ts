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

  it('variável que não existe vira vazio na renderização e problema na validação', () => {
    expect(TemplateRenderHelper.render('[{{xpto}}]', {})).toBe('[]');
    expect(TemplateRenderHelper.validate('{{xpto}}')).toEqual(['Variável desconhecida: {{xpto}}.']);
  });

  it('acusa bloco aberto sem fechar e fechamento trocado', () => {
    expect(TemplateRenderHelper.validate('{{#frase}}a')).toContain('Bloco {{#frase}} sem {{/frase}}.');
    expect(TemplateRenderHelper.validate('{{#frase}}{{/nome}}').length).toBeGreaterThan(0);
  });

  it('recusa script e eventos', () => {
    expect(TemplateRenderHelper.validate('<img src=x onerror=alert(1)>').length).toBe(1);
    expect(TemplateRenderHelper.validate('<script>alert(1)</script>').length).toBe(1);
  });

  it('texto de variável trocada: valores crus, espaços recolhidos; só {{variavel}} conhecida', () => {
    expect(TemplateRenderHelper.renderText('{{time}}  {{empresa}} ', { time: '', empresa: 'Sebratel' })).toBe('Sebratel');
    expect(TemplateRenderHelper.validateText('{{cargo}} · {{empresa}}')).toEqual([]);
    expect(TemplateRenderHelper.validateText('{{xpto}}')).toEqual(['Variável desconhecida: {{xpto}}.']);
    expect(TemplateRenderHelper.validateText('{{#cargo}}x{{/cargo}}')).toHaveLength(2);
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
