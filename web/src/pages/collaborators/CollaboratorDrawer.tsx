import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DecisionList } from '../../components/signature/DecisionList';
import { SignaturePreview } from '../../components/signature/SignaturePreview';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { ApiError } from '../../services/api-client';
import { collaboratorService } from '../../services/collaborator.service';
import { derivedQueryRoots, queryKeys } from '../../services/query-keys';
import { googleIntegrationService } from '../../services/report.service';
import { formatNumber } from '../../utils/format';
import { LEVEL_LABELS } from '../../utils/labels';

const SEVERITY_TONE = { ERROR: 'warning', WARNING: 'warning', INFO: 'neutral' } as const;

export function CollaboratorDrawer({ collaboratorId, onClose }: { collaboratorId: string | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const signature = useQuery({
    queryKey: queryKeys.collaborator(collaboratorId ?? ''),
    queryFn: () => collaboratorService.getSignature(collaboratorId!),
    enabled: Boolean(collaboratorId),
  });
  const google = useQuery({ queryKey: queryKeys.googleIntegration, queryFn: googleIntegrationService.status });

  const [mobile, setMobile] = useState('');
  useEffect(() => setMobile(signature.data?.collaborator.informedMobile ?? ''), [signature.data?.collaborator.informedMobile]);

  const saveMobile = useMutation({
    mutationFn: (value: string) => collaboratorService.setInformedMobile(collaboratorId!, value),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.collaborator(collaboratorId!), data);
      derivedQueryRoots.filter((k) => k[0] !== 'collaborator').forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
    },
  });

  const data = signature.data;
  const person = data?.collaborator;
  const evaluation = data?.evaluation;
  const asksMobile = evaluation?.content.contactType === 'INFORMED_MOBILE';
  const mobileError = saveMobile.error instanceof ApiError ? saveMobile.error.message : undefined;

  return (
    <Drawer
      open={Boolean(collaboratorId)}
      onClose={onClose}
      width="lg"
      title={person?.name ?? 'Colaborador'}
      subtitle={person ? `${person.email} · ${person.title || 'sem cargo no AD'}` : undefined}
      footer={
        <Button
          variant="primary"
          icon={<Mail className="size-4" />}
          disabled={!google.data?.applyEnabled}
          title={google.data?.applyEnabled ? undefined : 'Liberado quando o superadmin autorizar a conta de serviço no Google.'}
        >
          Aplicar no Gmail
        </Button>
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

          {asksMobile && (
            <form
              className="flex flex-wrap items-end gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-3"
              onSubmit={(event) => {
                event.preventDefault();
                saveMobile.mutate(mobile);
              }}
            >
              <Field label="Celular informado" htmlFor="informed-mobile" hint="Direção e Gerência digitam o próprio" error={mobileError} className="min-w-48 flex-1">
                <Input id="informed-mobile" inputMode="tel" placeholder="(51) 99999-0000" value={mobile} onChange={(e) => setMobile(e.target.value)} />
              </Field>
              <Button type="submit" variant="primary" loading={saveMobile.isPending}>
                Salvar
              </Button>
            </form>
          )}

          <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
            <h3 className="border-b border-outline-variant px-3 py-2 text-sm font-semibold">Por que saiu assim</h3>
            <DecisionList evaluation={evaluation} />
          </section>

          <details className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm">
            <summary className="cursor-pointer font-medium">Dados lidos do AD</summary>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
              {[
                ['Login', person.login],
                ['Departamento', person.department],
                ['Empresa', person.company],
                ['Segmento', person.segment],
                ['Celular corporativo', person.corporateMobile],
                ['Ramal', person.extension],
                ['UF', person.state],
                ['Criado no AD', person.createdAt?.slice(0, 10) ?? ''],
              ].map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-on-surface-variant">{label}</dt>
                  <dd className="min-w-0 break-words">{value || <span className="text-on-surface-variant/60">vazio</span>}</dd>
                </div>
              ))}
            </dl>
          </details>

          <p className="text-xs text-on-surface-variant">
            Regras que valem: {evaluation.matchedRules.map((r) => `${r.name} (p${r.priority})`).join(' · ') || 'nenhuma'}
          </p>
        </div>
      )}
    </Drawer>
  );
}
