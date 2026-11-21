const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

/** "há 3 minutos", "ontem"… */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diffSeconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);
  if (abs < 60) return relative.format(diffSeconds, 'second');
  if (abs < 3600) return relative.format(Math.round(diffSeconds / 60), 'minute');
  if (abs < 86400) return relative.format(Math.round(diffSeconds / 3600), 'hour');
  return relative.format(Math.round(diffSeconds / 86400), 'day');
}

export function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}

export function formatPercent(part: number, total: number): string {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}
