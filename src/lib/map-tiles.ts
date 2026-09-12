// High-density map tiles — Google Maps Street & Satellite Hybrid resolution.
// Provides dense coverage of rural roads, trading centers, terrain, and village boundaries.

export const GOOGLE_STREETS_TILE_URL = 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
export const GOOGLE_HYBRID_TILE_URL = 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
export const GOOGLE_TERRAIN_TILE_URL = 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}';
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

// Primary default tile URL across the application
export const MAP_TILE_URL = GOOGLE_STREETS_TILE_URL;

export const MAP_TILE_OPTIONS = {
  attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
  subdomains: '0123',
  maxZoom: 21,
  detectRetina: true,
  crossOrigin: true,
};

export const HYBRID_TILE_OPTIONS = {
  attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a> Imagery',
  subdomains: '0123',
  maxZoom: 21,
  detectRetina: true,
  crossOrigin: true,
};
