import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

/*
 * Native Google sign-in (Android Credential Manager / iOS Google Sign-In SDK).
 * It returns a Google ID token that we hand to Supabase with signInWithIdToken.
 *
 * webClientId must be the *Web* OAuth client: it is the audience of the ID token, and it is
 * the one configured in Supabase (Authentication → Providers → Google).
 */
let configured = false;

function configure() {
  if (configured) return;
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    scopes: ['email', 'profile'],
  });
  configured = true;
}

export type GoogleTokenResult =
  | { type: 'success'; idToken: string }
  | { type: 'cancelled' }
  | { type: 'error'; code: 'play_services' | 'in_progress' | 'no_token' | 'unknown' };

export async function getGoogleIdToken(): Promise<GoogleTokenResult> {
  configure();
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
  try {
    configure();
    if (GoogleSignin.hasPreviousSignIn()) await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google: nothing to clear.
  }
}
