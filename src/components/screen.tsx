import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GUTTER, space } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

import { Txt } from './ui/text';

/** Scrollable tab screen with a large title header. */
export function TabScreen({
  title,
  kicker,
  right,
  children,
}: {
  title: string;
  kicker?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + space.md,
        paddingBottom: space.xxl,
        paddingHorizontal: GUTTER,
        gap: space.xl,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          {kicker ? (
            <Txt variant="label" color={colors.mute}>
              {kicker}
            </Txt>
          ) : null}
          <Txt variant="display">{title}</Txt>
        </View>
        {right}
      </View>
      {children}
    </ScrollView>
  );
}
