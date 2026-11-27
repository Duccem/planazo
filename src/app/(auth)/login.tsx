import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthLink, AuthScreen, FormError, OrDivider, PasswordField, SocialButtons } from '@/components/auth';
import { Button, Field, Tap } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { useAuth } from '@/data/auth';
import { useColors } from '@/theme/theme';

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.includes('@') && password.length > 0 && !submitting;

  // On success the session changes and the root layout's guard opens the app.
  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const result = await signIn(email, password);
    setSubmitting(false);
    setError(result.error);
  };

  return (
    <AuthScreen
      title="Hola de nuevo"
      subtitle="Entra para seguir planeando juntos."
      footer={<AuthLink text="¿No tienes cuenta?" link="Crear cuenta" onPress={() => router.replace('/registro')} />}>
      <Field
        label="Correo electrónico"
        icon="mail"
        placeholder="tu@correo.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <View style={{ gap: 10 }}>
        <PasswordField
          label="Contraseña"
          placeholder="Tu contraseña"
          value={password}
          onChangeText={setPassword}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={canSubmit ? submit : undefined}
        />
        <Tap
          onPress={() => router.push({ pathname: '/recuperar', params: email ? { email } : {} })}
          accessibilityRole="link"
          hitSlop={8}
          style={{ alignSelf: 'flex-end' }}>
          <Txt variant="label" color={colors.indigo}>
            ¿Olvidaste tu contraseña?
          </Txt>
        </Tap>
      </View>
      <FormError message={error} />
      <Button label="Entrar" disabled={!canSubmit} loading={submitting} onPress={submit} />
      <OrDivider />
      <SocialButtons />
    </AuthScreen>
  );
}
