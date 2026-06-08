export interface DistrictInfo {
  name: string;
  lat: number;
  lng: number;
  region: 'central' | 'eastern' | 'northern' | 'western';
  zone: 'highland' | 'lowland' | 'semi-arid' | 'lakeside';
}

export const UGANDA_DISTRICTS: Record<string, DistrictInfo> = {
  Kampala:    { name: 'Kampala',    lat: 0.3476,   lng: 32.5825, region: 'central',  zone: 'lowland' },
  Wakiso:     { name: 'Wakiso',     lat: 0.4042,   lng: 32.4476, region: 'central',  zone: 'lowland' },
  Mukono:     { name: 'Mukono',     lat: 0.3533,   lng: 32.7559, region: 'central',  zone: 'lowland' },
  Jinja:      { name: 'Jinja',      lat: 0.4478,   lng: 33.2026, region: 'eastern',  zone: 'lakeside' },
  Mbale:      { name: 'Mbale',      lat: 1.0796,   lng: 34.1750, region: 'eastern',  zone: 'highland' },
  Gulu:       { name: 'Gulu',       lat: 2.7745,   lng: 32.2990, region: 'northern', zone: 'lowland' },
  Lira:       { name: 'Lira',       lat: 2.2499,   lng: 32.8998, region: 'northern', zone: 'semi-arid' },
  Masaka:     { name: 'Masaka',     lat: -0.3333,  lng: 31.7333, region: 'central',  zone: 'lowland' },
  Mbarara:    { name: 'Mbarara',    lat: -0.6071,  lng: 30.6550, region: 'western',  zone: 'highland' },
  Kabale:     { name: 'Kabale',     lat: -1.2499,  lng: 29.9900, region: 'western',  zone: 'highland' },
  'Fort Portal': { name: 'Fort Portal', lat: 0.6710, lng: 30.2740, region: 'western', zone: 'highland' },
  Arua:       { name: 'Arua',       lat: 3.0248,   lng: 30.9068, region: 'northern', zone: 'semi-arid' },
  Soroti:     { name: 'Soroti',     lat: 1.7143,   lng: 33.6108, region: 'eastern',  zone: 'semi-arid' },
  Tororo:     { name: 'Tororo',     lat: 0.6932,   lng: 34.1818, region: 'eastern',  zone: 'lowland' },
  Iganga:     { name: 'Iganga',     lat: 0.6091,   lng: 33.4689, region: 'eastern',  zone: 'lowland' },
  Hoima:      { name: 'Hoima',      lat: 1.4337,   lng: 31.3537, region: 'western',  zone: 'lowland' },
  Masindi:    { name: 'Masindi',    lat: 1.6736,   lng: 31.7154, region: 'western',  zone: 'lowland' },
  Mityana:    { name: 'Mityana',    lat: 0.4167,   lng: 32.0167, region: 'central',  zone: 'lowland' },
  Nakaseke:   { name: 'Nakaseke',   lat: 0.7167,   lng: 32.2667, region: 'central',  zone: 'lowland' },
  Rakai:      { name: 'Rakai',      lat: -0.7167,  lng: 31.4000, region: 'central',  zone: 'lowland' },
  Lyantonde:  { name: 'Lyantonde',  lat: -0.4000,  lng: 31.1500, region: 'central',  zone: 'semi-arid' },
  Ntungamo:   { name: 'Ntungamo',   lat: -0.8779,  lng: 30.2647, region: 'western',  zone: 'highland' },
  Isingiro:   { name: 'Isingiro',   lat: -0.9283,  lng: 30.8167, region: 'western',  zone: 'highland' },
  Kiruhura:   { name: 'Kiruhura',   lat: -0.2000,  lng: 30.8333, region: 'western',  zone: 'semi-arid' },
  Bushenyi:   { name: 'Bushenyi',   lat: -0.5833,  lng: 30.2000, region: 'western',  zone: 'highland' },
};

export const DISTRICT_NAMES = Object.keys(UGANDA_DISTRICTS);

export function getDistrict(name: string): DistrictInfo | undefined {
  return UGANDA_DISTRICTS[name] ?? UGANDA_DISTRICTS[Object.keys(UGANDA_DISTRICTS).find(k => k.toLowerCase() === name.toLowerCase()) ?? ''];
}

export function getDefaultDistrict(): DistrictInfo {
  return UGANDA_DISTRICTS['Kampala'];
}
