import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ApiError } from '../../services/api-client';
import { phraseImportService } from '../../services/phrase-import.service';
import type { DirectoryTeam, PhraseImportMatch } from '../../types/api';
import { parsePhraseTable } from '../../utils/parse-pasted-table';

const CONFIDENCE: Record<PhraseImportMatch['confidence'], { label: string; tone: BadgeTone }> = {
  EXACT: { label: 'Certo', tone: 'success' },
  PROBABLE: { label: 'Confira', tone: 'warning' },
  NONE: { label: 'Sem time no AD', tone: 'neutral' },
};
const keyOf = (t: { area: string; team: string }) => `${t.area}|${t.team}`;

interface ImportPhrasesDialogProps {
  teams: DirectoryTeam[];
  onApply: (assignments: Array<{ area: string; team: string; phrase: string }>) => void;
  onClose: () => void;
}

/** Colar da planilha → conferir a qual time do AD cada linha vai → aplicar na tabela (salvar é na tela). */
export function ImportPhrasesDialog({ teams, onApply, onClose }: ImportPhrasesDialogProps) {
  const [text, setText] = useState('');
  const [choice, setChoice] = useState<Record<number, string>>({});
  const preview = useMutation({
    mutationFn: (rows: Array<{ team: string; phrase: string }>) => phraseImportService.preview(rows),
    onSuccess: (matches) => setChoice(Object.fromEntries(matches.map((m, i) => [i, m.best ? keyOf(m.best) : '']))),
  });
  const matches = preview.data;
  const sortedTeams = [...teams].sort((a, b) => a.team.localeCompare(b.team, 'pt-BR'));
  const chosen = matches ? matches.map((m, i) => ({ m, key: choice[i] ?? '' })).filter(({ key, m }) => key && !m.tooLong) : [];
  const parsedCount = text ? parsePhraseTable(text).length : 0;

  const apply = () => {
    onApply(
      chosen.map(({ m, key }) => {
        const [area, team] = key.split('|');
        return { area, team, phrase: m.phrase };
      }),
    );
    onClose();
  };

  return (
    <Modal
      open
      size="lg"
      title="Importar frases da planilha"
      onClose={onClose}
      footer={
        matches ? (
          <>
            <Button onClick={() => preview.reset()}>Voltar</Button>
            <Button variant="primary" disabled={!chosen.length} onClick={apply}>
              Aplicar {chosen.length} na tabela
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="primary" loading={preview.isPending} disabled={!parsedCount} onClick={() => preview.mutate(parsePhraseTable(text))}>
              Ler {parsedCount || ''} linhas
            </Button>
          </>
        )
      }
    >
      {!matches && (
        <div className="grid gap-2 text-sm">
          <p className="text-on-surface-variant">
            No Google Sheets, selecione as colunas (com ou sem o cabeçalho <strong>GESTOR · TIME · Frase</strong>), copie e cole aqui.
          </p>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} className="font-mono text-xs" placeholder={'TIME\tFrase E-mail\nLOGISTICA\tA logística a gente garante.'} />
          {preview.error instanceof ApiError && <p className="text-xs text-rose-700 dark:text-rose-300">{preview.error.message}</p>}
        </div>
      )}

      {matches && (
        <ul className="grid gap-2">
          {matches.map((m, i) => (
            <li key={`${m.team}-${i}`} className="grid gap-1 rounded-xl border border-outline-variant p-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold">{m.team}</span>
                <Badge tone={CONFIDENCE[m.confidence].tone}>{CONFIDENCE[m.confidence].label}</Badge>
                {m.tooLong && <Badge tone="danger">Frase com mais de 140 caracteres</Badge>}
              </div>
              <p className="text-xs text-on-surface-variant">“{m.phrase}”</p>
              <Select value={choice[i] ?? ''} onChange={(e) => setChoice({ ...choice, [i]: e.target.value })} aria-label={`Time do AD para ${m.team}`}>
                <option value="">— não importar —</option>
                {m.candidates.length > 0 && (
                  <optgroup label="Mais parecidos">
                    {m.candidates.map((c) => (
                      <option key={keyOf(c)} value={keyOf(c)}>
                        {c.team} · {c.area} ({c.count})
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Todos os times do AD">
                  {sortedTeams.map((t) => (
                    <option key={keyOf(t)} value={keyOf(t)}>
                      {t.team} · {t.area} ({t.count})
                    </option>
                  ))}
                </optgroup>
              </Select>
              {m.sameNameElsewhere.length > 0 && (
                <p className="text-[11px] text-amber-800 dark:text-amber-200">
                  Também existe “{m.best?.team}” em {m.sameNameElsewhere.map((t) => t.area).join(', ')}: ajuste lá na tabela se valer a mesma frase.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
