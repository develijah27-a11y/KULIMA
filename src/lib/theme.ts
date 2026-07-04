export function initTheme() {
  const saved = localStorage.getItem('agrinova-theme');
  // Default to light unless the user explicitly chose dark
  const isDark = saved === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('agrinova-theme', isDark ? 'dark' : 'light');
  return isDark;
}

export function getTheme(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}
