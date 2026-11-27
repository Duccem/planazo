import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import type { Tabs } from 'expo-router/js-tabs';

import { fonts } from '@/theme/tokens';
import { makeStyles, useColors } from '@/theme/theme';

import { Icon, type IconName } from './ui/icon';
import { Tap } from './ui/primitives';
import { Txt } from './ui/text';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TAB_ICONS: Record<string, IconName> = {
  index: 'home',
  planes: 'calendar',
  deseos: 'gift',
  perfil: 'user',
};

/** Four tabs with the "new plan" button in the middle. */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: TabBarProps) {
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const routes = state.routes.filter((r) => TAB_ICONS[r.name]);
  const half = Math.ceil(routes.length / 2);

  const renderTab = (route: (typeof routes)[number]) => {
    const index = state.routes.indexOf(route);
    const focused = index === state.index;
    const { options } = descriptors[route.key];
    const label = typeof options.title === 'string' ? options.title : route.name;
    const color = focused ? colors.indigo : colors.faint;
    return (
      <Tap
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        onPress={() => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        }}
        style={styles.tab}>
        <Icon name={TAB_ICONS[route.name]} size={23} color={color} strokeWidth={focused ? 2.4 : 2} />
        <Txt variant="caption" color={color} style={focused && { fontFamily: fonts.bold }}>
          {label}
        </Txt>
      </Tap>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {routes.slice(0, half).map(renderTab)}
      <View style={styles.tab}>
        <Tap
          accessibilityRole="button"
          accessibilityLabel="Crear plan"
          onPress={() => router.push('/nuevo-plan')}
          style={styles.fab}>
          <Icon name="plus" size={26} color={colors.white} strokeWidth={2.6} />
        </Tap>
      </View>
      {routes.slice(half).map(renderTab)}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 48 },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: colors.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    boxShadow: '0 6px 16px rgba(63,47,214,0.35)',
  },
}));
