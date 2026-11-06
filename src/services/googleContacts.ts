import { auth, db, googleProvider, signInWithPopup } from '../firebase/config';
import { GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface GoogleContactItem {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  photoUrl?: string;
  updatedAt?: string;
}

const LOCAL_CONTACTS_KEY = 'sz_cached_contacts';
const LOCAL_META_KEY = 'sz_google_contacts_meta';
const FIRESTORE_CACHE_DOC = 'google_contacts_cache';

// In-memory access token cache (never stored in localStorage)
let cachedAccessToken: string | null = null;
let cachedEmail: string | null = null;

// Clear in-memory token on logout
onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedAccessToken = null;
  } else if (user.email) {
    cachedEmail = user.email;
  }
});

export const getCachedContactsToken = () => cachedAccessToken;

export const getCachedContactsEmail = (): string | null => {
  if (cachedEmail) return cachedEmail;
  try {
    const meta = localStorage.getItem(LOCAL_META_KEY);
    if (meta) {
      const parsed = JSON.parse(meta);
      if (parsed?.email) return parsed.email;
    }
  } catch {
    // ignore
  }
  return auth.currentUser?.email || null;
};

export const isGoogleContactsPermanentlyConnected = (): boolean => {
  if (cachedAccessToken) return true;
  try {
    const meta = localStorage.getItem(LOCAL_META_KEY);
    if (meta) {
      const parsed = JSON.parse(meta);
      if (parsed?.connected) return true;
    }
    const saved = localStorage.getItem(LOCAL_CONTACTS_KEY);
    if (saved) {
      const list = JSON.parse(saved);
      if (Array.isArray(list) && list.length > 0) return true;
    }
  } catch {
    // ignore
  }
  return false;
};

export const getLocalSavedContacts = (): GoogleContactItem[] => {
  try {
    const saved = localStorage.getItem(LOCAL_CONTACTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
};

/**
 * Persists contacts list and connection state to both localStorage and Firestore
 * so the user only needs to connect Google Contacts ONE time.
 */
export const persistContactsCache = async (
  contacts: GoogleContactItem[],
  email?: string | null
): Promise<void> => {
  const effectiveEmail = email || getCachedContactsEmail() || 'sanzaritourism@gmail.com';
  const now = new Date().toISOString();

  // Merge with any existing saved contacts so we never lose contacts
  const existing = getLocalSavedContacts();
  const mergedMap = new Map<string, GoogleContactItem>();

  const makeKey = (c: GoogleContactItem) => {
    const digits = (c.phoneNumber || '').replace(/[^0-9]/g, '').slice(-10);
    const nameKey = (c.name || '').toLowerCase().trim();
    return digits ? `${digits}__${nameKey}` : c.id || nameKey;
  };

  contacts.forEach((c) => {
    if (c.name || c.phoneNumber) {
      mergedMap.set(makeKey(c), c);
    }
  });
  existing.forEach((c) => {
    const k = makeKey(c);
    if (!mergedMap.has(k) && (c.name || c.phoneNumber)) {
      mergedMap.set(k, c);
    }
  });

  const mergedList = Array.from(mergedMap.values()).slice(0, 1500);

  try {
    localStorage.setItem(LOCAL_CONTACTS_KEY, JSON.stringify(mergedList));
    localStorage.setItem(
      LOCAL_META_KEY,
      JSON.stringify({
        connected: true,
        email: effectiveEmail,
        lastSyncedAt: now,
        count: mergedList.length,
      })
    );
  } catch {
    // ignore storage quota errors
  }

  // Also save compact list to Firestore settings/google_contacts_cache (under 1MB limit)
  try {
    const compactContacts = mergedList.slice(0, 800).map((c) => ({
      id: c.id,
      name: c.name,
      phoneNumber: c.phoneNumber,
      ...(c.email ? { email: c.email } : {}),
      ...(c.updatedAt ? { updatedAt: c.updatedAt } : {}),
    }));
    await setDoc(
      doc(db, 'settings', FIRESTORE_CACHE_DOC),
      {
        connected: true,
        email: effectiveEmail,
        lastSyncedAt: now,
        contacts: compactContacts,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not sync contacts cache to Firestore:', err);
  }
};

/**
 * Loads permanently saved Google Contacts from Firestore if local cache is empty
 */
export const loadPermanentContactsFromFirestore = async (): Promise<{
  connected: boolean;
  email: string | null;
  contacts: GoogleContactItem[];
}> => {
  try {
    const snap = await getDoc(doc(db, 'settings', FIRESTORE_CACHE_DOC));
    if (snap.exists()) {
      const data = snap.data();
      const cloudContacts: GoogleContactItem[] = Array.isArray(data.contacts) ? data.contacts : [];
      const email = data.email || 'sanzaritourism@gmail.com';
      if (cloudContacts.length > 0 || data.connected) {
        try {
          const local = getLocalSavedContacts();
          const combined = cloudContacts.length >= local.length ? cloudContacts : local;
          localStorage.setItem(LOCAL_CONTACTS_KEY, JSON.stringify(combined));
          localStorage.setItem(
            LOCAL_META_KEY,
            JSON.stringify({
              connected: true,
              email,
              lastSyncedAt: data.lastSyncedAt || new Date().toISOString(),
              count: combined.length,
            })
          );
          return { connected: true, email, contacts: combined };
        } catch {
          return { connected: true, email, contacts: cloudContacts };
        }
      }
    }
  } catch (err) {
    console.warn('Failed to read contacts cache from Firestore:', err);
  }
  const local = getLocalSavedContacts();
  return {
    connected: isGoogleContactsPermanentlyConnected(),
    email: getCachedContactsEmail(),
    contacts: local,
  };
};

/**
 * Adds a newly booked / inquired customer to the saved contacts cache automatically
 */
export const saveCustomerToContactsCache = async (customer: {
  name: string;
  phoneNumber: string;
  email?: string;
}): Promise<void> => {
  if (!customer.name && !customer.phoneNumber) return;
  const item: GoogleContactItem = {
    id: `cust_${Date.now()}`,
    name: customer.name.trim(),
    phoneNumber: cleanPhoneNumber(customer.phoneNumber),
    email: customer.email?.trim(),
    updatedAt: new Date().toISOString(),
  };
  await persistContactsCache([item]);
};

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
    try {
      localStorage.setItem(
        LOCAL_META_KEY,
        JSON.stringify({
          connected: true,
          email: cachedEmail,
          lastSyncedAt: new Date().toISOString(),
        })
      );
    } catch {
      // ignore
    }
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
 * Fetches latest saved contacts from Google People API and saves them permanently
 */
export const fetchGoogleContacts = async (
  accessToken: string,
  pageSize = 1000
): Promise<GoogleContactItem[]> => {
  try {
    const url = `https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers,emailAddresses,photos,metadata&pageSize=${pageSize}&sortOrder=LAST_MODIFIED_DESCENDING`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });
    } catch (netErr) {
      console.warn('Network error during Google Contacts fetch:', netErr);
      return getLocalSavedContacts();
    }

    if (response.status === 401) {
      cachedAccessToken = null;
      throw new Error('Google session expired. Click Sync to refresh from Google.');
    }

    if (!response.ok) {
      const err = await response.text();
      console.warn(`Google Contacts API error: ${err}`);
      return getLocalSavedContacts();
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

    await persistContactsCache(contacts, cachedEmail);
    return contacts;
  } catch (err: any) {
    console.error('Failed to fetch Google Contacts:', err);
    return getLocalSavedContacts();
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
      return [];
    }

    if (!response.ok) {
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
