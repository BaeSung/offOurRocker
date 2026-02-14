import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/toaster'
import { AppShell } from '@/components/app-shell'

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={300}>
        <AppShell />
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  )
}
