import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  size?: 'md' | 'lg';
  children: ReactNode;
}

export function Modal({ open, title, onClose, footer, size = 'md', children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[90dvh] w-full ${size === 'lg' ? 'max-w-2xl' : 'max-w-lg'} flex-col rounded-lg border border-outline-variant bg-surface-container-lowest shadow-2xl animate-fade-in-up motion-reduce:animate-none`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-outline-variant px-4 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="grid size-11 place-items-center rounded-md text-on-surface-variant hover:bg-surface-container-low md:size-8">
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto p-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-outline-variant px-4 py-3">{footer}</footer>}
      </div>
    </div>
  );
}
