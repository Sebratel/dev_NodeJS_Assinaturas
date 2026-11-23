import { useQuery } from '@tanstack/react-query'
import { Copy, Plus } from 'lucide-react'
import { useState } from 'react'
import { AppPageHeader } from '../../components/layout/AppPageHeader'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { queryKeys } from '../../services/query-keys'
import { signatureRuleService } from '../../services/signature-rule.service'
import { signatureTemplateService } from '../../services/signature-template.service'
import type { SignatureTemplate, SignatureTemplateInput } from '../../types/api'
import { formatRelative } from '../../utils/format'
import { TemplateEditor } from './TemplateEditor'

type EditorState = {
  template: SignatureTemplate | null
  initial: SignatureTemplateInput
} | null

/** Modelos de assinatura (layout HTML com variáveis). As regras escolhem qual usar; sem escolha, vale o padrão. */
export function TemplatesPage() {
  const templates = useQuery({
    queryKey: queryKeys.templates,
    queryFn: signatureTemplateService.list,
  })
  const rules = useQuery({
    queryKey: queryKeys.rules,
    queryFn: signatureRuleService.list,
  })
  const [editor, setEditor] = useState<EditorState>(null)

  const usage = new Map<string, number>()
  ;(rules.data ?? [])
    .filter((r) => r.active && r.outputs.templateId)
    .forEach((r) =>
      usage.set(
        r.outputs.templateId!,
        (usage.get(r.outputs.templateId!) ?? 0) + 1
      )
    )
  const defaultTemplate = templates.data?.find((t) => t.isDefault)

  const duplicate = (source: SignatureTemplate) =>
    setEditor({
      template: null,
      initial: {
        name: `${source.name} (cópia)`,
        description: source.description,
        html: source.html,
        isDefault: false,
      },
    })

  return (
    <div className="grid gap-4">
      <AppPageHeader
        description={
          <>
            O layout da assinatura. As regras escolhem qual usar; sem escolha,
            vale o <strong className="text-on-surface">padrão</strong>.
          </>
        }
        actions={
          <Button
            variant="primary"
            icon={<Plus className="size-4" />}
            disabled={!defaultTemplate}
            onClick={() => defaultTemplate && duplicate(defaultTemplate)}
          >
            Novo modelo
          </Button>
        }
      />

      {templates.isLoading && <LoadingState />}
      {templates.isError && (
        <ErrorState
          error={templates.error}
          onRetry={() => templates.refetch()}
        />
      )}
      {templates.data && (
        <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-low text-left text-[10.5px] uppercase tracking-wide text-on-surface-variant">
                <th className="px-3 py-2 font-semibold">Modelo</th>
                <th className="px-3 py-2 font-semibold">Uso</th>
                <th className="px-3 py-2 font-semibold">Alterado</th>
                <th className="w-28 px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {templates.data.map((template) => (
                <tr
                  key={template.id}
                  className="cursor-pointer align-top hover:bg-surface-container-low"
                  onClick={() =>
                    setEditor({
                      template,
                      initial: {
                        name: template.name,
                        description: template.description,
                        html: template.html,
                        isDefault: template.isDefault,
                      },
                    })
                  }
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5 font-medium">
                      {template.name}
                      {template.isDefault && <Badge tone="brand">Padrão</Badge>}
                    </div>
                    {template.description && (
                      <div className="text-xs text-on-surface-variant">
                        {template.description}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-on-surface-variant">
                    {template.isDefault
                      ? 'Todos sem regra de modelo'
                      : `${usage.get(template.id) ?? 0} regra(s) ativa(s)`}
                  </td>
                  <td className="px-3 py-2 text-on-surface-variant">
                    {formatRelative(template.updatedAt)}
                  </td>
                  <td
                    className="px-3 py-2 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Copy className="size-3.5" />}
                      onClick={() => duplicate(template)}
                    >
                      Duplicar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editor && (
        <TemplateEditor
          key={editor.template?.id ?? 'new'}
          template={editor.template}
          initial={editor.initial}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  )
}
