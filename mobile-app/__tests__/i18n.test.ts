/**
 * The translation engine (src/i18n/auto.ts): dictionary, patterns, server
 * text, and what must be left alone.
 */
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../src/api/client', () => ({
  hasToken: () => true,
  api: jest.fn(async (_path: string, opts: { body: { to: string; texts: string[] } }) => ({
    // Fake server: wraps each text so the test can see it went through.
    translations: opts.body.texts.map((t) => (t === 'FAIL ME' ? null : `[${opts.body.to}:${t}]`)),
  })),
}));

import i18n from '../src/i18n';
import { tx, txChildren, txInfo, txReady } from '../src/i18n/auto';
import { GENERATED, SOURCES } from '../src/i18n/generated';
import { api } from '../src/api/client';

const LANGS = ['hi', 'mr', 'gu', 'bn', 'pa', 'ta', 'te', 'kn'];
const wait = (ms = 150) => new Promise<void>((r) => setTimeout(() => r(), ms));
// auto.ts saves answers to the phone a moment later; let that timer finish.
afterAll(() => wait(1700));

describe('dictionaries', () => {
  test.each(LANGS)('%s covers every app text and key', (lang) => {
    const g = GENERATED[lang];
    const missing = SOURCES.filter((s) => !g.auto[s]);
    expect(missing).toEqual([]);
    expect(Object.keys(g.keys).length).toBeGreaterThan(200);
  });

  test.each(LANGS)('%s keeps the placeholders of every pattern', (lang) => {
    const slots = (s: string) => (s.match(/\{\d+\}/g) ?? []).sort().join();
    const broken = SOURCES.filter((s) => slots(s) !== slots(GENERATED[lang].auto[s] ?? ''));
    expect(broken).toEqual([]);
  });

  test.each(LANGS)('%s translates the i18next keys', async (lang) => {
    await i18n.changeLanguage(lang);
    expect(i18n.t('job.applyNow')).not.toBe('Apply now');
    expect(i18n.t('home.hello', { name: 'Ravi' })).toContain('Ravi');
    expect(i18n.t('profile.logout')).not.toBe('Log out');
  });
});

describe('tx in Hindi', () => {
  beforeAll(() => i18n.changeLanguage('hi'));

  test('fixed text comes from the dictionary', () => {
    expect(tx('Save vehicle')).toBe('गाड़ी सेव करें');
    expect(tx('Applied')).toBe('आवेदन किया');
    expect(tx('  Applied ')).toBe('  आवेदन किया ');
    expect(tx('Mumbai')).toBe(GENERATED.hi.auto.Mumbai);
  });

  test('sentences built from parts use a pattern', () => {
    expect(tx('12 drivers near you')).toBe('आपके पास के 12 ड्राइवर');
    expect(tx('2.4 km away')).toBe(GENERATED.hi.auto['{0} km away'].replace('{0}', '2.4'));
    // children of <T>{n} drivers near you</T>
    expect(txChildren([12, ' drivers near you'])).toBe('आपके पास के 12 ड्राइवर');
  });

  test('numbers, phone and vehicle numbers, codes and the brand are left alone', () => {
    for (const s of ['₹15,000', '+91 98201 45210', 'MH 04 AB 1234', 'CG11AB4792', 'LMV', '5m', 'Driver Finder', 'Driver Finder 1.3.0']) expect(tx(s)).toBe(s);
    expect(api).not.toHaveBeenCalled();
  });

  test('text already in Hindi is not sent anywhere', () => {
    expect(tx('नमस्ते, रवि')).toBe('नमस्ते, रवि');
    expect(api).not.toHaveBeenCalled();
  });

  test('database text goes to the server once, then is remembered', async () => {
    expect(tx('I drive container trucks on long routes')).toBe('I drive container trucks on long routes'); // original while waiting
    await wait();
    expect(tx('I drive container trucks on long routes')).toBe('[hi:I drive container trucks on long routes]');
    const calls = (api as jest.Mock).mock.calls.length;
    tx('I drive container trucks on long routes');
    await wait();
    expect((api as jest.Mock).mock.calls.length).toBe(calls);
  });

  test('a pattern translates its dynamic parts through the server', async () => {
    tx('Ramesh Agarwal applied for "Night shift loader".');
    await wait();
    expect(tx('Ramesh Agarwal applied for "Night shift loader".')).toBe('[hi:Ramesh Agarwal] ने "[hi:Night shift loader]" के लिए आवेदन किया।');
  });

  test('when the server cannot translate, the original stays', async () => {
    tx('FAIL ME');
    await wait();
    expect(tx('FAIL ME')).toBe('FAIL ME');
  });

  test('chat shows whether a message was translated', async () => {
    txInfo('Please come tomorrow at 9');
    await wait();
    expect(txInfo('Please come tomorrow at 9')).toEqual({ text: '[hi:Please come tomorrow at 9]', translated: true });
    expect(txInfo('कल सुबह आइए')).toEqual({ text: 'कल सुबह आइए', translated: false });
  });

  test('alerts wait for the server', async () => {
    const [title, message] = await txReady(['Add vehicle', 'A brand new server sentence']);
    expect(title).toBe('गाड़ी जोड़ें');
    expect(message).toBe('[hi:A brand new server sentence]');
  });
});

describe('tx in English', () => {
  beforeAll(() => i18n.changeLanguage('en'));

  test('English stays; other scripts are translated for the reader', async () => {
    expect(tx('Save vehicle')).toBe('Save vehicle');
    expect(tx('12 drivers near you')).toBe('12 drivers near you');
    tx('मुझे 8 साल का अनुभव है');
    await wait();
    expect(tx('मुझे 8 साल का अनुभव है')).toBe('[en:मुझे 8 साल का अनुभव है]');
  });
});

describe('layout pieces in Tamil', () => {
  beforeAll(() => i18n.changeLanguage('ta'));

  test('separate pieces are translated on their own, sentences as one', () => {
    // <T>{city}{' · Plan: 17 days left'}</T>: two pieces, not "{0} · {1} days left"
    const out = txChildren(['Bhiwandi', ' · Plan: 17 days left']) as string[];
    expect(out[0]).toBe(GENERATED.ta.auto.Bhiwandi);
    expect(out[1]).toContain('17');
    expect(out[1]).not.toContain('Plan');
    // <T>{n} drivers near you</T>: one sentence
    expect(txChildren([12, ' drivers near you'])).toBe(GENERATED.ta.auto['{0} drivers near you'].replace('{0}', '12'));
  });

  test('lists of known items need no server', () => {
    const before = (api as jest.Mock).mock.calls.length;
    expect(tx('Jaipur, Thane')).toBe(`${GENERATED.ta.auto.Jaipur}, ${GENERATED.ta.auto.Thane}`);
    expect(tx('LMV + HMV')).toBe('LMV + HMV');
    expect(tx('Wants to drive: Jaipur, Thane')).toContain(GENERATED.ta.auto.Jaipur);
    expect((api as jest.Mock).mock.calls.length).toBe(before);
  });

  test('"driver" is a person, not software', () => {
    for (const k of ['Drivers', 'Your drivers', 'Available drivers', 'Find driver']) expect(GENERATED.ta.auto[k]).not.toContain('இயக்கி');
  });
});

describe('dates', () => {
  test('the month is translated, the numbers stay', async () => {
    await i18n.changeLanguage('hi');
    expect(tx('29 Nov 2026')).toBe(`29 ${GENERATED.hi.auto.Nov} 2026`);
    expect(tx('Active until 29 Nov 2026')).toContain(GENERATED.hi.auto.Nov);
  });
});
