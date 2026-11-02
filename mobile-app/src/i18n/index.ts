/**
 * Translations. English and Hindi cover every driver-facing screen; the other
 * launch languages cover sign-in, role choice, tabs and the job feed basics
 * and fall back to English elsewhere. All non-English text is a draft for the
 * client's language reviewers. To add a language, add a block here.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const en = {
  common: {
    continue: 'Continue', next: 'Next', save: 'Save', cancel: 'Cancel', help: 'Help', done: 'Done', call: 'Call', whatsapp: 'WhatsApp',
    chat: 'Chat', verified: 'Verified', seeAll: 'See all', submit: 'Submit', retake: 'Retake', perMonth: '/month', perTrip: '/trip',
    monthly: 'Monthly', trip: 'Per trip', ok: 'OK',
  },
  tabs: { jobs: 'Jobs', myJobs: 'My jobs', chats: 'Chats', profile: 'Profile' },
  lang: { title: 'Choose your language', more: 'More Indian languages are coming soon. You can change this later in Settings.' },
  phone: {
    title: 'Enter your mobile number', sub: 'We will send a 6-digit code by SMS', label: 'Mobile number', getOtp: 'Get OTP',
    terms: 'By continuing you agree to our Terms and Privacy Policy',
  },
  otp: {
    title: 'Enter the code', sub: 'Sent to +91 {{phone}}', demo: 'Demo build: any 6-digit code works', resendIn: 'Resend code in {{s}}s',
    resend: 'Resend code', change: 'Change number', verify: 'Verify',
  },
  role: {
    title: 'Who are you?', sub: 'Choose one', driver: 'I am a Driver', driverB1: 'Find driving jobs near you', driverB2: 'Monthly salary or per trip',
    driverB3: 'Talk to owners directly', owner: 'I own a Vehicle', ownerB1: 'Post jobs for your vehicles', ownerB2: 'Hire KYC-verified drivers',
    ownerB3: 'Car, bus, truck and more', note: "Next you'll add your details and documents. Our team checks them before your profile goes live.",
    asDriver: 'Continue as Driver', asOwner: 'Continue as Owner',
  },
  setup: {
    step: 'Step {{n}} of {{total}}', nameTitle: 'What is your name?', namePh: 'Full name', photo: 'Your photo',
    photoHint: 'Owners trust profiles with a clear face photo.', takePhoto: 'Take photo', cityTitle: 'Where do you live?',
    catTitle: 'Which vehicles can you drive?', catHint: 'Choose all that apply', licTitle: 'Your licence', expTitle: 'Driving experience',
    years: '{{n}}+ yrs', prefTitle: 'What work do you want?', monthlyPay: 'Monthly salary', tripPay: 'Per trip', both: 'Both',
    expected: 'Expected pay', fullTime: 'Full-time', partTime: 'Part-time', toDocs: 'Next: documents',
  },
  kyc: {
    step: 'Step {{n}} of {{total}}', licenceFront: 'Driving licence: front', licenceBack: 'Driving licence: back', aadhaarFront: 'Aadhaar: front',
    aadhaarBack: 'Aadhaar: back', selfie: 'Selfie', sub: 'Keep the card inside the frame', selfieSub: 'Keep your face inside the circle',
    ok: 'Card is in place', hold: 'Hold your hand steady', tip1: 'Whole card in the frame', tip2: 'Good light, no glare', tip3: 'Photo must be sharp',
    capture: 'Take photo', gallery: 'Gallery', flash: 'Flash', captured: 'Photo taken', check: 'Check that all text is readable.',
    useThis: 'Use this photo', reviewTitle: 'Check your documents', reviewSub: 'Tap a document to take it again.', submit: 'Submit for verification',
  },
  status: {
    pendingTitle: 'Checking your documents', pendingText: 'Our team checks every document by hand, usually within 24 hours. We will notify you.',
    s1: 'Documents received', s2: 'Team is checking', s3: 'Profile goes live', browse: 'Browse jobs meanwhile', demoApprove: 'Approve now',
    demoReject: 'Show a rejected result', approvedTitle: 'You are verified!', approvedText: 'Your profile is now visible to vehicle owners.',
    start: 'Start finding jobs', rejectedTitle: 'One document needs a new photo', fix: 'Take the photo again', demoTitle: 'Demo controls',
  },
  home: {
    hello: 'Namaste, {{name}}', search: 'Search: truck, sedan, bus…', nearMe: 'Near me', planTitle: 'Get a plan to apply',
    planText: 'Browsing is free. Apply and call owners with a plan.', planActive: 'Driver plan active', daysLeft: '{{n}} days left',
    jobsFor: '{{cat}} jobs', allJobs: 'Jobs near you', newest: 'Newest', noJobs: 'No jobs match these filters', clear: 'Clear filters',
    posted: '{{h}}h ago', applied: '{{n}} applied', kycBanner: 'Verification pending. You can apply once approved.', all: 'All',
  },
  job: {
    salary: 'Salary', payPerTrip: 'Pay per trip', route: 'Route', duty: 'Duty', licence: 'Licence', experience: 'Experience', stay: 'Stay',
    start: 'Start', vehicle: 'Vehicle', model: 'Model', year: 'Year', number: 'Number', owner: 'Vehicle owner', vehicles: '{{n}} vehicles',
    locked: 'Phone and chat open after the owner accepts your application.', report: 'Report this job', applyNow: 'Apply now',
    status: 'Application status', payTitle: 'Get the Driver plan to apply', paySub: 'One plan, all jobs on Driver Finder', b1: 'Apply to any job',
    b2: 'Accept hiring requests from owners', b3: 'Call, WhatsApp and chat with owners', startsAt: 'Price', seePlans: 'See plans', notNow: 'Not now',
    kycTitle: 'Verification pending', kycText: 'You can apply after our team approves your documents.', sent: 'Application sent',
    sentText: 'The owner will review it. We will notify you.', reported: 'Thanks. Our team will check this job.', postedBy: 'Posted {{h}}h ago',
  },
  my: {
    title: 'My jobs', applied: 'Applied', requests: 'Requests', connected: 'Connected', emptyApplied: 'No applications yet',
    emptyAppliedText: 'Jobs you apply to will show here with their status.', emptyReq: 'No hiring requests yet',
    emptyReqText: 'Owners can send you requests once your profile is live.', emptyConn: 'No connections yet',
    emptyConnText: 'When an owner accepts, you can call and chat here.', wants: 'wants to hire you', accept: 'Accept', decline: 'Decline',
    findJobs: 'Find jobs', Applied: 'Applied', Shortlisted: 'Shortlisted', Connected: 'Connected', 'Not selected': 'Not selected',
  },
  chat: { title: 'Chats', empty: 'No chats yet', emptyText: 'Chats open after you connect with an owner.', type: 'Type a message' },
  profile: {
    title: 'Profile', complete: 'Profile {{p}}% complete', documents: 'My documents', plan: 'My plan', language: 'Language',
    notifications: 'Notifications', help: 'Help and support', terms: 'Terms and privacy', logout: 'Log out', logoutQ: 'Log out of Driver Finder?',
    noPlan: 'No active plan', canDrive: 'Can drive', lookingFor: 'Looking for', saved: 'Saved jobs',
  },
  plans: {
    title: 'Plans', driverPlan: 'Driver plan', ownerPlan: 'Owner plan', sub: 'Browsing stays free. A plan unlocks connecting.',
    get: 'What you get', pay: 'Continue to pay', secure: 'Secure payment · UPI, cards, net banking', d1: 'Apply to any job, any category',
    d2: 'Accept hiring requests from owners', d3: 'Call, WhatsApp and chat after connecting', d4: 'Verified badge shown to owners',
    o1: 'Post jobs for all your vehicles', o2: 'Search all verified drivers', o3: 'Send hiring requests to drivers', o4: 'Call, WhatsApp and chat after connecting',
    active: 'Active until {{date}}',
  },
  pay: {
    title: 'Checkout', demo: 'Demo build: no real payment is taken.', payNow: 'Pay now', method: 'Payment method', upi: 'UPI', card: 'Debit or credit card',
    net: 'Net banking', processing: 'Processing payment…', success: 'Payment successful', successText: 'Your plan is active until {{date}}.',
  },
  notif: { title: 'Notifications', empty: "You're all caught up", emptyText: 'Job updates and messages will show here.' },
};

const hi: typeof en = {
  common: {
    continue: 'आगे बढ़ें', next: 'आगे', save: 'सेव करें', cancel: 'रद्द करें', help: 'मदद', done: 'हो गया', call: 'कॉल', whatsapp: 'व्हाट्सऐप',
    chat: 'चैट', verified: 'सत्यापित', seeAll: 'सभी देखें', submit: 'जमा करें', retake: 'फिर से लें', perMonth: '/महीना', perTrip: '/ट्रिप',
    monthly: 'मासिक', trip: 'प्रति ट्रिप', ok: 'ठीक है',
  },
  tabs: { jobs: 'नौकरियाँ', myJobs: 'मेरी नौकरियाँ', chats: 'चैट', profile: 'प्रोफ़ाइल' },
  lang: { title: 'अपनी भाषा चुनें', more: 'और भारतीय भाषाएँ जल्द आ रही हैं। आप इसे बाद में सेटिंग्स में बदल सकते हैं।' },
  phone: {
    title: 'अपना मोबाइल नंबर डालें', sub: 'हम SMS से 6 अंकों का कोड भेजेंगे', label: 'मोबाइल नंबर', getOtp: 'OTP पाएँ',
    terms: 'आगे बढ़कर आप हमारी शर्तों और गोपनीयता नीति से सहमत हैं',
  },
  otp: {
    title: 'कोड डालें', sub: '+91 {{phone}} पर भेजा गया', demo: 'डेमो बिल्ड: कोई भी 6 अंकों का कोड चलेगा', resendIn: '{{s}} सेकंड में कोड दोबारा भेजें',
    resend: 'कोड दोबारा भेजें', change: 'नंबर बदलें', verify: 'पुष्टि करें',
  },
  role: {
    title: 'आप कौन हैं?', sub: 'एक चुनें', driver: 'मैं ड्राइवर हूँ', driverB1: 'अपने पास ड्राइविंग की नौकरी खोजें', driverB2: 'मासिक वेतन या प्रति ट्रिप',
    driverB3: 'मालिकों से सीधे बात करें', owner: 'मेरे पास वाहन है', ownerB1: 'अपने वाहनों के लिए नौकरी डालें', ownerB2: 'KYC-सत्यापित ड्राइवर रखें',
    ownerB3: 'कार, बस, ट्रक और भी', note: 'आगे आप अपनी जानकारी और दस्तावेज़ जोड़ेंगे। प्रोफ़ाइल लाइव होने से पहले हमारी टीम उन्हें जाँचती है।',
    asDriver: 'ड्राइवर के रूप में आगे बढ़ें', asOwner: 'मालिक के रूप में आगे बढ़ें',
  },
  setup: {
    step: 'चरण {{n}} / {{total}}', nameTitle: 'आपका नाम क्या है?', namePh: 'पूरा नाम', photo: 'आपकी फोटो',
    photoHint: 'साफ़ चेहरे वाली फोटो पर मालिक ज़्यादा भरोसा करते हैं।', takePhoto: 'फोटो लें', cityTitle: 'आप कहाँ रहते हैं?',
    catTitle: 'आप कौन-से वाहन चला सकते हैं?', catHint: 'जितने चाहें चुनें', licTitle: 'आपका लाइसेंस', expTitle: 'ड्राइविंग का अनुभव',
    years: '{{n}}+ साल', prefTitle: 'आपको कैसा काम चाहिए?', monthlyPay: 'मासिक वेतन', tripPay: 'प्रति ट्रिप', both: 'दोनों',
    expected: 'अपेक्षित वेतन', fullTime: 'फुल-टाइम', partTime: 'पार्ट-टाइम', toDocs: 'आगे: दस्तावेज़',
  },
  kyc: {
    step: 'चरण {{n}} / {{total}}', licenceFront: 'ड्राइविंग लाइसेंस: आगे का हिस्सा', licenceBack: 'ड्राइविंग लाइसेंस: पीछे का हिस्सा',
    aadhaarFront: 'आधार: आगे का हिस्सा', aadhaarBack: 'आधार: पीछे का हिस्सा', selfie: 'सेल्फ़ी', sub: 'कार्ड को फ्रेम के अंदर रखें',
    selfieSub: 'अपना चेहरा गोले के अंदर रखें', ok: 'कार्ड सही जगह है', hold: 'हाथ स्थिर रखें', tip1: 'पूरा कार्ड फ्रेम में', tip2: 'अच्छी रोशनी, चमक नहीं',
    tip3: 'फोटो साफ़ हो', capture: 'फोटो लें', gallery: 'गैलरी से', flash: 'फ्लैश', captured: 'फोटो ले ली गई', check: 'देख लें कि सारा लिखा हुआ पढ़ा जा सके।',
    useThis: 'यही फोटो रखें', reviewTitle: 'अपने दस्तावेज़ जाँचें', reviewSub: 'दोबारा फोटो लेने के लिए दस्तावेज़ पर टैप करें।', submit: 'जाँच के लिए भेजें',
  },
  status: {
    pendingTitle: 'आपके दस्तावेज़ जाँचे जा रहे हैं', pendingText: 'हमारी टीम हर दस्तावेज़ हाथ से जाँचती है, आमतौर पर 24 घंटे में। हम आपको सूचना देंगे।',
    s1: 'दस्तावेज़ मिल गए', s2: 'टीम जाँच रही है', s3: 'प्रोफ़ाइल लाइव होगी', browse: 'तब तक नौकरियाँ देखें', demoApprove: 'अभी मंज़ूर करें',
    demoReject: 'अस्वीकृत नतीजा दिखाएँ', approvedTitle: 'आप सत्यापित हैं!', approvedText: 'आपकी प्रोफ़ाइल अब वाहन मालिकों को दिख रही है।',
    start: 'नौकरी खोजना शुरू करें', rejectedTitle: 'एक दस्तावेज़ की नई फोटो चाहिए', fix: 'फोटो दोबारा लें', demoTitle: 'डेमो कंट्रोल',
  },
  home: {
    hello: 'नमस्ते, {{name}}', search: 'खोजें: ट्रक, सेडान, बस…', nearMe: 'मेरे पास', planTitle: 'आवेदन के लिए प्लान लें',
    planText: 'देखना मुफ़्त है। प्लान से आवेदन करें और मालिकों को कॉल करें।', planActive: 'ड्राइवर प्लान चालू', daysLeft: '{{n}} दिन बाकी',
    jobsFor: '{{cat}} की नौकरियाँ', allJobs: 'आपके पास की नौकरियाँ', newest: 'नई पहले', noJobs: 'इन फ़िल्टर से कोई नौकरी नहीं मिली',
    clear: 'फ़िल्टर हटाएँ', posted: '{{h}} घंटे पहले', applied: '{{n}} ने आवेदन किया', kycBanner: 'जाँच बाकी है। मंज़ूरी के बाद आवेदन कर सकेंगे।', all: 'सभी',
  },
  job: {
    salary: 'वेतन', payPerTrip: 'प्रति ट्रिप भुगतान', route: 'रूट', duty: 'ड्यूटी', licence: 'लाइसेंस', experience: 'अनुभव', stay: 'रहना',
    start: 'शुरुआत', vehicle: 'वाहन', model: 'मॉडल', year: 'साल', number: 'नंबर', owner: 'वाहन मालिक', vehicles: '{{n}} वाहन',
    locked: 'मालिक आपका आवेदन मंज़ूर करे, तब फ़ोन और चैट खुलेंगे।', report: 'इस नौकरी की शिकायत करें', applyNow: 'अभी आवेदन करें',
    status: 'आवेदन की स्थिति', payTitle: 'आवेदन के लिए ड्राइवर प्लान लें', paySub: 'एक प्लान, Driver Finder की सारी नौकरियाँ', b1: 'किसी भी नौकरी पर आवेदन',
    b2: 'मालिकों के बुलावे स्वीकार करें', b3: 'मालिकों को कॉल, व्हाट्सऐप और चैट', startsAt: 'कीमत', seePlans: 'प्लान देखें', notNow: 'अभी नहीं',
    kycTitle: 'जाँच बाकी है', kycText: 'टीम आपके दस्तावेज़ मंज़ूर करे, उसके बाद आवेदन कर सकेंगे।', sent: 'आवेदन भेज दिया',
    sentText: 'मालिक इसे देखेंगे। हम आपको सूचना देंगे।', reported: 'धन्यवाद। हमारी टीम इस नौकरी को जाँचेगी।', postedBy: '{{h}} घंटे पहले डाली गई',
  },
  my: {
    title: 'मेरी नौकरियाँ', applied: 'आवेदन', requests: 'बुलावे', connected: 'जुड़े हुए', emptyApplied: 'अभी तक कोई आवेदन नहीं',
    emptyAppliedText: 'जिन नौकरियों पर आप आवेदन करेंगे, वे यहाँ स्थिति के साथ दिखेंगी।', emptyReq: 'अभी तक कोई बुलावा नहीं',
    emptyReqText: 'प्रोफ़ाइल लाइव होने पर मालिक आपको बुलावा भेज सकते हैं।', emptyConn: 'अभी कोई जुड़ाव नहीं',
    emptyConnText: 'मालिक मंज़ूर करे, तो आप यहाँ कॉल और चैट कर सकेंगे।', wants: 'आपको काम पर रखना चाहते हैं', accept: 'स्वीकार करें',
    decline: 'मना करें', findJobs: 'नौकरी खोजें', Applied: 'आवेदन किया', Shortlisted: 'चुने गए', Connected: 'जुड़ गए', 'Not selected': 'नहीं चुने गए',
  },
  chat: { title: 'चैट', empty: 'अभी कोई चैट नहीं', emptyText: 'मालिक से जुड़ने के बाद चैट खुलती है।', type: 'संदेश लिखें' },
  profile: {
    title: 'प्रोफ़ाइल', complete: 'प्रोफ़ाइल {{p}}% पूरी', documents: 'मेरे दस्तावेज़', plan: 'मेरा प्लान', language: 'भाषा',
    notifications: 'सूचनाएँ', help: 'मदद और सहायता', terms: 'शर्तें और गोपनीयता', logout: 'लॉग आउट', logoutQ: 'Driver Finder से लॉग आउट करें?',
    noPlan: 'कोई चालू प्लान नहीं', canDrive: 'चला सकते हैं', lookingFor: 'ढूँढ रहे हैं', saved: 'सेव की गई नौकरियाँ',
  },
  plans: {
    title: 'प्लान', driverPlan: 'ड्राइवर प्लान', ownerPlan: 'मालिक प्लान', sub: 'देखना मुफ़्त रहेगा। प्लान से जुड़ना खुलता है।',
    get: 'आपको क्या मिलेगा', pay: 'भुगतान करें', secure: 'सुरक्षित भुगतान · UPI, कार्ड, नेट बैंकिंग', d1: 'किसी भी श्रेणी की नौकरी पर आवेदन',
    d2: 'मालिकों के बुलावे स्वीकार करें', d3: 'जुड़ने के बाद कॉल, व्हाट्सऐप और चैट', d4: 'मालिकों को सत्यापित बैज दिखेगा',
    o1: 'अपने सभी वाहनों के लिए नौकरी डालें', o2: 'सभी सत्यापित ड्राइवर खोजें', o3: 'ड्राइवरों को बुलावा भेजें', o4: 'जुड़ने के बाद कॉल, व्हाट्सऐप और चैट',
    active: '{{date}} तक चालू',
  },
  pay: {
    title: 'भुगतान', demo: 'डेमो बिल्ड: असली भुगतान नहीं लिया जाता।', payNow: 'अभी भुगतान करें', method: 'भुगतान का तरीका', upi: 'UPI',
    card: 'डेबिट या क्रेडिट कार्ड', net: 'नेट बैंकिंग', processing: 'भुगतान हो रहा है…', success: 'भुगतान सफल', successText: 'आपका प्लान {{date}} तक चालू है।',
  },
  notif: { title: 'सूचनाएँ', empty: 'कोई नई सूचना नहीं', emptyText: 'नौकरी की खबरें और संदेश यहाँ दिखेंगे।' },
};

/** Core screens for the other launch languages (draft translations). */
const core = (
  c: { continue: string; next: string; call: string; chat: string },
  tabs: typeof en.tabs,
  langTitle: string,
  phone: { title: string; getOtp: string },
  otp: { title: string; verify: string },
  role: { title: string; driver: string; owner: string },
  home: { hello: string; nearMe: string; allJobs: string },
  applyNow: string,
) => ({
  common: c,
  tabs,
  lang: { title: langTitle },
  phone,
  otp,
  role,
  home,
  job: { applyNow },
});

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  mr: {
    translation: core(
      { continue: 'पुढे चला', next: 'पुढे', call: 'कॉल', chat: 'चॅट' },
      { jobs: 'नोकऱ्या', myJobs: 'माझ्या नोकऱ्या', chats: 'चॅट', profile: 'प्रोफाइल' },
      'तुमची भाषा निवडा',
      { title: 'तुमचा मोबाइल नंबर टाका', getOtp: 'OTP मिळवा' },
      { title: 'कोड टाका', verify: 'पडताळा' },
      { title: 'तुम्ही कोण आहात?', driver: 'मी ड्रायव्हर आहे', owner: 'माझ्याकडे वाहन आहे' },
      { hello: 'नमस्कार, {{name}}', nearMe: 'जवळपास', allJobs: 'तुमच्या जवळच्या नोकऱ्या' },
      'आत्ता अर्ज करा',
    ),
  },
  gu: {
    translation: core(
      { continue: 'આગળ વધો', next: 'આગળ', call: 'કૉલ', chat: 'ચેટ' },
      { jobs: 'નોકરીઓ', myJobs: 'મારી નોકરીઓ', chats: 'ચેટ', profile: 'પ્રોફાઇલ' },
      'તમારી ભાષા પસંદ કરો',
      { title: 'તમારો મોબાઇલ નંબર નાખો', getOtp: 'OTP મેળવો' },
      { title: 'કોડ નાખો', verify: 'ચકાસો' },
      { title: 'તમે કોણ છો?', driver: 'હું ડ્રાઇવર છું', owner: 'મારી પાસે વાહન છે' },
      { hello: 'નમસ્તે, {{name}}', nearMe: 'મારી નજીક', allJobs: 'તમારી નજીકની નોકરીઓ' },
      'હમણાં અરજી કરો',
    ),
  },
  bn: {
    translation: core(
      { continue: 'এগিয়ে যান', next: 'পরবর্তী', call: 'কল', chat: 'চ্যাট' },
      { jobs: 'কাজ', myJobs: 'আমার কাজ', chats: 'চ্যাট', profile: 'প্রোফাইল' },
      'আপনার ভাষা বেছে নিন',
      { title: 'আপনার মোবাইল নম্বর দিন', getOtp: 'OTP নিন' },
      { title: 'কোড দিন', verify: 'যাচাই করুন' },
      { title: 'আপনি কে?', driver: 'আমি ড্রাইভার', owner: 'আমার গাড়ি আছে' },
      { hello: 'নমস্কার, {{name}}', nearMe: 'কাছাকাছি', allJobs: 'আপনার কাছের কাজ' },
      'এখনই আবেদন করুন',
    ),
  },
  pa: {
    translation: core(
      { continue: 'ਅੱਗੇ ਵਧੋ', next: 'ਅੱਗੇ', call: 'ਕਾਲ', chat: 'ਚੈਟ' },
      { jobs: 'ਨੌਕਰੀਆਂ', myJobs: 'ਮੇਰੀਆਂ ਨੌਕਰੀਆਂ', chats: 'ਚੈਟ', profile: 'ਪ੍ਰੋਫਾਈਲ' },
      'ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ',
      { title: 'ਆਪਣਾ ਮੋਬਾਈਲ ਨੰਬਰ ਪਾਓ', getOtp: 'OTP ਲਓ' },
      { title: 'ਕੋਡ ਪਾਓ', verify: 'ਪੁਸ਼ਟੀ ਕਰੋ' },
      { title: 'ਤੁਸੀਂ ਕੌਣ ਹੋ?', driver: 'ਮੈਂ ਡਰਾਈਵਰ ਹਾਂ', owner: 'ਮੇਰੇ ਕੋਲ ਗੱਡੀ ਹੈ' },
      { hello: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ, {{name}}', nearMe: 'ਮੇਰੇ ਨੇੜੇ', allJobs: 'ਤੁਹਾਡੇ ਨੇੜੇ ਦੀਆਂ ਨੌਕਰੀਆਂ' },
      'ਹੁਣੇ ਅਪਲਾਈ ਕਰੋ',
    ),
  },
  ta: {
    translation: core(
      { continue: 'தொடரவும்', next: 'அடுத்து', call: 'அழை', chat: 'அரட்டை' },
      { jobs: 'வேலைகள்', myJobs: 'என் வேலைகள்', chats: 'அரட்டை', profile: 'சுயவிவரம்' },
      'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்',
      { title: 'உங்கள் மொபைல் எண்ணை உள்ளிடவும்', getOtp: 'OTP பெறவும்' },
      { title: 'குறியீட்டை உள்ளிடவும்', verify: 'சரிபார்க்கவும்' },
      { title: 'நீங்கள் யார்?', driver: 'நான் ஓட்டுநர்', owner: 'என்னிடம் வாகனம் உள்ளது' },
      { hello: 'வணக்கம், {{name}}', nearMe: 'அருகில்', allJobs: 'உங்கள் அருகிலுள்ள வேலைகள்' },
      'இப்போது விண்ணப்பிக்கவும்',
    ),
  },
  te: {
    translation: core(
      { continue: 'కొనసాగించండి', next: 'తరువాత', call: 'కాల్', chat: 'చాట్' },
      { jobs: 'ఉద్యోగాలు', myJobs: 'నా ఉద్యోగాలు', chats: 'చాట్', profile: 'ప్రొఫైల్' },
      'మీ భాషను ఎంచుకోండి',
      { title: 'మీ మొబైల్ నంబర్ నమోదు చేయండి', getOtp: 'OTP పొందండి' },
      { title: 'కోడ్ నమోదు చేయండి', verify: 'ధృవీకరించండి' },
      { title: 'మీరు ఎవరు?', driver: 'నేను డ్రైవర్‌ని', owner: 'నాకు వాహనం ఉంది' },
      { hello: 'నమస్తే, {{name}}', nearMe: 'దగ్గరలో', allJobs: 'మీ దగ్గరి ఉద్యోగాలు' },
      'ఇప్పుడే దరఖాస్తు చేయండి',
    ),
  },
  kn: {
    translation: core(
      { continue: 'ಮುಂದುವರಿಯಿರಿ', next: 'ಮುಂದೆ', call: 'ಕರೆ', chat: 'ಚಾಟ್' },
      { jobs: 'ಕೆಲಸಗಳು', myJobs: 'ನನ್ನ ಕೆಲಸಗಳು', chats: 'ಚಾಟ್', profile: 'ಪ್ರೊಫೈಲ್' },
      'ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
      { title: 'ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ', getOtp: 'OTP ಪಡೆಯಿರಿ' },
      { title: 'ಕೋಡ್ ನಮೂದಿಸಿ', verify: 'ಪರಿಶೀಲಿಸಿ' },
      { title: 'ನೀವು ಯಾರು?', driver: 'ನಾನು ಚಾಲಕ', owner: 'ನನ್ನ ಬಳಿ ವಾಹನವಿದೆ' },
      { hello: 'ನಮಸ್ಕಾರ, {{name}}', nearMe: 'ಹತ್ತಿರ', allJobs: 'ನಿಮ್ಮ ಹತ್ತಿರದ ಕೆಲಸಗಳು' },
      'ಈಗಲೇ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ',
    ),
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
