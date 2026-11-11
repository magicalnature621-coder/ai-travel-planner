export type City = {
  name: string;
  state: string;
  lat: number;
  lng: number;
  airport?: string; // IATA code
  station: string; // railway station code
  areas: string[];
  attractions: string[];
  dishes: string[];
  tagline: string;
};

export const CITIES: City[] = [
  { name: "Delhi", state: "Delhi", lat: 28.61, lng: 77.21, airport: "DEL", station: "NDLS", areas: ["Connaught Place", "Karol Bagh", "Paharganj", "Aerocity"], attractions: ["Red Fort", "Qutub Minar", "India Gate", "Humayun's Tomb", "Chandni Chowk", "Lotus Temple", "Akshardham Temple", "Hauz Khas Village"], dishes: ["Chole Bhature", "Butter Chicken", "Parathas", "Chaat"], tagline: "History on every street corner" },
  { name: "Mumbai", state: "Maharashtra", lat: 19.08, lng: 72.88, airport: "BOM", station: "CSMT", areas: ["Colaba", "Bandra", "Juhu", "Andheri"], attractions: ["Gateway of India", "Marine Drive", "Elephanta Caves", "Chhatrapati Shivaji Terminus", "Siddhivinayak Temple", "Juhu Beach", "Bandra-Worli Sea Link", "Haji Ali Dargah"], dishes: ["Vada Pav", "Pav Bhaji", "Bombay Duck Fry", "Misal Pav"], tagline: "The city that never sleeps" },
  { name: "Bengaluru", state: "Karnataka", lat: 12.97, lng: 77.59, airport: "BLR", station: "SBC", areas: ["MG Road", "Indiranagar", "Koramangala", "Whitefield"], attractions: ["Lalbagh Botanical Garden", "Cubbon Park", "Bangalore Palace", "Tipu Sultan's Summer Palace", "ISKCON Temple", "Nandi Hills", "Commercial Street", "Bull Temple"], dishes: ["Masala Dosa", "Bisi Bele Bath", "Filter Coffee", "Ragi Mudde"], tagline: "Garden city with a startup soul" },
  { name: "Chennai", state: "Tamil Nadu", lat: 13.08, lng: 80.27, airport: "MAA", station: "MAS", areas: ["T. Nagar", "Egmore", "Mylapore", "Besant Nagar"], attractions: ["Marina Beach", "Kapaleeshwarar Temple", "Fort St. George", "San Thome Basilica", "Government Museum", "Mahabalipuram Shore Temple", "Elliot's Beach", "DakshinaChitra"], dishes: ["Idli Sambar", "Chettinad Chicken", "Pongal", "Filter Coffee"], tagline: "Gateway to South India" },
  { name: "Kolkata", state: "West Bengal", lat: 22.57, lng: 88.36, airport: "CCU", station: "HWH", areas: ["Park Street", "Salt Lake", "Esplanade", "New Town"], attractions: ["Victoria Memorial", "Howrah Bridge", "Dakshineswar Kali Temple", "Indian Museum", "Princep Ghat", "Kalighat Temple", "Science City", "College Street"], dishes: ["Kathi Roll", "Rosogolla", "Macher Jhol", "Mishti Doi"], tagline: "City of joy" },
  { name: "Hyderabad", state: "Telangana", lat: 17.39, lng: 78.49, airport: "HYD", station: "SC", areas: ["Banjara Hills", "Hitech City", "Charminar", "Jubilee Hills"], attractions: ["Charminar", "Golconda Fort", "Ramoji Film City", "Hussain Sagar Lake", "Salar Jung Museum", "Chowmahalla Palace", "Birla Mandir", "Qutb Shahi Tombs"], dishes: ["Hyderabadi Biryani", "Haleem", "Double ka Meetha", "Irani Chai"], tagline: "City of pearls and biryani" },
  { name: "Jaipur", state: "Rajasthan", lat: 26.91, lng: 75.79, airport: "JAI", station: "JP", areas: ["MI Road", "C-Scheme", "Bani Park", "Old City"], attractions: ["Amber Fort", "Hawa Mahal", "City Palace", "Jantar Mantar", "Nahargarh Fort", "Jal Mahal", "Albert Hall Museum", "Johari Bazaar"], dishes: ["Dal Baati Churma", "Laal Maas", "Ghewar", "Pyaaz Kachori"], tagline: "The pink city of royals" },
  { name: "Goa", state: "Goa", lat: 15.49, lng: 73.83, airport: "GOI", station: "MAO", areas: ["Calangute", "Baga", "Panaji", "Palolem"], attractions: ["Baga Beach", "Fort Aguada", "Basilica of Bom Jesus", "Dudhsagar Falls", "Anjuna Flea Market", "Chapora Fort", "Palolem Beach", "Fontainhas Latin Quarter"], dishes: ["Goan Fish Curry", "Pork Vindaloo", "Bebinca", "Prawn Balchão"], tagline: "Sun, sand and susegad" },
  { name: "Agra", state: "Uttar Pradesh", lat: 27.18, lng: 78.01, airport: "AGR", station: "AGC", areas: ["Taj Ganj", "Fatehabad Road", "Sadar Bazaar"], attractions: ["Taj Mahal", "Agra Fort", "Fatehpur Sikri", "Mehtab Bagh", "Itmad-ud-Daulah", "Akbar's Tomb", "Kinari Bazaar"], dishes: ["Agra Petha", "Bedai & Jalebi", "Mughlai Korma", "Dalmoth"], tagline: "Home of the Taj" },
  { name: "Varanasi", state: "Uttar Pradesh", lat: 25.32, lng: 82.97, airport: "VNS", station: "BSB", areas: ["Dashashwamedh", "Assi Ghat", "Godowlia", "Cantonment"], attractions: ["Dashashwamedh Ghat Aarti", "Kashi Vishwanath Temple", "Sarnath", "Assi Ghat", "Manikarnika Ghat", "Ramnagar Fort", "Sunrise boat ride on the Ganga", "Banaras Hindu University"], dishes: ["Kachori Sabzi", "Banarasi Paan", "Tamatar Chaat", "Malaiyyo"], tagline: "The spiritual capital" },
  { name: "Udaipur", state: "Rajasthan", lat: 24.59, lng: 73.71, airport: "UDR", station: "UDZ", areas: ["Lake Pichola", "Fateh Sagar", "Old City"], attractions: ["City Palace", "Lake Pichola Boat Ride", "Jag Mandir", "Saheliyon ki Bari", "Fateh Sagar Lake", "Sajjangarh Monsoon Palace", "Bagore ki Haveli", "Jagdish Temple"], dishes: ["Dal Baati", "Gatte ki Sabzi", "Mirchi Bada", "Malpua"], tagline: "City of lakes" },
  { name: "Manali", state: "Himachal Pradesh", lat: 32.24, lng: 77.19, airport: "KUU", station: "CDG", areas: ["Mall Road", "Old Manali", "Vashisht"], attractions: ["Solang Valley", "Rohtang Pass", "Hadimba Temple", "Old Manali Village", "Jogini Waterfall", "Vashisht Hot Springs", "Manu Temple", "Atal Tunnel"], dishes: ["Siddu", "Trout Fish", "Thukpa", "Babru"], tagline: "Mountains, snow and adventure" },
  { name: "Rishikesh", state: "Uttarakhand", lat: 30.09, lng: 78.27, airport: "DED", station: "RKSH", areas: ["Tapovan", "Laxman Jhula", "Ram Jhula"], attractions: ["Laxman Jhula", "Triveni Ghat Aarti", "River Rafting at Shivpuri", "Beatles Ashram", "Neer Garh Waterfall", "Parmarth Niketan", "Kunjapuri Temple sunrise", "Bungee at Mohan Chatti"], dishes: ["Aloo Puri", "Chotiwala Thali", "Lassi", "Momos"], tagline: "Yoga capital of the world" },
  { name: "Kochi", state: "Kerala", lat: 9.93, lng: 76.27, airport: "COK", station: "ERS", areas: ["Fort Kochi", "Marine Drive", "Edappally"], attractions: ["Chinese Fishing Nets", "Fort Kochi Beach", "Mattancherry Palace", "Jew Town", "Kathakali Show", "St. Francis Church", "Cherai Beach", "Alleppey backwater day trip"], dishes: ["Appam & Stew", "Karimeen Pollichathu", "Kerala Sadya", "Puttu Kadala"], tagline: "Queen of the Arabian Sea" },
  { name: "Pune", state: "Maharashtra", lat: 18.52, lng: 73.86, airport: "PNQ", station: "PUNE", areas: ["Koregaon Park", "Shivajinagar", "Hinjewadi"], attractions: ["Shaniwar Wada", "Aga Khan Palace", "Sinhagad Fort", "Dagdusheth Ganpati", "Osho Ashram", "Pataleshwar Caves", "Lonavala day trip"], dishes: ["Misal Pav", "Puran Poli", "Sabudana Khichdi", "Bhakarwadi"], tagline: "Oxford of the East" },
  { name: "Amritsar", state: "Punjab", lat: 31.63, lng: 74.87, airport: "ATQ", station: "ASR", areas: ["Golden Temple Area", "Lawrence Road", "Ranjit Avenue"], attractions: ["Golden Temple", "Wagah Border Ceremony", "Jallianwala Bagh", "Partition Museum", "Durgiana Temple", "Gobindgarh Fort"], dishes: ["Amritsari Kulcha", "Langar", "Lassi", "Amritsari Fish"], tagline: "Soul of Punjab" },
  { name: "Ahmedabad", state: "Gujarat", lat: 23.02, lng: 72.57, airport: "AMD", station: "ADI", areas: ["Navrangpura", "CG Road", "Old City"], attractions: ["Sabarmati Ashram", "Adalaj Stepwell", "Sidi Saiyyed Mosque", "Kankaria Lake", "Manek Chowk night market", "Calico Museum", "Riverfront"], dishes: ["Dhokla", "Khandvi", "Gujarati Thali", "Fafda Jalebi"], tagline: "India's first heritage city" },
  { name: "Darjeeling", state: "West Bengal", lat: 27.04, lng: 88.26, airport: "IXB", station: "NJP", areas: ["Mall Road", "Chowrasta", "Ghoom"], attractions: ["Tiger Hill Sunrise", "Darjeeling Himalayan Railway", "Batasia Loop", "Happy Valley Tea Estate", "Peace Pagoda", "Padmaja Naidu Zoo", "Rock Garden"], dishes: ["Momos", "Thukpa", "Darjeeling Tea", "Sel Roti"], tagline: "Queen of the hills" },
  { name: "Leh", state: "Ladakh", lat: 34.15, lng: 77.58, airport: "IXL", station: "JAT", areas: ["Leh Main Bazaar", "Changspa", "Fort Road"], attractions: ["Pangong Lake", "Nubra Valley", "Khardung La", "Shanti Stupa", "Leh Palace", "Thiksey Monastery", "Magnetic Hill", "Hemis Monastery"], dishes: ["Thukpa", "Skyu", "Butter Tea", "Momos"], tagline: "Land of high passes" },
  { name: "Mysuru", state: "Karnataka", lat: 12.3, lng: 76.64, airport: "MYQ", station: "MYS", areas: ["Palace Road", "Gokulam", "Chamundi Hills"], attractions: ["Mysore Palace", "Chamundi Hills", "Brindavan Gardens", "St. Philomena's Church", "Srirangapatna", "Mysore Zoo", "Devaraja Market"], dishes: ["Mysore Pak", "Mysore Masala Dosa", "Bisi Bele Bath", "Chiroti"], tagline: "City of palaces" },
  { name: "Shimla", state: "Himachal Pradesh", lat: 31.1, lng: 77.17, airport: "SLV", station: "SML", areas: ["The Mall", "Lakkar Bazaar", "Chotta Shimla"], attractions: ["The Ridge", "Jakhoo Temple", "Kufri", "Christ Church", "Kalka-Shimla Toy Train", "Viceregal Lodge", "Chadwick Falls"], dishes: ["Chana Madra", "Siddu", "Babru", "Tudkiya Bhath"], tagline: "Summer capital of the Raj" },
  { name: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.69, lng: 83.22, airport: "VTZ", station: "VSKP", areas: ["Beach Road", "MVP Colony", "Rushikonda"], attractions: ["RK Beach", "Kailasagiri", "Araku Valley", "Borra Caves", "INS Kursura Submarine Museum", "Rushikonda Beach", "Yarada Beach"], dishes: ["Bongulo Chicken", "Pootharekulu", "Andhra Thali", "Royyala Iguru"], tagline: "City of destiny" },
];

export function findCity(name: string): City | undefined {
  const n = name.trim().toLowerCase();
  return CITIES.find((c) => c.name.toLowerCase() === n);
}

export function distanceKm(a: City, b: City): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  // road/rail distance is ~1.25x the straight line
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 1.25);
}
