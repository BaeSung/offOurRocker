import { useEffect } from 'react'
import { useSettingsStore } from '@/stores/useSettingsStore'

const ACCENT_HSL: Record<string, { primary: string; ring: string }> = {
  amber:  { primary: '30 40% 64%',  ring: '30 40% 64%' },
  rose:   { primary: '350 60% 60%', ring: '350 60% 60%' },
  sage:   { primary: '140 25% 55%', ring: '140 25% 55%' },
  slate:  { primary: '215 20% 55%', ring: '215 20% 55%' },
  indigo: { primary: '230 55% 60%', ring: '230 55% 60%' },
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((s) => s.theme)
  const accentColor = useSettingsStore((s) => s.accentColor)

  // Apply theme class
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.add(prefersDark ? 'dark' : 'light')
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  // Apply accent color CSS variables
  useEffect(() => {
    const accent = ACCENT_HSL[accentColor] || ACCENT_HSL.amber
    const root = document.documentElement.style
    root.setProperty('--primary', accent.primary)
    root.setProperty('--accent', accent.primary)
    root.setProperty('--ring', accent.ring)
    root.setProperty('--sidebar-primary', accent.primary)
    root.setProperty('--sidebar-ring', accent.ring)
    root.setProperty('--chart-1', accent.primary)
  }, [accentColor])

  return <>{children}</>
}
