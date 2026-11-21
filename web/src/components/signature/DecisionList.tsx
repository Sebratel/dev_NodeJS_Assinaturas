import type { SignatureEvaluation, SignatureSlot } from '../../types/api';
import { CONTACT_LABELS, PHRASE_MODE_LABELS, SECTOR_LABELS, SLOT_LABELS } from '../../utils/labels';

/** "Por que saiu assim": cada parte da assinatura, o valor e a regra que decidiu. */
export function DecisionList({ evaluation }: { evaluation: SignatureEvaluation }) {
  const { decisions, content } = evaluation;
  const rows: Array<{ slot: SignatureSlot; value: string; detail: string; rule: string | null; priority: number | null }> = [
    { slot: 'phone0800', value: content.phone0800 || '—', detail: '', rule: decisions.phone0800?.ruleName ?? null, priority: decisions.phone0800?.priority ?? null },
    {
      slot: 'contact',
      value: CONTACT_LABELS[content.contactType],
      detail: content.contactText || (content.contactType !== 'NONE' ? 'sem dado' : ''),
      rule: decisions.contact?.ruleName ?? null,
      priority: decisions.contact?.priority ?? null,
    },
    {
      slot: 'sectorLabel',
      value: decisions.sectorLabel ? SECTOR_LABELS[decisions.sectorLabel.value] : 'Time',
      detail: content.sectorText,
      rule: decisions.sectorLabel?.ruleName ?? null,
      priority: decisions.sectorLabel?.priority ?? null,
    },
    {
      slot: 'phrase',
      value: decisions.phrase ? PHRASE_MODE_LABELS[decisions.phrase.value.mode] : 'Sem frase',
      detail: content.phrase,
      rule: decisions.phrase?.ruleName ?? null,
      priority: decisions.phrase?.priority ?? null,
    },
  ];

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-table-head text-left text-[10.5px] uppercase tracking-wide text-on-surface-variant">
          <th className="px-2.5 py-1.5 font-semibold">Parte</th>
          <th className="px-2.5 py-1.5 font-semibold">Ficou</th>
          <th className="px-2.5 py-1.5 font-semibold">Decidido por</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-outline-variant">
        {rows.map((row) => (
          <tr key={row.slot} className="align-top">
            <td className="px-2.5 py-2 text-on-surface-variant">{SLOT_LABELS[row.slot]}</td>
            <td className="px-2.5 py-2">
              <div className="font-medium">{row.value}</div>
              {row.detail && <div className="text-xs text-on-surface-variant">{row.detail}</div>}
            </td>
            <td className="px-2.5 py-2">
              {row.rule ? (
                <span>
                  {row.rule} <span className="text-xs tabular-nums text-on-surface-variant">· p{row.priority}</span>
                </span>
              ) : (
                <span className="text-on-surface-variant">nenhuma regra</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
