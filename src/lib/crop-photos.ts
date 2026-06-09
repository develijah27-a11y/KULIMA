// Curated Unsplash photo IDs for Uganda cash crops
// Format: https://images.unsplash.com/photo-{ID}?w=600&h=400&fit=crop&q=80&auto=format

export const CROP_PHOTO_IDS: Record<string, string> = {
  coffee:         '1447933601403-0c6688de566e',
  coffee_robusta: '1447933601403-0c6688de566e',
  coffee_arabica: '1493380789672-d97c88e22d3c',
  maize:          '1551754655-cd27e38d2076',
  banana:         '1528825871115-3581a5387919',
  avocado:        '1523049673857-eb18f1d7b578',
  tomato:         '1592924357228-91a4daadcfea',
  beans:          '1586201375761-83865001e31c',
  rice:           '1536304929831-ee1ca9d44906',
  cassava:        '1530026186672-2cd00ffc50fe',
  sunflower:      '1597848212624-a19eb35e2651',
  tea:            '1509042239860-f55ce3de6d4c',
  tea_green:      '1509042239860-f55ce3de6d4c',
  cocoa:          '1606312619070-d48b4c652a52',
  cotton:         '1575844264771-892081089af5',
  groundnuts:     '1564890369478-c89ca3d9cde4',
  soybeans:       '1592997571659-97b47280ada2',
  sesame:         '1607914084099-53a9dd0ae6a9',
  vanilla:        '1582560475093-ba66accbc424',
  sorghum:        '1568702846914-96b305d2aaeb',
  sweet_potatoes: '1518977676601-b53f82aba655',
  macadamia:      '1568702846914-96b305d2aaeb',
  tobacco:        '1607914084099-53a9dd0ae6a9',
};

// Gradient fallbacks by crop category (used when photo isn't available)
export const CROP_GRADIENTS: Record<string, { from: string; to: string; emoji: string }> = {
  coffee:         { from: '#3B1F09', to: '#7C4A1E', emoji: '☕' },
  coffee_robusta: { from: '#3B1F09', to: '#7C4A1E', emoji: '☕' },
  coffee_arabica: { from: '#4A2310', to: '#8B5E3C', emoji: '☕' },
  tea:            { from: '#1B4332', to: '#40916C', emoji: '🍵' },
  tea_green:      { from: '#1B4332', to: '#40916C', emoji: '🍵' },
  maize:          { from: '#92400E', to: '#D97706', emoji: '🌽' },
  beans:          { from: '#7F1D1D', to: '#DC2626', emoji: '🫘' },
  banana:         { from: '#713F12', to: '#CA8A04', emoji: '🍌' },
  cassava:        { from: '#065F46', to: '#059669', emoji: '🥔' },
  tomato:         { from: '#7F1D1D', to: '#EF4444', emoji: '🍅' },
  avocado:        { from: '#166534', to: '#16A34A', emoji: '🥑' },
  rice:           { from: '#0C4A6E', to: '#0284C7', emoji: '🌾' },
  vanilla:        { from: '#3B1F09', to: '#854D0E', emoji: '🌿' },
  cotton:         { from: '#374151', to: '#6B7280', emoji: '🌾' },
  sunflower:      { from: '#713F12', to: '#EAB308', emoji: '🌻' },
  sesame:         { from: '#78350F', to: '#D97706', emoji: '🌱' },
  cocoa:          { from: '#44201A', to: '#78350F', emoji: '🍫' },
  soybeans:       { from: '#065F46', to: '#15803D', emoji: '🫘' },
  groundnuts:     { from: '#78350F', to: '#B45309', emoji: '🥜' },
  macadamia:      { from: '#1C1917', to: '#57534E', emoji: '🥥' },
  sorghum:        { from: '#78350F', to: '#C2410C', emoji: '🌾' },
  tobacco:        { from: '#1C1917', to: '#44403C', emoji: '🍂' },
};

export function getCropPhotoUrl(cropKey: string, width = 600, height = 400): string | null {
  const id = CROP_PHOTO_IDS[cropKey.toLowerCase().replace(/\s+/g, '_')];
  if (!id) return null;
  return `https://images.unsplash.com/photo-${id}?w=${width}&h=${height}&fit=crop&q=80&auto=format`;
}

export function getCropGradient(cropKey: string) {
  const key = cropKey.toLowerCase().replace(/\s+/g, '_');
  return CROP_GRADIENTS[key] ?? { from: '#1B4332', to: '#40916C', emoji: '🌱' };
}
