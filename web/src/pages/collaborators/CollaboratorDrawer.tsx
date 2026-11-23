import { useQuery } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApplyDialog } from '../../components/signature/ApplyDialog';
import { DecisionList } from '../../components/signature/DecisionList';
import { SignaturePreview } from '../../components/signature/SignaturePreview';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { useApplyScope } from '../../hooks/useApplyScope';
import { collaboratorService } from '../../services/collaborator.service';
import { queryKeys } from '../../services/query-keys';
import { googleIntegrationService } from '../../services/report.service';
import { formatNumber } from '../../utils/format';
import { LEVEL_LABELS } from '../../utils/labels';
import { ApplicationHistory } from './ApplicationHistory';
import { InformedMobileForm } from './InformedMobileForm';

const SEVERITY_TONE = { ERROR: 'warning', WARNING: 'warning', INFO: 'neutral' } as const;

export function CollaboratorDrawer({ collaboratorId, onClose }: { collaboratorId: string | null; onClose: () => void }) {
  const signature = useQuery({
    queryKey: queryKeys.collaborator(collaboratorId ?? ''),
    queryFn: () => collaboratorService.getSignature(collaboratorId!),
    enabled: Boolean(collaboratorId),
  });
  const google = useQuery({ queryKey: queryKeys.googleIntegration, queryFn: googleIntegrationService.status });
  const applyScope = useApplyScope();
  const [applying, setApplying] = useState(false);
  useEffect(() => setApplying(false), [collaboratorId]);

  const data = signature.data;
  const person = data?.collaborator;
  const evaluation = data?.evaluation;

  return (
    <>
      <Drawer
        open={Boolean(collaboratorId)}
        onClose={onClose}
        width="lg"
        title={person?.name ?? 'Colaborador'}
        subtitle={person ? `${person.email} · ${person.title || 'sem cargo no AD'}` : undefined}
        footer={
          <>
            {person && applyScope.scope.mode === 'LIST' && (
              <label className="mr-auto flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--color-primary)]"
                  checked={applyScope.inList(person.email)}
                  disabled={applyScope.save.isPending}
                  onChange={() => applyScope.toggleEmail(person.email)}
                />
                Na lista de teste
                <span className="text-xs text-on-surface-variant">(pode receber gravação)</span>
              </label>
            )}
            <Button
              variant="primary"
              icon={<Mail className="size-4" />}
              disabled={!google.data?.applyEnabled || !data}
              title={google.data?.applyEnabled ? undefined : 'Google não autorizado. Veja Configurações › Google.'}
              onClick={() => setApplying(true)}
            >
              Aplicar no Gmail
            </Button>
          </>
        }
      >
        {signature.isLoading && <LoadingState />}
        {signature.isError && <ErrorState error={signature.error} onRetry={() => signature.refetch()} />}
        {data && person && evaluation && (
          <div className="grid gap-4 animate-fade-in-up motion-reduce:animate-none">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={evaluation.status} />
              <Badge>{LEVEL_LABELS[person.level]}</Badge>
              <Badge>{person.area || 'sem área'}</Badge>
              <Badge>{person.team || 'sem time'}</Badge>
              <span className="ml-auto text-xs tabular-nums text-on-surface-variant">
                {formatNumber(data.htmlLength)} de {formatNumber(data.gmailLimit)} caracteres do Gmail
              </span>
            </div>

            <SignaturePreview html={data.html} />

            {evaluation.issues.filter((i) => i.severity !== 'INFO').length > 0 && (
              <ul className="grid gap-1.5">
                {evaluation.issues
                  .filter((i) => i.severity !== 'INFO')
                  .map((issue) => (
                    <li key={issue.code + issue.message}>
                      <Badge tone={SEVERITY_TONE[issue.severity]} className="whitespace-normal py-1 text-xs">
                        {issue.message}
                      </Badge>
                    </li>
                  ))}
              </ul>
            )}

            {evaluation.content.contactType === 'INFORMED_MOBILE' && <InformedMobileForm collaboratorId={person.id} current={person.informedMobile} />}

            <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
              <h3 className="border-b border-outline-variant px-3 py-2 text-sm font-semibold">Por que saiu assim</h3>
              <DecisionList evaluation={evaluation} templateName={data.template.fallback ? `${data.template.name} (o da regra foi excluído)` : data.template.name} />
            </section>

            <ApplicationHistory collaboratorId={person.id} />

            <details className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm">
              <summary className="cursor-pointer font-medium">Dados lidos do AD</summary>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                {[
                  ['Login', person.login],
                  ['Departamento', person.department],
                  ['Empresa', person.company],
                  ['Segmento', person.segment],
                  ['0800 (Telephone number)', person.phone0800],
                  ['Ramal (IP phone)', person.extension],
                  ['Celular corporativo', person.corporateMobile],
                  ['UF', person.state],
                  ['Alterado no AD', person.changedAt?.slice(0, 16).replace('T', ' ') ?? ''],
                ].map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-on-surface-variant">{label}</dt>
                    <dd className="min-w-0 break-words">{value || <span className="text-on-surface-variant/60">vazio</span>}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>
        )}
      </Drawer>
      {applying && person && <ApplyDialog target={{ collaboratorIds: [person.id] }} count={1} onClose={() => setApplying(false)} />}
    </>
  );
}
