import { randomUUID } from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';

import { base64ToBytes } from './base64';
import { supabase } from './supabase';

/** Public bucket: files at `{user_id}/{uuid}.jpg`. A new picture is a new file, so URLs never go stale. */
export const AVATAR_BUCKET = 'avatars';
const SIDE = 512;

/** `uri` is a local file for the preview; `base64` is the JPEG that gets uploaded. */
export type PickedAvatar = { uri: string; base64: string };

/**
 * Opens the photo picker with a square crop (iOS/Android) and returns a 512×512 JPEG.
 * On web there's no crop UI, so the photo is centre-cropped. Returns null if the user cancels.
 */
export async function pickAvatar(): Promise<PickedAvatar | null> {
  const result = await launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    shape: 'oval',
    quality: 1,
  });
  if (result.canceled || !result.assets[0]) return null;

  const { uri, width, height } = result.assets[0];
  const side = Math.min(width, height);
  let context = ImageManipulator.manipulate(uri);
  if (width !== height) {
    context = context.crop({
      originX: Math.floor((width - side) / 2),
      originY: Math.floor((height - side) / 2),
      width: side,
      height: side,
    });
  }
  if (side > SIDE) context = context.resize({ width: SIDE, height: SIDE });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
  if (!saved.base64) throw new Error('image_encode_failed');
  return { uri: saved.uri, base64: saved.base64 };
}

/** Uploads a prepared picture for this user. Returns its storage path. */
export async function uploadAvatar(userId: string, avatar: PickedAvatar) {
  const path = `${userId}/${randomUUID()}.jpg`;
  const body = base64ToBytes(avatar.base64);
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, body, { contentType: 'image/jpeg', upsert: false });
  return { path, error };
}

/** Public URL for a stored picture, or undefined when there is none. */
export function avatarUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function removeAvatarFile(path: string) {
  return supabase.storage.from(AVATAR_BUCKET).remove([path]);
}
