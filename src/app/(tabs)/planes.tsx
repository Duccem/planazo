import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { PlanRow } from '@/components/plan-cards';
import { TabScreen } from '@/components/screen';
import { EmptyState, IconButton, Segmented } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { useMyPlans, usePlansLoading } from '@/data/store';
import type { Plan } from '@/data/types';
import { space } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

type Tab = 'agendados' | 'algun-dia' | 'hechos';

const empty: Record<Tab, { title: string; body: string; icon: 'calendar' | 'infinity' | 'check' }> = {
  agendados: {
    title: 'Sin fechas todavía',
    body: 'Abre un plan de tu lista y ponle día. Lo verás aquí ordenado.',
    icon: 'calendar',
  },
  'algun-dia': {
    title: 'Tu lista está vacía',
    body: 'Guarda ideas de la comunidad o crea las tuyas para hacerlas algún día.',
    icon: 'infinity',
  },
  hechos: {
    title: 'Aún no hay planazos hechos',
    body: 'Cuando completes un plan, quedará guardado aquí como recuerdo.',
    icon: 'check',
  },
};

/** Groups scheduled plans into "Esta semana", "Este mes" and "Más adelante". */
function groupScheduled(plans: Plan[]) {
  const now = Date.now();
  const week = now + 7 * 86_400_000;
  const month = now + 31 * 86_400_000;
  const groups: { title: string; items: Plan[] }[] = [
    { title: 'Esta semana', items: [] },
    { title: 'Este mes', items: [] },
    { title: 'Más adelante', items: [] },
  ];
  for (const p of plans) {
    const t = new Date(p.date!).getTime();
    groups[t <= week ? 0 : t <= month ? 1 : 2].items.push(p);
  }
  return groups.filter((g) => g.items.length);
}

export default function PlansScreen() {
  const colors = useColors();
  const router = useRouter();
  const { scheduled, someday, done } = useMyPlans();
  const loading = usePlansLoading();
  const [tab, setTab] = useState<Tab>('agendados');

  const list = tab === 'agendados' ? scheduled : tab === 'algun-dia' ? someday : done;
  const groups = tab === 'agendados' ? groupScheduled(scheduled) : [{ title: '', items: list }];

  return (
    <TabScreen
      title="Planes"
      kicker={`${scheduled.length + someday.length} por hacer · ${done.length} hechos`}
      right={<IconButton icon="plus" label="Crear plan" tone="primary" onPress={() => router.push('/nuevo-plan')} />}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'agendados', label: 'Con fecha', count: scheduled.length },
          { value: 'algun-dia', label: 'Algún día', count: someday.length },
          { value: 'hechos', label: 'Hechos', count: done.length },
        ]}
      />

      {loading && list.length === 0 ? (
        <ActivityIndicator color={colors.indigo} style={{ paddingVertical: space.xxl }} />
      ) : list.length === 0 ? (
        <EmptyState
          {...empty[tab]}
          action={tab === 'hechos' ? undefined : 'Crear plan'}
          onAction={() => router.push('/nuevo-plan')}
        />
      ) : (
        groups.map((g) => (
          <View key={g.title || 'all'} style={{ gap: space.sm + 2 }}>
            {g.title ? (
              <Txt variant="label" color={colors.mute}>
                {g.title.toUpperCase()}
              </Txt>
            ) : null}
            {g.items.map((p) => (
              <PlanRow key={p.id} plan={p} />
            ))}
          </View>
        ))
      )}
    </TabScreen>
  );
}
