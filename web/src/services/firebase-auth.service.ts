import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { config } from '../config';

/**
 * Login com Google via Firebase Authentication (padrao-login-sso): SDK do npm, nunca <script> do Google;
 * a API confere a assinatura do ID token localmente. Um projeto Firebase só deste sistema.
 */
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

function getFirebaseAuth(): Auth {
  if (!auth) {
    app = initializeApp(config.auth.firebase);
    auth = getAuth(app);
    void setPersistence(auth, browserLocalPersistence).catch(() => undefined);
  }
  return auth;
}

export const firebaseAuthService = {
  onUserChanged: (callback: (user: User | null) => void) => onAuthStateChanged(getFirebaseAuth(), callback),

  signIn: async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ hd: config.auth.hostedDomain, prompt: 'select_account' });
    await signInWithPopup(getFirebaseAuth(), provider);
  },

  signOut: () => signOut(getFirebaseAuth()),

  /** Token de cada requisição: o SDK devolve o de memória e só vai à rede perto de vencer. `force` renova já. */
  getIdToken: async (force = false): Promise<string | null> => {
    const user = getFirebaseAuth().currentUser;
    return user ? user.getIdToken(force) : null;
  },
};

/** Mensagem legível para os erros mais comuns do popup. */
export function describeSignInError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'O login foi cancelado.';
  if (code === 'auth/popup-blocked') return 'O navegador bloqueou a janela de login. Libere pop-ups para este endereço.';
  if (code === 'auth/unauthorized-domain') return 'Este endereço não está autorizado no projeto Firebase (Authentication › Settings › Authorized domains).';
  if (code === 'auth/network-request-failed') return 'Sem conexão com o Google. Confira a rede e tente de novo.';
  return 'Não foi possível entrar. Tente de novo.';
}
