import { useRouter } from 'expo-router';
import { Alert, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Cover } from '@/components/ui/cover';
import { Icon, type IconName } from '@/components/ui/icon';
import { Button, FieldLabel, IconButton, Tap } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { useActions, useMySharedPlans, usePartner, usePlansLoading } from '@/data/store';
import type { Plan } from '@/data/types';
import { makeStyles, useColors } from '@/theme/theme';
import { GUTTER, radius, space } from '@/theme/tokens';

/** What each audience can see. Keep in sync with the RLS policies in supabase/migrations. */
const AUDIENCES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'globe',
    title: 'La comunidad',
    body: 'Solo las ideas que compartes: título, descripción, fotos, tu nombre y tu foto. Nunca la fecha ni con quién vas.',
  },
  {
    icon: 'heart',
    title: 'Tu pareja',
    body: 'Vuestros deseos y los planes que le propones.',
  },
  {
    icon: 'users',
    title: 'Tus amigos',
    body: 'Tu nombre, tu foto y los planes que les propones. Tus deseos no.',
  },
];

export default function PrivacyScreen() {
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const shared = useMySharedPlans();
  const loading = usePlansLoading();
  const partner = usePartner();
  const { setPublic } = useActions();

  const stopSharing = (plans: Plan[]) => {
    const one = plans.length === 1;
    const title = one ? `¿Dejar de compartir «${plans[0].title}»?` : `¿Dejar de compartir tus ${plans.length} ideas?`;
    const body = one
      ? 'Desaparecerá de la comunidad. Seguirá en tus planes y quien ya la guardó la conserva.'
      : 'Desaparecerán de la comunidad. Seguirán en tus planes y quien ya las guardó las conserva.';
    const run = () => plans.forEach((p) => setPublic(p.id, false));
    // react-native-web's Alert has no buttons.
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(title)) run();
      return;
    }
    Alert.alert(title, body, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Dejar de compartir', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + space.md,
        paddingBottom: insets.bottom + space.xxl,
        paddingHorizontal: GUTTER,
        gap: space.xl,
      }}>
      <View style={styles.header}>
        <IconButton icon="back" label="Volver" onPress={() => router.back()} />
        <Txt variant="title" style={{ flex: 1 }}>
          Privacidad y comunidad
        </Txt>
      </View>

      {/* My shared ideas */}
      <View style={{ gap: space.sm + 2 }}>
        <FieldLabel>{`Tus ideas en la comunidad · ${shared.length}`}</FieldLabel>
        {shared.length ? (
          <>
            <View style={styles.list}>
              {shared.map((plan, i) => (
                <View key={plan.id} style={[styles.row, i > 0 && styles.divider]}>
                  <Tap
                    onPress={() => router.push(`/plan/${plan.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`${plan.title}, ${likesLabel(plan.likes)}`}
                    style={styles.planTap}>
                    <Cover cover={plan.cover} photo={plan.photos[0]} height={48} radius={12} style={{ width: 48 }} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt variant="bodyStrong" numberOfLines={1}>
                        {plan.title}
                      </Txt>
                      <View style={styles.likes}>
                        <Icon name="heart" size={13} color={colors.mute} />
                        <Txt variant="caption" color={colors.mute}>
                          {likesLabel(plan.likes)}
                        </Txt>
                      </View>
                    </View>
                  </Tap>
                  <Button label="Quitar" tone="ghost" compact onPress={() => stopSharing([plan])} />
                </View>
              ))}
            </View>
            {shared.length > 1 ? (
              <Button label="Dejar de compartir todas" tone="ghost" onPress={() => stopSharing(shared)} />
            ) : null}
          </>
        ) : !loading ? (
          <View style={styles.empty}>
            <Icon name="globe" size={22} color={colors.indigo} />
            <Txt variant="caption" color={colors.mute} style={{ flex: 1 }}>
              No compartes ninguna idea. Puedes hacerlo al crear un plan o desde su detalle con «Compartir con la
              comunidad».
            </Txt>
          </View>
        ) : null}
      </View>

      {/* Who sees what */}
      <View style={{ gap: space.sm + 2 }}>
        <FieldLabel>Quién ve qué</FieldLabel>
        <View style={styles.list}>
          {AUDIENCES.map((a, i) => (
            <View key={a.title} style={[styles.row, styles.rowTop, i > 0 && styles.divider]}>
              <Icon name={a.icon} size={20} color={colors.indigo} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="bodyStrong">{a.title === 'Tu pareja' && partner ? partner.name : a.title}</Txt>
                <Txt variant="caption" color={colors.mute}>
                  {a.body}
                </Txt>
              </View>
            </View>
          ))}
        </View>
        <Txt variant="caption" color={colors.faint}>
          Tus fechas, tus respuestas a propuestas y lo que guardas son solo tuyos.
        </Txt>
      </View>

      {/* Invite code */}
      <View style={{ gap: space.sm + 2 }}>
        <FieldLabel>Tu código</FieldLabel>
        <View style={[styles.list, styles.row, styles.rowTop]}>
          <Icon name="lock" size={20} color={colors.indigo} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="bodyStrong">Compártelo solo con gente de confianza</Txt>
            <Txt variant="caption" color={colors.mute}>
              Con tu código cualquiera puede conectarse contigo. Si alguien que no conoces aparece en tus conexiones,
              quítalo desde tu perfil.
            </Txt>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function likesLabel(n: number) {
  return n === 1 ? '1 me gusta' : `${n} me gusta`;
}

const useStyles = makeStyles((colors) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  list: { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md + 2 },
  rowTop: { alignItems: 'flex-start' },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  planTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  likes: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
}));
