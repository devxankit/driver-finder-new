/**
 * Cities offered in the app's city pickers: metros first (the order the app
 * shows them), then major cities and transport hubs across every state.
 * Users can add a missing city with "Other"; the admin manages the list.
 */
export const METROS = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Surat', 'Jaipur', 'Lucknow', 'Thane', 'Navi Mumbai', 'Bhiwandi', 'Gurugram', 'Noida']

export const STATE_CITIES = {
  Maharashtra: ['Nashik', 'Nagpur', 'Aurangabad', 'Solapur', 'Kolhapur', 'Amravati', 'Nanded', 'Sangli', 'Jalgaon', 'Akola', 'Latur', 'Dhule', 'Ahmednagar', 'Chandrapur', 'Parbhani', 'Satara', 'Ratnagiri', 'Panvel', 'Kalyan', 'Vasai-Virar', 'Pimpri-Chinchwad', 'Ulhasnagar', 'Malegaon', 'Jalna', 'Wardha', 'Yavatmal', 'Beed', 'Osmanabad', 'Baramati', 'Palghar'],
  Gujarat: ['Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh', 'Anand', 'Navsari', 'Morbi', 'Bharuch', 'Vapi', 'Mehsana', 'Gandhidham', 'Mundra', 'Kandla', 'Porbandar', 'Palanpur', 'Ankleshwar', 'Surendranagar', 'Valsad'],
  Rajasthan: ['Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar', 'Bhilwara', 'Sikar', 'Bharatpur', 'Pali', 'Sri Ganganagar', 'Barmer', 'Chittorgarh', 'Bhiwadi', 'Kishangarh'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa', 'Katni', 'Singrauli', 'Burhanpur', 'Khandwa', 'Pithampur', 'Chhindwara', 'Neemuch', 'Mandsaur'],
  'Uttar Pradesh': ['Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur', 'Gorakhpur', 'Firozabad', 'Jhansi', 'Muzaffarnagar', 'Mathura', 'Ayodhya', 'Shahjahanpur', 'Rampur', 'Greater Noida', 'Hapur', 'Etawah', 'Mirzapur', 'Bulandshahr', 'Unnao', 'Rae Bareli', 'Sitapur', 'Basti', 'Azamgarh'],
  Delhi: ['New Delhi', 'Dwarka', 'Rohini', 'Narela', 'Okhla'],
  Haryana: ['Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula', 'Bahadurgarh', 'Rewari', 'Sirsa', 'Bhiwani', 'Manesar', 'Jhajjar', 'Kurukshetra'],
  Punjab: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Hoshiarpur', 'Pathankot', 'Moga', 'Firozpur', 'Phagwara', 'Rajpura', 'Khanna', 'Sangrur', 'Barnala'],
  Chandigarh: ['Chandigarh'],
  'Himachal Pradesh': ['Shimla', 'Solan', 'Baddi', 'Mandi', 'Dharamshala', 'Kullu'],
  Uttarakhand: ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh'],
  'Jammu and Kashmir': ['Jammu', 'Srinagar', 'Kathua', 'Udhampur'],
  Bihar: ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Begusarai', 'Arrah', 'Hajipur', 'Siwan', 'Chhapra', 'Katihar'],
  Jharkhand: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh', 'Giridih', 'Ramgarh'],
  'West Bengal': ['Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Kharagpur', 'Haldia', 'Bardhaman', 'Malda', 'Kalyani', 'Barasat', 'Krishnanagar', 'Baharampur'],
  Odisha: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Paradip', 'Balasore', 'Jharsuguda', 'Angul', 'Puri'],
  Chhattisgarh: ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Raigarh', 'Jagdalpur'],
  Assam: ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur'],
  'North East': ['Shillong', 'Imphal', 'Agartala', 'Aizawl', 'Kohima', 'Dimapur', 'Itanagar', 'Gangtok'],
  Karnataka: ['Mysuru', 'Mangaluru', 'Hubballi', 'Dharwad', 'Belagavi', 'Kalaburagi', 'Ballari', 'Davanagere', 'Shivamogga', 'Tumakuru', 'Udupi', 'Vijayapura', 'Hosapete', 'Hassan', 'Raichur', 'Bidar', 'Chitradurga', 'Mandya', 'Kolar'],
  Telangana: ['Warangal', 'Karimnagar', 'Nizamabad', 'Khammam', 'Ramagundam', 'Mahbubnagar', 'Nalgonda', 'Secunderabad', 'Siddipet', 'Adilabad'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Tirupati', 'Kakinada', 'Kadapa', 'Anantapur', 'Eluru', 'Ongole', 'Vizianagaram', 'Srikakulam', 'Chittoor'],
  'Tamil Nadu': ['Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur', 'Erode', 'Vellore', 'Tirunelveli', 'Thoothukudi', 'Hosur', 'Thanjavur', 'Dindigul', 'Kanchipuram', 'Karur', 'Namakkal', 'Nagercoil', 'Cuddalore', 'Sivakasi', 'Ennore', 'Sriperumbudur'],
  Kerala: ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Palakkad', 'Alappuzha', 'Malappuram', 'Kottayam', 'Kasaragod'],
  Goa: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa'],
  'Puducherry': ['Puducherry'],
}

/** Every city in display order, without duplicates. */
export const ALL_CITIES = [...new Set([...METROS, ...Object.values(STATE_CITIES).flat()])]
