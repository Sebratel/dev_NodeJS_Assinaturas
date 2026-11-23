import { useSearchParams } from 'react-router-dom';
import { Tabs } from '../../components/ui/Tabs';
import { PhraseProfilesSection } from './PhraseProfilesSection';
import { TeamPhrasesSection } from './TeamPhrasesSection';

type TabKey = 'perfis' | 'times';

/**
 * Frases da assinatura. Ordem para escolher a frase de cada pessoa (quando a regra diz "pela tela Frases"):
 * perfil de frase que casa (prioridade maior) › frase do time › frase padrão.
 */
export function PhrasesPage() {
  const [params, setParams] = useSearchParams();
  const tab: TabKey = params.get('aba') === 'times' ? 'times' : 'perfis';

  return (
    <div className="grid gap-3">
      <p className="text-sm text-on-surface-variant">
        Ordem para escolher a frase de cada pessoa: <strong className="text-on-surface">perfil de frase</strong> (o de prioridade maior que casar) ›{' '}
        <strong className="text-on-surface">frase do time</strong> › <strong className="text-on-surface">frase padrão</strong>. Regra com frase fixa passa por cima de tudo.
      </p>
      <Tabs<TabKey>
        value={tab}
        onChange={(value) => setParams({ aba: value }, { replace: true })}
        tabs={[
          { value: 'perfis', label: 'Perfis de frase' },
          { value: 'times', label: 'Por time e padrão' },
        ]}
      />
      {tab === 'perfis' ? <PhraseProfilesSection /> : <TeamPhrasesSection />}
    </div>
  );
}
