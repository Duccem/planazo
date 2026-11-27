import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthLink, AuthScreen } from '@/components/auth';
import { Icon } from '@/components/ui/icon';
import { Button, Field } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { fonts, radius, space } from '@/theme/tokens';
import { makeStyles, useColors } from '@/theme/theme';

export default function RecoverPasswordScreen() {
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [sent, setSent] = useState(false);

  const valid = email.includes('@');
  const backToLogin = () => (router.canGoBack() ? router.back() : router.replace('/login'));

  // TODO(auth): send the reset email with Supabase.
  const send = () => setSent(true);

  if (sent) {
    return (
      <AuthScreen
        back
        compactHero
        title="Revisa tu correo"
        footer={<AuthLink text="¿No te ha llegado?" link="Reenviar" onPress={send} />}>
        <View style={styles.sentCard}>
          <View style={styles.sentIcon}>
            <Icon name="mail" size={28} color={colors.mintDeep} />
          </View>
          <Txt color={colors.mute} align="center">
            Si existe una cuenta con{' '}
            <Txt color={colors.ink} style={{ fontFamily: fonts.bold }}>
              {email.trim()}
            </Txt>
            , te hemos enviado un enlace para crear una contraseña nueva.
          </Txt>
          <Txt variant="caption" color={colors.faint} align="center">
            Mira también en la carpeta de spam.
          </Txt>
        </View>
        <Button label="Volver a iniciar sesión" onPress={backToLogin} />
        <Button label="Cambiar correo" tone="ghost" onPress={() => setSent(false)} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      back
      compactHero
      title="Recupera tu contraseña"
      subtitle="Escribe tu correo y te mandamos un enlace para crear una nueva."
      footer={<AuthLink text="¿Te has acordado?" link="Inicia sesión" onPress={backToLogin} />}>
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
        returnKeyType="send"
        autoFocus
        onSubmitEditing={valid ? send : undefined}
      />
      <Button label="Enviar enlace" icon="send" disabled={!valid} onPress={send} />
    </AuthScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  sentCard: {
    alignItems: 'center',
    gap: space.md,
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  sentIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
