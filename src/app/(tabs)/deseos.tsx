import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, View } from 'react-native';

import { TabScreen } from '@/components/screen';
import { Icon } from '@/components/ui/icon';
import { AvatarStack, Checkbox, EmptyState, IconButton, ProgressBar, Segmented, Tap } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { wishKinds, wishOwners } from '@/data/meta';
import { useSocialLoading } from '@/data/social';
import { useActions, useMe, usePartner, useWishes } from '@/data/store';
import type { Wish, WishKind } from '@/data/types';
import { fonts, radius, space } from '@/theme/tokens';
import { makeStyles, useColors } from '@/theme/theme';

type Filter = 'todo' | WishKind;

export default function WishesScreen() {
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const me = useMe();
  const partner = usePartner();
  const wishes = useWishes();
  const loading = useSocialLoading();
  const [filter, setFilter] = useState<Filter>('todo');

  const visible = filter === 'todo' ? wishes : wishes.filter((w) => w.kind === filter);
  const open = visible.filter((w) => !w.done);
  const done = visible.filter((w) => w.done);
  const doneTotal = wishes.filter((w) => w.done).length;

  const kinds: WishKind[] = filter === 'todo' ? ['regalo', 'actividad', 'meta'] : [filter];

  return (
    <TabScreen
      title="Deseos"
      kicker={partner ? `Vuestra lista, de ${me.name} y ${partner.name}` : 'Tu lista'}
      right={
        <IconButton
          icon="plus"
          label="Añadir deseo"
          tone="primary"
          onPress={() =>
            router.push({ pathname: '/nuevo-deseo', params: filter !== 'todo' ? { kind: filter } : {} })
          }
        />
      }>
      {/* Summary */}
      <View style={styles.summary}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <AvatarStack
            people={[{ id: 'me', initial: me.initial, color: me.color }, ...(partner ? [partner] : [])]}
            size={36}
            ring={colors.indigo}
          />
          <View style={{ flex: 1 }}>
            <Txt variant="bodyStrong" color={colors.white}>
              {doneTotal} de {wishes.length} cumplidos
            </Txt>
            <Txt variant="label" color="#DCD8FF">
              Regalos, aventuras y metas en común
            </Txt>
          </View>
        </View>
        <ProgressBar value={wishes.length ? doneTotal / wishes.length : 0} color={colors.sun} track="#FFFFFF33" />
      </View>

      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'todo', label: 'Todo' },
          { value: 'regalo', label: 'Regalos' },
          { value: 'actividad', label: 'Planes' },
          { value: 'meta', label: 'Metas' },
        ]}
      />

      {loading && wishes.length === 0 ? (
        <ActivityIndicator color={colors.indigo} style={{ paddingVertical: space.xxl }} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={filter === 'todo' ? 'gift' : wishKinds[filter].icon}
          title="Nada por aquí aún"
          body="Apunta regalos que os gustaría recibir, cosas que queréis vivir o metas para lograr juntos."
          action="Añadir deseo"
          onAction={() => router.push('/nuevo-deseo')}
        />
      ) : null}

      {kinds.map((k) => {
        const items = open.filter((w) => w.kind === k);
        if (!items.length) return null;
        return (
          <View key={k} style={{ gap: space.sm + 2 }}>
            {filter === 'todo' ? (
              <Txt variant="label" color={colors.mute}>
                {wishKinds[k].plural.toUpperCase()}
              </Txt>
            ) : null}
            {items.map((w) => (
              <WishRow key={w.id} wish={w} />
            ))}
          </View>
        );
      })}

      {done.length > 0 ? (
        <View style={{ gap: space.sm + 2 }}>
          <Txt variant="label" color={colors.mute}>
            CUMPLIDOS · {done.length}
          </Txt>
          {done.map((w) => (
            <WishRow key={w.id} wish={w} />
          ))}
        </View>
      ) : null}
    </TabScreen>
  );
}

function WishRow({ wish }: { wish: Wish }) {
  const colors = useColors();
  const styles = useStyles();
  const { updateWish, removeWish } = useActions();
  const partner = usePartner();
  const kind = wishKinds[wish.kind];
  const k = { ...kind, bg: colors[kind.bg], fg: colors[kind.fg] };
  const isGoal = wish.kind === 'meta';
  const owner = wish.owner === 'pareja' && partner ? `Para ${partner.name}` : wishOwners[wish.owner];
  const by = wish.addedBy === 'me' ? 'tú' : (partner?.name ?? 'tu pareja');

  const toggle = () => updateWish(wish.id, { done: !wish.done, progress: isGoal && !wish.done ? 1 : wish.progress });

  const confirmRemove = () => {
    if (Platform.OS === 'web') return removeWish(wish.id);
    Alert.alert('¿Borrar deseo?', wish.title, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => removeWish(wish.id) },
    ]);
  };

  return (
    <Tap
      onPress={toggle}
      onLongPress={confirmRemove}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: wish.done }}
      accessibilityHint="Mantén pulsado para borrar"
      style={[styles.row, wish.done && { opacity: 0.6 }]}>
      <View style={[styles.kindTile, { backgroundColor: k.bg }]}>
        <Icon name={k.icon} size={20} color={k.fg} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Txt
          variant="bodyStrong"
          numberOfLines={2}
          style={wish.done && { textDecorationLine: 'line-through', color: colors.mute }}>
          {wish.title}
        </Txt>
        <Txt variant="caption" color={colors.mute} numberOfLines={1}>
          {owner} · añadido por {by}
          {wish.note && !isGoal ? ` · ${wish.note}` : ''}
        </Txt>
        {isGoal && !wish.done ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 4 }}>
            <View style={{ flex: 1 }}>
              <ProgressBar value={wish.progress ?? 0} color={colors.sun} track={colors.sunSoft} />
            </View>
            <Txt variant="caption" color={colors.sunDeep} style={{ fontFamily: fonts.bold, minWidth: 34 }}>
              {Math.round((wish.progress ?? 0) * 100)}%
            </Txt>
            <Tap
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Avanzar 10%"
              onPress={() => {
                const next = Math.min(1, Math.round(((wish.progress ?? 0) + 0.1) * 10) / 10);
                updateWish(wish.id, { progress: next, done: next >= 1 });
              }}
              style={styles.step}>
              <Icon name="plus" size={14} color={colors.sunDeep} strokeWidth={2.6} />
            </Tap>
          </View>
        ) : null}
      </View>
      <Checkbox checked={wish.done} />
    </Tap>
  );
}

const useStyles = makeStyles((colors) => ({
  summary: { backgroundColor: colors.indigo, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  kindTile: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  step: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.sunSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
