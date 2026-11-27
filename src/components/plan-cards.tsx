import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { categories, priceLabel, responseMeta } from '@/data/meta';
import { useActions, usePeople } from '@/data/store';
import type { Invitation, Person, Plan } from '@/data/types';
import { formatDateTime, formatShortDate, relativeDay, timeAgo } from '@/lib/dates';
import { fonts, radius, space } from '@/theme/tokens';
import { makeStyles, useColors } from '@/theme/theme';

import { Cover } from './ui/cover';
import { Icon } from './ui/icon';
import { Avatar, AvatarStack, Button, Chip, IconButton, ProgressBar, Tap } from './ui/primitives';
import { Txt } from './ui/text';

function useSharedPeople(plan: Plan) {
  const people = usePeople();
  return plan.sharedWith
    .map((s) => ({ ...s, person: people.find((p) => p.id === s.personId) }))
    .filter((s): s is typeof s & { person: Person } => !!s.person);
}

export function planWhen(plan: Plan) {
  if (plan.done) return plan.date ? `Hecho · ${formatShortDate(plan.date)}` : 'Hecho';
  if (plan.date) return formatDateTime(plan.date);
  return 'Algún día';
}

/* ---------- Big "next plan" card on Inicio ---------- */

export function NextPlanCard({ plan }: { plan: Plan }) {
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const shared = useSharedPeople(plan);
  const yes = shared.filter((s) => s.response === 'si').length;
  return (
    <Tap onPress={() => router.push(`/plan/${plan.id}`)} style={styles.card}>
      <Cover cover={plan.cover} height={130} />
      <View style={styles.cardBody}>
        <View style={styles.rowBetween}>
          <Txt variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
            {plan.title}
          </Txt>
          {plan.date ? <Chip label={relativeDay(plan.date)} /> : null}
        </View>
        <Txt variant="label" color={colors.mute}>
          {planWhen(plan)}
          {plan.place ? ` · ${plan.place}` : ''}
        </Txt>
        {shared.length > 0 ? (
          <View style={[styles.row, { marginTop: 4 }]}>
            <View style={{ flex: 1 }}>
              <ProgressBar value={yes / shared.length} />
            </View>
            <Txt variant="caption" color={colors.mute}>
              {yes} de {shared.length} confirmados
            </Txt>
          </View>
        ) : null}
      </View>
    </Tap>
  );
}

/* ---------- Community feed card ---------- */

export function FeedCard({ plan }: { plan: Plan }) {
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const { toggleLike, setSaved } = useActions();
  const cat = categories[plan.category];
  return (
    <Tap onPress={() => router.push(`/plan/${plan.id}`)} style={styles.card}>
      <View>
        <Cover cover={plan.cover} height={170} />
        <View style={styles.coverChips}>
          <Chip label={`${cat.emoji} ${cat.label}`} tone="plain" />
        </View>
      </View>
      <View style={styles.cardBody}>
        {plan.author ? (
          <View style={styles.row}>
            <Avatar initial={plan.author.initial} color={plan.author.color} size={24} ring={colors.surface} />
            <Txt variant="label" color={colors.mute} style={{ flex: 1 }} numberOfLines={1}>
              {plan.author.name} · {timeAgo(plan.createdAt)}
            </Txt>
          </View>
        ) : null}
        <Txt variant="heading" numberOfLines={2}>
          {plan.title}
        </Txt>
        <Txt color={colors.mute} numberOfLines={2}>
          {plan.description}
        </Txt>
        <View style={[styles.row, { gap: 6, flexWrap: 'wrap' }]}>
          <Chip label={priceLabel(plan.price)} icon="wallet" />
          {plan.durationLabel ? <Chip label={plan.durationLabel} icon="clock" /> : null}
        </View>
        <View style={[styles.rowBetween, { marginTop: 6 }]}>
          <Tap
            onPress={() => toggleLike(plan.id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={plan.likedByMe ? 'Quitar me gusta' : 'Me gusta'}
            style={styles.row}>
            <Icon
              name="heart"
              size={22}
              color={plan.likedByMe ? colors.coral : colors.mute}
              fill={plan.likedByMe ? colors.coral : 'none'}
            />
            <Txt variant="label" color={plan.likedByMe ? colors.coralDeep : colors.mute}>
              {plan.likes}
            </Txt>
          </Tap>
          <View style={[styles.row, { gap: space.sm }]}>
            <IconButton
              icon="send"
              label="Enviar a alguien"
              size={40}
              onPress={() => router.push(`/enviar/${plan.id}`)}
            />
            <Button
              compact
              tone={plan.inMyList ? 'soft' : 'primary'}
              icon={plan.inMyList ? 'check' : 'bookmark'}
              label={plan.inMyList ? 'En mi lista' : 'Guardar'}
              onPress={() => setSaved(plan.id, !plan.inMyList)}
            />
          </View>
        </View>
      </View>
    </Tap>
  );
}

/* ---------- Compact row for "Planes" ---------- */

export function PlanRow({ plan }: { plan: Plan }) {
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const shared = useSharedPeople(plan);
  return (
    <Tap onPress={() => router.push(`/plan/${plan.id}`)} style={styles.rowCard}>
      <Cover cover={plan.cover} height={76} radius={16} style={{ width: 76 }} />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt variant="bodyStrong" numberOfLines={1}>
          {plan.title}
        </Txt>
        <View style={styles.row}>
          <Icon name={plan.date ? 'calendar' : 'infinity'} size={14} color={colors.mute} />
          <Txt variant="label" color={colors.mute} numberOfLines={1} style={{ flex: 1 }}>
            {planWhen(plan)}
          </Txt>
        </View>
        <View style={styles.rowBetween}>
          {shared.length > 0 ? (
            <AvatarStack people={shared.map((s) => s.person)} size={24} />
          ) : (
            <Txt variant="caption" color={colors.faint}>
              Sin compartir
            </Txt>
          )}
          {plan.date && !plan.done ? <Chip label={relativeDay(plan.date)} /> : null}
          {plan.isPublic ? <Icon name="globe" size={16} color={colors.faint} /> : null}
        </View>
      </View>
      <Icon name="chevron" size={18} color={colors.faint} />
    </Tap>
  );
}

/* ---------- Incoming invitation ---------- */

export function InvitationCard({
  invitation,
  plan,
  wide,
}: {
  invitation: Invitation;
  plan: Plan;
  wide?: boolean;
}) {
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const people = usePeople();
  const { respond } = useActions();
  const from = people.find((p) => p.id === invitation.fromId);
  const answered = invitation.myResponse !== 'pendiente';
  const r = responseMeta[invitation.myResponse];
  return (
    <Tap onPress={() => router.push(`/plan/${plan.id}`)} style={[styles.invite, wide ? { width: '100%' } : { width: 290 }]}>
      <View style={styles.row}>
        {from ? <Avatar initial={from.initial} color={from.color} size={30} ring={colors.indigo} /> : null}
        <Txt variant="label" color="#DCD8FF" style={{ flex: 1 }} numberOfLines={1}>
          <Txt variant="label" color={colors.white} style={{ fontFamily: fonts.bold }}>
            {from?.name ?? 'Alguien'}
          </Txt>{' '}
          te propone · {timeAgo(invitation.sentAt)}
        </Txt>
      </View>
      <View style={[styles.row, { gap: space.md }]}>
        <Cover cover={plan.cover} height={56} radius={14} style={{ width: 56 }} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="bodyStrong" color={colors.white} numberOfLines={1}>
            {plan.title}
          </Txt>
          <Txt variant="label" color="#DCD8FF" numberOfLines={1}>
            {planWhen(plan)}
          </Txt>
        </View>
      </View>
      {invitation.note ? (
        <Txt variant="label" color={colors.white} style={styles.note} numberOfLines={2}>
          “{invitation.note}”
        </Txt>
      ) : null}
      {answered ? (
        <Chip label={`Respondiste: ${r.label}`} tone={r.tone} icon={r.icon} />
      ) : (
        <View style={[styles.row, { gap: space.sm }]}>
          <Button compact tone="white" icon="check" label="¡Va!" style={{ flex: 1 }} onPress={() => respond(invitation.id, 'si')} />
          <Button compact tone="soft" label="Quizás" style={{ flex: 1 }} onPress={() => respond(invitation.id, 'quizas')} />
          <IconButton icon="x" label="No me apetece" tone="coral" size={38} onPress={() => respond(invitation.id, 'no')} />
        </View>
      )}
    </Tap>
  );
}

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  card: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface },
  cardBody: { padding: space.lg - 2, gap: 6 },
  coverChips: { position: 'absolute', top: space.md, left: space.md },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.sm + 2,
    paddingRight: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  invite: {
    backgroundColor: colors.indigo,
    borderRadius: radius.lg,
    padding: space.lg - 2,
    gap: space.md,
  },
  note: { fontFamily: fonts.medium, fontStyle: 'italic', opacity: 0.92 },
}));
