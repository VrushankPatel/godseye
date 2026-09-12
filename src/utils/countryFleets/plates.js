// Authentic regional vehicle registration plate formatters

export function generateRegionalPlate(countryCode, seed) {
  const pseudo = (Math.abs(Math.sin(seed * 12.9898 + 78.233)) % 1);

  // --- ASIA ---
  if (countryCode === 'IN') {
    const states = ['MH', 'DL', 'KA', 'GJ', 'TN', 'HR', 'UP', 'KL', 'WB', 'TS', 'RJ', 'PB'];
    const state = states[Math.floor(pseudo * states.length)];
    const rto = String(Math.floor(1 + ((seed * 13) % 45))).padStart(2, '0');
    const letters = ['AB', 'CD', 'EF', 'GH', 'JK', 'MN', 'PQ', 'RS', 'EV', 'AX'][Math.floor(((seed * 7) % 10))];
    const num = Math.floor(1000 + ((seed * 37) % 8999));
    return `${state} ${rto} ${letters} ${num}`;
  }

  if (countryCode === 'CN') {
    const provs = ['京A', '沪A', '粤B', '浙A', '苏A', '川A', '鲁A', '鄂A'];
    const prov = provs[Math.floor(pseudo * provs.length)];
    const num = Math.floor(10000 + ((seed * 37) % 89999));
    return `${prov}·${num}`;
  }

  if (countryCode === 'JP') {
    const prefs = ['品川', '練馬', '横浜', 'なにわ', '名古屋', '福岡', '札幌'];
    const pref = prefs[Math.floor(pseudo * prefs.length)];
    const n1 = Math.floor(10 + ((seed * 17) % 89));
    const n2 = Math.floor(10 + ((seed * 23) % 89));
    return `${pref} 300 ほ ${n1}-${n2}`;
  }

  if (countryCode === 'KR') {
    const prefix = Math.floor(100 + ((seed * 19) % 899));
    const hangeul = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차'][Math.floor(((seed * 7) % 10))];
    const num = Math.floor(1000 + ((seed * 31) % 8999));
    return `${prefix}${hangeul} ${num}`;
  }

  if (countryCode === 'ID') {
    const codes = ['B', 'D', 'L', 'F', 'H', 'AB'];
    const code = codes[Math.floor(pseudo * codes.length)];
    const num = Math.floor(1000 + ((seed * 29) % 8999));
    const suf = ['JKT', 'BDG', 'SBY', 'SMG'][Math.floor(((seed * 3) % 4))];
    return `${code} ${num} ${suf}`;
  }

  if (countryCode === 'TH') {
    const letters = ['1กข', '2กค', '3กง', '4กจ', '5ขข'];
    const letPart = letters[Math.floor(pseudo * letters.length)];
    const num = Math.floor(1000 + ((seed * 19) % 8999));
    return `${letPart} ${num}`;
  }

  if (countryCode === 'VN') {
    const provs = ['29A', '30E', '51F', '51K', '43A'];
    const prov = provs[Math.floor(pseudo * provs.length)];
    const n1 = Math.floor(100 + ((seed * 17) % 899));
    const n2 = Math.floor(10 + ((seed * 23) % 89));
    return `${prov}-${n1}.${n2}`;
  }

  if (countryCode === 'PK') {
    const cities = ['LEA', 'ICT', 'KHI', 'RWP'];
    const city = cities[Math.floor(pseudo * cities.length)];
    const num = Math.floor(1000 + ((seed * 41) % 8999));
    return `${city}-${num}`;
  }

  if (countryCode === 'MY') {
    const states = ['W', 'B', 'J', 'P', 'D'];
    const state = states[Math.floor(pseudo * states.length)];
    const num = Math.floor(1000 + ((seed * 37) % 8999));
    const suf = ['A', 'B', 'C', 'D'][Math.floor(((seed * 3) % 4))];
    return `${state} ${num} ${suf}`;
  }

  if (countryCode === 'PH') {
    const num = Math.floor(1000 + ((seed * 29) % 8999));
    return `ABC ${num}`;
  }

  // --- EUROPE ---
  if (countryCode === 'GB') {
    const prefixes = ['LG', 'BD', 'WN', 'KV', 'RE', 'SH', 'OV', 'EA'];
    const prefix = prefixes[Math.floor(pseudo * prefixes.length)];
    const year = ['21', '22', '23', '24', '73', '74'][Math.floor(((seed * 3) % 6))];
    const suffixes = ['XTR', 'KVM', 'PXL', 'WNZ', 'BTH', 'ZRA'];
    const suffix = suffixes[Math.floor(((seed * 5) % suffixes.length))];
    return `${prefix}${year} ${suffix}`;
  }

  if (countryCode === 'DE') {
    const cities = ['B', 'M', 'S', 'HH', 'F', 'K', 'N', 'D'];
    const city = cities[Math.floor(pseudo * cities.length)];
    const letters = ['DE', 'MW', 'GO', 'GT', 'TS', 'EV'][Math.floor(((seed * 5) % 6))];
    const num = Math.floor(100 + ((seed * 19) % 899));
    return `${city}-${letters} ${num}`;
  }

  if (countryCode === 'FR') {
    const l1 = ['AB', 'CD', 'EF', 'GH', 'JK'][Math.floor(pseudo * 5)];
    const num = String(Math.floor(100 + ((seed * 13) % 899))).padStart(3, '0');
    const l2 = ['XY', 'WZ', 'TR', 'QS'][Math.floor(((seed * 7) % 4))];
    return `${l1}-${num}-${l2}`;
  }

  if (countryCode === 'IT') {
    const l1 = ['GA', 'GE', 'GF', 'GG', 'GH'][Math.floor(pseudo * 5)];
    const num = String(Math.floor(100 + ((seed * 17) % 899))).padStart(3, '0');
    const l2 = ['AA', 'BB', 'CC', 'DD'][Math.floor(((seed * 3) % 4))];
    return `${l1} ${num} ${l2}`;
  }

  if (countryCode === 'ES') {
    const num = String(Math.floor(1000 + ((seed * 23) % 8999)));
    const letters = ['BCD', 'FGH', 'JKL', 'MNP', 'RST'][Math.floor(pseudo * 5)];
    return `${num} ${letters}`;
  }

  if (countryCode === 'NL') {
    const p1 = String(Math.floor(10 + ((seed * 13) % 89)));
    const p2 = ['ABC', 'DEF', 'GHK', 'LMN'][Math.floor(pseudo * 4)];
    const p3 = String(Math.floor(1 + ((seed * 7) % 9)));
    return `${p1}-${p2}-${p3}`;
  }

  if (countryCode === 'SE') {
    const letters = ['ABC', 'DEF', 'GHI', 'JKL'][Math.floor(pseudo * 4)];
    const num = Math.floor(10 + ((seed * 17) % 89));
    const end = ['A', 'B', 'C', 'D'][Math.floor(((seed * 5) % 4))];
    return `${letters} ${num}${end}`;
  }

  if (countryCode === 'NO') {
    const prefix = ['EV', 'EK', 'EL', 'EB', 'DP'][Math.floor(pseudo * 5)];
    const num = Math.floor(10000 + ((seed * 37) % 89999));
    return `${prefix} ${num}`;
  }

  if (countryCode === 'PL') {
    const city = ['WI', 'KR', 'DW', 'GD', 'PO'][Math.floor(pseudo * 5)];
    const num = Math.floor(10000 + ((seed * 29) % 89999));
    return `${city} ${num}`;
  }

  if (countryCode === 'TR') {
    const city = ['34', '06', '35', '07', '16'][Math.floor(pseudo * 5)];
    const num = Math.floor(1000 + ((seed * 17) % 8999));
    return `${city} AB ${num}`;
  }

  if (countryCode === 'RU') {
    const num = Math.floor(100 + ((seed * 19) % 899));
    const reg = ['777', '178', '116', '196', '154'][Math.floor(pseudo * 5)];
    return `а${num}вс ${reg}`;
  }

  if (countryCode === 'CH') {
    const canton = ['ZH', 'GE', 'BE', 'BS', 'VD', 'LU'][Math.floor(pseudo * 6)];
    const num = Math.floor(10000 + ((seed * 31) % 899999));
    return `${canton} · ${num}`;
  }

  // --- AMERICAS ---
  if (countryCode === 'US') {
    const states = ['CA', 'NY', 'TX', 'FL', 'WA', 'IL', 'CO', 'GA', 'MI', 'AZ'];
    const state = states[Math.floor(pseudo * states.length)];
    const num = Math.floor(1000 + ((seed * 41) % 8999));
    return `${state} · ${num}`;
  }

  if (countryCode === 'CA') {
    const provs = ['ON', 'QC', 'BC', 'AB', 'MB'];
    const prov = provs[Math.floor(pseudo * provs.length)];
    const num = Math.floor(100 + ((seed * 23) % 899));
    return `${prov} · ABCD ${num}`;
  }

  if (countryCode === 'MX') {
    const num = Math.floor(10 + ((seed * 19) % 89));
    const end = Math.floor(10 + ((seed * 29) % 89));
    return `ABC-${num}-${end}`;
  }

  if (countryCode === 'BR') {
    const num = Math.floor(1 + ((seed * 7) % 9));
    const end = Math.floor(10 + ((seed * 17) % 89));
    return `ABC${num}D${end}`;
  }

  if (countryCode === 'AR') {
    const num = Math.floor(100 + ((seed * 19) % 899));
    return `AB ${num} CD`;
  }

  if (countryCode === 'CL') {
    const num = Math.floor(10 + ((seed * 13) % 89));
    return `AB CD · ${num}`;
  }

  if (countryCode === 'CO') {
    const num = Math.floor(100 + ((seed * 23) % 899));
    return `ABC · ${num}`;
  }

  // --- MIDDLE EAST & AFRICA ---
  if (countryCode === 'AE') {
    const emirates = ['DXB', 'AUH', 'SHJ'];
    const em = emirates[Math.floor(pseudo * emirates.length)];
    const code = ['A', 'B', 'C', 'D', 'E', 'F'][Math.floor(((seed * 5) % 6))];
    const num = Math.floor(1000 + ((seed * 31) % 8999));
    return `${em} · ${code} ${num}`;
  }

  if (countryCode === 'SA') {
    const num = Math.floor(1000 + ((seed * 29) % 8999));
    return `KSA · ${num} ABC`;
  }

  if (countryCode === 'EG') {
    const num = Math.floor(1000 + ((seed * 17) % 8999));
    return `EGY · ${num}`;
  }

  if (countryCode === 'ZA') {
    const provs = ['CA', 'GP', 'ZN', 'EC'];
    const prov = provs[Math.floor(pseudo * provs.length)];
    const n1 = Math.floor(100 + ((seed * 19) % 899));
    const n2 = Math.floor(100 + ((seed * 31) % 899));
    return `${prov} ${n1}-${n2}`;
  }

  if (countryCode === 'NG') {
    const state = ['LAG', 'ABJ', 'PHC', 'KAN'][Math.floor(pseudo * 4)];
    const num = Math.floor(100 + ((seed * 23) % 899));
    return `${state}-${num}-XY`;
  }

  if (countryCode === 'KE') {
    const num = Math.floor(100 + ((seed * 31) % 899));
    return `KDA ${num}A`;
  }

  // --- OCEANIA ---
  if (countryCode === 'AU') {
    const states = ['NSW', 'VIC', 'QLD', 'WA', 'SA'];
    const state = states[Math.floor(pseudo * states.length)];
    const num = Math.floor(100 + ((seed * 17) % 899));
    return `${state} · ${num} AB`;
  }

  if (countryCode === 'NZ') {
    const num = Math.floor(100 + ((seed * 19) % 899));
    return `NZ · ABC ${num}`;
  }

  // --- REGIONAL & GLOBAL FALLBACKS ---
  if (countryCode === 'EU_REGIONAL') {
    const num = Math.floor(1000 + ((seed * 29) % 8999));
    return `EU · ${num}`;
  }
  if (countryCode === 'AS_REGIONAL') {
    const num = Math.floor(1000 + ((seed * 29) % 8999));
    return `AS · ${num}`;
  }
  if (countryCode === 'LATAM_REGIONAL') {
    const num = Math.floor(1000 + ((seed * 29) % 8999));
    return `LAT · ${num}`;
  }
  if (countryCode === 'AFRICA_REGIONAL') {
    const num = Math.floor(1000 + ((seed * 29) % 8999));
    return `AFR · ${num}`;
  }
  if (countryCode === 'ME_REGIONAL') {
    const num = Math.floor(1000 + ((seed * 29) % 8999));
    return `ME · ${num}`;
  }

  // Global default
  const num = Math.floor(1000 + ((seed * 29) % 8999));
  return `INT · ${num}`;
}
