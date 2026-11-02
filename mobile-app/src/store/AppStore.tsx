/**
 * App state, backed by the Driver Finder API.
 *
 * The server is the source of truth. This store keeps the signed-in user
 * (`me`), the admin-managed lists (`meta`) and the small lists several screens
 * share (notifications, chats, requests, vehicles...). Screen-specific lists
 * such as the job feed are loaded by the screen itself (see hooks/useQuery).
 *
 * `me` and `meta` are cached on the device so the app opens instantly and
 * still shows the last known state when offline.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';
import { api, getToken, hasToken, loadConnection, setToken, setUnauthorizedHandler, upload } from '../api/client';
import { connectSocket, disconnectSocket, onSocket, onSocketStatus, socketConnected } from '../api/socket';
import { applyMeta, AppStatus, DriverLink, Job, Meta, OwnerCard, Driver } from '../data/catalog';

/* ------------------------------------------------------------------ Types */

export type Role = 'driver' | 'owner';
export type KycStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type { AppStatus, DriverLink } from '../data/catalog';

export type DriverProfile = {
  name: string;
  city: string;
  categories: string[];
  licence: string[];
  experience: number;
  payPref: 'monthly' | 'trip' | 'both';
  expectedPay: string;
  fullTime: boolean;
  types?: string[];
  preferredLocations?: string[];
};

export type OwnerProfile = { name: string; company: string; type: 'individual' | 'fleet'; city: string };

export type Vehicle = { id: string; category: string; model: string; number: string; year: string; driver?: string; photo?: string | null };

export type Subscription = { id?: string; role: Role; planId: string; name: string; startedAt: number; expiresAt: number };

export type Me = {
  id: string;
  phone: string;
  lang: string;
  role: Role | null;
  status: 'active' | 'suspended';
  name: string;
  city: string;
  photo: string | null;
  profileDone: boolean;
  driver: Omit<DriverProfile, 'name' | 'city'> | null;
  owner: OwnerProfile | null;
  kyc: { status: KycStatus; reason?: string; docs: Record<string, boolean>; rejectedDocs: { key: string; reason: string }[] };
  plan: Subscription | null;
  registration?: { paid: boolean; paidAt: string | null };
  saved: string[];
  prefs: { jobs: boolean; chats: boolean; whatsapp: boolean };
};

export type Notice = { id: string; title: string; text: string; at: number; read: boolean; data?: any };

export type Connection = {
  id: string;
  otherId: string;
  other: (OwnerCard | Driver) & { name: string; phone: string | null; photo: string | null; city: string };
  jobTitle: string | null;
  source: 'application' | 'request';
  status: 'active' | 'hired' | 'closed';
  lastMessage: string;
  lastMessageAt: number;
  unread: number;
  /** The other side has read every message up to this time (read ticks). */
  otherReadAt: number | null;
  online: boolean;
  lastSeenAt: number | null;
  at: number;
};

export type HireRequest = {
  id: string;
  status: 'Pending' | 'Accepted' | 'Declined';
  message: string;
  at: number;
  ownerId: string;
  driverId: string;
  owner?: OwnerCard;
  driver?: Driver;
  job: Job | null;
};

export type Application = { id: string; status: AppStatus; at: number; job: Job };

type Cache = { lang: string | null; me: Me | null; meta: Meta | null };

const CACHE_KEY = 'driverfinder.cache.v2';
/** Fallback refresh, used only while the live socket is disconnected. */
const POLL_MS = 20000;

/* ------------------------------------------------------------------ Store */

type Store = {
  ready: boolean;
  lang: string | null;
  me: Me | null;
  meta: Meta | null;
  notices: Notice[];
  connections: Connection[];
  requests: HireRequest[];
  applications: Application[];
  vehicles: Vehicle[];
  postedJobs: Job[];
  links: Record<string, DriverLink>;

  // Convenience views of `me` (the names the screens were written against).
  phone: string | null;
  role: Role | null;
  driver: DriverProfile | null;
  owner: OwnerProfile | null;
  kyc: Me['kyc'];
  plan: Subscription | null;
  hasPlan: boolean;
  /** One-time registration fee paid (undefined while signed out). */
  registered: boolean | undefined;
  saved: string[];
  prefs: Me['prefs'];
  unreadChats: number;

  setLang: (l: string) => void;
  loadMeta: () => Promise<void>;
  requestOtp: (phone: string) => Promise<{ sent: boolean; devOtp?: string; resendIn: number }>;
  verifyOtp: (phone: string, code: string) => Promise<Me>;
  refresh: () => Promise<void>;
  chooseRole: (r: Role) => Promise<Me>;
  saveDriver: (p: DriverProfile) => Promise<void>;
  saveOwner: (p: OwnerProfile) => Promise<void>;
  uploadPhoto: (uri: string, type?: string) => Promise<void>;
  uploadDoc: (key: string, file: { uri: string; type?: string }) => Promise<void>;
  submitKyc: () => Promise<void>;
  toggleSave: (jobId: string) => void;
  apply: (jobId: string) => Promise<void>;
  answerRequest: (id: string, accept: boolean) => Promise<void>;
  addVehicle: (v: Omit<Vehicle, 'id'>) => Promise<void>;
  postJob: (j: Record<string, unknown>) => Promise<Job>;
  setApplication: (applicationId: string, status: 'Shortlisted' | 'Connected' | 'Not selected') => Promise<void>;
  toggleShortlist: (driverId: string) => Promise<void>;
  sendRequest: (driverId: string, jobId?: string) => Promise<void>;
  markHired: (connectionId: string) => Promise<void>;
  connectionWith: (otherId: string) => Connection | undefined;
  /** The chat screen that is open, so live messages there don't count as unread. */
  setActiveChat: (connectionId: string | null) => void;
  live: boolean;
  markNoticesRead: () => void;
  setPrefs: (p: Partial<Me['prefs']>) => void;
  logout: () => void;
  deleteAccount: () => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [lang, setLangState] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [requests, setRequests] = useState<HireRequest[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [postedJobs, setPostedJobs] = useState<Job[]>([]);
  const [links, setLinks] = useState<Record<string, DriverLink>>({});
  const [live, setLive] = useState(false);
  const meRef = useRef<Me | null>(null);
  meRef.current = me;
  const activeChat = useRef<string | null>(null);

  const reset = useCallback(() => {
    setMe(null);
    setNotices([]);
    setConnections([]);
    setRequests([]);
    setApplications([]);
    setVehicles([]);
    setPostedJobs([]);
    setLinks({});
  }, []);

  /* ---------------------------------------------------------- start-up */

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      disconnectSocket();
      reset();
    });
    (async () => {
      const conn = await loadConnection();
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          const c = JSON.parse(raw) as Cache;
          if (c.lang) {
            setLangState(c.lang);
            i18n.changeLanguage(c.lang);
          }
          if (c.meta) {
            applyMeta(c.meta);
            setMeta(c.meta);
          }
          if (c.me && conn.token) setMe(c.me);
        }
      } catch {
        // corrupt cache: start fresh
      }
      setReady(true);
    })();
  }, [reset]);

  useEffect(() => {
    if (!ready) return;
    const c: Cache = { lang, me, meta };
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(c)).catch(() => {});
  }, [ready, lang, me, meta]);

  /* ------------------------------------------------------------ loaders */

  const loadMeta = useCallback(async () => {
    const m = await api<Meta & { success: boolean }>('/meta');
    applyMeta(m);
    setMeta(m);
  }, []);

  const loadLists = useCallback(async (role: Role | null) => {
    if (!role) return;
    const jobs: Promise<unknown>[] = [
      api('/notifications').then((d) => setNotices(d.notifications)),
      api('/connections').then((d) => setConnections(d.connections)),
      api('/requests').then((d) => setRequests(d.requests)),
    ];
    if (role === 'driver') {
      jobs.push(api('/applications/mine').then((d) => setApplications(d.applications)));
    } else {
      jobs.push(api('/vehicles').then((d) => setVehicles(d.vehicles)));
      jobs.push(api('/jobs/mine').then((d) => setPostedJobs(d.jobs)));
      jobs.push(api('/owner/links').then((d) => setLinks(d.links)));
    }
    await Promise.allSettled(jobs);
  }, []);

  const refresh = useCallback(async () => {
    if (!hasToken()) return;
    const d = await api<{ user: Me }>('/me');
    setMe(d.user);
    await loadLists(d.user.role);
  }, [loadLists]);

  // Meta on start, then the user's data; refresh on resume and every POLL_MS while open.
  useEffect(() => {
    if (!ready) return;
    loadMeta().catch(() => {});
    refresh().catch(() => {});
    const tk = getToken();
    if (tk) connectSocket(tk);
    const iv = setInterval(() => {
      if (AppState.currentState === 'active' && hasToken() && !socketConnected()) refresh().catch(() => {});
    }, POLL_MS);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        refresh().catch(() => {});
        loadMeta().catch(() => {});
      }
    });
    return () => {
      clearInterval(iv);
      sub.remove();
    };
  }, [ready, loadMeta, refresh]);

  /* ---------------------------------------------------------- live events */

  useEffect(() => {
    if (!ready) return;
    // Several "sync" events can arrive together (e.g. connect = 3 lists); batch them.
    let pending = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      timer = null;
      const what = pending;
      pending = new Set();
      const role = meRef.current?.role;
      if (!role) return;
      if (what.has('connections')) api('/connections').then((d) => setConnections(d.connections)).catch(() => {});
      if (what.has('requests')) api('/requests').then((d) => setRequests(d.requests)).catch(() => {});
      if (role === 'driver' && what.has('applications')) api('/applications/mine').then((d) => setApplications(d.applications)).catch(() => {});
      if (role === 'owner' && what.has('jobs')) api('/jobs/mine').then((d) => setPostedJobs(d.jobs)).catch(() => {});
      if (role === 'owner' && what.has('links')) api('/owner/links').then((d) => setLinks(d.links)).catch(() => {});
      if (role === 'owner' && what.has('vehicles')) api('/vehicles').then((d) => setVehicles(d.vehicles)).catch(() => {});
    };
    const offs = [
      onSocket<{ what: string[] }>('sync', ({ what }) => {
        what.forEach((w) => pending.add(w));
        if (!timer) timer = setTimeout(flush, 250);
      }),
      onSocket<{ notification: Notice }>('notification', ({ notification }) =>
        setNotices((n) => (n.some((x) => x.id === notification.id) ? n : [notification, ...n])),
      ),
      onSocket('me:changed', () => {
        api<{ user: Me }>('/me')
          .then((d) => setMe(d.user))
          .catch(() => {});
      }),
      onSocket<{ connectionId: string; lastMessageAt: number; message: { from: 'me' | 'them'; text: string } }>('message:new', ({ connectionId, lastMessageAt, message }) => {
        setConnections((list) => {
          const i = list.findIndex((c) => c.id === connectionId);
          if (i < 0) {
            api('/connections').then((d) => setConnections(d.connections)).catch(() => {});
            return list;
          }
          const c = list[i];
          const bump = message.from === 'them' && activeChat.current !== connectionId ? 1 : 0;
          const next = { ...c, lastMessage: message.text, lastMessageAt, unread: activeChat.current === connectionId ? 0 : c.unread + bump };
          return [next, ...list.slice(0, i), ...list.slice(i + 1)];
        });
      }),
      onSocket<{ userId: string; online: boolean; lastSeenAt: number }>('presence', ({ userId, online, lastSeenAt }) =>
        setConnections((list) => list.map((c) => (c.otherId === userId ? { ...c, online, lastSeenAt } : c))),
      ),
      onSocket<{ connectionId: string; at: number }>('chat:read', ({ connectionId, at }) =>
        setConnections((list) => list.map((c) => (c.id === connectionId ? { ...c, otherReadAt: at } : c))),
      ),
      // Back online after a drop: catch up on anything missed.
      onSocketStatus((up) => {
        setLive(up);
        if (up) refresh().catch(() => {});
      }),
    ];
    return () => {
      offs.forEach((off) => off());
      if (timer) clearTimeout(timer);
    };
  }, [ready, refresh]);

  /* ------------------------------------------------------------- derived */

  const role = me?.role ?? null;
  const plan = me?.plan ?? null;
  const hasPlan = !!plan && plan.role === role && plan.expiresAt > Date.now();
  const driver = useMemo<DriverProfile | null>(
    () => (me && me.role === 'driver' && me.profileDone && me.driver ? { name: me.name, city: me.city, ...me.driver } : null),
    [me],
  );
  const owner = useMemo<OwnerProfile | null>(
    () => (me && me.role === 'owner' && me.profileDone && me.owner ? { name: me.name, city: me.city, company: me.owner.company, type: me.owner.type } : null),
    [me],
  );
  const unreadChats = connections.filter((c) => c.unread > 0).length;

  const store = useMemo<Store>(() => {
    const withMe = (d: { user: Me }) => {
      setMe(d.user);
      return d.user;
    };
    return {
      ready,
      lang,
      me,
      meta,
      notices,
      connections,
      requests,
      applications,
      vehicles,
      postedJobs,
      links,
      phone: me?.phone ?? null,
      role,
      driver,
      owner,
      kyc: me?.kyc ?? { status: 'none', docs: {}, rejectedDocs: [] },
      plan,
      hasPlan,
      registered: me ? !!me.registration?.paid : undefined,
      saved: me?.saved ?? [],
      prefs: me?.prefs ?? { jobs: true, chats: true, whatsapp: true },
      unreadChats,

      setLang: (l) => {
        i18n.changeLanguage(l);
        setLangState(l);
        if (meRef.current) api('/me', { method: 'PATCH', body: { lang: l } }).catch(() => {});
      },
      loadMeta,
      requestOtp: (phone) => {
        if (!meta) loadMeta().catch(() => {});
        return api('/auth/otp', { method: 'POST', body: { phone } });
      },
      verifyOtp: async (phone, code) => {
        const d = await api<{ token: string; user: Me }>('/auth/verify', { method: 'POST', body: { phone, code, lang } });
        await setToken(d.token);
        setMe(d.user);
        connectSocket(d.token);
        loadLists(d.user.role).catch(() => {});
        // Start-up may have been offline (or on another server address): fetch the admin lists again.
        loadMeta().catch(() => {});
        return d.user;
      },
      refresh,
      chooseRole: async (r) => {
        const u = withMe(await api('/me/role', { method: 'POST', body: { role: r } }));
        loadLists(r).catch(() => {});
        return u;
      },
      saveDriver: async (p) => {
        withMe(await api('/me/driver', { method: 'PUT', body: p }));
      },
      saveOwner: async (p) => {
        withMe(await api('/me/owner', { method: 'PUT', body: p }));
      },
      uploadPhoto: async (uri, type) => {
        const d = await upload<{ photo: string }>('/me/photo', { uri, type });
        setMe((m) => (m ? { ...m, photo: d.photo } : m));
      },
      uploadDoc: async (key, file) => {
        withMe(await upload(`/kyc/docs/${key}`, file));
      },
      submitKyc: async () => {
        withMe(await api('/kyc/submit', { method: 'POST' }));
      },
      toggleSave: (jobId) => {
        // Optimistic: flip locally, then confirm with the server's list.
        setMe((m) => (m ? { ...m, saved: m.saved.includes(jobId) ? m.saved.filter((x) => x !== jobId) : [...m.saved, jobId] } : m));
        api<{ ids: string[] }>(`/jobs/${jobId}/save`, { method: 'POST' })
          .then((d) => setMe((m) => (m ? { ...m, saved: d.ids } : m)))
          .catch(() => refresh().catch(() => {}));
      },
      apply: async (jobId) => {
        await api(`/jobs/${jobId}/apply`, { method: 'POST' });
        api('/applications/mine').then((d) => setApplications(d.applications)).catch(() => {});
      },
      answerRequest: async (id, accept) => {
        await api(`/requests/${id}`, { method: 'PATCH', body: { accept } });
        await loadLists('driver');
      },
      addVehicle: async (v) => {
        const d = await api<{ vehicle: Vehicle }>('/vehicles', { method: 'POST', body: v });
        setVehicles((x) => [d.vehicle, ...x]);
      },
      postJob: async (j) => {
        const d = await api<{ job: Job }>('/jobs', { method: 'POST', body: j });
        setPostedJobs((x) => [d.job, ...x]);
        return d.job;
      },
      setApplication: async (applicationId, status) => {
        await api(`/applications/${applicationId}`, { method: 'PATCH', body: { status } });
        await loadLists('owner');
      },
      toggleShortlist: async (driverId) => {
        await api(`/drivers/${driverId}/shortlist`, { method: 'POST' });
        api('/owner/links').then((d) => setLinks(d.links)).catch(() => {});
      },
      sendRequest: async (driverId, jobId) => {
        await api('/requests', { method: 'POST', body: { driverId, jobId } });
        setLinks((l) => ({ ...l, [driverId]: 'Request sent' }));
      },
      markHired: async (connectionId) => {
        await api(`/connections/${connectionId}`, { method: 'PATCH', body: { status: 'hired' } });
        await loadLists('owner');
      },
      connectionWith: (otherId) => connections.find((c) => c.otherId === otherId),
      setActiveChat: (id) => {
        activeChat.current = id;
        if (id) setConnections((list) => list.map((c) => (c.id === id && c.unread ? { ...c, unread: 0 } : c)));
      },
      live,
      markNoticesRead: () => {
        setNotices((n) => n.map((x) => ({ ...x, read: true })));
        api('/notifications/read', { method: 'POST' }).catch(() => {});
      },
      setPrefs: (p) => {
        setMe((m) => (m ? { ...m, prefs: { ...m.prefs, ...p } } : m));
        api('/me', { method: 'PATCH', body: { prefs: p } }).catch(() => {});
      },
      logout: () => {
        setToken(null);
        disconnectSocket();
        reset();
      },
      deleteAccount: async () => {
        await api('/me', { method: 'DELETE' });
        await setToken(null);
        disconnectSocket();
        reset();
      },
    };
  }, [ready, lang, me, meta, notices, connections, requests, applications, vehicles, postedJobs, links, role, driver, owner, plan, hasPlan, unreadChats, live, loadMeta, loadLists, refresh, reset]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStore outside AppStoreProvider');
  return c;
}
