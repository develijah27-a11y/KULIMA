// Shared tile config — used by every Leaflet map in the app
// (DeliveryTrackingMap, NearbyDriversMap, LocationPinPicker) so there's one
// place to change the provider/key handling instead of copies drifting
// apart. Mapbox is primary (per explicit request); falls back to Stadia,
// then plain OpenStreetMap tiles, so a missing/expired key degrades the
// map's look rather than breaking it outright.
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const STADIA_KEY = process.env.NEXT_PUBLIC_STADIA_MAPS_API_KEY;

export const MAP_TILE_URL = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/256/{z}/{x}/{y}{r}?access_token=${MAPBOX_TOKEN}`
  : STADIA_KEY
  ? `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${STADIA_KEY}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const MAP_TILE_OPTIONS = {
  attribution: MAPBOX_TOKEN
    ? '&copy; <a href="https://www.mapbox.com/about/maps/" target="_blank">Mapbox</a> &copy; OpenStreetMap contributors'
    : STADIA_KEY
    ? '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; OpenStreetMap contributors'
    : '© OpenStreetMap',
  maxZoom: 19,
  detectRetina: true,
};
