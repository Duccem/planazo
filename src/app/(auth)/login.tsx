import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthLink, AuthScreen, OrDivider, PasswordField, SocialButtons } from '@/components/auth';
import { Button, Field, Tap } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { useColors } from '@/theme/theme';

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = email.includes('@') && password.length > 0;

  // TODO(auth): sign in with Supabase; for now just go back into the app.
  const submit = () => router.dismissTo('/');

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
      <Button label="Entrar" disabled={!canSubmit} onPress={submit} />
      <OrDivider />
      <SocialButtons />
    </AuthScreen>
  );
}
