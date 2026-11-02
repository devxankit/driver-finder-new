/**
 * Demo marketplace for `npm run seed -- --demo`: verified owners with vehicles
 * and job posts, and verified drivers. All demo phones start with 9000, and
 * every demo user has isDemo: true so `--remove-demo` can delete them cleanly.
 * The data is deterministic: re-running the seed never creates duplicates.
 */

export const DEMO_OWNERS = [
  { phone: '9000012345', name: 'Ramesh Agarwal', company: 'Agarwal Roadlines', city: 'Bhiwandi', type: 'fleet', photo: 'app:owner-ramesh.jpg' },
  { phone: '9000023456', name: 'Sunita Kulkarni', company: 'Kulkarni Tours & Travels', city: 'Pune', type: 'fleet' },
  { phone: '9000034567', name: 'Harpreet Gill', company: 'Gill School Transport', city: 'Thane', type: 'fleet' },
  { phone: '9000045678', name: 'Vinod Shah', company: 'Shah Logistics', city: 'Ahmedabad', type: 'fleet', photo: 'owner-05.jpg' },
  { phone: '9000101001', name: 'Rajesh Menon', company: 'Menon Cargo Movers', city: 'Bengaluru', type: 'fleet', photo: 'owner-01.jpg' },
  { phone: '9000101002', name: 'Anil Deshmukh', company: 'Deshmukh Transport Co.', city: 'Nagpur', type: 'fleet', photo: 'owner-02.jpg' },
  { phone: '9000101003', name: 'Farhan Qureshi', company: 'Qureshi Travels', city: 'Hyderabad', type: 'fleet', photo: 'owner-03.jpg' },
  { phone: '9000101004', name: 'Gurpreet Sandhu', company: 'Sandhu Freight Carriers', city: 'Delhi', type: 'fleet', photo: 'owner-04.jpg' },
  { phone: '9000101005', name: 'Prakash Iyer', company: 'Prakash Iyer', city: 'Chennai', type: 'individual' },
  { phone: '9000101006', name: 'Meena Joshi', company: 'Joshi Staff Transport', city: 'Indore', type: 'fleet' },
  { phone: '9000101007', name: 'Dinesh Choudhary', company: 'Choudhary Roadways', city: 'Jaipur', type: 'fleet' },
  { phone: '9000101008', name: 'Sanjay Kapoor', company: 'Sanjay Kapoor', city: 'Noida', type: 'individual' },
]

const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ'
const STATE = { Bhiwandi: 'MH 04', Pune: 'MH 12', Thane: 'MH 04', Ahmedabad: 'GJ 01', Bengaluru: 'KA 01', Nagpur: 'MH 31', Hyderabad: 'TS 09', Delhi: 'DL 01', Chennai: 'TN 09', Indore: 'MP 09', Jaipur: 'RJ 14', Noida: 'UP 16', Mumbai: 'MH 02', Surat: 'GJ 05', Gurugram: 'HR 26', Nashik: 'MH 15' }
const plate = (city, i) => `${STATE[city] ?? 'MH 01'} ${LETTERS[i % 23]}${LETTERS[(i * 7) % 23]} ${String(1000 + ((i * 7919) % 9000)).padStart(4, '0')}`

/**
 * Job templates per category: vehicle, title pattern, pay (monthly / per trip),
 * duty, licence, experience, perks.
 */
const TEMPLATES = {
  truck: [
    { vehicle: 'Open body 19 ft', route: (a, b) => `${a} ⇄ ${b}`, title: (a, b) => `Long-haul driver, ${a} ⇄ ${b}`, payType: 'monthly', pay: 28000, allowance: '+ ₹300/day trip allowance', duty: '22–24 days/month', licence: 'HMV + Transport', experience: '3+ years', stay: 'Food + stay at depot' },
    { vehicle: 'Container 32 ft', route: (a, b) => `${a} ⇄ ${b}, highway`, title: (a, b) => `Container truck driver, ${a} to ${b}`, payType: 'monthly', pay: 32000, allowance: '+ ₹400/day on trip', duty: '25 days/month', licence: 'HMV + Transport', experience: '5+ years', stay: 'Stay paid on trip' },
    { vehicle: 'Tipper 10 wheel', route: (a) => `${a} construction sites`, title: (a) => `Tipper driver for ${a} sites`, payType: 'monthly', pay: 24000, duty: '6 days/week, day shift', licence: 'HMV', experience: '3+ years', stay: 'Lunch provided' },
    { vehicle: 'Open body 19 ft', route: (a, b) => `Fixed route, 2 trips/week`, title: (a, b) => `Truck driver, ${a} ⇄ ${b}`, payType: 'trip', pay: 2400, duty: 'Per trip, return same week', licence: 'HMV', experience: '2+ years', stay: 'Food on trip' },
  ],
  bigtruck: [
    { vehicle: 'Container truck', route: (a, b) => `${a} port ⇄ ${b}`, title: (a, b) => `Container truck driver, ${a} ⇄ ${b}`, payType: 'monthly', pay: 34000, allowance: '+ ₹400/day on trip', duty: '24–26 days/month', licence: 'HMV + Transport', experience: '5+ years', stay: 'Stay paid on trip' },
    { vehicle: 'Bulker truck', route: (a) => `Cement plant to ${a} sites`, title: (a) => `Bulker truck driver (cement), ${a}`, payType: 'monthly', pay: 31000, duty: '26 days/month', licence: 'HMV + Transport', experience: '4+ years', stay: 'Food at plant' },
    { vehicle: 'Bag truck', route: (a, b) => `${a} ⇄ ${b}, bagged cargo`, title: (a, b) => `Bag truck driver, ${a} to ${b}`, payType: 'trip', pay: 3200, duty: 'Per trip, 2–3 trips/week', licence: 'HMV', experience: '3+ years', stay: 'Food on trip' },
  ],
  tempo: [
    { vehicle: 'Mini truck', route: (a) => 'City deliveries', title: (a) => `Tempo driver, ${a} city deliveries`, payType: 'monthly', pay: 18000, allowance: '+ fuel paid by owner', duty: '26 days/month, day shift', licence: 'LMV', experience: '1+ year', stay: 'Lunch provided' },
    { vehicle: 'Tata Ace', route: (a) => 'E-commerce last mile', title: (a) => `Tata Ace driver for parcel delivery, ${a}`, payType: 'monthly', pay: 17000, duty: '6 days/week, 9 AM to 7 PM', licence: 'LMV', experience: '1+ year', stay: 'Not provided' },
    { vehicle: 'Pickup', route: (a, b) => `${a} to nearby towns`, title: (a) => `Pickup driver, per trip, ${a}`, payType: 'trip', pay: 900, duty: 'On call, 15–20 trips/month', licence: 'LMV', experience: '2+ years', stay: 'Not provided' },
  ],
  bus: [
    { vehicle: 'School bus, 40 seats', route: (a) => 'Local, fixed school route', title: (a) => `School bus driver, ${a}`, payType: 'monthly', pay: 22000, duty: '6 days/week, 6–10 AM and 1–5 PM', licence: 'HMV + Transport', experience: '5+ years', stay: 'Not provided' },
    { vehicle: 'Sleeper coach', route: (a, b) => `${a} ⇄ ${b}, night`, title: (a, b) => `Sleeper bus driver, ${a} ⇄ ${b} night service`, payType: 'monthly', pay: 35000, allowance: '+ night allowance', duty: 'Alternate nights', licence: 'HMV + Transport', experience: '7+ years', stay: 'Stay at destination' },
    { vehicle: 'Tourist bus, 45 seats', route: (a) => 'Tours across the state', title: (a) => `Tourist bus driver, ${a}`, payType: 'trip', pay: 3500, duty: 'Per tour, 2–4 days', licence: 'HMV + Transport', experience: '5+ years', stay: 'Food and stay on tour' },
  ],
  minibus: [
    { vehicle: 'Staff bus, 26 seats', route: (a) => 'Local, office pickup and drop', title: (a) => `Staff bus driver, IT park pickup, ${a}`, payType: 'monthly', pay: 20000, duty: '5 days/week, two shifts', licence: 'HMV', experience: '3+ years', stay: 'Not provided' },
    { vehicle: 'Tempo Traveller, 17 seats', route: (a) => 'Weekend tours', title: (a) => `Tempo Traveller driver for tours, ${a}`, payType: 'trip', pay: 2200, duty: 'Weekend and holiday trips', licence: 'LMV + Transport', experience: '3+ years', stay: 'Stay paid on tour' },
  ],
  car: [
    { vehicle: 'Sedan', route: (a) => 'Airport, outstation trips', title: (a) => `Sedan driver, airport and outstation, ${a}`, payType: 'trip', pay: 1200, duty: 'On call, 15–20 trips/month', licence: 'LMV', experience: '2+ years', stay: 'Not provided' },
    { vehicle: 'Sedan', route: (a) => 'Office and family use', title: (a) => `Personal driver for family, ${a}`, payType: 'monthly', pay: 19000, duty: '6 days/week, 8 AM to 8 PM', licence: 'LMV', experience: '3+ years', stay: 'Lunch provided' },
    { vehicle: 'Luxury sedan', route: (a) => 'Corporate duty', title: (a) => `Corporate chauffeur, ${a}`, payType: 'monthly', pay: 26000, duty: '5 days/week', licence: 'LMV', experience: '5+ years', stay: 'Uniform provided' },
  ],
  suv: [
    { vehicle: 'SUV, 7 seats', route: (a) => 'Outstation tours', title: (a) => `SUV driver for family trips, ${a}`, payType: 'trip', pay: 1800, duty: 'Weekend and holiday trips', licence: 'LMV', experience: '3+ years', stay: 'Stay paid on tour' },
    { vehicle: 'SUV, 7 seats', route: (a) => 'Site visits', title: (a) => `SUV driver for company site visits, ${a}`, payType: 'monthly', pay: 23000, duty: '6 days/week', licence: 'LMV', experience: '3+ years', stay: 'Food on outstation days' },
  ],
}

const DEST = { Bhiwandi: 'Ahmedabad', Pune: 'Mumbai', Thane: 'Nashik', Ahmedabad: 'Surat', Bengaluru: 'Chennai', Nagpur: 'Hyderabad', Hyderabad: 'Vijayawada', Delhi: 'Jaipur', Chennai: 'Bengaluru', Indore: 'Bhopal', Jaipur: 'Delhi', Noida: 'Lucknow' }
const STARTS = ['Immediately', 'This week', 'Immediately', 'Next week', '1 Dec', 'Immediately']

/** Which categories each owner hires for (index into DEMO_OWNERS). */
const OWNER_CATS = [
  ['truck', 'truck', 'tempo', 'bigtruck'],
  ['car', 'suv', 'minibus', 'car'],
  ['bus', 'minibus', 'bus'],
  ['tempo', 'truck', 'tempo', 'truck', 'bigtruck'],
  ['truck', 'tempo', 'truck', 'tempo', 'bigtruck'],
  ['truck', 'truck', 'tempo', 'bigtruck'],
  ['car', 'suv', 'minibus', 'bus'],
  ['truck', 'bus', 'truck', 'tempo'],
  ['car', 'suv'],
  ['minibus', 'bus', 'minibus'],
  ['truck', 'tempo', 'bus'],
  ['car', 'suv'],
]

const YEARS = ['2019', '2020', '2021', '2022', '2023', '2024']

const BONUS = [
  { amount: 2000, details: 'Monthly bonus for on-time delivery and no damage' },
  { amount: 1500, details: 'Diesel saving bonus when the average stays above the target' },
  { amount: 3000, details: 'Festival bonus plus ₹500 per extra trip' },
  { amount: 1000, details: 'Safe-driving bonus every month (no challans, no accidents)' },
]

/** Truck jobs carry idle allowance (bhatta), diesel mileage and a bonus. */
export function truckExtras(category, n) {
  if (category !== 'truck' && category !== 'bigtruck') return {}
  return {
    idleAllowance: { amount: 200, afterHours: 48 },
    mileage: category === 'bigtruck' ? 3 : 2.75,
    bonus: BONUS[n % BONUS.length],
  }
}

/** About 40 job posts spread over the last two weeks. */
export function demoJobs() {
  const jobs = []
  let n = 0
  OWNER_CATS.forEach((cats, o) => {
    const owner = DEMO_OWNERS[o]
    const used = {}
    cats.forEach((category) => {
      const list = TEMPLATES[category]
      const t = list[(used[category] = (used[category] ?? -1) + 1) % list.length]
      const a = owner.city
      const b = DEST[a] ?? 'Mumbai'
      // Spread pay a little so cards don't all look identical.
      const bump = t.payType === 'monthly' ? ((n * 1000) % 4000) - 1000 : ((n * 100) % 400) - 100
      jobs.push({
        o,
        h: 1 + ((n * 17) % 330), // hours ago: newest first, up to ~2 weeks
        category,
        vehicle: t.vehicle,
        vehicleNo: plate(a, n),
        year: YEARS[n % YEARS.length],
        title: t.title(a, b),
        payType: t.payType,
        pay: Math.max(500, t.pay + bump),
        allowance: t.allowance ?? '',
        area: a,
        route: t.route(a, b),
        duty: t.duty,
        licence: t.licence,
        experience: t.experience,
        stay: t.stay,
        start: STARTS[n % STARTS.length],
        ...truckExtras(category, n),
      })
      n += 1
    })
  })
  return jobs
}

const FIRST = ['Imran', 'Mahesh', 'Arjun', 'Suresh', 'Ravi', 'Sandeep', 'Abdul', 'Manoj', 'Prakash', 'Vijay', 'Gurdeep', 'Rakesh', 'Anil', 'Kishore', 'Salim', 'Deepak', 'Ramesh', 'Balwinder', 'Santosh', 'Harish', 'Naveen', 'Ganesh', 'Mohan', 'Ajay', 'Kiran']
const LAST = ['Shaikh', 'Patil', 'Rathore', 'Yadav', 'Kumar', 'Singh', 'Rehman', 'Tiwari', 'Gowda', 'Pawar', 'Singh', 'Sharma', 'Jadhav', 'Reddy', 'Khan', 'Verma', 'Naik', 'Sidhu', 'More', 'Nair', 'Raju', 'Shinde', 'Das', 'Mishra', 'Bhat']
const CITIES = ['Bhiwandi', 'Nashik', 'Pune', 'Thane', 'Mumbai', 'Delhi', 'Hyderabad', 'Indore', 'Bengaluru', 'Nagpur', 'Ludhiana', 'Jaipur', 'Ahmedabad', 'Chennai', 'Surat', 'Lucknow', 'Thane', 'Amritsar', 'Pune', 'Kochi', 'Bengaluru', 'Nashik', 'Kolkata', 'Noida', 'Mangaluru']
const LANG = ['Hindi, Marathi', 'Marathi, Hindi', 'Hindi, English', 'Hindi', 'Hindi, Kannada', 'Punjabi, Hindi', 'Urdu, Hindi', 'Hindi', 'Kannada, Hindi', 'Marathi', 'Punjabi, Hindi', 'Hindi, Rajasthani', 'Gujarati, Hindi', 'Tamil, English', 'Gujarati, Hindi', 'Hindi', 'Marathi, Hindi', 'Punjabi', 'Marathi, Hindi', 'Malayalam, English', 'Telugu, Kannada', 'Marathi', 'Bengali, Hindi', 'Hindi, English', 'Kannada, Tulu']
const DRIVES = {
  truck: ['Open body, container', 'Tipper, open body', 'Trailer, container'],
  bigtruck: ['Container truck, trailer', 'Bulker truck (cement)', 'Bag truck, container truck'],
  tempo: ['Tata Ace, pickup', 'Mini truck, Bolero pickup'],
  bus: ['School bus, staff bus', 'Sleeper coach, tourist bus'],
  minibus: ['Tempo Traveller, staff van'],
  car: ['Sedan, hatchback', 'Sedan, luxury car'],
  suv: ['Innova, Ertiga', 'SUV 7 seat'],
}
const CATSETS = [['truck', 'bus'], ['truck', 'bigtruck'], ['car', 'suv'], ['tempo', 'minibus'], ['bigtruck', 'truck'], ['bus', 'minibus'], ['truck', 'tempo'], ['car'], ['tempo'], ['bigtruck'], ['bus'], ['suv', 'car'], ['truck', 'tempo'], ['car', 'suv'], ['minibus', 'tempo'], ['truck'], ['tempo', 'truck'], ['bus', 'truck'], ['car'], ['suv'], ['truck', 'bus'], ['tempo'], ['car', 'minibus'], ['truck'], ['bus']]

/** 25 drivers: the first four keep their original app photos, then 20 with portraits, one without a photo. */
export function demoDrivers() {
  const photo = (i) => (i === 0 ? 'app:driver-imran.jpg' : i === 1 ? 'app:driver-mahesh.jpg' : i === 2 ? 'app:driver-arjun.jpg' : i === 3 ? 'app:driver-suresh.jpg' : i <= 23 ? `driver-${String(i - 3).padStart(2, '0')}.jpg` : null)
  const phones = ['9000056789', '9000067890', '9000078901', '9000089012']
  return FIRST.map((first, i) => {
    const cats = CATSETS[i]
    const heavy = cats.some((c) => c === 'truck' || c === 'bus')
    const experience = 2 + ((i * 5) % 14)
    const payPref = cats.includes('car') || cats.includes('suv') ? (i % 2 ? 'trip' : 'both') : i % 4 === 0 ? 'both' : 'monthly'
    const base = heavy ? 22 + (experience % 10) : 16 + (experience % 6)
    return {
      phone: phones[i] ?? `9000201${String(i).padStart(3, '0')}`,
      name: `${first} ${LAST[i]}`,
      city: CITIES[i],
      photo: photo(i),
      driver: {
        age: 24 + ((i * 3) % 24),
        experience,
        licence: heavy ? (i % 3 ? ['HMV', 'Transport badge'] : ['HMV']) : i % 2 ? ['LMV', 'Transport badge'] : ['LMV'],
        categories: cats,
        types: cats.includes('bigtruck') ? [['Container truck'], ['Bulker truck'], ['Bag truck', 'Container truck']][i % 3] : [],
        preferredLocations: i % 4 === 0 ? ['Anywhere in India'] : [CITIES[i], CITIES[(i + 5) % CITIES.length]],
        about: DRIVES[cats[0]][i % DRIVES[cats[0]].length],
        payPref,
        expectedPay: payPref === 'trip' ? `₹${(9 + (i % 6)) * 100}–${(12 + (i % 6)) * 100}` : `₹${base}k–${base + 4}k`,
        fullTime: payPref !== 'trip',
        languages: LANG[i],
      },
      // Police verification on about a third of profiles.
      police: i % 3 === 1,
      joinedDaysAgo: 3 + ((i * 11) % 90),
    }
  })
}
