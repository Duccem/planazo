import { randomUUID } from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';

import { base64ToBytes } from './base64';
import { supabase } from './supabase';

export const PHOTO_BUCKET = 'plan-photos';
/** Same limit the database enforces. */
export const MAX_PHOTOS_PER_PLAN = 10;
/** Signed URLs last an hour; the app re-signs on every refresh (and on returning to the app). */
const SIGNED_URL_TTL = 60 * 60;
const MAX_SIDE = 1600;

/** `uri` is a local file for previews; `base64` is the JPEG that gets uploaded. */
export type PickedPhoto = { uri: string; base64: string; width: number; height: number };

/**
 * Opens the system photo picker and returns the chosen photos, already downscaled to at most
 * 1600px and re-encoded as JPEG (photos from the camera roll are often 5–10 MB).
 * Returns [] if the user cancels.
 */
export async function pickPhotos(limit: number): Promise<PickedPhoto[]> {
  if (limit <= 0) return [];
  const result = await launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 1,
  });
  if (result.canceled) return [];

  return Promise.all(
    result.assets.slice(0, limit).map(async (asset) => {
      const landscape = asset.width >= asset.height;
      let context = ImageManipulator.manipulate(asset.uri);
      if (Math.max(asset.width, asset.height) > MAX_SIDE) {
        context = context.resize(landscape ? { width: MAX_SIDE } : { height: MAX_SIDE });
      }
      const image = await context.renderAsync();
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
      if (!saved.base64) throw new Error('image_encode_failed');
      return { uri: saved.uri, base64: saved.base64, width: saved.width, height: saved.height };
    }),
  );
}

/** Uploads one prepared photo to `{planId}/{photoId}.jpg`. Returns its id and storage path. */
export async function uploadPhoto(planId: string, photo: PickedPhoto) {
  const id = randomUUID();
  const path = `${planId}/${id}.jpg`;
  const body = base64ToBytes(photo.base64);
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, body, { contentType: 'image/jpeg', upsert: false });
  return { id, path, error };
}

/** Signed URLs for many paths in one request: path → URL (paths that fail are left out). */
export async function signPhotoUrls(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (!paths.length) return urls;
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}

export function removePhotoFiles(paths: string[]) {
  return supabase.storage.from(PHOTO_BUCKET).remove(paths);
}
