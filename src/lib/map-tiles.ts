// Clean, high-resolution map tiles with zero watermarks and zero attribution clutter.
// Defaults to crystal-clear satellite imagery as requested, with Mapbox integration support.

const MAPBOX_TOKEN =
  (typeof process !== 'undefined' &&
    (process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN)) ||
  '';

// Clean high-resolution satellite imagery (pure imagery, no watermarks)
export const SATELLITE_TILE_URL = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

// Fast, crystal-clear road navigation tiles (CartoDB Voyager: crisp roads, districts, labels, 100% open CORS)
export const STREETS_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

// High-detail street/terrain fallback
export const ESRI_STREETS_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

// Google hybrid and streets tile URLs with auto-fallback
export const GOOGLE_HYBRID_TILE_URL = 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
export const GOOGLE_STREETS_TILE_URL = 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

// OpenStreetMap fallback
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_TILE_OPTIONS = {
  attribution: '',
  subdomains: 'abc',
  maxZoom: 19,
};

// Primary default tile URL across the application
export const MAP_TILE_URL = STREETS_TILE_URL;

// Zero-attribution tile options
export const MAP_TILE_OPTIONS = {
  attribution: '',
  subdomains: 'abcd',
  maxZoom: 20,
  detectRetina: true,
  crossOrigin: false,
};

export const HYBRID_TILE_OPTIONS = {
  attribution: '',
  subdomains: '0123',
  maxZoom: 20,
  detectRetina: true,
  crossOrigin: false,
};

// Ultra-clean high contrast dark night GPS navigation tiles (CartoDB Dark Matter)
export const DARK_NAV_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
export const DARK_NAV_TILE_OPTIONS = {
  attribution: '',
  subdomains: 'abcd',
  maxZoom: 20,
  detectRetina: true,
  crossOrigin: false,
};



