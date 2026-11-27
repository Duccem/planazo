/**
 * Base64 → bytes, for uploading images to Supabase Storage.
 *
 * We don't read local files with `fetch(file://…)`: in React Native it can answer with an error
 * body ("File not found") instead of throwing, which silently uploads a broken file. Instead,
 * expo-image-manipulator hands us the encoded image as base64 when saving it.
 */
export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
