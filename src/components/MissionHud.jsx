import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { LAYER_DEFS, SURVEILLANCE_PRIMARY_LAYERS } from '../constants/dataSources';
import IntelWire from './IntelWire';
import IntelBriefPanel from './IntelBriefPanel';
import LiveNewsRelayPanel from './LiveNewsRelayPanel';
import StrategicIntelPanel from './StrategicIntelPanel';
import { discoverEntityVisuals } from '../services/visualDiscovery';
import { isContinuousLiveCameraFeed } from '../services/cctvFeeds';

// ── Massive city database (250+ cities, ranked by global significance) ──
const ALL_CITIES = [
    // ─── Tier 1 — Global megacities (pop > 10M) ───
    { name: 'Tokyo', longitude: 139.6917, latitude: 35.6895, height: 220000 },
    { name: 'Delhi', longitude: 77.2090, latitude: 28.6139, height: 200000 },
    { name: 'Shanghai', longitude: 121.4737, latitude: 31.2304, height: 200000 },
    { name: 'São Paulo', longitude: -46.6333, latitude: -23.5505, height: 220000 },
    { name: 'Mexico City', longitude: -99.1332, latitude: 19.4326, height: 200000 },
    { name: 'Cairo', longitude: 31.2357, latitude: 30.0444, height: 200000 },
    { name: 'Mumbai', longitude: 72.8777, latitude: 19.0760, height: 180000 },
    { name: 'Beijing', longitude: 116.4074, latitude: 39.9042, height: 220000 },
    { name: 'Dhaka', longitude: 90.4125, latitude: 23.8103, height: 180000 },
    { name: 'Osaka', longitude: 135.5023, latitude: 34.6937, height: 200000 },
    { name: 'New York', longitude: -74.006, latitude: 40.7128, height: 220000 },
    { name: 'Karachi', longitude: 67.0011, latitude: 24.8607, height: 200000 },
    { name: 'Buenos Aires', longitude: -58.3816, latitude: -34.6037, height: 220000 },
    { name: 'Istanbul', longitude: 28.9784, latitude: 41.0082, height: 200000 },
    { name: 'Lagos', longitude: 3.3792, latitude: 6.5244, height: 180000 },
    { name: 'Manila', longitude: 120.9842, latitude: 14.5995, height: 180000 },
    { name: 'Guangzhou', longitude: 113.2644, latitude: 23.1291, height: 200000 },
    { name: 'Moscow', longitude: 37.6173, latitude: 55.7558, height: 220000 },
    // ─── Tier 2 — Major world cities (pop 5-10M) ───
    { name: 'London', longitude: -0.1276, latitude: 51.5072, height: 180000, pitch: -65 },
    { name: 'Kolkata', longitude: 88.3639, latitude: 22.5726, height: 180000 },
    { name: 'Lima', longitude: -77.0428, latitude: -12.0464, height: 200000 },
    { name: 'Seoul', longitude: 126.9780, latitude: 37.5665, height: 200000 },
    { name: 'Shenzhen', longitude: 114.0579, latitude: 22.5431, height: 180000 },
    { name: 'Jakarta', longitude: 106.8456, latitude: -6.2088, height: 200000 },
    { name: 'Bangalore', longitude: 77.5946, latitude: 12.9716, height: 180000 },
    { name: 'Bangkok', longitude: 100.5018, latitude: 13.7563, height: 180000 },
    { name: 'Hyderabad', longitude: 78.4867, latitude: 17.3850, height: 180000 },
    { name: 'Chennai', longitude: 80.2707, latitude: 13.0827, height: 180000 },
    { name: 'Bogotá', longitude: -74.0721, latitude: 4.7110, height: 200000 },
    { name: 'Ho Chi Minh', longitude: 106.6297, latitude: 10.8231, height: 180000 },
    { name: 'Hong Kong', longitude: 114.1694, latitude: 22.3193, height: 160000 },
    { name: 'Lahore', longitude: 74.3587, latitude: 31.5204, height: 180000 },
    { name: 'Riyadh', longitude: 46.6753, latitude: 24.7136, height: 200000 },
    { name: 'Singapore', longitude: 103.8198, latitude: 1.3521, height: 160000 },
    { name: 'Tehran', longitude: 51.3890, latitude: 35.6892, height: 200000 },
    { name: 'Santiago', longitude: -70.6693, latitude: -33.4489, height: 200000 },
    { name: 'Wuhan', longitude: 114.3055, latitude: 30.5928, height: 200000 },
    { name: 'Toronto', longitude: -79.3832, latitude: 43.6532, height: 200000 },
    { name: 'Paris', longitude: 2.3522, latitude: 48.8566, height: 180000 },
    // ─── Tier 3 — Major capitals & hubs (pop 2-5M) ───
    { name: 'Johannesburg', longitude: 28.0473, latitude: -26.2041, height: 200000 },
    { name: 'Los Angeles', longitude: -118.2437, latitude: 34.0522, height: 200000 },
    { name: 'Chicago', longitude: -87.6298, latitude: 41.8781, height: 200000 },
    { name: 'Nairobi', longitude: 36.8219, latitude: -1.2921, height: 180000 },
    { name: 'Dubai', longitude: 55.2708, latitude: 25.2048, height: 220000 },
    { name: 'Sydney', longitude: 151.2093, latitude: -33.8688, height: 260000 },
    { name: 'Berlin', longitude: 13.4050, latitude: 52.5200, height: 200000 },
    { name: 'Madrid', longitude: -3.7038, latitude: 40.4168, height: 180000 },
    { name: 'Rome', longitude: 12.4964, latitude: 41.9028, height: 180000 },
    { name: 'Taipei', longitude: 121.5654, latitude: 25.0330, height: 180000 },
    { name: 'Kuala Lumpur', longitude: 101.6869, latitude: 3.1390, height: 180000 },
    { name: 'Hanoi', longitude: 105.8542, latitude: 21.0285, height: 180000 },
    { name: 'Addis Ababa', longitude: 38.7578, latitude: 9.0249, height: 200000 },
    { name: 'Dar es Salaam', longitude: 39.2083, latitude: -6.7924, height: 180000 },
    { name: 'Luanda', longitude: 13.2343, latitude: -8.8390, height: 180000 },
    { name: 'Kinshasa', longitude: 15.2663, latitude: -4.4419, height: 180000 },
    { name: 'Khartoum', longitude: 32.5599, latitude: 15.5007, height: 200000 },
    { name: 'Baghdad', longitude: 44.3661, latitude: 33.3152, height: 200000 },
    { name: 'Algiers', longitude: 3.0588, latitude: 36.7538, height: 180000 },
    { name: 'Casablanca', longitude: -7.5898, latitude: 33.5731, height: 180000 },
    { name: 'Abuja', longitude: 7.4951, latitude: 9.0579, height: 180000 },
    { name: 'Accra', longitude: -0.1870, latitude: 5.6037, height: 180000 },
    { name: 'Ankara', longitude: 32.8597, latitude: 39.9334, height: 200000 },
    { name: 'Cape Town', longitude: 18.4241, latitude: -33.9249, height: 200000 },
    { name: 'Pune', longitude: 73.8567, latitude: 18.5204, height: 180000 },
    { name: 'Ahmedabad', longitude: 72.5714, latitude: 23.0225, height: 180000 },
    { name: 'Jeddah', longitude: 39.1925, latitude: 21.4858, height: 200000 },
    { name: 'Chongqing', longitude: 106.5516, latitude: 29.5630, height: 200000 },
    { name: 'Tianjin', longitude: 117.3616, latitude: 39.3434, height: 200000 },
    { name: 'Chengdu', longitude: 104.0665, latitude: 30.5723, height: 200000 },
    { name: 'Nanjing', longitude: 118.7969, latitude: 32.0603, height: 200000 },
    { name: 'St Petersburg', longitude: 30.3351, latitude: 59.9343, height: 200000 },
    { name: 'Melbourne', longitude: 144.9631, latitude: -37.8136, height: 220000 },
    { name: 'Rio de Janeiro', longitude: -43.1729, latitude: -22.9068, height: 200000 },
    { name: 'Amsterdam', longitude: 4.9041, latitude: 52.3676, height: 160000 },
    // ─── Tier 4 — Strategic & regional capitals ───
    { name: 'Stockholm', longitude: 18.0686, latitude: 59.3293, height: 180000 },
    { name: 'Vienna', longitude: 16.3738, latitude: 48.2082, height: 180000 },
    { name: 'Brussels', longitude: 4.3517, latitude: 50.8503, height: 160000 },
    { name: 'Warsaw', longitude: 21.0122, latitude: 52.2297, height: 180000 },
    { name: 'Prague', longitude: 14.4378, latitude: 50.0755, height: 180000 },
    { name: 'Budapest', longitude: 19.0402, latitude: 47.4979, height: 180000 },
    { name: 'Bucharest', longitude: 26.1025, latitude: 44.4268, height: 180000 },
    { name: 'Athens', longitude: 23.7275, latitude: 37.9838, height: 180000 },
    { name: 'Lisbon', longitude: -9.1393, latitude: 38.7223, height: 180000 },
    { name: 'Dublin', longitude: -6.2603, latitude: 53.3498, height: 160000 },
    { name: 'Copenhagen', longitude: 12.5683, latitude: 55.6761, height: 160000 },
    { name: 'Oslo', longitude: 10.7522, latitude: 59.9139, height: 160000 },
    { name: 'Helsinki', longitude: 24.9384, latitude: 60.1699, height: 160000 },
    { name: 'Kyiv', longitude: 30.5234, latitude: 50.4501, height: 200000 },
    { name: 'Barcelona', longitude: 2.1686, latitude: 41.3874, height: 180000 },
    { name: 'Milan', longitude: 9.1900, latitude: 45.4642, height: 180000 },
    { name: 'Munich', longitude: 11.5820, latitude: 48.1351, height: 180000 },
    { name: 'Zurich', longitude: 8.5417, latitude: 47.3769, height: 160000 },
    { name: 'Geneva', longitude: 6.1432, latitude: 46.2044, height: 160000 },
    { name: 'Edinburgh', longitude: -3.1883, latitude: 55.9533, height: 160000 },
    { name: 'Manchester', longitude: -2.2426, latitude: 53.4808, height: 160000 },
    { name: 'Abu Dhabi', longitude: 54.3773, latitude: 24.4539, height: 180000 },
    { name: 'Doha', longitude: 51.5310, latitude: 25.2854, height: 180000 },
    { name: 'Kuwait City', longitude: 47.9783, latitude: 29.3759, height: 180000 },
    { name: 'Muscat', longitude: 58.3829, latitude: 23.5880, height: 180000 },
    { name: 'Amman', longitude: 35.9106, latitude: 31.9454, height: 180000 },
    { name: 'Beirut', longitude: 35.5018, latitude: 33.8938, height: 160000 },
    { name: 'Jerusalem', longitude: 35.2137, latitude: 31.7683, height: 160000 },
    { name: 'Tel Aviv', longitude: 34.7818, latitude: 32.0853, height: 160000 },
    { name: 'Islamabad', longitude: 73.0479, latitude: 33.6844, height: 180000 },
    { name: 'Kabul', longitude: 69.1723, latitude: 34.5553, height: 200000 },
    { name: 'Kathmandu', longitude: 85.3240, latitude: 27.7172, height: 180000 },
    { name: 'Colombo', longitude: 79.8612, latitude: 6.9271, height: 160000 },
    { name: 'Yangon', longitude: 96.1951, latitude: 16.8661, height: 180000 },
    { name: 'Phnom Penh', longitude: 104.9282, latitude: 11.5564, height: 160000 },
    // ─── Tier 5 — Americas deep ───
    { name: 'Houston', longitude: -95.3698, latitude: 29.7604, height: 200000 },
    { name: 'Dallas', longitude: -96.7970, latitude: 32.7767, height: 200000 },
    { name: 'San Francisco', longitude: -122.4194, latitude: 37.7749, height: 180000 },
    { name: 'Miami', longitude: -80.1918, latitude: 25.7617, height: 180000 },
    { name: 'Washington DC', longitude: -77.0369, latitude: 38.9072, height: 180000 },
    { name: 'Boston', longitude: -71.0589, latitude: 42.3601, height: 180000 },
    { name: 'Seattle', longitude: -122.3321, latitude: 47.6062, height: 180000 },
    { name: 'Denver', longitude: -104.9903, latitude: 39.7392, height: 200000 },
    { name: 'Phoenix', longitude: -112.0740, latitude: 33.4484, height: 200000 },
    { name: 'Atlanta', longitude: -84.3880, latitude: 33.7490, height: 200000 },
    { name: 'Detroit', longitude: -83.0458, latitude: 42.3314, height: 180000 },
    { name: 'Philadelphia', longitude: -75.1652, latitude: 39.9526, height: 180000 },
    { name: 'Minneapolis', longitude: -93.2650, latitude: 44.9778, height: 180000 },
    { name: 'Las Vegas', longitude: -115.1398, latitude: 36.1699, height: 180000 },
    { name: 'Montreal', longitude: -73.5673, latitude: 45.5017, height: 180000 },
    { name: 'Vancouver', longitude: -123.1207, latitude: 49.2827, height: 180000 },
    { name: 'Havana', longitude: -82.3666, latitude: 23.1136, height: 180000 },
    { name: 'Guatemala City', longitude: -90.5069, latitude: 14.6349, height: 180000 },
    { name: 'San José', longitude: -84.0907, latitude: 9.9281, height: 180000 },
    { name: 'Panamá', longitude: -79.5197, latitude: 8.9824, height: 180000 },
    { name: 'Medellín', longitude: -75.5636, latitude: 6.2476, height: 180000 },
    { name: 'Quito', longitude: -78.4678, latitude: -0.1807, height: 180000 },
    { name: 'Caracas', longitude: -66.9036, latitude: 10.4806, height: 180000 },
    { name: 'Montevideo', longitude: -56.1645, latitude: -34.9011, height: 180000 },
    { name: 'Asunción', longitude: -57.5759, latitude: -25.2637, height: 180000 },
    { name: 'La Paz', longitude: -68.1193, latitude: -16.4897, height: 200000 },
    { name: 'Brasília', longitude: -47.9292, latitude: -15.7942, height: 200000 },
    { name: 'Recife', longitude: -34.8771, latitude: -8.0476, height: 180000 },
    { name: 'Anchorage', longitude: -149.9003, latitude: 61.2181, height: 200000 },
    { name: 'Honolulu', longitude: -157.8268, latitude: 21.3069, height: 180000 },
    // ─── Tier 6 — Africa deep ───
    { name: 'Kampala', longitude: 32.5825, latitude: 0.3476, height: 180000 },
    { name: 'Maputo', longitude: 32.5732, latitude: -25.9692, height: 180000 },
    { name: 'Lusaka', longitude: 28.3228, latitude: -15.3875, height: 180000 },
    { name: 'Harare', longitude: 31.0335, latitude: -17.8252, height: 180000 },
    { name: 'Dakar', longitude: -17.4467, latitude: 14.7167, height: 180000 },
    { name: 'Abidjan', longitude: -3.9962, latitude: 5.3600, height: 180000 },
    { name: 'Tunis', longitude: 10.1815, latitude: 36.8065, height: 180000 },
    { name: 'Tripoli', longitude: 13.1913, latitude: 32.8872, height: 180000 },
    { name: 'Antananarivo', longitude: 47.5079, latitude: -18.8792, height: 180000 },
    { name: 'Douala', longitude: 9.7679, latitude: 4.0511, height: 180000 },
    { name: 'Bamako', longitude: -8.0029, latitude: 12.6392, height: 180000 },
    { name: 'Conakry', longitude: -13.5784, latitude: 9.6412, height: 180000 },
    { name: 'Mogadishu', longitude: 45.3182, latitude: 2.0469, height: 180000 },
    { name: 'Windhoek', longitude: 17.0658, latitude: -22.5609, height: 180000 },
    { name: 'Durban', longitude: 31.0218, latitude: -29.8587, height: 180000 },
    // ─── Tier 7 — Asia-Pacific deep ───
    { name: 'Surabaya', longitude: 112.7508, latitude: -7.2575, height: 180000 },
    { name: 'Bandung', longitude: 107.6191, latitude: -6.9175, height: 180000 },
    { name: 'Cebu', longitude: 123.8854, latitude: 10.3157, height: 160000 },
    { name: 'Davao', longitude: 125.4553, latitude: 7.1907, height: 160000 },
    { name: 'Busan', longitude: 129.0756, latitude: 35.1796, height: 180000 },
    { name: 'Fukuoka', longitude: 130.4017, latitude: 33.5904, height: 180000 },
    { name: 'Sapporo', longitude: 141.3545, latitude: 43.0618, height: 180000 },
    { name: 'Nagoya', longitude: 136.9066, latitude: 35.1815, height: 180000 },
    { name: 'Yokohama', longitude: 139.6380, latitude: 35.4437, height: 180000 },
    { name: 'Kyoto', longitude: 135.7681, latitude: 35.0116, height: 160000 },
    { name: 'Hangzhou', longitude: 120.1551, latitude: 30.2741, height: 180000 },
    { name: 'Xi\'an', longitude: 108.9398, latitude: 34.2658, height: 200000 },
    { name: 'Harbin', longitude: 126.6347, latitude: 45.7564, height: 200000 },
    { name: 'Dalian', longitude: 121.6147, latitude: 38.9140, height: 180000 },
    { name: 'Qingdao', longitude: 120.3826, latitude: 36.0671, height: 180000 },
    { name: 'Kunming', longitude: 102.8329, latitude: 25.0389, height: 200000 },
    { name: 'Shenyang', longitude: 123.4328, latitude: 41.8057, height: 200000 },
    { name: 'Ulaanbaatar', longitude: 106.9057, latitude: 47.8864, height: 200000 },
    { name: 'Vladivostok', longitude: 131.8735, latitude: 43.1155, height: 200000 },
    { name: 'Novosibirsk', longitude: 82.9346, latitude: 55.0084, height: 200000 },
    { name: 'Tashkent', longitude: 69.2401, latitude: 41.2995, height: 200000 },
    { name: 'Almaty', longitude: 76.9458, latitude: 43.2379, height: 200000 },
    { name: 'Baku', longitude: 49.8671, latitude: 40.4093, height: 180000 },
    { name: 'Tbilisi', longitude: 44.8271, latitude: 41.7151, height: 180000 },
    { name: 'Yerevan', longitude: 44.5152, latitude: 40.1792, height: 180000 },
    // ─── Tier 8 — Oceania & Pacific Islands ───
    { name: 'Brisbane', longitude: 153.0251, latitude: -27.4698, height: 200000 },
    { name: 'Perth', longitude: 115.8605, latitude: -31.9505, height: 200000 },
    { name: 'Adelaide', longitude: 138.6007, latitude: -34.9285, height: 180000 },
    { name: 'Auckland', longitude: 174.7633, latitude: -36.8485, height: 200000 },
    { name: 'Wellington', longitude: 174.7762, latitude: -41.2866, height: 160000 },
    { name: 'Christchurch', longitude: 172.6362, latitude: -43.5321, height: 160000 },
    { name: 'Suva', longitude: 178.0650, latitude: -18.1416, height: 160000 },
    { name: 'Port Moresby', longitude: 147.1803, latitude: -9.4438, height: 180000 },
    { name: 'Noumea', longitude: 166.4580, latitude: -22.2558, height: 160000 },
    // ─── Tier 9 — India deep coverage ───
    { name: 'Jaipur', longitude: 75.7873, latitude: 26.9124, height: 180000 },
    { name: 'Lucknow', longitude: 80.9462, latitude: 26.8467, height: 180000 },
    { name: 'Kanpur', longitude: 80.3319, latitude: 26.4499, height: 180000 },
    { name: 'Nagpur', longitude: 79.0882, latitude: 21.1458, height: 180000 },
    { name: 'Indore', longitude: 75.8577, latitude: 22.7196, height: 180000 },
    { name: 'Bhopal', longitude: 77.4126, latitude: 23.2599, height: 180000 },
    { name: 'Patna', longitude: 85.1376, latitude: 25.6093, height: 180000 },
    { name: 'Vadodara', longitude: 73.1812, latitude: 22.3072, height: 180000 },
    { name: 'Surat', longitude: 72.8311, latitude: 21.1702, height: 180000 },
    { name: 'Kochi', longitude: 76.2673, latitude: 9.9312, height: 160000 },
    { name: 'Visakhapatnam', longitude: 83.2185, latitude: 17.6868, height: 180000 },
    { name: 'Coimbatore', longitude: 76.9558, latitude: 11.0168, height: 160000 },
    { name: 'Chandigarh', longitude: 76.7794, latitude: 30.7333, height: 160000 },
    { name: 'Guwahati', longitude: 91.7362, latitude: 26.1445, height: 180000 },
    { name: 'Varanasi', longitude: 82.9739, latitude: 25.3176, height: 160000 },
    { name: 'Agra', longitude: 78.0081, latitude: 27.1767, height: 160000 },
    { name: 'Amritsar', longitude: 74.8723, latitude: 31.6340, height: 160000 },
    { name: 'Thiruvananthapuram', longitude: 76.9366, latitude: 8.5241, height: 160000 },
    { name: 'Goa', longitude: 74.1240, latitude: 15.2993, height: 160000 },
    // ─── Tier 10 — Europe & Russia deep ───
    { name: 'Hamburg', longitude: 9.9937, latitude: 53.5511, height: 160000 },
    { name: 'Frankfurt', longitude: 8.6821, latitude: 50.1109, height: 160000 },
    { name: 'Naples', longitude: 14.2681, latitude: 40.8518, height: 160000 },
    { name: 'Lyon', longitude: 4.8357, latitude: 45.7640, height: 160000 },
    { name: 'Marseille', longitude: 5.3698, latitude: 43.2965, height: 160000 },
    { name: 'Seville', longitude: -5.9845, latitude: 37.3891, height: 160000 },
    { name: 'Valencia', longitude: -0.3763, latitude: 39.4699, height: 160000 },
    { name: 'Kraków', longitude: 19.9450, latitude: 50.0647, height: 160000 },
    { name: 'Sofia', longitude: 23.3219, latitude: 42.6977, height: 180000 },
    { name: 'Belgrade', longitude: 20.4489, latitude: 44.7866, height: 180000 },
    { name: 'Zagreb', longitude: 15.9819, latitude: 45.8150, height: 160000 },
    { name: 'Bratislava', longitude: 17.1077, latitude: 48.1486, height: 160000 },
    { name: 'Ljubljana', longitude: 14.5058, latitude: 46.0569, height: 160000 },
    { name: 'Riga', longitude: 24.1052, latitude: 56.9496, height: 160000 },
    { name: 'Vilnius', longitude: 25.2797, latitude: 54.6872, height: 160000 },
    { name: 'Tallinn', longitude: 24.7536, latitude: 59.4370, height: 160000 },
    { name: 'Reykjavik', longitude: -21.8174, latitude: 64.1466, height: 160000 },
    { name: 'Minsk', longitude: 27.5615, latitude: 53.9006, height: 180000 },
    { name: 'Tbilisi', longitude: 44.8271, latitude: 41.7151, height: 180000 },
    { name: 'Nicosia', longitude: 33.3823, latitude: 35.1856, height: 160000 },
    { name: 'Malta', longitude: 14.5146, latitude: 35.8997, height: 140000 },
    { name: 'Monaco', longitude: 7.4246, latitude: 43.7384, height: 140000 },
    { name: 'Kazan', longitude: 49.1221, latitude: 55.7879, height: 180000 },
    { name: 'Yekaterinburg', longitude: 60.6122, latitude: 56.8389, height: 200000 },
    // ─── Tier 11 — Middle East & Central Asia ───
    { name: 'Mecca', longitude: 39.8579, latitude: 21.3891, height: 180000 },
    { name: 'Medina', longitude: 39.5692, latitude: 24.5247, height: 180000 },
    { name: 'Manama', longitude: 50.5577, latitude: 26.2285, height: 160000 },
    { name: 'Sana\'a', longitude: 44.2075, latitude: 15.3694, height: 180000 },
    { name: 'Damascus', longitude: 36.2765, latitude: 33.5138, height: 180000 },
    { name: 'Erbil', longitude: 44.0119, latitude: 36.1912, height: 180000 },
    { name: 'Bishkek', longitude: 74.5698, latitude: 42.8746, height: 180000 },
    { name: 'Dushanbe', longitude: 68.7870, latitude: 38.5598, height: 180000 },
    { name: 'Ashgabat', longitude: 58.3833, latitude: 37.9601, height: 180000 },
    { name: 'Astana', longitude: 71.4704, latitude: 51.1694, height: 200000 },
];

// Cartesian positions pre-computed once for perf
const CITY_CARTESIANS = ALL_CITIES.map((c) => ({
    ...c,
    cartesian: Cesium.Cartesian3.fromDegrees(c.longitude, c.latitude),
}));

function getVisibleCities(viewer, maxCities = 6) {
    if (!viewer || viewer.isDestroyed()) return ALL_CITIES.slice(0, maxCities);

    const camera = viewer.camera;
    const cameraPos = camera.positionWC;

    // Get the point the camera is looking at (center of screen)
    const centerRay = camera.getPickRay(new Cesium.Cartesian2(
        viewer.canvas.width / 2,
        viewer.canvas.height / 2,
    ));

    let lookAtCartesian = null;
    if (centerRay) {
        const hit = viewer.scene.globe.pick(centerRay, viewer.scene);
        if (hit) lookAtCartesian = hit;
    }

    // Fallback: use camera position projected to surface
    if (!lookAtCartesian) {
        const cartographic = Cesium.Cartographic.fromCartesian(cameraPos);
        lookAtCartesian = Cesium.Cartesian3.fromRadians(
            cartographic.longitude,
            cartographic.latitude,
            0,
        );
    }

    // Score cities: closer to camera look-at center = better
    const scored = CITY_CARTESIANS.map((city) => {
        const dist = Cesium.Cartesian3.distance(lookAtCartesian, city.cartesian);
        return { city, dist };
    });

    scored.sort((a, b) => a.dist - b.dist);
    return scored.slice(0, maxCities).map((s) => s.city);
}

function appendCacheBuster(url) {
    if (!url) return '';
    try {
        const parsed = new URL(url);
        parsed.searchParams.set('_ts', String(Date.now()));
        return parsed.toString();
    } catch (err) {
        return `${url}${url.includes('?') ? '&' : '?'}_ts=${Date.now()}`;
    }
}

function unwrapWorldcamsPlayer(url) {
    if (!url) return '';
    try {
        const parsed = new URL(url);
        if (!(parsed.hostname.includes('worldcams.tv') && parsed.pathname.includes('/player'))) {
            return '';
        }
        return parsed.searchParams.get('url') || '';
    } catch (err) {
        return '';
    }
}

function isHlsUrl(url) {
    return /\.m3u8(\?|$)/i.test(String(url || ''));
}

function resolvePanelMediaKind(inspector, effectiveVideoUrl) {
    if (!inspector) return 'none';
    if (!effectiveVideoUrl && (inspector.url || inspector.fallbackUrl)) return 'image';
    if (!effectiveVideoUrl) return 'none';

    const lower = String(effectiveVideoUrl).toLowerCase();
    if (
        lower.includes('youtube.com/embed') ||
        lower.includes('/player?url=') ||
        lower.endsWith('.htm') ||
        lower.endsWith('.html')
    ) {
        return 'embed';
    }
    if (
        lower.includes('.m3u8') ||
        lower.includes('.mp4') ||
        lower.includes('.webm')
    ) {
        return 'video';
    }
    return 'embed';
}

function supportsVisualRecon(inspector) {
    if (!inspector) return false;

    if (inspector.type === 'powerGrid') {
        return String(inspector.assetType || '').toUpperCase() === 'POWER_PLANT';
    }

    if (inspector.type === 'maritime') {
        return ['PORT', 'VESSEL'].includes(String(inspector.assetType || '').toUpperCase());
    }

    return ['airports', 'militaryBases'].includes(inspector.type);
}

export default function MissionHud() {
    const layers = useStore((s) => s.layers);
    const viewerRef = useStore((s) => s.viewerRef);
    const activeShader = useStore((s) => s.activeShader);
    const inspector = useStore((s) => s.inspector);
    const clearInspector = useStore((s) => s.clearInspector);
    const trackedTarget = useStore((s) => s.trackedTarget);
    const toggleTrackedTarget = useStore((s) => s.toggleTrackedTarget);
    const trackingView = useStore((s) => s.trackingView);
    const setTrackingView = useStore((s) => s.setTrackingView);
    const layerPanelOpen = useStore((s) => s.layerPanelOpen);
    const toggleLayerPanel = useStore((s) => s.toggleLayerPanel);
    const missionHudVisible = useStore((s) => s.missionHudVisible);
    const toggleMissionHud = useStore((s) => s.toggleMissionHud);
    const citiesVisible = useStore((s) => s.citiesVisible);
    const toggleCities = useStore((s) => s.toggleCities);
    const setAutoRotating = useStore((s) => s.setAutoRotating);
    const setFocusMode = useStore((s) => s.setFocusMode);
    const appIsActive = useStore((s) => s.appIsActive);

    const TRACKABLE_TYPES = new Set(['aircraft', 'satellites', 'militaryActivity']);
    const AIRCRAFT_VIEWS = [{ id: 'CHASE', label: 'Chase' }, { id: 'COCKPIT', label: 'Cockpit' }, { id: 'TOP', label: 'Top' }, { id: 'SIDE', label: 'Side' }];
    const SATELLITE_VIEWS = [{ id: 'ORBIT', label: 'Orbit' }, { id: 'NADIR', label: 'Nadir' }, { id: 'WIDE', label: 'Wide' }];

    const SKIP_KEYS = new Set(['type', 'name', 'callsign', 'id', 'url', 'fallbackUrl', 'videoUrl', 'resolvedVideoUrl', 'mediaType', 'refreshSeconds', 'detailsUrl', 'mediaEnabled']);

    // Entity info helpers
    const inspectorDef = inspector ? (LAYER_DEFS[inspector.type] || { color: '#fff', icon: '❓', label: 'UNKNOWN' }) : null;
    const isTrackable = inspector && TRACKABLE_TYPES.has(inspector.type) && Boolean(inspector._entityId);
    const isTracked = isTrackable && trackedTarget?.entityId === inspector._entityId;
    const trackViews = inspector?.type === 'satellites' ? SATELLITE_VIEWS : AIRCRAFT_VIEWS;
    const hasMedia = Boolean(
        inspector &&
        (
            inspector.mediaEnabled ||
            inspector.type === 'cctv' ||
            inspector.type === 'traffic'
        )
    );

    const handleTrackToggle = useCallback(() => {
        if (!inspector || !isTrackable) return;
        const normalizedType = inspector.type === 'militaryActivity' ? 'aircraft' : inspector.type;
        if (!isTracked) setTrackingView(normalizedType === 'satellites' ? 'ORBIT' : 'CHASE');
        toggleTrackedTarget({ entityId: inspector._entityId, type: normalizedType, label: inspector.name || inspector.callsign || inspector.id || 'TARGET' });
    }, [inspector, isTrackable, isTracked, setTrackingView, toggleTrackedTarget]);

    // Flight filter store reads
    const aircraftEnabled = useStore((s) => s.layers.aircraft.enabled);
    const flights = useStore((s) => s.layers.aircraft.data);
    const flightFilters = useStore((s) => s.flightFilters);
    const setFlightFilter = useStore((s) => s.setFlightFilter);
    const setFlightAirlineQuery = useStore((s) => s.setFlightAirlineQuery);
    const resetFlightFilters = useStore((s) => s.resetFlightFilters);

    const FILTER_CONFIG = [
        { key: 'passenger', label: 'PAX', color: '#00b4ff' },
        { key: 'cargo', label: 'CARGO', color: '#ffaa00' },
        { key: 'military', label: 'MIL', color: '#ff5555' },
        { key: 'private', label: 'PVT', color: '#a47bff' },
        { key: 'unknown', label: 'UNK', color: '#9aa1c4' },
    ];

    const filterCounts = flights.reduce((acc, flight) => {
        const cls = String(flight.flightClass || 'unknown').toLowerCase();
        acc[cls] = (acc[cls] || 0) + 1;
        return acc;
    }, {});
    const showFlightFilters = aircraftEnabled;
    const showNavShortcuts = !inspector || inspector.type !== 'aircraft';

    const [visibleCities, setVisibleCities] = useState(ALL_CITIES.slice(0, 6));
    const [intelWireVisible, setIntelWireVisible] = useState(true);
    const [intelBriefVisible, setIntelBriefVisible] = useState(true);
    const [newsRelayVisible, setNewsRelayVisible] = useState(true);
    const [strategicIntelVisible, setStrategicIntelVisible] = useState(true);
    const [snapshotVisible, setSnapshotVisible] = useState(true);
    const [panelMediaSrc, setPanelMediaSrc] = useState('');
    const [panelMediaFailed, setPanelMediaFailed] = useState(false);
    const [isMediaExpanded, setIsMediaExpanded] = useState(false);
    const [inspectorVisuals, setInspectorVisuals] = useState([]);
    const [inspectorVisualsLoading, setInspectorVisualsLoading] = useState(false);
    const [selectedVisualIndex, setSelectedVisualIndex] = useState(0);
    const [isVisualExpanded, setIsVisualExpanded] = useState(false);
    const mediaVideoRef = useRef(null);
    const mediaTheaterRef = useRef(null);
    const visualTheaterRef = useRef(null);
    const rafRef = useRef(null);

    const effectiveVideoUrl = (() => {
        const rawVideoUrl = inspector?.resolvedVideoUrl || inspector?.videoUrl;
        if (!rawVideoUrl) return '';
        const nested = unwrapWorldcamsPlayer(rawVideoUrl);
        return nested || rawVideoUrl;
    })();
    const panelMediaKind = resolvePanelMediaKind(inspector, effectiveVideoUrl);
    const isContinuousMedia = isContinuousLiveCameraFeed({
        ...inspector,
        resolvedVideoUrl: effectiveVideoUrl || inspector?.resolvedVideoUrl,
        videoUrl: effectiveVideoUrl || inspector?.videoUrl,
    });
    const panelMediaStatusLabel = isContinuousMedia
        ? 'LIVE STREAM'
        : panelMediaKind === 'image'
            ? 'REFRESH IMAGE'
            : 'REFRESH FEED';
    const shouldShowVisualRecon = inspector && !hasMedia && supportsVisualRecon(inspector);
    const selectedVisual = inspectorVisuals[selectedVisualIndex] || null;
    const selectedVisualOpenUrl = selectedVisual?.sourceUrl || selectedVisual?.url || '';

    useEffect(() => {
        if (!viewerRef || viewerRef.isDestroyed()) return;
        const updateCities = () => setVisibleCities(getVisibleCities(viewerRef, 6));
        updateCities();
        const removeListener = viewerRef.camera.moveEnd.addEventListener(() => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(updateCities);
        });
        return () => { removeListener(); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [viewerRef]);

    useEffect(() => {
        setPanelMediaFailed(false);
        setPanelMediaSrc(appendCacheBuster(inspector?.url || inspector?.fallbackUrl || ''));
        setIsMediaExpanded(false);
        setIsVisualExpanded(false);
        setInspectorVisuals([]);
        setInspectorVisualsLoading(false);
        setSelectedVisualIndex(0);
    }, [inspector]);

    useEffect(() => {
        let cancelled = false;

        if (!shouldShowVisualRecon) {
            setInspectorVisuals([]);
            setInspectorVisualsLoading(false);
            setSelectedVisualIndex(0);
            return undefined;
        }

        setInspectorVisualsLoading(true);
        discoverEntityVisuals(inspector, { limit: 4 })
            .then((items) => {
                if (cancelled) return;
                setInspectorVisuals(items);
                setSelectedVisualIndex(0);
            })
            .catch(() => {
                if (cancelled) return;
                setInspectorVisuals([]);
            })
            .finally(() => {
                if (!cancelled) setInspectorVisualsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [inspector, shouldShowVisualRecon]);

    useEffect(() => {
        if (!appIsActive || !hasMedia || panelMediaKind !== 'image' || !inspector?.url) return undefined;
        const refreshSeconds = Math.max(3, Number(inspector.refreshSeconds) || 6);
        const timer = setInterval(() => {
            setPanelMediaSrc(appendCacheBuster(inspector.url));
            setPanelMediaFailed(false);
        }, refreshSeconds * 1000);
        return () => clearInterval(timer);
    }, [appIsActive, hasMedia, inspector, panelMediaKind]);

    useEffect(() => {
        const videoEl = mediaVideoRef.current;
        if (!appIsActive || !videoEl || panelMediaKind !== 'video' || !effectiveVideoUrl || !isHlsUrl(effectiveVideoUrl)) {
            return undefined;
        }

        let cancelled = false;
        let hlsInstance = null;

        const setup = async () => {
            if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
                videoEl.src = effectiveVideoUrl;
                return;
            }
            try {
                const module = await import('hls.js');
                if (cancelled) return;
                const Hls = module.default;
                if (Hls?.isSupported?.()) {
                    hlsInstance = new Hls({ enableWorker: true, lowLatencyMode: true });
                    hlsInstance.loadSource(effectiveVideoUrl);
                    hlsInstance.attachMedia(videoEl);
                    hlsInstance.on(Hls.Events.ERROR, (_, data) => {
                        if (data?.fatal) setPanelMediaFailed(true);
                    });
                } else {
                    videoEl.src = effectiveVideoUrl;
                }
            } catch (err) {
                if (!cancelled) setPanelMediaFailed(true);
            }
        };

        setup();

        return () => {
            cancelled = true;
            if (hlsInstance) hlsInstance.destroy();
        };
    }, [appIsActive, effectiveVideoUrl, panelMediaKind, inspector?.id]);

    useEffect(() => {
        if (!isMediaExpanded) return undefined;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsMediaExpanded(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isMediaExpanded]);

    useEffect(() => {
        if (!isVisualExpanded) return undefined;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsVisualExpanded(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isVisualExpanded]);

    const panelMediaOpenUrl = inspector?.detailsUrl || effectiveVideoUrl || inspector?.url || inspector?.fallbackUrl || panelMediaSrc;

    const requestMediaFullscreen = useCallback(async () => {
        const node = mediaTheaterRef.current;
        if (!node?.requestFullscreen) return;
        try {
            await node.requestFullscreen();
        } catch (err) {
            // Ignore browser fullscreen denials.
        }
    }, []);

    const requestVisualFullscreen = useCallback(async () => {
        const node = visualTheaterRef.current;
        if (!node?.requestFullscreen) return;
        try {
            await node.requestFullscreen();
        } catch (err) {
            // Ignore browser fullscreen denials.
        }
    }, []);

    const renderInspectorMedia = (expanded = false) => {
        if (!appIsActive) {
            return <div className="rcp-media-fallback">FEED PAUSED WHILE WINDOW IS INACTIVE</div>;
        }

        const mediaClassName = `rcp-media-frame ${expanded ? 'rcp-media-frame--theater' : ''}`.trim();

        if (panelMediaKind === 'embed' && effectiveVideoUrl) {
            return (
                <iframe
                    src={effectiveVideoUrl}
                    title="Surveillance media feed"
                    className={mediaClassName}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                    referrerPolicy="strict-origin-when-cross-origin"
                />
            );
        }

        if (panelMediaKind === 'video' && effectiveVideoUrl && !panelMediaFailed) {
            return (
                <video
                    ref={isHlsUrl(effectiveVideoUrl) ? mediaVideoRef : null}
                    src={isHlsUrl(effectiveVideoUrl) ? undefined : effectiveVideoUrl}
                    className={mediaClassName}
                    autoPlay
                    muted
                    controls
                    playsInline
                    onError={() => setPanelMediaFailed(true)}
                />
            );
        }

        if (panelMediaSrc && !panelMediaFailed) {
            return (
                <img
                    src={panelMediaSrc}
                    alt={inspector?.name || 'Camera Feed'}
                    className={mediaClassName}
                    onError={() => setPanelMediaFailed(true)}
                />
            );
        }

        return <div className="rcp-media-fallback">FEED METADATA ONLY</div>;
    };

    const snapshotRows = SURVEILLANCE_PRIMARY_LAYERS
        .map((key) => {
            const layer = layers[key];
            const def = LAYER_DEFS[key];
            if (!layer || !def || !layer.enabled) return null;
            return {
                key,
                label: def.label,
                count: layer.count || 0,
            };
        })
        .filter(Boolean);

    const focusCity = useCallback((city) => {
        if (!viewerRef || viewerRef.isDestroyed()) return;
        setAutoRotating(false);
        setFocusMode(true);
        const target = Cesium.Cartesian3.fromDegrees(city.longitude, city.latitude, 0);
        const range = Math.max(80000, Number(city.height) || 220000);
        const heading = Cesium.Math.toRadians(Number(city.heading) || 0);
        const pitch = Cesium.Math.toRadians(Number(city.pitch) || -65);
        viewerRef.camera.flyToBoundingSphere(
            new Cesium.BoundingSphere(target, 1),
            {
                duration: 1.8,
                offset: new Cesium.HeadingPitchRange(heading, pitch, range),
            }
        );
    }, [viewerRef, setAutoRotating, setFocusMode]);

    const toggleBtnStyle = {
        padding: '4px 10px', fontSize: '9px', letterSpacing: '1.5px',
        color: 'var(--color-text-dim)', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.03)', transition: 'all 0.3s',
        fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
    };

    // Right panel stays fixed; all entity types render in this same column.
    const rightPanelRight = 'max(18px, env(safe-area-inset-right))';
    const HiddenPanelStub = ({ label, onShow }) => (
        <div className="rcp-section">
            <div className="rcp-header">
                <span>{label} HIDDEN</span>
                <button onClick={onShow} className="rcp-action" title={`Show ${label.toLowerCase()}`}>
                    SHOW
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mode wizard chip */}
            {missionHudVisible ? (
                <div className={`mission-hud-left glass-panel pointer-events-auto z-10 ${layerPanelOpen ? 'mission-hud-left--offset' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div className="mission-label">CLASSIFIED // EYES ONLY // GODSEYE</div>
                        <button onClick={toggleMissionHud} className="text-text-dim hover:text-white transition-colors"
                            style={{ fontSize: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 8px', lineHeight: 1 }}
                            title="Hide mode wizard">✕</button>
                    </div>
                    <div className="mission-title">{activeShader} MODE</div>
                    <div className="mission-sub">SURVEILLANCE NODE ACTIVE</div>
                </div>
            ) : (
                <button onClick={toggleMissionHud} className="pointer-events-auto z-10"
                    style={{ ...toggleBtnStyle, position: 'absolute', left: layerPanelOpen ? '288px' : '16px', top: '92px' }}
                    title="Show mode wizard">◎ MODE</button>
            )}

            {!layerPanelOpen && (
                <button onClick={toggleLayerPanel} className="pointer-events-auto z-10"
                    style={{ ...toggleBtnStyle, position: 'absolute', left: '16px', top: missionHudVisible ? '200px' : '118px' }}
                    title="Show data layers">◎ LAYERS</button>
            )}

            {/* ── Unified right column ── */}
            {citiesVisible ? (
                <div className="right-column-panel pointer-events-auto z-10" style={{ right: rightPanelRight }}>
                    <IntelWire
                        embedded
                        hidden={Boolean(inspector) || !intelWireVisible}
                        onHide={() => setIntelWireVisible(false)}
                    />

                    {!inspector && !intelWireVisible && (
                        <div className="rcp-section">
                            <div className="rcp-header">
                                <span>INTEL WIRE HIDDEN</span>
                                <button onClick={() => setIntelWireVisible(true)} className="rcp-action" title="Show intel wire">
                                    SHOW
                                </button>
                            </div>
                        </div>
                    )}

                    {!inspector && (
                        intelBriefVisible
                            ? <IntelBriefPanel onHide={() => setIntelBriefVisible(false)} />
                            : <HiddenPanelStub label="LOCAL INTEL BRIEF" onShow={() => setIntelBriefVisible(true)} />
                    )}
                    {!inspector && (
                        newsRelayVisible
                            ? <LiveNewsRelayPanel onHide={() => setNewsRelayVisible(false)} />
                            : <HiddenPanelStub label="LIVE NEWS RELAY" onShow={() => setNewsRelayVisible(true)} />
                    )}
                    {!inspector && (
                        strategicIntelVisible
                            ? <StrategicIntelPanel onHide={() => setStrategicIntelVisible(false)} />
                            : <HiddenPanelStub label="STRATEGIC INTEL" onShow={() => setStrategicIntelVisible(true)} />
                    )}

                    {/* Entity Info — unified for all clicked entities including CCTV/Traffic */}
                    {inspector && (
                        <div className="rcp-section rcp-entity">
                            <div className="rcp-header" style={{ borderBottomColor: `${inspectorDef.color}22` }}>
                                <span style={{ color: inspectorDef.color }}>{inspectorDef.icon} {inspectorDef.label}</span>
                                <button onClick={clearInspector} className="rcp-action">✕</button>
                            </div>
                            {hasMedia && (
                                <div style={{ padding: '8px 10px 6px' }}>
                                    <div className="rcp-media-toolbar">
                                        <span className="rcp-media-status">{panelMediaStatusLabel}</span>
                                        <div className="rcp-media-actions">
                                            {(effectiveVideoUrl || panelMediaSrc) && (
                                                <button
                                                    onClick={() => setIsMediaExpanded(true)}
                                                    className="rcp-action"
                                                    title="Expand media feed"
                                                >
                                                    MAX
                                                </button>
                                            )}
                                            {panelMediaOpenUrl && (
                                                <a
                                                    href={panelMediaOpenUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="rcp-action"
                                                >
                                                    OPEN
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {isMediaExpanded ? (
                                        <button
                                            onClick={() => setIsMediaExpanded(true)}
                                            className="rcp-media-minimized-state"
                                            title="Feed opened in theater mode"
                                        >
                                            FEED IN THEATER MODE
                                        </button>
                                    ) : (
                                        renderInspectorMedia(false)
                                    )}
                                </div>
                            )}
                            {shouldShowVisualRecon && (
                                <div style={{ padding: '8px 10px 6px' }}>
                                    <div className="rcp-media-toolbar">
                                        <span className="rcp-media-status">VISUAL RECON</span>
                                        <div className="rcp-media-actions">
                                            {selectedVisual && (
                                                <button
                                                    onClick={() => setIsVisualExpanded(true)}
                                                    className="rcp-action"
                                                    title="Expand visual reference"
                                                >
                                                    MAX
                                                </button>
                                            )}
                                            {selectedVisualOpenUrl && (
                                                <a
                                                    href={selectedVisualOpenUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="rcp-action"
                                                >
                                                    OPEN
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {inspectorVisualsLoading ? (
                                        <div className="rcp-media-fallback">SCANNING REFERENCE IMAGERY</div>
                                    ) : selectedVisual ? (
                                        <>
                                            <img
                                                src={selectedVisual.url}
                                                alt={selectedVisual.title || `${inspector?.name || 'Entity'} visual reference`}
                                                className="rcp-media-frame"
                                            />
                                            {inspectorVisuals.length > 1 && (
                                                <div className="rcp-visual-strip">
                                                    {inspectorVisuals.map((visual, index) => (
                                                        <button
                                                            key={`${visual.url}-${index}`}
                                                            onClick={() => setSelectedVisualIndex(index)}
                                                            className={`rcp-visual-thumb ${index === selectedVisualIndex ? 'is-active' : ''}`}
                                                            title={visual.title || 'Reference image'}
                                                        >
                                                            <img src={visual.url} alt={visual.title || 'Reference image'} />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="rcp-visual-meta">
                                                {selectedVisual.title || 'Reference image'}
                                                {selectedVisual.sourceLabel ? ` · ${selectedVisual.sourceLabel}` : ''}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="rcp-media-fallback">NO REFERENCE IMAGERY FOUND</div>
                                    )}
                                </div>
                            )}
                            <div className="rcp-entity-name" style={{ textShadow: `0 0 8px ${inspectorDef.color}30` }}>
                                {inspector.name || inspector.callsign || inspector.id || 'UNIDENTIFIED'}
                            </div>
                            <div className="rcp-entity-grid">
                                {Object.entries(inspector).map(([key, value]) => {
                                    if (SKIP_KEYS.has(key) || key.startsWith('_') || typeof value === 'object') return null;
                                    return (
                                        <div key={key} className="rcp-entity-field">
                                            <span className="rcp-entity-key">{key}</span>
                                            <span className="rcp-entity-val">{value !== null && value !== undefined ? String(value) : 'N/A'}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            {isTrackable && (
                                <div style={{ padding: '0 8px 8px' }}>
                                    <button className={`rcp-track-btn ${isTracked ? 'is-tracked' : ''}`} onClick={handleTrackToggle}>
                                        {isTracked ? '■ STOP TRACK' : '▶ TRACK TARGET'}
                                    </button>
                                </div>
                            )}
                            {isTracked && (
                                <div style={{ padding: '0 8px 8px' }}>
                                    <div className="rcp-entity-key" style={{ marginBottom: '4px' }}>TRACK VIEW</div>
                                    <div className="rcp-view-grid">
                                        {trackViews.map((v) => (
                                            <button key={v.id} onClick={() => setTrackingView(v.id)}
                                                className={`rcp-view-btn ${trackingView === v.id ? 'is-active' : ''}`}>
                                                {v.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {/* Flight Filters — only when an aircraft is selected */}
                    {showFlightFilters && (
                        <div className="rcp-section">
                            <div className="rcp-header">
                                <span>FLIGHT FILTERS</span>
                                <button onClick={resetFlightFilters} className="rcp-action">RESET</button>
                            </div>
                            <div style={{ padding: '6px 8px 4px' }}>
                                <input type="text" value={flightFilters.airlineQuery}
                                    onChange={(e) => setFlightAirlineQuery(e.target.value)}
                                    placeholder="Airline / Callsign" className="rcp-search" />
                            </div>
                            <div className="rcp-filter-grid">
                                {FILTER_CONFIG.map((item) => {
                                    const enabled = Boolean(flightFilters[item.key]);
                                    const count = filterCounts[item.key] || 0;
                                    return (
                                        <button key={item.key}
                                            className={`rcp-filter-chip ${enabled ? 'is-active' : ''}`}
                                            onClick={() => setFlightFilter(item.key, !enabled)}
                                            style={enabled ? { borderColor: `${item.color}88`, color: item.color } : undefined}>
                                            <span className="rcp-chip-label">{item.label}</span>
                                            <span className="rcp-chip-count">{count.toLocaleString()}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* NAV Shortcuts — for non-aircraft targets */}
                    {showNavShortcuts && (
                        <div className="rcp-section">
                            <div className="rcp-header">
                                <span>NAV SHORTCUTS</span>
                                <button onClick={toggleCities} className="rcp-action" title="Hide panel">✕</button>
                            </div>
                            <div className="rcp-city-grid">
                                <button className="city-chip" onClick={() => focusCity({ longitude: 10, latitude: 20, height: 9000000, pitch: -90 })}>
                                    ◎ GLOBAL
                                </button>
                                {visibleCities.map((city) => (
                                    <button key={city.name} className="city-chip" onClick={() => focusCity(city)}>
                                        {city.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Compact surveillance snapshot inside same right column */}
                    {snapshotVisible ? (
                        <div className="rcp-section">
                            <div className="rcp-header">
                                <span>SURV SNAPSHOT</span>
                                <button onClick={() => setSnapshotVisible(false)} className="rcp-action" title="Hide surveillance snapshot">
                                    ✕
                                </button>
                            </div>
                            {snapshotRows.length > 0 ? (
                                <div className="rcp-snapshot-list">
                                    {snapshotRows.map((item) => (
                                        <div key={item.key} className="rcp-snapshot-item">
                                            <div className="rcp-snapshot-top">
                                                <span>{item.label}</span>
                                                <span>{item.count.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rcp-snapshot-empty">NO ENABLED LAYERS</div>
                            )}
                        </div>
                    ) : (
                        <HiddenPanelStub label="SURV SNAPSHOT" onShow={() => setSnapshotVisible(true)} />
                    )}
                </div>
            ) : (
                <button onClick={toggleCities} className="pointer-events-auto z-10 sys-terminal-toggle"
                    style={{ position: 'absolute', bottom: '24px', right: rightPanelRight }}
                    title="Show right panel">▸ PANEL</button>
            )}

            {isMediaExpanded && hasMedia && (effectiveVideoUrl || panelMediaSrc) && (
                <div className="rcp-media-theater-backdrop" onClick={() => setIsMediaExpanded(false)}>
                    <div
                        ref={mediaTheaterRef}
                        className="rcp-media-theater"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="rcp-media-theater-header">
                            <div>
                                <div className="news-relay-title">{inspector?.name || inspector?.callsign || inspector?.id || panelMediaStatusLabel}</div>
                                <div className="news-relay-note">{panelMediaStatusLabel} · {inspectorDef?.label || 'SURVEILLANCE FEED'}</div>
                            </div>
                            <div className="rcp-media-theater-actions">
                                <button
                                    onClick={requestMediaFullscreen}
                                    className="rcp-action"
                                    title="Enter browser fullscreen"
                                >
                                    FULL
                                </button>
                                {panelMediaOpenUrl && (
                                    <a
                                        href={panelMediaOpenUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rcp-action"
                                    >
                                        OPEN
                                    </a>
                                )}
                                <button
                                    onClick={() => setIsMediaExpanded(false)}
                                    className="rcp-action"
                                    title="Close theater mode"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div className="rcp-media-theater-body">
                            {renderInspectorMedia(true)}
                        </div>
                    </div>
                </div>
            )}

            {isVisualExpanded && selectedVisual && (
                <div className="rcp-media-theater-backdrop" onClick={() => setIsVisualExpanded(false)}>
                    <div
                        ref={visualTheaterRef}
                        className="rcp-media-theater"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="rcp-media-theater-header">
                            <div>
                                <div className="news-relay-title">{selectedVisual.title || inspector?.name || 'VISUAL RECON'}</div>
                                <div className="news-relay-note">{inspectorDef?.label || 'REFERENCE IMAGERY'}</div>
                            </div>
                            <div className="rcp-media-theater-actions">
                                <button
                                    onClick={requestVisualFullscreen}
                                    className="rcp-action"
                                    title="Enter browser fullscreen"
                                >
                                    FULL
                                </button>
                                {selectedVisualOpenUrl && (
                                    <a
                                        href={selectedVisualOpenUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rcp-action"
                                    >
                                        OPEN
                                    </a>
                                )}
                                <button
                                    onClick={() => setIsVisualExpanded(false)}
                                    className="rcp-action"
                                    title="Close visual reference"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div className="rcp-media-theater-body">
                            <img
                                src={selectedVisual.url}
                                alt={selectedVisual.title || `${inspector?.name || 'Entity'} visual reference`}
                                className="rcp-media-frame rcp-media-frame--theater"
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
