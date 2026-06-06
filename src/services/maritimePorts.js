const MAX_DEFAULT_PORTS = 4200;

const HARBOR_SIZE_LABELS = {
  L: 'Large',
  M: 'Medium',
  S: 'Small',
  V: 'Very small',
  U: 'Unknown',
};

const HARBOR_TYPE_LABELS = {
  CB: 'Coastal breakwater',
  CN: 'Canal or lake',
  CT: 'Coastal tide gate',
  LC: 'Lake or canal',
  OR: 'Open roadstead',
  RB: 'River basin',
  RN: 'River natural',
  RT: 'River tide gate',
  TH: 'Typhoon harbor',
};

function toNumber(value) {
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDmsCoordinate(value) {
  const raw = String(value || '').trim();
  const compact = raw.replace(/\s+/g, '');
  if (!compact) return null;

  const decimal = Number.parseFloat(compact);
  if (Number.isFinite(decimal) && /^-?\d+(\.\d+)?$/.test(compact)) return decimal;

  const direction = compact.match(/[NSEW]$/i)?.[0]?.toUpperCase();
  const numericParts = compact.match(/\d+(?:\.\d+)?/g) || [];
  if (!numericParts.length || !direction) return null;

  const degrees = Number.parseFloat(numericParts[0]);
  const minutes = Number.parseFloat(numericParts[1] || '0');
  const seconds = Number.parseFloat(numericParts[2] || '0');
  if (![degrees, minutes, seconds].every(Number.isFinite)) return null;

  const sign = ['S', 'W'].includes(direction) ? -1 : 1;
  return sign * (degrees + minutes / 60 + seconds / 3600);
}

export function normalizeNgaPortRows(payload, maxPorts = MAX_DEFAULT_PORTS) {
  const rows = Array.isArray(payload?.ports)
    ? payload.ports
    : Array.isArray(payload)
      ? payload
      : [];

  return rows
    .map((row, index) => {
      const lat = toNumber(row.lat) ?? parseDmsCoordinate(row.latitude);
      const lon = toNumber(row.lon) ?? parseDmsCoordinate(row.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

      const portNumber = row.portNumber || row.id || `${lat.toFixed(4)}:${lon.toFixed(4)}`;
      const harborSize = row.harborSize || row.portSize || 'U';
      const harborType = row.harborType || row.portType || 'U';
      const sizeLabel = HARBOR_SIZE_LABELS[String(harborSize).toUpperCase()] || harborSize || 'Unknown';
      const typeLabel = HARBOR_TYPE_LABELS[String(harborType).toUpperCase()] || harborType || 'Unknown';

      return {
        id: `port-${portNumber}-${index}`,
        assetType: 'PORT',
        name: row.portName || row.name || 'Port',
        lat,
        lon,
        portNumber,
        portType: typeLabel,
        portSize: sizeLabel,
        harborTypeCode: harborType || 'N/A',
        harborSizeCode: harborSize || 'N/A',
        status: row.firstPortOfEntry === 'Y' ? 'PORT OF ENTRY' : 'PUBLISHED',
        country: row.countryName || row.country || 'N/A',
        iso3: row.iso3 || row.countryCode || 'N/A',
        region: row.regionName || 'N/A',
        navArea: row.navArea || 'N/A',
        chartNumber: row.chartNumber || 'N/A',
        publication: row.publicationNumber || 'N/A',
        maxVesselLength: row.maxVesselLength || 'N/A',
        maxVesselBeam: row.maxVesselBeam || 'N/A',
        maxVesselDraft: row.maxVesselDraft || 'N/A',
        updated: row.updated || row.generatedAt || 'N/A',
        source: 'NGA Maritime Safety World Port Index',
        reference: 'https://msi.nga.mil/Publications/WPI',
      };
    })
    .filter(Boolean)
    .slice(0, maxPorts);
}
