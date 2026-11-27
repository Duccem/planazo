import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthLink, AuthScreen, OrDivider, PasswordField, SocialButtons } from '@/components/auth';
import { Button, Checkbox, Field, Tap } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { fonts, space } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

const MIN_PASSWORD = 8;

export default function SignUpScreen() {
  const colors = useColors();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);

  const shortPassword = password.length > 0 && password.length < MIN_PASSWORD;
  const canSubmit =
    name.trim().length > 1 && email.includes('@') && password.length >= MIN_PASSWORD && accepted;

  // TODO(auth): create the account with Supabase; for now just go back into the app.
  const submit = () => router.dismissTo('/');

  const linkStyle = { fontFamily: fonts.bold, fontSize: 13 };

  return (
    <AuthScreen
      compactHero
      title="Crea tu cuenta"
      subtitle="Un minuto y empezáis a llenar la lista de planes."
      footer={<AuthLink text="¿Ya tienes cuenta?" link="Inicia sesión" onPress={() => router.replace('/login')} />}>
      <Field
        label="Nombre"
        icon="user"
        placeholder="¿Cómo te llamas?"
        value={name}
        onChangeText={setName}
        autoComplete="name"
        textContentType="givenName"
        returnKeyType="next"
      />
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
      <PasswordField
        label="Contraseña"
        placeholder="Crea una contraseña"
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        hint={
          shortPassword
            ? `Te faltan ${MIN_PASSWORD - password.length} caracteres`
            : `Mínimo ${MIN_PASSWORD} caracteres`
        }
      />

      <Tap
        onPress={() => setAccepted((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Checkbox checked={accepted} />
        <View style={{ flex: 1 }}>
          <Txt variant="caption" color={colors.mute} style={{ fontSize: 13, lineHeight: 18 }}>
            Acepto los{' '}
            <Txt variant="caption" color={colors.indigo} style={linkStyle}>
              Términos
            </Txt>{' '}
            y la{' '}
            <Txt variant="caption" color={colors.indigo} style={linkStyle}>
              Política de privacidad
            </Txt>
          </Txt>
        </View>
      </Tap>

      <Button label="Crear cuenta" disabled={!canSubmit} onPress={submit} />
      <OrDivider />
      <SocialButtons />
    </AuthScreen>
  );
}
