// Clean, high-resolution map tiles with zero watermarks and zero attribution clutter.
// Defaults to crystal-clear satellite imagery as requested, with Mapbox integration support.

const MAPBOX_TOKEN =
  (typeof process !== 'undefined' &&
    (process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN)) ||
  '';

// Clean high-resolution satellite imagery (pure imagery, no Google Maps / Leaflet watermarks)
export const SATELLITE_TILE_URL = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

// Clean street/terrain fallback
export const STREETS_TILE_URL = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

// Google hybrid tile URL kept for optional alternate resolution
export const GOOGLE_HYBRID_TILE_URL = 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
export const GOOGLE_STREETS_TILE_URL = 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

// Primary default tile URL across the application — pristine satellite view
export const MAP_TILE_URL = SATELLITE_TILE_URL;

// Zero-attribution tile options so no "Leaflet", "Google Maps", or "OpenStreetMap" displays on the screen
export const MAP_TILE_OPTIONS = {
  attribution: '',
  subdomains: '0123',
  maxZoom: 20,
  detectRetina: true,
  crossOrigin: true,
};

export const HYBRID_TILE_OPTIONS = {
  attribution: '',
  subdomains: '0123',
  maxZoom: 20,
  detectRetina: true,
  crossOrigin: true,
};
