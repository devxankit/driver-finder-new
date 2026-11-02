/**
 * Types shared with the API, plus the lists the admin manages (vehicle
 * categories, cities, licence types, plans). The lists start with built-in
 * defaults so the app works offline on first launch, then `applyMeta()`
 * replaces them with the server's values. The six built-in categories keep
 * their bundled photos; new categories use the image uploaded by the admin.
 */
import { ImageSourcePropType } from 'react-native';
import { CategoryKey } from '../theme';
import { fileSource } from '../api/client';

export const images = {
  logo: require('../assets/images/logo-mark.png'),
  driverSuresh: require('../assets/images/driver-suresh.jpg'),
  driverImran: require('../assets/images/driver-imran.jpg'),
  driverMahesh: require('../assets/images/driver-mahesh.jpg'),
  driverArjun: require('../assets/images/driver-arjun.jpg'),
  ownerRamesh: require('../assets/images/owner-ramesh.jpg'),
};

/* -------------------------------------------------------------- Categories */

export type Category = { key: CategoryKey; label: string; labels?: Record<string, string>; tile: ImageSourcePropType; photo: ImageSourcePropType; types?: string[] };

const BUNDLED: Record<string, { tile: ImageSourcePropType; photo: ImageSourcePropType }> = {
  truck: { tile: require('../assets/images/t-truck.jpg'), photo: require('../assets/images/v-truck.jpg') },
  bigtruck: { tile: require('../assets/images/t-bigtruck.jpg'), photo: require('../assets/images/v-bigtruck.jpg') },
  tempo: { tile: require('../assets/images/t-tempo.jpg'), photo: require('../assets/images/v-tempo.jpg') },
  bus: { tile: require('../assets/images/t-bus.jpg'), photo: require('../assets/images/v-bus.jpg') },
  minibus: { tile: require('../assets/images/t-minibus.jpg'), photo: require('../assets/images/v-minibus.jpg') },
  car: { tile: require('../assets/images/t-car.jpg'), photo: require('../assets/images/v-car.jpg') },
  suv: { tile: require('../assets/images/t-suv.jpg'), photo: require('../assets/images/v-suv.jpg') },
};

const DEFAULT_LABELS: Record<string, string> = { truck: 'Truck', bigtruck: 'Big Truck', tempo: 'Tempo', bus: 'Bus', minibus: 'Mini bus', car: 'Car', suv: 'SUV' };

/** Live list (mutated in place by applyMeta so every importer sees updates). */
export const categories: Category[] = Object.keys(BUNDLED).map((key) => ({ key, label: DEFAULT_LABELS[key], ...BUNDLED[key], types: key === 'bigtruck' ? ['Bag truck', 'Bulker truck', 'Container truck'] : undefined }));

/** Truck categories carry idle allowance, diesel mileage and bonus on their jobs. */
export const isTruck = (k?: string | null) => k === 'truck' || k === 'bigtruck';

const UNKNOWN: Category = { key: 'other', label: 'Vehicle', ...BUNDLED.truck };

export const cat = (k: CategoryKey): Category => categories.find((c) => c.key === k) ?? { ...UNKNOWN, key: k, label: k };

/** Category name in the user's language when the admin has set one. */
export const catLabel = (k: CategoryKey, lang?: string | null) => {
  const c = cat(k);
  return (lang && c.labels?.[lang]) || c.label;
};

export const cities: string[] = ['Mumbai', 'Thane', 'Navi Mumbai', 'Pune', 'Nashik', 'Ahmedabad', 'Surat', 'Delhi', 'Jaipur', 'Indore', 'Bengaluru', 'Hyderabad'];

export const licenceTypes: string[] = ['LMV', 'HMV', 'Transport badge', 'Hazardous goods'];

/* ------------------------------------------------------------------- Plans */

export type Plan = { id: string; role: 'driver' | 'owner'; name: string; months: number; price: number; note: string; tag?: string; benefits: string[] };

export const plans: Plan[] = [];

/** Shown when the admin has not set a price yet (price 0). */
export const PRICE_LABEL = 'Price at launch';

export type Support = { phone?: string; whatsapp?: string; email?: string; hours?: string };
export const support: Support = {};

/** One-time registration fee in rupees (admin-set; ₹1 by default). */
export const fees = { registration: 1 };

export const ANYWHERE = 'Anywhere in India';

export type Meta = {
  categories: { key: string; label: string; labels?: Record<string, string>; image: string | null; types?: string[] }[];
  cities: string[];
  licenceTypes: string[];
  plans: Plan[];
  support: Support;
  fees?: { registration: number };
  otpEnabled: boolean;
  razorpayKeyId: string | null;
};

const replace = <X,>(arr: X[], next: X[]) => {
  arr.splice(0, arr.length, ...next);
};

export function applyMeta(m: Meta) {
  if (m.categories?.length) {
    replace(
      categories,
      m.categories.map((c) => {
        const remote = fileSource(c.image);
        const bundled = BUNDLED[c.key];
        const img = bundled ?? { tile: remote ?? UNKNOWN.tile, photo: remote ?? UNKNOWN.photo };
        return { key: c.key, label: c.label, labels: c.labels, types: c.types, ...img };
      }),
    );
  }
  if (m.cities?.length) replace(cities, m.cities);
  if (m.licenceTypes?.length) replace(licenceTypes, m.licenceTypes);
  if (m.plans) replace(plans, m.plans);
  Object.assign(support, m.support ?? {});
  if (m.fees) Object.assign(fees, m.fees);
}

/* -------------------------------------------------------- Server shapes */

export type PayType = 'monthly' | 'trip';

export type OwnerCard = {
  id: string;
  name: string;
  company: string;
  type: 'individual' | 'fleet';
  city: string;
  photo: string | null;
  vehicles: number;
  since: string;
  verified: boolean;
  phone: string | null;
};

export type AppStatus = 'Applied' | 'Shortlisted' | 'Connected' | 'Not selected';

export type Job = {
  id: string;
  ownerId: string;
  owner?: OwnerCard | null;
  category: CategoryKey;
  vehicle: string;
  vehicleNo: string;
  year: string;
  title: string;
  payType: PayType;
  pay: number;
  allowance?: string;
  area: string;
  route: string;
  duty: string;
  licence: string;
  experience: string;
  stay: string;
  start: string;
  idleAllowance?: { amount: number; afterHours: number } | null;
  mileage?: number | null;
  bonus?: { amount: number; details: string } | null;
  status?: 'active' | 'paused' | 'closed' | 'hidden';
  applicants: number;
  postedAt: number;
  application?: { id: string; status: AppStatus; at: number } | null;
  saved?: boolean;
};

export type DriverLink = 'Applied' | 'Shortlisted' | 'Request sent' | 'Connected' | 'Hired' | 'Not selected';

export type Driver = {
  id: string;
  name: string;
  photo: string | null;
  city: string;
  age: number | null;
  experience: number;
  licence: string[];
  categories: CategoryKey[];
  drives: string;
  payPref: string;
  work: string;
  languages: string;
  types?: string[];
  preferredLocations?: string[];
  verified: boolean;
  phone: string | null;
  docs: { licence: boolean; aadhaar: boolean; police: boolean };
  link: DriverLink | null;
};

export const hoursAgo = (at: number) => Math.max(0, Math.floor((Date.now() - at) / 3600000));

export const languages = [
  { id: 'hi', native: 'हिन्दी', en: 'Hindi', letter: 'अ', fg: '#6B4E00', bg: '#FFF1C2' },
  { id: 'en', native: 'English', en: 'English', letter: 'A', fg: '#111111', bg: '#ECEAE3' },
  { id: 'mr', native: 'मराठी', en: 'Marathi', letter: 'म', fg: '#C2410C', bg: '#FFEDE3' },
  { id: 'gu', native: 'ગુજરાતી', en: 'Gujarati', letter: 'ગ', fg: '#0E8A7C', bg: '#DFF3F0' },
  { id: 'bn', native: 'বাংলা', en: 'Bengali', letter: 'অ', fg: '#6A4FD6', bg: '#EEEAFE' },
  { id: 'pa', native: 'ਪੰਜਾਬੀ', en: 'Punjabi', letter: 'ਪ', fg: '#0A7DB8', bg: '#E1F1FB' },
  { id: 'ta', native: 'தமிழ்', en: 'Tamil', letter: 'த', fg: '#5F8318', bg: '#EDF3DA' },
  { id: 'te', native: 'తెలుగు', en: 'Telugu', letter: 'తె', fg: '#B4366B', bg: '#FCE7F0' },
  { id: 'kn', native: 'ಕನ್ನಡ', en: 'Kannada', letter: 'ಕ', fg: '#6B4E00', bg: '#FFF8E1' },
];

export const quickReplies = {
  driver: ['I am interested', 'When can I start?', 'Please share the address', 'I will call you'],
  owner: ['Come for a trial drive', 'Bring your documents', 'Salary as posted', 'I will call you'],
};
