import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  CheckCircle2,
  Phone,
  User,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  GoogleContactItem,
  signInForGoogleContacts,
  fetchGoogleContacts,
  searchGoogleContactsApi,
  getCachedContactsToken,
  getCachedContactsEmail,
} from '../../services/googleContacts';

interface GoogleContactsAutofillProps {
  onSelectContact: (contact: { name: string; phoneNumber: string }) => void;
  selectedName?: string;
  selectedPhone?: string;
}

export const GoogleContactsAutofill: React.FC<GoogleContactsAutofillProps> = ({
  onSelectContact,
  selectedName,
  selectedPhone,
}) => {
  const [accessToken, setAccessToken] = useState<string | null>(() => getCachedContactsToken());
  const [googleEmail, setGoogleEmail] = useState<string | null>(() => getCachedContactsEmail());
  const [contacts, setContacts] = useState<GoogleContactItem[]>(() => {
    try {
      const saved = localStorage.getItem('sz_cached_contacts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [apiSearchResults, setApiSearchResults] = useState<GoogleContactItem[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autofilledContact, setAutofilledContact] = useState<string | null>(null);

  // Load contacts if token is available
  useEffect(() => {
    const token = getCachedContactsToken();
    if (token && !accessToken) {
      setAccessToken(token);
      setGoogleEmail(getCachedContactsEmail() || 'sanzaritourism@gmail.com');
    }
  }, []);

  const handleConnect = async () => {
    setIsAuthenticating(true);
    setErrorMsg(null);
    try {
      const res = await signInForGoogleContacts();
      setAccessToken(res.accessToken);
      setGoogleEmail(res.email);
      await loadContacts(res.accessToken);
      setIsExpanded(true);
    } catch (err: any) {
      console.error('Failed to connect Google Contacts:', err);
      setErrorMsg(err?.message || 'Failed to connect Google Contacts. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const loadContacts = async (token: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const list = await fetchGoogleContacts(token, 1000);
      setContacts(list);
      try {
        localStorage.setItem('sz_cached_contacts', JSON.stringify(list));
      } catch {
        // ignore quota
      }
    } catch (err: any) {
      console.error('Fetch contacts error:', err);
      if (err?.message?.includes('expired') || err?.message?.includes('401')) {
        setAccessToken(null);
        setErrorMsg('Session expired. Please reconnect Google Contacts.');
      } else {
        setErrorMsg(err?.message || 'Could not fetch contacts.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!accessToken) {
      handleConnect();
      return;
    }
    await loadContacts(accessToken);
  };

  // Live search: match local contacts across name, phone, digits, email, and word tokens
  const filteredLocalContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const normalizedQuery = searchQuery.toLowerCase().trim().replace(/\s+/g, ' ');
    const tokens = normalizedQuery.split(' ').filter(Boolean);
    const qDigits = normalizedQuery.replace(/[^0-9]/g, '');

    return contacts.filter((c) => {
      const name = c.name.toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = c.phoneNumber.toLowerCase();
      const phoneDigits = c.phoneNumber.replace(/[^0-9]/g, '');

      // Direct string includes
      if (name.includes(normalizedQuery) || email.includes(normalizedQuery) || phone.includes(normalizedQuery)) {
        return true;
      }

      // Digits match
      if (qDigits.length > 0 && phoneDigits.includes(qDigits)) {
        return true;
      }

      // Token-by-token match (all typed tokens must match somewhere in name, email, or phone)
      if (tokens.length > 1) {
        const matchesAll = tokens.every((token) => {
          const tokenDigits = token.replace(/[^0-9]/g, '');
          return (
            name.includes(token) ||
            email.includes(token) ||
            phone.includes(token) ||
            (tokenDigits.length > 0 && phoneDigits.includes(tokenDigits))
          );
        });
        if (matchesAll) return true;
      }

      return false;
    });
  }, [contacts, searchQuery]);

  // If local search has few results and query length >= 3, query Google API
  useEffect(() => {
    if (!accessToken || searchQuery.trim().length < 3) {
      setApiSearchResults([]);
      return;
    }

    if (filteredLocalContacts.length >= 3) {
      setApiSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingApi(true);
      try {
        const results = await searchGoogleContactsApi(accessToken, searchQuery.trim());
        setApiSearchResults(results);
      } catch (err) {
        console.warn('API search error:', err);
      } finally {
        setIsSearchingApi(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [accessToken, searchQuery, filteredLocalContacts.length]);

  const displayedContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts.slice(0, 100);
    const combined = [...filteredLocalContacts];
    for (const apiC of apiSearchResults) {
      if (!combined.some((c) => (c.phoneNumber && c.phoneNumber === apiC.phoneNumber) || c.name === apiC.name)) {
        combined.push(apiC);
      }
    }
    return combined;
  }, [contacts, filteredLocalContacts, apiSearchResults, searchQuery]);

  const handleSelect = (contact: GoogleContactItem) => {
    onSelectContact({
      name: contact.name,
      phoneNumber: contact.phoneNumber,
    });
    setAutofilledContact(contact.name);
    setIsExpanded(false);
  };

  return (
    <div className="bg-zinc-50 border-2 border-zinc-900 rounded-2xl p-3 sm:p-3.5 space-y-2.5 transition-all">
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-950 text-white flex items-center justify-center text-xs font-bold shadow-xs">
            {/* Google G Logo SVG */}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.4 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.13z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.6 1.24 6.58l4.04 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black text-zinc-950 tracking-tight">
                Google Contacts Auto-Fill
              </h4>
              {accessToken ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
              ) : (
                <span className="text-[10px] font-bold text-zinc-500">
                  (sanzaritourism@gmail.com)
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-600">
              {accessToken
                ? `Latest saved contacts from ${googleEmail || 'sanzaritourism@gmail.com'}`
                : 'Connect to autofill latest saved customer names & phone numbers'}
            </p>
          </div>
        </div>

        {/* Action Toggle or Connect */}
        <div className="flex items-center gap-1.5">
          {accessToken ? (
            <>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
                title="Refresh latest contacts from Google"
                className="p-1.5 rounded-lg bg-white hover:bg-zinc-200 border border-zinc-300 text-zinc-700 hover:text-black transition-colors cursor-pointer text-xs disabled:opacity-50"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-black text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <span>{isExpanded ? 'Hide' : 'Pick Contact'}</span>
                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={isAuthenticating}
              className="px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-black text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isAuthenticating ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Sparkles size={13} className="text-amber-300" />
              )}
              <span>{isAuthenticating ? 'Connecting...' : 'Connect Google'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tip for unverified app screen */}
      {!accessToken && (
        <div className="text-[11px] text-zinc-500 bg-amber-50/80 border border-amber-200/70 rounded-xl p-2 flex items-start gap-1.5">
          <span className="text-amber-600 font-bold">ℹ️ Note:</span>
          <span>
            Agar Google popup me <strong>&ldquo;Google hasn&rsquo;t verified this app&rdquo;</strong> aaye, to bas <strong>&ldquo;Continue&rdquo;</strong> par click karein.
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span className="flex-1 font-medium">{errorMsg}</span>
          <button
            type="button"
            onClick={handleConnect}
            className="text-[11px] font-black underline hover:text-rose-900 cursor-pointer"
          >
            Reconnect
          </button>
        </div>
      )}

      {/* When Autofilled confirmation badge */}
      {autofilledContact && !isExpanded && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 rounded-xl px-2.5 py-1.5 text-xs text-emerald-900 font-bold">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-600" />
            Autofilled: {selectedName} ({selectedPhone})
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-[10px] text-emerald-800 underline hover:text-emerald-950 cursor-pointer font-black"
          >
            Change
          </button>
        </div>
      )}

      {/* Expanded Contacts Selector & Search Box */}
      {accessToken && isExpanded && (
        <div className="pt-2 border-t border-zinc-200 space-y-2.5">
          {/* Search Bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search latest contacts by name or mobile number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-medium pl-8 pr-8 py-2 bg-white border border-zinc-300 rounded-xl focus:outline-none focus:border-zinc-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-black"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Quick Label */}
          <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 px-0.5">
            <span>
              {searchQuery
                ? `Search results (${displayedContacts.length})`
                : `Latest Saved Contacts (${contacts.length})`}
            </span>
            {isSearchingApi && (
              <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                <RefreshCw size={10} className="animate-spin" />
                Searching Google...
              </span>
            )}
          </div>

          {/* Contacts List */}
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
            {isLoading ? (
              <div className="py-6 text-center text-xs text-zinc-500 flex flex-col items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin text-zinc-900" />
                <span>Loading latest Google Contacts...</span>
              </div>
            ) : displayedContacts.length === 0 ? (
              <div className="py-5 text-center bg-white rounded-xl border border-dashed border-zinc-300 p-3">
                <p className="text-xs font-bold text-zinc-700">No contacts found</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Try searching with a different name or number, or click Refresh.
                </p>
              </div>
            ) : (
              displayedContacts.map((contact) => {
                const isCurrent =
                  selectedPhone &&
                  contact.phoneNumber.replace(/[^0-9]/g, '') === selectedPhone.replace(/[^0-9]/g, '');

                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => handleSelect(contact)}
                    className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                        : 'bg-white hover:bg-zinc-100/90 border-zinc-200/90 text-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {contact.photoUrl ? (
                        <img
                          src={contact.photoUrl}
                          alt={contact.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0 border border-zinc-200"
                        />
                      ) : (
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCurrent
                              ? 'bg-white/20 text-white'
                              : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                          }`}
                        >
                          {contact.name.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="truncate min-w-0">
                        <div className="text-xs font-bold truncate">{contact.name}</div>
                        <div
                          className={`text-[11px] flex items-center gap-1.5 ${
                            isCurrent ? 'text-zinc-300' : 'text-zinc-600'
                          }`}
                        >
                          <Phone size={10} className="shrink-0" />
                          <span>{contact.phoneNumber || 'No phone'}</span>
                          {contact.email && (
                            <span className="truncate opacity-75 hidden sm:inline">
                              • {contact.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span
                        className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                          isCurrent
                            ? 'bg-white text-zinc-950'
                            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
                        }`}
                      >
                        {isCurrent ? 'Selected ✓' : 'Auto-fill'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
