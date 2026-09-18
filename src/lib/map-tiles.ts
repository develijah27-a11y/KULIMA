import type { TileLayerOptions } from 'leaflet';

// Clean, high-resolution, robust map tiles for Cropify navigation and tracking.
// Supports Mapbox API with bulletproof auto-fallback to OpenStreetMap and Google Maps.

export const MAPBOX_TOKEN =
  (typeof process !== 'undefined' &&
    (process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN)) ||
  '';

// Primary Road Navigation Tile URL:
// If Mapbox token is provided, use Mapbox Streets v12 (or Navigation Day).
// Otherwise, use OpenStreetMap / Google Roads which are 100% open and reliable.
export const STREETS_TILE_URL = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// Fallback high-uptime OpenStreetMap and Google roads URLs
export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const GOOGLE_STREETS_TILE_URL = 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
export const GOOGLE_HYBRID_TILE_URL = 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
export const ESRI_STREETS_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

// High-resolution Satellite Imagery:
// Uses Mapbox Satellite Streets if token exists; falls back to Google Hybrid or Esri World Imagery
export const SATELLITE_TILE_URL = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';

// Dark / Night GPS Navigation Tiles
export const DARK_NAV_TILE_URL = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/navigation-night-v1/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

// Primary default tile URL
export const MAP_TILE_URL = STREETS_TILE_URL;

// Reliable tile options
export const MAP_TILE_OPTIONS: TileLayerOptions = {
  attribution: '',
  subdomains: MAPBOX_TOKEN ? '' : 'abc',
  maxZoom: 19,
  detectRetina: true,
  crossOrigin: 'anonymous',
};

export const HYBRID_TILE_OPTIONS: TileLayerOptions = {
  attribution: '',
  subdomains: MAPBOX_TOKEN ? '' : '0123',
  maxZoom: 19,
  detectRetina: true,
  crossOrigin: 'anonymous',
};

export const DARK_NAV_TILE_OPTIONS: TileLayerOptions = {
  attribution: '',
  subdomains: MAPBOX_TOKEN ? '' : 'abcd',
  maxZoom: 19,
  detectRetina: true,
  crossOrigin: 'anonymous',
};

export const OSM_TILE_OPTIONS: TileLayerOptions = {
  attribution: '',
  subdomains: 'abc',
  maxZoom: 19,
  detectRetina: true,
  crossOrigin: 'anonymous',
};
