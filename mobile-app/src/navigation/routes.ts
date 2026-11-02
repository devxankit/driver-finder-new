import type { KycStatus, Me, Role } from '../store/AppStore';

type Progress = {
  lang: string | null;
  phone: string | null;
  role: Role | null;
  /** One-time ₹1 registration; undefined is treated as paid (older cached data). */
  registered?: boolean;
  driver: unknown | null;
  owner: unknown | null;
  kyc: { status: KycStatus };
};

/** Where a returning user lands, from what they have completed so far. */
export function nextRoute(s: Progress): string {
  if (!s.lang) return 'Language';
  if (!s.phone) return 'Phone';
  if (!s.role) return 'Role';
  if (s.registered === false) return 'Register';
  if (s.role === 'driver') {
    if (!s.driver) return 'DriverSetup';
    if (s.kyc.status === 'none') return 'Kyc';
    return 'DriverMain';
  }
  if (!s.owner) return 'OwnerSetup';
  if (s.kyc.status === 'none') return 'OwnerKyc';
  return 'OwnerMain';
}

/** nextRoute for a user object fresh from the server. */
export function routeForMe(me: Pick<Me, 'phone' | 'role' | 'profileDone' | 'kyc' | 'registration'>, lang: string | null): string {
  const done = me.profileDone ? {} : null;
  return nextRoute({ lang: lang ?? 'hi', phone: me.phone, role: me.role, registered: !!me.registration?.paid, driver: me.role === 'driver' ? done : null, owner: me.role === 'owner' ? done : null, kyc: me.kyc });
}
