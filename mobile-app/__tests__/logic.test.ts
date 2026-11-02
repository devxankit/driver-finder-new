import { daysLeft, firstName, phoneFmt, rupees, timeAgo } from '../src/utils/format';
import { nextRoute } from '../src/navigation/routes';

describe('format', () => {
  test('rupees uses Indian digit grouping', () => {
    expect(rupees(950)).toBe('₹950');
    expect(rupees(28000)).toBe('₹28,000');
    expect(rupees(1250000)).toBe('₹12,50,000');
  });
  test('timeAgo', () => {
    const now = 1_000_000_000_000;
    expect(timeAgo(now - 30_000, now)).toBe('now');
    expect(timeAgo(now - 5 * 60_000, now)).toBe('5m');
    expect(timeAgo(now - 3 * 3_600_000, now)).toBe('3h');
    expect(timeAgo(now - 2 * 86_400_000, now)).toBe('2d');
  });
  test('names, phones, days', () => {
    expect(firstName('  Suresh Kumar Yadav ')).toBe('Suresh');
    expect(phoneFmt('9820145210')).toBe('98201 45210');
    expect(daysLeft(2 * 86_400_000 + 5, 0)).toBe(3);
  });
});

describe('nextRoute', () => {
  const base = { lang: 'hi', phone: '9820145210', role: null, driver: null, owner: null, kyc: { status: 'none' as const, docs: {} } };
  test('walks through onboarding in order', () => {
    expect(nextRoute({ ...base, lang: null })).toBe('Language');
    expect(nextRoute({ ...base, phone: null })).toBe('Phone');
    expect(nextRoute(base)).toBe('Role');
    expect(nextRoute({ ...base, role: 'driver' })).toBe('DriverSetup');
    expect(nextRoute({ ...base, role: 'owner' })).toBe('OwnerSetup');
  });
  test('drivers land on KYC, then the app', () => {
    const driver = { name: 'A', city: 'Pune', categories: [], licence: [], experience: 1, payPref: 'monthly' as const, expectedPay: '', fullTime: true };
    expect(nextRoute({ ...base, role: 'driver', driver })).toBe('Kyc');
    expect(nextRoute({ ...base, role: 'driver', driver, kyc: { status: 'pending' } })).toBe('DriverMain');
  });
});
