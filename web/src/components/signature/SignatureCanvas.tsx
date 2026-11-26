import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../utils/cn'

const MEASURE_WIDTH = 1400

/** Onde uma variável caiu na assinatura (coordenadas do HTML, antes da escala). */
interface Mark {
  key: string
  x: number
  y: number
  w: number
  h: number
  empty: boolean
}

interface SignatureCanvasProps {
  /** HTML marcado pela API (`<span data-sig-var="cargo">`). */
  html: string
  title: string
  /** Variável em destaque (linha em foco no editor). */
  activeVar: string | null
  /** Número de cada variável (ordem no modelo), igual ao da lista do editor. */
  numbers: Record<string, number>
  /** Mostra o número em todas as marcas (mapa do modelo); senão só na ativa. */
  showNumbers?: boolean
  onHover?: (key: string | null) => void
  onSelect?: (key: string) => void
}

/**
 * Assinatura num iframe sem scripts, encolhida para caber, com uma marca por cima de cada variável:
 * contorno tracejado em todas, destaque na ativa, clique leva à linha da variável no editor.
 * As marcas ficam fora do iframe (camada por cima), medidas com getBoundingClientRect dos spans marcados.
 */
export function SignatureCanvas({
  html,
  title,
  activeVar,
  numbers,
  showNumbers = false,
  onHover,
  onSelect,
}: SignatureCanvasProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [size, setSize] = useState({ width: 0, height: 160, scale: 1 })
  const [marks, setMarks] = useState<Mark[]>([])
  const doc = useMemo(
    () =>
      `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#fff;overflow:hidden}body{padding:16px;display:inline-block}</style></head><body>${html}</body></html>`,
    [html]
  )

  const measure = useCallback(() => {
    const frame = frameRef.current
    const document = frame?.contentDocument
    const body = document?.body
    const box = boxRef.current
    if (!frame || !document || !body || !box) return
    frame.style.width = `${MEASURE_WIDTH}px`
    const width = Math.ceil(body.scrollWidth)
    const height = Math.ceil(body.scrollHeight)
    frame.style.width = `${width}px`
    const scale = Math.min(1, box.clientWidth / Math.max(1, width))
    setSize((current) =>
      current.width === width &&
      current.height === height &&
      Math.abs(current.scale - scale) < 0.001
        ? current
        : { width, height, scale }
    )
    const found = [
      ...document.querySelectorAll<HTMLElement>('[data-sig-var]'),
    ].map((el) => {
      const rect = el.getBoundingClientRect()
      return {
        key: el.dataset.sigVar ?? '',
        x: rect.left,
        y: rect.top,
        w: rect.width,
        h: rect.height || 14,
        empty: el.hasAttribute('data-sig-empty'),
      }
    })
    setMarks(found.filter((m) => m.key))
  }, [])

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    let lastWidth = box.clientWidth
    const observer = new ResizeObserver(() => {
      if (box.clientWidth === lastWidth) return
      lastWidth = box.clientWidth
      measure()
    })
    observer.observe(box)
    return () => observer.disconnect()
  }, [measure])

  const { scale } = size
  return (
    <div
      ref={boxRef}
      className="relative overflow-hidden rounded-xl border border-outline-variant bg-white"
      style={{ height: Math.ceil(size.height * scale) }}
    >
      <iframe
        ref={frameRef}
        title={title}
        sandbox="allow-same-origin"
        srcDoc={doc}
        onLoad={measure}
        scrolling="no"
        style={{
          width: size.width || MEASURE_WIDTH,
          height: size.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          border: 0,
          display: 'block',
        }}
      />
      <div className="pointer-events-none absolute inset-0">
        {marks.map((m, index) => {
          const active = m.key === activeVar
          const number = numbers[m.key]
          const top = m.y * scale
          return (
            <button
              key={`${m.key}-${index}`}
              type="button"
              aria-label={`{{${m.key}}}${m.empty ? ', vazia' : ''}`}
              title={`{{${m.key}}}${m.empty ? ' · vazia nesta assinatura' : ''}`}
              onMouseEnter={() => onHover?.(m.key)}
              onMouseLeave={() => onHover?.(null)}
              onFocus={() => onHover?.(m.key)}
              onBlur={() => onHover?.(null)}
              onClick={() => onSelect?.(m.key)}
              className={cn(
                'pointer-events-auto absolute rounded-[3px] transition focus-visible:outline-none',
                active
                  ? 'z-10 border-2 border-primary-ink bg-primary/15'
                  : 'border border-dashed border-primary-ink/35 hover:border-primary-ink hover:bg-primary/10',
                m.empty && 'bg-primary/25'
              )}
              style={{
                left: m.x * scale - 2,
                top: top - 1,
                width: Math.max(m.w * scale + 4, 6),
                height: m.h * scale + 2,
              }}
            >
              {(showNumbers || active) && number && (
                <span className="absolute -left-2 -top-2 grid size-4 place-items-center rounded-full bg-primary-ink text-[9px] font-bold leading-none text-white">
                  {number}
                </span>
              )}
              {active && (
                <span
                  className={cn(
                    'absolute left-0 whitespace-nowrap rounded bg-neutral-900 px-1.5 py-0.5 font-mono text-[10px] leading-none text-white',
                    top < 22 ? 'top-full mt-1' : 'bottom-full mb-1'
                  )}
                >
                  {`{{${m.key}}}`}
                  {m.empty ? ' · vazia' : ''}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
