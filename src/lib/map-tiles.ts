// Shared Stadia Maps tile config — used by every Leaflet map in the app
// (DeliveryTrackingMap, NearbyDriversMap) so there's one place to change
// the style/key handling instead of two copies drifting apart.
//
// "alidade_smooth" is Stadia's clean, muted grayscale-leaning basemap —
// deliberately not the loud default OSM raster colors. Falls back to
// plain OpenStreetMap tiles (unstyled, but still real and free) if the
// key isn't configured, so a missing/expired key degrades the map's
// look rather than breaking it outright.
const STADIA_KEY = process.env.NEXT_PUBLIC_STADIA_MAPS_API_KEY;

export const MAP_TILE_URL = STADIA_KEY
  ? `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${STADIA_KEY}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const MAP_TILE_OPTIONS = {
  attribution: STADIA_KEY
    ? '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; OpenStreetMap contributors'
    : '© OpenStreetMap',
  maxZoom: 19,
  detectRetina: true,
};
