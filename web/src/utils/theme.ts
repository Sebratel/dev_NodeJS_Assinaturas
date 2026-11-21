export type ThemeMode = 'light' | 'dark';

function readSaved(): string | null {
  try {
    return localStorage.getItem('theme');
  } catch {
    return null;
  }
}

/** Preferência efetiva: escolha salva ou, na ausência, a do sistema. */
export function getPreferredTheme(): ThemeMode {
  const saved = readSaved();
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Chamar antes do render para não piscar. */
export function applyInitialTheme(): void {
  document.documentElement.classList.toggle('dark', getPreferredTheme() === 'dark');
}

export function setTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem('theme', mode);
  } catch {
    /* navegação privada: só não persiste */
  }
  document.documentElement.classList.toggle('dark', mode === 'dark');
}

export function toggleTheme(): ThemeMode {
  const next: ThemeMode = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
  setTheme(next);
  return next;
}
