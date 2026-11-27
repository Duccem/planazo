import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Share, StyleSheet, View } from 'react-native';

import { TabScreen } from '@/components/screen';
import { Icon, type IconName } from '@/components/ui/icon';
import { LogoMark } from '@/components/ui/logo';
import { Avatar, Button, Chip, Tap } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { useAuth } from '@/data/auth';
import { useSocialLoading } from '@/data/social';
import { useActions, useMe, useMyPlans, usePeople, useWishes } from '@/data/store';
import type { Person } from '@/data/types';
import { type PickedAvatar, pickAvatar } from '@/lib/avatars';
import { radius, space } from '@/theme/tokens';
import { makeStyles, useColors } from '@/theme/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const colors = useColors();
  const styles = useStyles();
  const me = useMe();
  const people = usePeople();
  const { scheduled, someday, done } = useMyPlans();
  const wishes = useWishes();
  const loading = useSocialLoading();
  const { removeConnection, changeAvatar } = useActions();
  // Local file shown while the new picture uploads.
  const [uploadingUri, setUploadingUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const saveAvatar = async (avatar: PickedAvatar | null) => {
    setBusy(true);
    setUploadingUri(avatar?.uri ?? null);
    const { error } = await changeAvatar(avatar);
    setBusy(false);
    setUploadingUri(null);
    if (error) Alert.alert('No se pudo cambiar tu foto', error);
  };

  const chooseAvatar = async () => {
    let avatar: PickedAvatar | null;
    try {
      avatar = await pickAvatar();
    } catch {
      Alert.alert('No se pudieron abrir tus fotos', 'Revisa los permisos de la app e inténtalo de nuevo.');
      return;
    }
    if (avatar) await saveAvatar(avatar);
  };

  const editAvatar = () => {
    if (busy) return;
    // react-native-web's Alert has no buttons.
    if (!me.avatarUrl || Platform.OS === 'web') {
      void chooseAvatar();
      return;
    }
    Alert.alert('Foto de perfil', undefined, [
      { text: 'Elegir otra foto', onPress: () => void chooseAvatar() },
      { text: 'Quitar foto', style: 'destructive', onPress: () => void saveAvatar(null) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };
  const partner = people.find((p) => p.relation === 'pareja');
  const friends = people.filter((p) => p.relation === 'amigo');

  return (
    <TabScreen title="Perfil">
      {/* Me */}
      <View style={styles.meRow}>
        <Tap
          onPress={editAvatar}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Cambiar foto de perfil"
          style={styles.avatarButton}>
          <Avatar initial={me.initial} color={me.color} uri={uploadingUri ?? me.avatarUrl} size={68} ring={colors.lilac} />
          {busy ? (
            <View style={styles.avatarBusy}>
              <ActivityIndicator color={colors.white} />
            </View>
          ) : null}
          <View style={styles.avatarBadge}>
            <Icon name="camera" size={14} color={colors.white} strokeWidth={2.2} />
          </View>
        </Tap>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="title" numberOfLines={1}>
            {me.name}
          </Txt>
          {me.email ? (
            <Txt variant="label" color={colors.mute} numberOfLines={1}>
              {me.email}
            </Txt>
          ) : null}
          <View style={{ marginTop: space.xs }}>
            <Chip label={`En Planazo desde ${memberSince(me.memberSince)}`} icon="heart" />
          </View>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat value={scheduled.length + someday.length} label="Por hacer" />
        <Stat value={done.length} label="Planazos" />
        <Stat value={wishes.filter((w) => w.done).length} label="Deseos" />
      </View>

      {/* Partner */}
      {partner ? (
        <Tap
          onPress={() => confirmRemove(partner, removeConnection)}
          accessibilityRole="button"
          accessibilityHint="Opciones de la conexión con tu pareja"
          style={styles.couple}>
          <View style={styles.coupleAvatars}>
            <Avatar initial={me.initial} color={me.color} uri={me.avatarUrl} size={44} ring={colors.indigo} />
            <View style={{ marginLeft: -12 }}>
              <Avatar
                initial={partner.initial}
                color={partner.color}
                uri={partner.avatarUrl}
                size={44}
                ring={colors.indigo}
              />
            </View>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="label" color="#DCD8FF">
              Tu pareja
            </Txt>
            <Txt variant="heading" color={colors.white}>
              {me.name} & {partner.name}
            </Txt>
          </View>
          <LogoMark size={34} color={colors.white} m3={colors.indigo} />
        </Tap>
      ) : !loading ? (
        <Tap
          onPress={() => router.push({ pathname: '/codigo', params: { relation: 'pareja' } })}
          accessibilityRole="button"
          style={[styles.couple, styles.coupleEmpty]}>
          <LogoMark size={40} color={colors.indigo} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="heading">Conecta con tu pareja</Txt>
            <Txt variant="caption" color={colors.mute}>
              Compartid deseos y planes. Escribe su código o pásale el tuyo.
            </Txt>
          </View>
          <Icon name="chevron" size={18} color={colors.faint} />
        </Tap>
      ) : null}

      {/* Friends */}
      <View style={{ gap: space.sm + 2 }}>
        <Txt variant="label" color={colors.mute}>
          AMIGOS · {friends.length}
        </Txt>
        {friends.length ? (
          <View style={styles.list}>
            {friends.map((f, i) => (
              <Tap
                key={f.id}
                onPress={() => confirmRemove(f, removeConnection)}
                accessibilityRole="button"
                accessibilityHint="Opciones de esta conexión"
                style={[styles.listRow, i > 0 && styles.divider]}>
                <Avatar initial={f.initial} color={f.color} uri={f.avatarUrl} size={36} ring={colors.surface} />
                <Txt variant="bodyStrong" style={{ flex: 1 }}>
                  {f.name}
                </Txt>
                <Chip label="Amigo" />
              </Tap>
            ))}
          </View>
        ) : !loading ? (
          <Txt variant="caption" color={colors.mute}>
            Aún no tienes amigos en Planazo. Pásales tu código para planear juntos.
          </Txt>
        ) : null}
      </View>

      {/* Invite */}
      <View style={styles.invite}>
        <Txt variant="label" color={colors.mute} align="center">
          Tu código para invitar
        </Txt>
        <Txt variant="display" color={colors.indigo} align="center" style={{ letterSpacing: 1 }}>
          {me.inviteCode || '····'}
        </Txt>
        <Txt variant="caption" color={colors.mute} align="center">
          Compártelo con tu pareja o amigos para planear juntos
        </Txt>
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
          <Button
            label="Compartir"
            icon="send"
            style={{ flex: 1 }}
            disabled={!me.inviteCode}
            onPress={() => shareCode(me.name, me.inviteCode)}
          />
          <Button
            label="Tengo un código"
            tone="soft"
            style={{ flex: 1 }}
            onPress={() => router.push('/codigo')}
          />
        </View>
      </View>

      {/* Settings */}
      <View style={styles.list}>
        {(
          [
            ['bell', 'Notificaciones', () => router.push('/notificaciones')],
            ['globe', 'Privacidad y comunidad'],
            ['settings', 'Ajustes', () => router.push('/ajustes')],
            ['lock', 'Cerrar sesión', () => confirmSignOut(signOut)],
          ] as [IconName, string, (() => void)?][]
        ).map(([icon, label, onPress], i) => (
          <Tap key={label} onPress={onPress} accessibilityRole="button" style={[styles.listRow, i > 0 && styles.divider]}>
            <Icon name={icon} size={20} color={colors.indigo} />
            <Txt variant="bodyStrong" style={{ flex: 1 }}>
              {label}
            </Txt>
            <Icon name="chevron" size={18} color={colors.faint} />
          </Tap>
        ))}
      </View>
    </TabScreen>
  );
}

const monthYear = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' });

/** "noviembre de 2026" → "noviembre 2026". */
function memberSince(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 'hoy' : monthYear.format(date).replace(' de ', ' ');
}

function shareCode(name: string, code: string) {
  void Share.share({
    message: `${name} te invita a Planazo para hacer planes juntos. Usa mi código: ${code}`,
  });
}

function confirmRemove(person: Person, remove: (id: string) => Promise<{ error: string | null }>) {
  const what = person.relation === 'pareja' ? 'tu pareja' : 'tus amigos';
  const run = async () => {
    const { error } = await remove(person.id);
    if (error) Alert.alert('No se pudo eliminar', error);
  };
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`¿Quitar a ${person.name} de ${what}?`)) void run();
    return;
  }
  Alert.alert(
    person.name,
    person.relation === 'pareja'
      ? 'Si dejáis de estar conectados, dejaréis de ver los deseos del otro.'
      : 'Dejaréis de poder enviaros planes.',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: `Quitar de ${what}`, style: 'destructive', onPress: () => void run() },
    ],
  );
}

/** The root layout's guard sends the user to the login once the session is gone. */
function confirmSignOut(signOut: () => Promise<{ error: string | null }>) {
  // react-native-web's Alert has no buttons.
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.('¿Cerrar sesión?')) void signOut();
    return;
  }
  Alert.alert('¿Cerrar sesión?', 'Tendrás que volver a entrar con tu correo y contraseña.', [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Cerrar sesión',
      style: 'destructive',
      onPress: async () => {
        const { error } = await signOut();
        if (error) Alert.alert('No se pudo cerrar sesión', error);
      },
    },
  ]);
}

function Stat({ value, label }: { value: number; label: string }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Txt variant="title" color={colors.indigo}>
        {value}
      </Txt>
      <Txt variant="caption" color={colors.mute}>
        {label}
      </Txt>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  meRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  avatarButton: { width: 68, height: 68 },
  avatarBusy: {
    ...StyleSheet.absoluteFill,
    borderRadius: 34,
    backgroundColor: 'rgba(23, 18, 61, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.indigo,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: space.md + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  couple: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.indigo,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  coupleAvatars: { flexDirection: 'row' },
  coupleEmpty: { backgroundColor: colors.lilac },
  list: { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md + 2, minHeight: 56 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  invite: {
    gap: 6,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderStyle: 'dashed',
  },
}));
