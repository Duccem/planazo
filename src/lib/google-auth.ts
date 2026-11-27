import { TurboModuleRegistry } from 'react-native';

/*
 * Native Google sign-in (Android Credential Manager / iOS Google Sign-In SDK).
 * It returns a Google ID token that we hand to Supabase with signInWithIdToken.
 *
 * webClientId must be the *Web* OAuth client: it is the audience of the ID token, and it is
 * the one configured in Supabase (Authentication → Providers → Google).
 *
 * The library is loaded lazily: importing it in a binary without its native module (Expo Go, or a
 * development build made before it was added) throws at startup. This way only Google sign-in fails.
 */
type GoogleSigninLib = typeof import('@react-native-google-signin/google-signin');

let lib: GoogleSigninLib | null | undefined;

function load(): GoogleSigninLib | null {
  if (lib !== undefined) return lib;
  if (!TurboModuleRegistry.get('RNGoogleSignin')) {
    console.warn('[google-auth] RNGoogleSignin is not in this binary. Make a new development build.');
    lib = null;
    return lib;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  lib = require('@react-native-google-signin/google-signin') as GoogleSigninLib;
  lib.GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    scopes: ['email', 'profile'],
  });
  return lib;
}

export type GoogleTokenResult =
  | { type: 'success'; idToken: string }
  | { type: 'cancelled' }
  | { type: 'error'; code: 'play_services' | 'in_progress' | 'no_token' | 'unavailable' | 'unknown' };

export async function getGoogleIdToken(): Promise<GoogleTokenResult> {
  const google = load();
  if (!google) return { type: 'error', code: 'unavailable' };
  const { GoogleSignin, isCancelledResponse, isErrorWithCode, statusCodes } = google;
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return { type: 'cancelled' };
    const idToken = response.data.idToken;
    if (!idToken) return { type: 'error', code: 'no_token' };
    return { type: 'success', idToken };
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return { type: 'cancelled' };
      if (error.code === statusCodes.IN_PROGRESS) return { type: 'error', code: 'in_progress' };
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return { type: 'error', code: 'play_services' };
    }
    console.warn('[google-auth]', error);
    return { type: 'error', code: 'unknown' };
  }
}

/** Forget the Google account so the next sign-in shows the account picker again. */
export async function signOutGoogle() {
  const google = load();
  if (!google) return;
  try {
    if (google.GoogleSignin.hasPreviousSignIn()) await google.GoogleSignin.signOut();
  } catch {
    // Not signed in with Google: nothing to clear.
  }
}
