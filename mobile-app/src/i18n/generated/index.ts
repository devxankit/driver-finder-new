/**
 * Translations made by `npm run i18n` (scripts/i18n-extract.mjs, then
 * scripts/i18n-translate.mjs). Do not edit the JSON by hand for app text: fix
 * the wording in `overrides.json` instead, which the script always keeps.
 *
 *  - keys: translations of the i18next keys in ../index.ts (flat "a.b" keys)
 *  - auto: English text -> translation, for text written directly in the screens,
 *          the server's messages and the admin's lists
 */
import hi from './hi.json';
import mr from './mr.json';
import gu from './gu.json';
import bn from './bn.json';
import pa from './pa.json';
import ta from './ta.json';
import te from './te.json';
import kn from './kn.json';
import source from './source.json';

export type Generated = { keys: Record<string, string>; auto: Record<string, string> };

export const GENERATED: Record<string, Generated> = { hi, mr, gu, bn, pa, ta, te, kn };

/** Every English text and pattern ("{0} drivers near you") the dictionaries cover. */
export const SOURCES: string[] = source;
