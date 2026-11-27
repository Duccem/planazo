import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { Cover, Photo } from '@/components/ui/cover';
import { Icon } from '@/components/ui/icon';
import { Button, Chip, Field, FieldLabel, Tap } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { WhenPicker, whenToISO, type WhenValue } from '@/components/when-picker';
import { categories, categoryList, priceLabel } from '@/data/meta';
import { useActions } from '@/data/store';
import type { Category, PriceTier } from '@/data/types';
import { MAX_PHOTOS_PER_PLAN, type PickedPhoto, pickPhotos } from '@/lib/photos';
import { radius, space } from '@/theme/tokens';
import { makeStyles, useColors } from '@/theme/theme';

const PRICES: PriceTier[] = [0, 1, 2, 3];

export default function NewPlanScreen() {
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const { addPlan } = useActions();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [place, setPlace] = useState('');
  const [category, setCategory] = useState<Category>('comida');
  const [price, setPrice] = useState<PriceTier>(1);
  const [when, setWhen] = useState<WhenValue>({ mode: 'someday' });
  const [isPublic, setIsPublic] = useState(false);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [picking, setPicking] = useState(false);

  const addPhotos = async () => {
    setPicking(true);
    try {
      const picked = await pickPhotos(MAX_PHOTOS_PER_PLAN - photos.length);
      setPhotos((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS_PER_PLAN));
    } catch {
      Alert.alert('No se pudieron abrir tus fotos', 'Revisa los permisos de la app e inténtalo de nuevo.');
    } finally {
      setPicking(false);
    }
  };

  const canSave = title.trim().length > 1;

  const save = () => {
    const id = addPlan({
      title: title.trim(),
      description: description.trim(),
      place: place.trim() || undefined,
      category,
      cover: categories[category].cover,
      price,
      date: whenToISO(when),
      isPublic,
    }, photos);
    router.replace(`/plan/${id}`);
  };

  return (
    <Sheet
      title="Nuevo plan"
      subtitle="Una idea para hacer juntos"
      footer={<Button label="Guardar plan" icon="check" disabled={!canSave} onPress={save} />}>
      <View style={styles.preview}>
        <Cover
          cover={categories[category].cover}
          photo={photos[0] ? { id: 'preview', path: '', url: photos[0].uri } : undefined}
          height={96}
        />
        <View style={styles.previewBody}>
          <Txt variant="bodyStrong" numberOfLines={1} color={title ? colors.ink : colors.faint}>
            {title || 'Tu plan'}
          </Txt>
          <Txt variant="caption" color={colors.mute}>
            {categories[category].emoji} {categories[category].label} · {priceLabel(price)}
          </Txt>
        </View>
      </View>

      <Field label="¿Qué plan es?" placeholder="Ej. Cena sorpresa en la playa" value={title} onChangeText={setTitle} autoFocus />
      <Field
        label="Detalles"
        placeholder="Qué haréis, qué llevar, cualquier idea…"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <Field label="Lugar (opcional)" placeholder="Restaurante, parque, ciudad…" value={place} onChangeText={setPlace} />

      <View style={{ gap: space.sm + 2 }}>
        <FieldLabel>Fotos (opcional)</FieldLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {photos.map((ph, i) => (
            <View key={ph.uri} style={styles.thumb}>
              <Photo photo={{ id: ph.uri, path: '', url: ph.uri }} />
              <Tap
                onPress={() => setPhotos((prev) => prev.filter((x) => x.uri !== ph.uri))}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Quitar foto ${i + 1}`}
                style={styles.thumbRemove}>
                <Icon name="x" size={12} color={colors.white} strokeWidth={3} />
              </Tap>
            </View>
          ))}
          {photos.length < MAX_PHOTOS_PER_PLAN ? (
            <Tap
              onPress={addPhotos}
              disabled={picking}
              accessibilityRole="button"
              accessibilityLabel="Añadir fotos"
              style={[styles.thumb, styles.addTile]}>
              {picking ? (
                <ActivityIndicator color={colors.indigo} />
              ) : (
                <>
                  <Icon name="plus" size={20} color={colors.indigo} strokeWidth={2.4} />
                  <Txt variant="caption" color={colors.indigo}>
                    Añadir
                  </Txt>
                </>
              )}
            </Tap>
          ) : null}
        </ScrollView>
        <Txt variant="caption" color={colors.faint}>
          La primera será la portada. Si no añades ninguna, usamos una ilustración.
        </Txt>
      </View>

      <View style={{ gap: space.sm + 2 }}>
        <FieldLabel>Tipo de plan</FieldLabel>
        <View style={styles.grid}>
          {categoryList.map((c) => {
            const on = c === category;
            return (
              <Tap
                key={c}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => setCategory(c)}
                style={[styles.cat, on && styles.catOn]}>
                <Txt style={{ fontSize: 22, lineHeight: 28 }}>{categories[c].emoji}</Txt>
                <Txt variant="label" color={on ? colors.white : colors.ink}>
                  {categories[c].label}
                </Txt>
              </Tap>
            );
          })}
        </View>
      </View>

      <View style={{ gap: space.sm + 2 }}>
        <FieldLabel>Presupuesto por persona</FieldLabel>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {PRICES.map((p) => (
            <Chip key={p} label={priceLabel(p)} tone="plain" selected={p === price} onPress={() => setPrice(p)} />
          ))}
        </View>
      </View>

      <View style={{ gap: space.sm + 2 }}>
        <FieldLabel>¿Cuándo?</FieldLabel>
        <WhenPicker value={when} onChange={setWhen} />
      </View>

      <View style={styles.publicRow}>
        <Icon name="globe" size={22} color={colors.indigo} />
        <View style={{ flex: 1 }}>
          <Txt variant="bodyStrong">Compartir con la comunidad</Txt>
          <Txt variant="caption" color={colors.mute}>
            Se publica la idea, nunca la fecha ni con quién vas
          </Txt>
        </View>
        <Switch
          value={isPublic}
          onValueChange={setIsPublic}
          trackColor={{ true: colors.indigo, false: colors.line }}
          thumbColor={colors.white}
        />
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles((colors) => ({
  preview: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface },
  previewBody: { padding: space.md, gap: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cat: {
    flexBasis: '31%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  catOn: { backgroundColor: colors.indigo },
  thumb: { width: 76, height: 76, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface },
  thumbRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0E0B24AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
    backgroundColor: colors.lilac,
  },
  publicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
}));
