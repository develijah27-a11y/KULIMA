import { NextResponse } from 'next/server';
import { fetchWeatherForFarmer, fetchWeatherForDistrict } from '@/lib/weather-server';

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const districtParam = searchParams.get('district');
  const latParam = searchParams.get('lat');
  const lonParam = searchParams.get('lon');

  let data;
  if (districtParam) {
    data = await fetchWeatherForDistrict(districtParam);
  } else if (latParam && lonParam) {
    const lat = parseFloat(latParam);
    const lon = parseFloat(lonParam);
    data = await fetchWeatherForFarmer(isNaN(lat) ? 0.3476 : lat, isNaN(lon) ? 32.5825 : lon);
  } else {
    // Default to Kampala coordinates
    data = await fetchWeatherForFarmer(0.3476, 32.5825);
  }

  return NextResponse.json(
    {
      success: true,
      data,
      // Top-level properties for universal client compatibility
      temp: data.now.temp,
      feelsLike: data.now.feelsLike,
      humidity: data.now.humidity,
      windSpeed: data.now.wind,
      description: data.now.description,
      icon: data.now.icon,
      rainfall: data.now.precipitation,
      district: data.district || districtParam || 'Uganda',
      source: data.source,
      forecast: data.forecast,
      daily: data.daily,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
      },
    }
  );
};
