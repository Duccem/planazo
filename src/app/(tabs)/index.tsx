import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedCard, InvitationCard, NextPlanCard } from '@/components/plan-cards';
import { LogoMark } from '@/components/ui/logo';
import { Chip, EmptyState, IconButton, SectionHeader } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { categories, categoryList } from '@/data/meta';
import { useCommunityFeed, useInvitations, useMe, useMyPlans } from '@/data/store';
import type { Category } from '@/data/types';
import { formatToday } from '@/lib/dates';
import { GUTTER, space } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

type Filter = 'para-ti' | Category;

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const me = useMe();
  const { pending } = useInvitations();
  const { scheduled, someday, done } = useMyPlans();
  const feed = useCommunityFeed();
  const [filter, setFilter] = useState<Filter>('para-ti');

  // "Para ti": rank community plans by how much you like that category, then popularity.
  const ranked = useMemo(() => {
    const affinity: Partial<Record<Category, number>> = {};
    for (const p of [...scheduled, ...someday, ...done]) affinity[p.category] = (affinity[p.category] ?? 0) + 1;
    const list = filter === 'para-ti' ? feed : feed.filter((p) => p.category === filter);
    return [...list].sort(
      (a, b) => (affinity[b.category] ?? 0) - (affinity[a.category] ?? 0) || b.likes - a.likes,
    );
  }, [feed, filter, scheduled, someday, done]);

  const next = scheduled[0];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: space.xxl, gap: space.xl }}>
      {/* Header */}
      <View style={[styles.pad, styles.header]}>
        <LogoMark size={40} />
        <View style={{ flex: 1 }}>
          <Txt variant="label" color={colors.mute}>
            {formatToday()}
          </Txt>
          <Txt variant="title">Hola, {me.name}</Txt>
        </View>
        <IconButton
          icon="bell"
          label={`Propuestas${pending.length ? `, ${pending.length} pendientes` : ''}`}
          badge={pending.length}
          onPress={() => router.push('/propuestas')}
        />
      </View>

      {/* Incoming proposals */}
      {pending.length > 0 ? (
        <View style={{ gap: space.md }}>
          <View style={styles.pad}>
            <SectionHeader
              title="Te han propuesto"
              action={pending.length > 1 ? 'Ver todas' : undefined}
              onAction={() => router.push('/propuestas')}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space.md, paddingHorizontal: GUTTER }}>
            {pending.map((inv) => (
              <InvitationCard key={inv.id} invitation={inv} plan={inv.plan} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Next plan */}
      <View style={[styles.pad, { gap: space.md }]}>
        <SectionHeader title="Tu próximo plan" action="Ver planes" onAction={() => router.navigate('/planes')} />
        {next ? (
          <NextPlanCard plan={next} />
        ) : (
          <EmptyState
            icon="calendar"
            title="Nada en el calendario"
            body={`Tienes ${someday.length} planes para algún día. ¿Le ponemos fecha a uno?`}
            action="Ver mi lista"
            onAction={() => router.navigate('/planes')}
          />
        )}
      </View>

      {/* Community feed */}
      <View style={{ gap: space.md }}>
        <View style={[styles.pad, { gap: 2 }]}>
          <Txt variant="heading">Ideas de la comunidad</Txt>
          <Txt variant="label" color={colors.mute}>
            Planes que otras parejas y grupos han compartido
          </Txt>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space.sm, paddingHorizontal: GUTTER }}>
          <Chip
            label="✨ Para ti"
            tone="plain"
            selected={filter === 'para-ti'}
            onPress={() => setFilter('para-ti')}
          />
          {categoryList.map((c) => (
            <Chip
              key={c}
              label={`${categories[c].emoji} ${categories[c].label}`}
              tone="plain"
              selected={filter === c}
              onPress={() => setFilter(c)}
            />
          ))}
        </ScrollView>
        <View style={[styles.pad, { gap: space.lg }]}>
          {ranked.length ? (
            ranked.map((p) => <FeedCard key={p.id} plan={p} />)
          ) : (
            <EmptyState
              icon="compass"
              title="Aún no hay ideas aquí"
              body="Sé la primera persona en compartir un plan de esta categoría."
              action="Crear plan"
              onAction={() => router.push('/nuevo-plan')}
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: GUTTER },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
