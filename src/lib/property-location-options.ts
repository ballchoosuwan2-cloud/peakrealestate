export type PhuketZone = 'Zone 1' | 'Zone 2' | 'Zone 3' | 'Zone 4' | 'Zone 5';

export const PHUKET_ZONE_OPTIONS: PhuketZone[] = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'];

export interface ZoneLocationConfig {
  zone: PhuketZone;
  areas: string[];
}

export const PHUKET_ZONE_CONFIGS: ZoneLocationConfig[] = [
  {
    zone: 'Zone 1',
    areas: ['Phuket Town', 'Kathu', 'Aopor Pier', 'Kohkeaw', 'Yamu', 'Naka'],
  },
  {
    zone: 'Zone 2',
    areas: ['Chalong', 'Bigbudha', 'Rawai', 'Naiharn', 'Panwa', 'Saiyuan'],
  },
  {
    zone: 'Zone 3',
    areas: ['Kata', 'Karon', 'Patong', 'Kamala', 'Kalim'],
  },
  {
    zone: 'Zone 4',
    areas: ['Surin', 'Bangtao', 'Layan', 'Chengtalay', 'Thalang', 'Pasak'],
  },
  {
    zone: 'Zone 5',
    areas: ['Naithon', 'Maikhao', 'Airport', 'Naiyang'],
  },
];

export interface DistrictInfo {
  district: string;
  postalCode: string;
}

export const AREA_DISTRICT_CONFIG: Record<string, DistrictInfo> = {
  // Zone 1
  'Phuket Town': { district: 'Muang Phuket (อำเภอเมืองภูเก็ต)', postalCode: '83000' },
  'Kohkeaw': { district: 'Muang Phuket (อำเภอเมืองภูเก็ต)', postalCode: '83000' },
  'Kathu': { district: 'Kathu (อำเภอกะทู้)', postalCode: '83120' },
  'Aopor Pier': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
  'Yamu': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
  'Naka': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },

  // Zone 2
  'Chalong': { district: 'Muang Phuket (อำเภอเมืองภูเก็ต)', postalCode: '83130' },
  'Bigbudha': { district: 'Muang Phuket (อำเภอเมืองภูเก็ต)', postalCode: '83130' },
  'Rawai': { district: 'Muang Phuket (อำเภอเมืองภูเก็ต)', postalCode: '83130' },
  'Naiharn': { district: 'Muang Phuket (อำเภอเมืองภูเก็ต)', postalCode: '83130' },
  'Panwa': { district: 'Muang Phuket (อำเภอเมืองภูเก็ต)', postalCode: '83130' },
  'Saiyuan': { district: 'Muang Phuket (อำเภอเมืองภูเก็ต)', postalCode: '83130' },

  // Zone 3
  'Kata': { district: 'Muang Phuket (อำเภอเมืองภูเก็ต)', postalCode: '83100' },
  'Karon': { district: 'Muang Phuket (อำเภอเมืองภูเก็ต)', postalCode: '83100' },
  'Patong': { district: 'Kathu (อำเภอกะทู้)', postalCode: '83150' },
  'Kamala': { district: 'Kathu (อำเภอกะทู้)', postalCode: '83120' },
  'Kalim': { district: 'Kathu (อำเภอกะทู้)', postalCode: '83150' },

  // Zone 4
  'Surin': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
  'Bangtao': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
  'Layan': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
  'Chengtalay': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
  'Thalang': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
  'Pasak': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },

  // Zone 5
  'Naithon': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
  'Maikhao': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
  'Airport': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
  'Naiyang': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
};

// Safe lookup with normalized lowercase matching
export function getAreasForZone(zone: string): string[] {
  if (!zone) return [];
  const normalizedZone = (zone || '').trim();
  const config = PHUKET_ZONE_CONFIGS.find(
    (c) => (c.zone || '').toLowerCase() === normalizedZone.toLowerCase()
  );
  return config ? config.areas : [];
}

export function validateAreaBelongsToZone(zone: string, area: string): boolean {
  if (!zone || !area) return false;
  const areas = getAreasForZone(zone);
  return areas.some((a) => (a || '').toLowerCase() === (area || '').toLowerCase());
}

export function getDistrictAndPostal(area: string): DistrictInfo {
  if (!area) {
    return {
      district: 'Muang Phuket (อำเภอเมืองภูเก็ต)',
      postalCode: '83000',
    };
  }
  // Case-insensitive fallback
  const normalizedArea = (area || '').trim().toLowerCase();
  const found = Object.entries(AREA_DISTRICT_CONFIG).find(
    ([k]) => (k || '').toLowerCase() === normalizedArea
  );
  if (found) {
    return found[1];
  }
  return {
    district: 'Muang Phuket (อำเภอเมืองภูเก็ต)',
    postalCode: '83000',
  };
}

export function formatZoneAreaSummary(zone: string, area: string): string {
  if (!zone && !area) return '';
  if (!area) return zone;
  if (!zone) return area;
  return `${zone} / ${area}`;
}

export function parseZoneAndArea(formatted: string): { zone: string; area: string } {
  if (!formatted) return { zone: 'Zone 2', area: 'Rawai' };
  if (formatted.includes('/')) {
    const parts = formatted.split('/');
    return {
      zone: parts[0].trim(),
      area: parts[1].trim(),
    };
  }
  return { zone: 'Zone 2', area: formatted.trim() };
}
