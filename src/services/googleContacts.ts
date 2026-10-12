import { auth, googleProvider, signInWithPopup } from '../firebase/config';
import { GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';

export interface GoogleContactItem {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  photoUrl?: string;
  updatedAt?: string;
}

let cachedAccessToken: string | null = null;
let cachedEmail: string | null = null;

// Clear in-memory token on logout
onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedAccessToken = null;
    cachedEmail = null;
  }
});

export const getCachedContactsToken = () => cachedAccessToken;
export const getCachedContactsEmail = () => cachedEmail;

/**
 * Sign in with Google to obtain OAuth Access Token with contacts.readonly scope
 */
export const signInForGoogleContacts = async (): Promise<{ accessToken: string; email: string }> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google OAuth Access Token not returned. Please try again.');
    }
    cachedAccessToken = credential.accessToken;
    cachedEmail = result.user.email || 'sanzaritourism@gmail.com';
    return {
      accessToken: credential.accessToken,
      email: cachedEmail,
    };
  } catch (error: any) {
    console.error('Google Contacts Auth Error:', error);
    throw new Error(error.message || 'Google Contacts Sign-In failed');
  }
};

/**
 * Normalizes phone number (removes spaces, dashes, braces)
 */
export const cleanPhoneNumber = (raw: string): string => {
  return raw.replace(/[\s\-\(\)]/g, '').trim();
};

/**
 * Fetches latest saved contacts from Google People API
 */
export const fetchGoogleContacts = async (
  accessToken: string,
  pageSize = 1000
): Promise<GoogleContactItem[]> => {
  try {
    const url = `https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers,emailAddresses,photos,metadata&pageSize=${pageSize}&sortOrder=LAST_MODIFIED_DESCENDING`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (response.status === 401) {
      cachedAccessToken = null;
      throw new Error('Google session expired. Please reconnect Google Contacts.');
    }

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Google Contacts API error: ${err}`);
    }

    const data = await response.json();
    const connections = data.connections || [];

    const contacts: GoogleContactItem[] = [];

    for (const person of connections) {
      const names = person.names || [];
      const primaryName = names.find((n: any) => n.metadata?.primary) || names[0];
      const displayName = primaryName?.displayName || primaryName?.givenName || '';

      const phones = person.phoneNumbers || [];
      const primaryPhone = phones.find((p: any) => p.metadata?.primary) || phones[0];
      const phoneNumber = primaryPhone?.value ? cleanPhoneNumber(primaryPhone.value) : '';

      const emails = person.emailAddresses || [];
      const primaryEmail = emails.find((e: any) => e.metadata?.primary) || emails[0];

      const photos = person.photos || [];
      const primaryPhoto = photos.find((ph: any) => !ph.default) || photos[0];

      const contactSource =
        person.metadata?.sources?.find((s: any) => s.updateTime) ||
        person.metadata?.sources?.[0];
      const updateTime = contactSource?.updateTime;

      // Only include contacts with at least a name or phone number
      if (displayName || phoneNumber) {
        contacts.push({
          id: person.resourceName || `contact_${Math.random().toString(36).substring(2, 9)}`,
          name: displayName || 'Unnamed Contact',
          phoneNumber: phoneNumber,
          email: primaryEmail?.value,
          photoUrl: primaryPhoto?.url,
          updatedAt: updateTime,
        });
      }
    }

    // Sort by latest update time descending so newest saved contacts appear at the top
    contacts.sort((a, b) => {
      const tA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tB - tA;
    });

    return contacts;
  } catch (err: any) {
    console.error('Failed to fetch Google Contacts:', err);
    throw err;
  }
};

/**
 * Searches Google People API directly by query
 */
export const searchGoogleContactsApi = async (
  accessToken: string,
  query: string
): Promise<GoogleContactItem[]> => {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(
      query.trim()
    )}&readMask=names,phoneNumbers,emailAddresses,photos&pageSize=30`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (response.status === 401) {
      cachedAccessToken = null;
      throw new Error('Google session expired. Please reconnect.');
    }

    if (!response.ok) {
      // Fallback: searchContacts might return 400 if indexing is in progress; return empty
      return [];
    }

    const data = await response.json();
    const results = data.results || [];

    const contacts: GoogleContactItem[] = [];

    for (const item of results) {
      const person = item.person;
      if (!person) continue;

      const names = person.names || [];
      const primaryName = names.find((n: any) => n.metadata?.primary) || names[0];
      const displayName = primaryName?.displayName || primaryName?.givenName || '';

      const phones = person.phoneNumbers || [];
      const primaryPhone = phones.find((p: any) => p.metadata?.primary) || phones[0];
      const phoneNumber = primaryPhone?.value ? cleanPhoneNumber(primaryPhone.value) : '';

      const emails = person.emailAddresses || [];
      const primaryEmail = emails.find((e: any) => e.metadata?.primary) || emails[0];

      const photos = person.photos || [];
      const primaryPhoto = photos[0];

      if (displayName || phoneNumber) {
        contacts.push({
          id: person.resourceName || `sr_${Math.random().toString(36).substring(2, 9)}`,
          name: displayName || 'Unnamed Contact',
          phoneNumber: phoneNumber,
          email: primaryEmail?.value,
          photoUrl: primaryPhoto?.url,
        });
      }
    }

    return contacts;
  } catch (err) {
    console.warn('People searchContacts fallback:', err);
    return [];
  }
};
