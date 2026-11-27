// Google sign-in is native-only (Android/iOS). The button is hidden on web.
export type GoogleTokenResult =
  | { type: 'success'; idToken: string }
  | { type: 'cancelled' }
  | { type: 'error'; code: 'play_services' | 'in_progress' | 'no_token' | 'unknown' };

export async function getGoogleIdToken(): Promise<GoogleTokenResult> {
  return { type: 'error', code: 'unknown' };
}

export async function signOutGoogle() {}
