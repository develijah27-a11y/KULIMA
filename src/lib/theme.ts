export function initTheme() {
  const saved = localStorage.getItem('kulima-theme');
  const sysDark = matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved ? saved === 'dark' : sysDark;
  document.documentElement.classList.toggle('dark', isDark);
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('kulima-theme', isDark ? 'dark' : 'light');
  return isDark;
}

export function getTheme(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}
