import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedCard, InvitationCard, NextPlanCard } from '@/components/plan-cards';
import { LogoMark } from '@/components/ui/logo';
import { Button, Chip, EmptyState, IconButton, SectionHeader } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { categories, categoryList } from '@/data/meta';
import { useCommunityFeed, useInvitations, useMe, useMyPlans, usePlansLoading } from '@/data/store';
import type { Category, Plan } from '@/data/types';
import { formatToday } from '@/lib/dates';
import { GUTTER, space } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { scheduled, someday, done } = useMyPlans();
  const feed = useCommunityFeed();
  const [refreshing, setRefreshing] = useState(false);

  // "Para ti": rank by how much you like each category, then popularity. Ranking happens within
  // each loaded page, so cards already on screen don't jump when the next page arrives.
  const items = useMemo(() => {
    const affinity: Partial<Record<Category, number>> = {};
    for (const p of [...scheduled, ...someday, ...done]) affinity[p.category] = (affinity[p.category] ?? 0) + 1;
    const rank = (a: Plan, b: Plan) =>
      (affinity[b.category] ?? 0) - (affinity[a.category] ?? 0) || b.likes - a.likes;
    return feed.pages.flatMap((page) => (feed.category ? page : [...page].sort(rank)));
  }, [feed.pages, feed.category, scheduled, someday, done]);

  const { refresh } = feed;
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const firstLoad = feed.loadingMore && items.length === 0;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: space.xxl }}
      data={items}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => (
        <View style={styles.pad}>
          <FeedCard plan={item} />
        </View>
      )}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={<Header />}
      ListEmptyComponent={
        firstLoad ? (
          <ActivityIndicator color={colors.indigo} style={{ paddingVertical: space.xl }} />
        ) : feed.error ? (
          <FeedError onRetry={refresh} />
        ) : (
          <View style={styles.pad}>
            <EmptyState
              icon="compass"
              title="Aún no hay ideas aquí"
              body={
                feed.category
                  ? 'Sé la primera persona en compartir un plan de esta categoría.'
                  : 'Sé la primera persona en compartir un plan con la comunidad.'
              }
              action="Crear plan"
              onAction={() => router.push('/nuevo-plan')}
            />
          </View>
        )
      }
      ListFooterComponent={
        items.length > 0 ? (
          feed.loadingMore ? (
            <ActivityIndicator color={colors.indigo} style={{ paddingVertical: space.xl }} />
          ) : feed.error ? (
            <FeedError onRetry={feed.loadMore} />
          ) : !feed.hasMore ? (
            <Txt variant="caption" color={colors.faint} align="center" style={{ paddingVertical: space.xl }}>
              Has visto todas las ideas. ¿Compartes la tuya?
            </Txt>
          ) : undefined
        ) : undefined
      }
      onEndReached={feed.loadMore}
      onEndReachedThreshold={0.6}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.indigo} />}
      // Feed cards are tall; keep the render window modest.
      initialNumToRender={6}
      windowSize={7}
    />
  );
}

/** Everything above the feed: greeting, proposals, next plan and the category filters. */
function Header() {
  const colors = useColors();
  const router = useRouter();
  const me = useMe();
  const { pending } = useInvitations();
  const { scheduled, someday } = useMyPlans();
  const loading = usePlansLoading();
  const { category, setCategory } = useCommunityFeed();
  const next = scheduled[0];

  return (
    <View style={{ gap: space.xl, paddingBottom: space.md }}>
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
        ) : loading ? (
          <ActivityIndicator color={colors.indigo} style={{ paddingVertical: space.xl }} />
        ) : someday.length ? (
          <EmptyState
            icon="calendar"
            title="Nada en el calendario"
            body={`Tienes ${someday.length === 1 ? '1 plan' : `${someday.length} planes`} para algún día. ¿Le ponemos fecha?`}
            action="Ver mi lista"
            onAction={() => router.navigate('/planes')}
          />
        ) : (
          <EmptyState
            icon="sparkle"
            title="Vuestro primer plan"
            body="Apunta algo que os apetezca hacer juntos, o guarda una idea de la comunidad."
            action="Crear plan"
            onAction={() => router.push('/nuevo-plan')}
          />
        )}
      </View>

      {/* Community feed heading + filters (filtering happens on the server) */}
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
          <Chip label="✨ Para ti" tone="plain" selected={category === null} onPress={() => setCategory(null)} />
          {categoryList.map((c) => (
            <Chip
              key={c}
              label={`${categories[c].emoji} ${categories[c].label}`}
              tone="plain"
              selected={category === c}
              onPress={() => setCategory(c)}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function Separator() {
  return <View style={{ height: space.lg }} />;
}

function FeedError({ onRetry }: { onRetry: () => void }) {
  const colors = useColors();
  return (
    <View style={[styles.pad, { alignItems: 'center', gap: space.sm, paddingVertical: space.xl }]}>
      <Txt variant="caption" color={colors.mute} align="center">
        No se pudieron cargar más ideas.
      </Txt>
      <Button label="Reintentar" tone="soft" compact onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: GUTTER },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
