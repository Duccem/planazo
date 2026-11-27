import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useActions } from '@/data/store';
import type { Plan, PlanPhoto } from '@/data/types';
import { MAX_PHOTOS_PER_PLAN, pickPhotos } from '@/lib/photos';
import { radius, space } from '@/theme/tokens';
import { makeStyles, useColors } from '@/theme/theme';

import { Photo } from './ui/cover';
import { Icon } from './ui/icon';
import { IconButton, Tap } from './ui/primitives';
import { Txt } from './ui/text';

const THUMB = 92;

/**
 * Photos of a plan: a horizontal strip of thumbnails (the first one is the cover) and a full-screen
 * viewer. The owner can add photos, make one the cover and remove them (long press).
 */
export function PlanPhotos({ plan, canEdit }: { plan: Plan; canEdit: boolean }) {
  const colors = useColors();
  const styles = useStyles();
  const { addPhotos, removePhoto, setCoverPhoto } = useActions();
  const [viewing, setViewing] = useState<PlanPhoto | null>(null);
  const [picking, setPicking] = useState(false);

  const room = MAX_PHOTOS_PER_PLAN - plan.photos.length;
  if (!canEdit && plan.photos.length === 0) return null;

  const add = async () => {
    setPicking(true);
    try {
      const picked = await pickPhotos(room);
      if (picked.length) addPhotos(plan.id, picked);
    } catch {
      Alert.alert('No se pudieron abrir tus fotos', 'Revisa los permisos de la app e inténtalo de nuevo.');
    } finally {
      setPicking(false);
    }
  };

  const options = (photo: PlanPhoto, index: number) => {
    if (!canEdit || photo.pending) return;
    const remove = () => removePhoto(plan.id, photo.id);
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('¿Borrar esta foto?')) remove();
      return;
    }
    Alert.alert('Foto del plan', undefined, [
      ...(index > 0 ? [{ text: 'Usar como portada', onPress: () => setCoverPhoto(plan.id, photo.id) }] : []),
      { text: 'Borrar foto', style: 'destructive' as const, onPress: remove },
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  };

  return (
    <View style={{ gap: space.sm + 2 }}>
      <View style={styles.rowBetween}>
        <Txt variant="heading">Fotos</Txt>
        {canEdit && plan.photos.length ? (
          <Txt variant="caption" color={colors.faint}>
            {plan.photos.length}/{MAX_PHOTOS_PER_PLAN} · mantén pulsada para opciones
          </Txt>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {plan.photos.map((photo, i) => (
          <Tap
            key={photo.id}
            onPress={() => setViewing(photo)}
            onLongPress={() => options(photo, i)}
            accessibilityRole="imagebutton"
            accessibilityLabel={i === 0 ? 'Foto de portada' : `Foto ${i + 1}`}
            accessibilityHint={canEdit ? 'Mantén pulsada para usarla de portada o borrarla' : undefined}
            style={styles.thumb}>
            <Photo photo={photo} />
            {photo.pending ? (
              <View style={styles.thumbOverlay}>
                <ActivityIndicator color={colors.white} />
              </View>
            ) : null}
            {i === 0 && !photo.pending ? (
              <View style={styles.coverBadge}>
                <Txt variant="caption" color={colors.white} style={{ fontSize: 10, lineHeight: 13 }}>
                  Portada
                </Txt>
              </View>
            ) : null}
          </Tap>
        ))}

        {canEdit && room > 0 ? (
          <Tap
            onPress={add}
            disabled={picking}
            accessibilityRole="button"
            accessibilityLabel="Añadir fotos"
            style={[styles.thumb, styles.addTile]}>
            {picking ? (
              <ActivityIndicator color={colors.indigo} />
            ) : (
              <>
                <Icon name="plus" size={22} color={colors.indigo} strokeWidth={2.4} />
                <Txt variant="caption" color={colors.indigo}>
                  {plan.photos.length ? 'Añadir' : 'Añadir fotos'}
                </Txt>
              </>
            )}
          </Tap>
        ) : null}
      </ScrollView>

      {canEdit && plan.photos.length === 0 ? (
        <Txt variant="caption" color={colors.mute}>
          La primera foto será la portada del plan.
        </Txt>
      ) : null}

      <PhotoViewer photo={viewing} onClose={() => setViewing(null)} />
    </View>
  );
}

function PhotoViewer({ photo, onClose }: { photo: PlanPhoto | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!photo} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: '#000000EE' }} onPress={onClose} accessibilityLabel="Cerrar foto">
        {photo ? <Photo photo={photo} contentFit="contain" /> : null}
      </Pressable>
      <View style={{ position: 'absolute', top: insets.top + space.sm, right: space.lg }}>
        <IconButton icon="x" label="Cerrar" tone="white" size={40} onPress={onClose} />
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  thumbOverlay: {
    ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const),
    backgroundColor: '#0E0B2466',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: '#0E0B24AA',
  },
  addTile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
    backgroundColor: colors.lilac,
  },
}));
