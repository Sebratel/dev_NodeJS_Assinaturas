import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const MEASURE_WIDTH = 1400;

/**
 * Mostra o HTML da assinatura isolado num iframe sem scripts (sandbox só com allow-same-origin, para medir).
 * Mede o tamanho natural e encolhe o iframe inteiro (transform) para caber na largura disponível, sem
 * barras de rolagem. Fundo sempre branco, como no Gmail.
 */
export function SignaturePreview({ html, title = 'Prévia da assinatura' }: { html: string; title?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [size, setSize] = useState({ width: 0, height: 160, scale: 1 });
  const doc = useMemo(
    () =>
      `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#fff;overflow:hidden}body{padding:16px;display:inline-block}</style></head><body>${html}</body></html>`,
    [html],
  );

  const fit = useCallback(() => {
    const frame = frameRef.current;
    const body = frame?.contentDocument?.body;
    const box = boxRef.current;
    if (!frame || !body || !box) return;
    // Mede com bastante largura, para o texto não quebrar como quebraria numa tela estreita.
    frame.style.width = `${MEASURE_WIDTH}px`;
    const width = Math.ceil(body.scrollWidth);
    const height = Math.ceil(body.scrollHeight);
    frame.style.width = `${width}px`;
    setSize({ width, height, scale: Math.min(1, box.clientWidth / Math.max(1, width)) });
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [fit]);

  return (
    <div ref={boxRef} className="overflow-hidden rounded-2xl border border-outline-variant bg-white" style={{ height: Math.ceil(size.height * size.scale) }}>
      <iframe
        ref={frameRef}
        title={title}
        sandbox="allow-same-origin"
        srcDoc={doc}
        onLoad={fit}
        scrolling="no"
        style={{
          width: size.width || MEASURE_WIDTH,
          height: size.height,
          transform: `scale(${size.scale})`,
          transformOrigin: 'top left',
          border: 0,
          display: 'block',
        }}
      />
    </div>
  );
}
