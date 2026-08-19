// Shared high-performance map tiles — Faras / Google Maps clean vector-raster aesthetic.
// Uses CARTO Voyager multi-CDN (subdomains a,b,c,d) with full CORS & zero rate-limiting.
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const STADIA_KEY = process.env.NEXT_PUBLIC_STADIA_MAPS_API_KEY;

export const MAP_TILE_URL = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}{r}?access_token=${MAPBOX_TOKEN}`
  : STADIA_KEY
  ? `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${STADIA_KEY}`
  : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

export const MAP_TILE_OPTIONS = {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 20,
  detectRetina: true,
  crossOrigin: true,
};
