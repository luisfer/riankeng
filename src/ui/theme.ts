export type ThemePref = 'light' | 'dark' | 'system'

export function resolvedTheme(pref: ThemePref | undefined): 'light' | 'dark' {
  const p = pref ?? 'light'
  if (p === 'light' || p === 'dark') return p
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(pref: ThemePref | undefined): 'light' | 'dark' {
  const resolved = resolvedTheme(pref)
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#1c1710' : '#f2ead8')
  return resolved
}
