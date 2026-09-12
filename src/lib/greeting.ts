/**
 * Calculates time-of-day greeting synchronized with Uganda local time (UTC+3)
 * or client device local hour.
 */
export function getUgandaHour(): number {
  try {
    const ugandaTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Kampala',
      hour: 'numeric',
      hour12: false,
    }).format(new Date());
    const h = parseInt(ugandaTime, 10);
    return isNaN(h) ? (new Date().getUTCHours() + 3) % 24 : h % 24;
  } catch {
    return (new Date().getUTCHours() + 3) % 24;
  }
}

export function getTimeGreeting(name?: string, hour?: number): string {
  const h = hour !== undefined ? hour : getUgandaHour();
  const timeGreeting = h >= 5 && h < 12
    ? 'Good morning'
    : h >= 12 && h < 17
    ? 'Good afternoon'
    : 'Good evening';
  const cleanName = name ? name.split(' ')[0].replace(/,/g, '').trim() : '';
  return cleanName ? `${timeGreeting}, ${cleanName}` : timeGreeting;
}
