import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { planWhen } from '@/components/plan-cards';
import { PlanPhotos } from '@/components/plan-photos';
import { Cover } from '@/components/ui/cover';
import { Icon, type IconName } from '@/components/ui/icon';
import { Avatar, Button, Chip, EmptyState, IconButton, Tap } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { categories, priceLabel, responseMeta } from '@/data/meta';
import { useActions, useInvitationForPlan, usePeople, usePerson, usePlan } from '@/data/store';
import { relativeDay } from '@/lib/dates';
import { fonts, GUTTER, radius, space } from '@/theme/tokens';
import { makeStyles, useColors } from '@/theme/theme';

export default function PlanDetailScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plan = usePlan(id);
  const people = usePeople();
  const invitation = useInvitationForPlan(id);
  const from = usePerson(invitation?.fromId);
  const actions = useActions();

  if (!plan) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + space.xl, paddingHorizontal: GUTTER }}>
        <EmptyState icon="compass" title="Este plan ya no existe" body="Puede que lo hayan borrado." action="Volver" onAction={() => router.back()} />
      </View>
    );
  }

  const cat = categories[plan.category];
  const isCommunity = !!plan.author;
  const pendingInvite = invitation?.myResponse === 'pendiente';
  const shared = plan.sharedWith
    .map((s) => ({ ...s, person: people.find((p) => p.id === s.personId) }))
    .filter((s) => s.person);

  const facts: { icon: IconName; label: string; value: string }[] = [
    { icon: plan.date ? 'calendar' : 'infinity', label: 'Cuándo', value: planWhen(plan) },
    ...(plan.place ? [{ icon: 'pin' as const, label: 'Dónde', value: plan.place }] : []),
    { icon: 'wallet', label: 'Presupuesto', value: priceLabel(plan.price) },
    ...(plan.durationLabel ? [{ icon: 'clock' as const, label: 'Duración', value: plan.durationLabel }] : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
        <Cover cover={plan.cover} photo={plan.photos[0]} height={260 + insets.top} />

        <View style={styles.sheet}>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Chip label={`${cat.emoji} ${cat.label}`} />
            {plan.date && !plan.done ? <Chip label={relativeDay(plan.date)} tone="sun" icon="calendar" /> : null}
            {plan.done ? <Chip label="Hecho" tone="mint" icon="check" /> : null}
            {plan.isPublic && !isCommunity ? <Chip label="En la comunidad" tone="plain" icon="globe" /> : null}
          </View>

          <Txt variant="display">{plan.title}</Txt>

          {plan.author ? (
            <View style={styles.row}>
              <Avatar initial={plan.author.initial} color={plan.author.color} size={30} ring={colors.bg} />
              <Txt variant="label" color={colors.mute} style={{ flex: 1 }}>
                {plan.isPublic ? 'Compartido por' : 'Plan de'} <Txt variant="label">{plan.author.name}</Txt>
                {plan.isPublic ? ` · ${plan.likes} me gusta` : ''}
              </Txt>
            </View>
          ) : null}

          <Txt color={colors.mute} style={{ fontSize: 16, lineHeight: 24 }}>
            {plan.description}
          </Txt>

          <View style={styles.facts}>
            {facts.map((f) => (
              <View key={f.label} style={styles.fact}>
                <Icon name={f.icon} size={18} color={colors.indigo} />
                <Txt variant="caption" color={colors.mute}>
                  {f.label}
                </Txt>
                <Txt variant="bodyStrong" numberOfLines={2}>
                  {f.value}
                </Txt>
              </View>
            ))}
          </View>

          {/* Photos: anyone who sees the plan sees them; only its creator edits them. */}
          <PlanPhotos plan={plan} canEdit={!plan.author} />

          {/* Invitation from someone */}
          {invitation && from ? (
            <View style={styles.invite}>
              <View style={styles.row}>
                <Avatar initial={from.initial} color={from.color} size={34} ring={colors.indigo} />
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyStrong" color={colors.white}>
                    {from.name} te propone este plan
                  </Txt>
                  {invitation.note ? (
                    <Txt variant="label" color="#DCD8FF" style={{ fontStyle: 'italic' }}>
                      “{invitation.note}”
                    </Txt>
                  ) : null}
                </View>
              </View>
              {pendingInvite ? (
                <View style={[styles.row, { gap: space.sm }]}>
                  <Button tone="white" icon="check" label="¡Va!" style={{ flex: 1 }} onPress={() => actions.respond(invitation.id, 'si')} />
                  <Button tone="soft" label="Quizás" style={{ flex: 1 }} onPress={() => actions.respond(invitation.id, 'quizas')} />
                  <IconButton icon="x" tone="coral" label="No me apetece" size={50} onPress={() => actions.respond(invitation.id, 'no')} />
                </View>
              ) : (
                <View style={styles.rowBetween}>
                  <Chip
                    label={`Respondiste: ${responseMeta[invitation.myResponse].label}`}
                    tone={responseMeta[invitation.myResponse].tone}
                    icon={responseMeta[invitation.myResponse].icon}
                  />
                  <Tap onPress={() => actions.respond(invitation.id, 'pendiente')} hitSlop={8}>
                    <Txt variant="label" color={colors.white}>
                      Cambiar
                    </Txt>
                  </Tap>
                </View>
              )}
            </View>
          ) : null}

          {/* Who's in */}
          {plan.inMyList ? (
            <View style={{ gap: space.sm + 2 }}>
              <View style={styles.rowBetween}>
                <Txt variant="heading">¿Quién se apunta?</Txt>
                <Tap onPress={() => router.push(`/enviar/${plan.id}`)} hitSlop={8}>
                  <Txt variant="label" color={colors.indigo}>
                    + Invitar
                  </Txt>
                </Tap>
              </View>
              {shared.length === 0 ? (
                <Txt color={colors.mute}>Aún no se lo has enviado a nadie.</Txt>
              ) : (
                <View style={styles.list}>
                  {shared.map((s, i) => {
                    const r = responseMeta[s.response];
                    return (
                      <View key={s.personId} style={[styles.listRow, i > 0 && styles.divider]}>
                        <Avatar initial={s.person!.initial} color={s.person!.color} size={34} ring={colors.surface} />
                        <Txt variant="bodyStrong" style={{ flex: 1 }}>
                          {s.person!.name}
                        </Txt>
                        <Chip label={r.label} tone={r.tone} icon={r.icon} />
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}

          {/* Settings for my plans */}
          {plan.inMyList ? (
            <View style={styles.list}>
              {!isCommunity ? (
                <View style={styles.listRow}>
                  <Icon name="globe" size={20} color={colors.indigo} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="bodyStrong">Compartir con la comunidad</Txt>
                    <Txt variant="caption" color={colors.mute}>
                      Otras parejas y grupos podrán inspirarse
                    </Txt>
                  </View>
                  <Switch
                    value={plan.isPublic}
                    onValueChange={(v) => actions.setPublic(plan.id, v)}
                    trackColor={{ true: colors.indigo, false: colors.line }}
                    thumbColor={colors.white}
                  />
                </View>
              ) : null}
              {plan.date || plan.done ? (
                <Tap
                  onPress={() => actions.markDone(plan.id, !plan.done)}
                  style={[styles.listRow, !isCommunity && styles.divider]}>
                  <Icon name="check" size={20} color={colors.mintDeep} />
                  <Txt variant="bodyStrong" style={{ flex: 1 }}>
                    {plan.done ? 'Marcar como pendiente' : '¡Ya lo hicimos!'}
                  </Txt>
                </Tap>
              ) : null}
              <Tap
                onPress={() => {
                  if (isCommunity || invitation) actions.setSaved(plan.id, false);
                  else actions.removePlan(plan.id);
                  router.back();
                }}
                style={[styles.listRow, styles.divider]}>
                <Icon name="trash" size={20} color={colors.coralDeep} />
                <Txt variant="bodyStrong" color={colors.coralDeep} style={{ flex: 1 }}>
                  {isCommunity || invitation ? 'Quitar de mi lista' : 'Borrar plan'}
                </Txt>
              </Tap>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Floating back + like */}
      <View style={[styles.topBar, { top: insets.top + space.sm }]}>
        <IconButton icon="back" label="Volver" tone="white" onPress={() => router.back()} />
        {isCommunity && plan.isPublic ? (
          <Tap
            accessibilityRole="button"
            accessibilityLabel="Me gusta"
            onPress={() => actions.toggleLike(plan.id)}
            style={styles.likeBtn}>
            <Icon name="heart" size={20} color={colors.coral} fill={plan.likedByMe ? colors.coral : 'none'} />
            <Txt variant="label" style={{ fontFamily: fonts.bold }}>
              {plan.likes}
            </Txt>
          </Tap>
        ) : null}
      </View>

      {/* Bottom actions */}
      {!pendingInvite ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
          {plan.inMyList ? (
            <Button
              label={plan.done ? 'Repetir plan' : plan.date ? 'Cambiar fecha' : 'Ponerle fecha'}
              icon="calendar"
              style={{ flex: 1 }}
              onPress={() => router.push(`/agendar/${plan.id}`)}
            />
          ) : (
            <Button label="Guardar en mi lista" icon="bookmark" style={{ flex: 1 }} onPress={() => actions.setSaved(plan.id, true)} />
          )}
          <Button label="Enviar" icon="send" tone="soft" onPress={() => router.push(`/enviar/${plan.id}`)} />
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  sheet: {
    marginTop: -28,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.bg,
    paddingHorizontal: GUTTER,
    paddingTop: space.xl,
    gap: space.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  fact: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: 3,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  invite: { backgroundColor: colors.indigo, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  list: { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md + 2, minHeight: 56 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  topBar: {
    position: 'absolute',
    left: GUTTER,
    right: GUTTER,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
  },
  footer: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: GUTTER,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
}));
