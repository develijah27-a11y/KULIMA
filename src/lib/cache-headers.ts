export function cacheControl(value: string): Record<string, string> {
  if (process.env.NODE_ENV !== 'production') return {};
  return { 'Cache-Control': value };
}
