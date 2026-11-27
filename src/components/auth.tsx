import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, type TextInputProps, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { brand, fonts, GUTTER, radius, space } from '@/theme/tokens';
import { makeStyles, useColors } from '@/theme/theme';

import { Icon } from './ui/icon';
import { LogoMark } from './ui/logo';
import { Button, Field, IconButton, Tap } from './ui/primitives';
import { Txt } from './ui/text';

/**
 * Auth layout: brand hero on indigo (same ground as the splash) and a rounded panel with the form.
 * The hero stays brand indigo in both themes; the panel follows the theme.
 */
export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
  back,
  compactHero,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Pinned under the form, e.g. "¿No tienes cuenta? Crear cuenta". */
  footer?: ReactNode;
  /** Show a back button over the hero. */
  back?: boolean;
  /** Shorter hero for screens with longer forms. */
  compactHero?: boolean;
}) {
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: brand.indigo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <View
          style={[
            styles.hero,
            { paddingTop: insets.top + space.md, minHeight: (compactHero ? 190 : 260) + insets.top },
          ]}>
          {/* Decorative echo of the logo's two circles. */}
          <View pointerEvents="none" style={[styles.blob, styles.blobCoral]} />
          <View pointerEvents="none" style={[styles.blob, styles.blobSun]} />

          <View style={styles.heroTop}>
            {back && router.canGoBack() ? (
              <IconButton icon="back" label="Volver" tone="white" size={40} onPress={() => router.back()} />
            ) : (
              <View style={{ height: 40 }} />
            )}
          </View>

          <View style={styles.brandRow}>
            <LogoMark size={compactHero ? 40 : 52} color={brand.white} m3={brand.indigo} />
            <Txt
              variant="display"
              color={brand.white}
              style={{ fontSize: compactHero ? 30 : 38, lineHeight: compactHero ? 36 : 44, letterSpacing: -1.4 }}>
              planazo
            </Txt>
          </View>
          {!compactHero ? (
            <Txt color="rgba(255,255,255,0.78)" style={{ marginTop: space.xs }}>
              Planes que os apetecen a los dos.
            </Txt>
          ) : null}
        </View>

        <View style={[styles.panel, { paddingBottom: insets.bottom + space.xl }]}>
          <View style={{ gap: space.xs }}>
            <Txt variant="title">{title}</Txt>
            {subtitle ? <Txt color={colors.mute}>{subtitle}</Txt> : null}
          </View>
          <View style={{ gap: space.lg }}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Password input with a show/hide toggle. */
export function PasswordField(props: TextInputProps & { label: string; hint?: string }) {
  const colors = useColors();
  const [visible, setVisible] = useState(false);
  return (
    <Field
      icon="lock"
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      accessory={
        <Tap
          onPress={() => setVisible((v) => !v)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
          <Icon name={visible ? 'eyeOff' : 'eye'} size={20} color={colors.mute} />
        </Tap>
      }
    />
  );
}

/** Error banner above the submit button. */
export function FormError({ message }: { message: string | null }) {
  const colors = useColors();
  const styles = useStyles();
  if (!message) return null;
  return (
    <View style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon name="x" size={16} color={colors.coralDeep} strokeWidth={2.6} />
      <Txt variant="label" color={colors.coralDeep} style={{ flex: 1 }}>
        {message}
      </Txt>
    </View>
  );
}

/** Informative banner, e.g. "check your inbox". */
export function FormNotice({ message }: { message: string | null }) {
  const colors = useColors();
  const styles = useStyles();
  if (!message) return null;
  return (
    <View style={[styles.error, { backgroundColor: colors.mint }]} accessibilityLiveRegion="polite">
      <Icon name="mail" size={16} color={colors.mintDeep} strokeWidth={2.4} />
      <Txt variant="label" color={colors.mintDeep} style={{ flex: 1 }}>
        {message}
      </Txt>
    </View>
  );
}

/** "o" separator between the main form and social sign-in. */
export function OrDivider() {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Txt variant="caption" color={colors.faint}>
        o continúa con
      </Txt>
      <View style={styles.dividerLine} />
    </View>
  );
}

/** Social sign-in buttons. Not wired to Supabase yet. */
export function SocialButtons() {
  const soon = () => Alert.alert('Muy pronto', 'Por ahora entra con tu correo y contraseña.');
  return (
    <View style={{ flexDirection: 'row', gap: space.md }}>
      {Platform.OS !== 'android' ? <Button label="Apple" tone="ghost" style={{ flex: 1 }} onPress={soon} /> : null}
      <Button label="Google" tone="ghost" style={{ flex: 1 }} onPress={soon} />
    </View>
  );
}

/** Inline text with a tappable link: "¿No tienes cuenta? **Crear cuenta**". */
export function AuthLink({ text, link, onPress }: { text: string; link: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Tap onPress={onPress} accessibilityRole="link" hitSlop={8} style={{ flexDirection: 'row', gap: 4 }}>
      <Txt variant="label" color={colors.mute}>
        {text}
      </Txt>
      <Txt variant="label" color={colors.indigo} style={{ fontFamily: fonts.bold }}>
        {link}
      </Txt>
    </Tap>
  );
}

const useStyles = makeStyles((colors) => ({
  hero: {
    paddingHorizontal: GUTTER,
    paddingBottom: space.xxl + space.lg,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  heroTop: { flexDirection: 'row' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xl },
  blob: { position: 'absolute', width: 220, height: 220, borderRadius: 110, opacity: 0.22 },
  blobCoral: { backgroundColor: brand.coral, top: -70, right: 40 },
  blobSun: { backgroundColor: brand.sun, top: -30, right: -90 },
  panel: {
    flex: 1,
    marginTop: -radius.xl,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: space.xl + 4,
    paddingHorizontal: GUTTER,
    gap: space.xl,
  },
  footer: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingTop: space.sm },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.coralSoft,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
}));
