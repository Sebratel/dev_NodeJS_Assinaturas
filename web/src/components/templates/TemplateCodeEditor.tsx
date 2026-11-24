import { html } from '@codemirror/lang-html'
import CodeMirror, {
  EditorView,
  type ReactCodeMirrorRef,
} from '@uiw/react-codemirror'
import { forwardRef, useImperativeHandle, useRef } from 'react'

export interface TemplateCodeEditorHandle {
  /** Insere texto onde está o cursor (ou no lugar da seleção). */
  insert: (text: string) => void
}

interface TemplateCodeEditorProps {
  value: string
  onChange: (value: string) => void
  /** Perfil sem permissão de editar: dá para ler e copiar, não para mudar. */
  readOnly?: boolean
}

const EXTENSIONS = [html(), EditorView.lineWrapping]

/** Editor de HTML do modelo: cores, números de linha, indentação automática. */
export const TemplateCodeEditor = forwardRef<
  TemplateCodeEditorHandle,
  TemplateCodeEditorProps
>(function TemplateCodeEditor({ value, onChange, readOnly = false }, ref) {
  const editorRef = useRef<ReactCodeMirrorRef>(null)
  useImperativeHandle(ref, () => ({
    insert: (text: string) => {
      const view = editorRef.current?.view
      if (!view) return onChange(value + text)
      view.dispatch(view.state.replaceSelection(text))
      view.focus()
    },
  }))
  const dark =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark')

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant text-xs">
      <CodeMirror
        ref={editorRef}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        editable={!readOnly}
        extensions={EXTENSIONS}
        theme={dark ? 'dark' : 'light'}
        height="460px"
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          tabSize: 2,
        }}
        aria-label="HTML do modelo"
      />
    </div>
  )
})
