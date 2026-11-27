import type { AuthError, Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { getGoogleIdToken, signOutGoogle } from '@/lib/google-auth';
import { unregisterPush } from '@/lib/push';
import { supabase } from '@/lib/supabase';

type Result = { error: string | null };
type SignUpResult = Result & { needsConfirmation: boolean };

type AuthContextValue = {
  session: Session | null;
  /** True until the stored session has been read on startup. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<Result>;
  signUp: (name: string, email: string, password: string) => Promise<SignUpResult>;
  /** Native Google sign-in. `error` is null on success and when the user cancels. */
  signInWithGoogle: () => Promise<Result>;
  resetPassword: (email: string) => Promise<Result>;
  signOut: () => Promise<Result>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Supabase error codes → copy for the user. */
const messages: Record<string, string> = {
  invalid_credentials: 'El correo o la contraseña no son correctos.',
  email_not_confirmed: 'Confirma tu correo antes de entrar. Revisa tu bandeja de entrada.',
  user_already_exists: 'Ya hay una cuenta con ese correo. Prueba a iniciar sesión.',
  email_exists: 'Ya hay una cuenta con ese correo. Prueba a iniciar sesión.',
  weak_password: 'La contraseña es demasiado débil. Usa al menos 8 caracteres.',
  email_address_invalid: 'Ese correo no parece válido.',
  validation_failed: 'Revisa los datos e inténtalo de nuevo.',
  over_request_rate_limit: 'Demasiados intentos. Espera un momento y vuelve a probar.',
  over_email_send_rate_limit: 'Hemos enviado demasiados correos. Espera unos minutos.',
  signup_disabled: 'El registro está desactivado por ahora.',
  provider_disabled: 'El acceso con Google no está activado todavía.',
};

const googleMessages = {
  play_services: 'Necesitas Google Play Services actualizado para entrar con Google.',
  in_progress: 'Ya hay un inicio de sesión con Google en curso.',
  no_token: 'Google no devolvió tus credenciales. Inténtalo de nuevo.',
  unavailable: 'El acceso con Google no está disponible en esta versión de la app.',
  unknown: 'No se pudo entrar con Google. Inténtalo de nuevo.',
};

function describe(error: AuthError | null): string | null {
  if (!error) return null;
  if (error.code && messages[error.code]) return messages[error.code];
  if (error.name === 'AuthRetryableFetchError' || error.status === 0) {
    return 'No hay conexión. Comprueba tu internet e inténtalo de nuevo.';
  }
  return 'Algo ha fallado. Inténtalo de nuevo.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        return { error: describe(error) };
      },
      signUp: async (name, email, password) => {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        });
        // Without a session the project requires email confirmation first.
        return { error: describe(error), needsConfirmation: !error && !data.session };
      },
      signInWithGoogle: async () => {
        const google = await getGoogleIdToken();
        if (google.type === 'cancelled') return { error: null };
        if (google.type === 'error') return { error: googleMessages[google.code] };
        const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: google.idToken });
        if (error) {
          console.warn('[auth] Google signInWithIdToken', error.code, error.message);
          await signOutGoogle();
        }
        return { error: describe(error) };
      },
      resetPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        return { error: describe(error) };
      },
      signOut: async () => {
        // Stop pushes to this device while the session can still authorise the call.
        await unregisterPush();
        const [{ error }] = await Promise.all([supabase.auth.signOut(), signOutGoogle()]);
        return { error: describe(error) };
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
