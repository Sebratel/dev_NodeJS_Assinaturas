import { useCallback, useMemo, useRef, useState } from 'react';

/**
 * Mostra o HTML da assinatura isolado num iframe sem scripts (sandbox só com allow-same-origin, para medir).
 * Encolhe para caber na largura disponível e ajusta a altura ao conteúdo. Fundo sempre branco, como no Gmail.
 */
export function SignaturePreview({ html, title = 'Prévia da assinatura' }: { html: string; title?: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(180);
  const doc = useMemo(
    () =>
      `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#fff}body{padding:16px;display:inline-block}</style></head><body>${html}</body></html>`,
    [html],
  );

  const fit = useCallback(() => {
    const frame = frameRef.current;
    const body = frame?.contentDocument?.body;
    if (!frame || !body) return;
    body.style.zoom = '1';
    const scale = Math.min(1, frame.clientWidth / body.scrollWidth);
    body.style.zoom = String(scale);
    setHeight(Math.ceil(body.getBoundingClientRect().height * scale) + 4);
  }, []);

  return (
    <div className="overflow-hidden rounded-lg border border-outline-variant bg-white">
      <iframe ref={frameRef} title={title} sandbox="allow-same-origin" srcDoc={doc} onLoad={fit} style={{ height }} className="block w-full" />
    </div>
  );
}
