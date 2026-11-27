import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GUTTER, space } from '@/theme/tokens';
import { makeStyles, useColors } from '@/theme/theme';

import { IconButton } from './ui/primitives';
import { Txt } from './ui/text';

/** Layout for modal and sheet routes: title row with close, scrollable body, pinned footer. */
export function Sheet({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    // On Android sheets are full-screen modals drawn edge-to-edge (see sheetOptions in the root
    // layout): pad below the status bar, and let KeyboardAvoidingView lift the footer above the keyboard.
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior="padding">
      <View style={[styles.header, Platform.OS === 'android' && { paddingTop: insets.top + space.md }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="title">{title}</Txt>
          {subtitle ? (
            <Txt variant="label" color={colors.mute} numberOfLines={1}>
              {subtitle}
            </Txt>
          ) : null}
        </View>
        <IconButton icon="x" label="Cerrar" size={40} onPress={() => router.back()} />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>{footer}</View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingHorizontal: GUTTER,
    paddingTop: space.xl,
    paddingBottom: space.md,
  },
  body: { paddingHorizontal: GUTTER, paddingBottom: space.xl, gap: space.xl },
  footer: {
    paddingHorizontal: GUTTER,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
}));
