import { useQueryClient } from '@tanstack/react-query';
import { ShieldX } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { AuthCard } from './AuthCard';

/** A API conferiu o token e recusou (403 AUTH_FORBIDDEN): conta fora do domínio ou sem liberação. */
export function AccessDeniedPage({ message }: { message: string }) {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  return (
    <AuthCard title="Sem acesso" subtitle={message}>
      <div className="flex items-center justify-center gap-2 rounded-xl bg-surface-container-low px-3 py-2.5 text-sm text-on-surface-variant">
        <ShieldX className="size-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden />
        <span className="truncate">{user?.email}</span>
      </div>
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => {
          void signOut().then(() => queryClient.clear());
        }}
      >
        Sair e usar outra conta
      </Button>
    </AuthCard>
  );
}
