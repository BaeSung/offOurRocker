import { useState, useEffect, useCallback } from "react"
import {
  Settings,
  Pen,
  Bot,
  Download,
  Keyboard,
  Info,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GeneralSettings } from "@/components/settings/general-settings"
import { EditorSettings } from "@/components/settings/editor-settings"
import { AISettings } from "@/components/settings/ai-settings"
import { ExportSettings } from "@/components/settings/export-settings"
import { ShortcutSettings } from "@/components/settings/shortcut-settings"
import { AboutSection } from "@/components/settings/about-section"

const CATEGORIES = [
  { id: "general", label: "일반", icon: Settings },
  { id: "editor", label: "에디터", icon: Pen },
  { id: "ai", label: "AI 연동", icon: Bot },
  { id: "export", label: "내보내기", icon: Download },
  { id: "shortcuts", label: "단축키", icon: Keyboard },
  { id: "about", label: "정보", icon: Info },
] as const

type CategoryId = (typeof CATEGORIES)[number]["id"]

function SaveToast({ visible }: { visible: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg bg-card/95 px-4 py-2 shadow-lg ring-1 ring-border/60 backdrop-blur transition-all duration-300",
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-2 opacity-0"
      )}
    >
      <p className="text-xs text-secondary-foreground">
        변경사항이 자동 저장되었습니다
      </p>
    </div>
  )
}

interface SettingsPageProps {
  onClose: () => void
}

export function SettingsPage({ onClose }: SettingsPageProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("general")
  const [toastVisible, setToastVisible] = useState(false)
  const [fadeKey, setFadeKey] = useState(0)

  const showToast = useCallback(() => {
    setToastVisible(true)
    const t = setTimeout(() => setToastVisible(false), 2000)
    return () => clearTimeout(t)
  }, [])

  // Listen for any input/change events inside the settings content to trigger toast
  useEffect(() => {
    const container = document.getElementById("settings-content")
    if (!container) return

    let timeout: ReturnType<typeof setTimeout>
    const handler = () => {
      clearTimeout(timeout)
      timeout = setTimeout(showToast, 400)
    }
    container.addEventListener("input", handler)
    container.addEventListener("change", handler)
    container.addEventListener("click", handler)
    return () => {
      container.removeEventListener("input", handler)
      container.removeEventListener("change", handler)
      container.removeEventListener("click", handler)
      clearTimeout(timeout)
    }
  }, [showToast])

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const handleCategoryChange = (id: CategoryId) => {
    setActiveCategory(id)
    setFadeKey((k) => k + 1)
  }

  const renderContent = () => {
    switch (activeCategory) {
      case "general":
        return <GeneralSettings />
      case "editor":
        return <EditorSettings />
      case "ai":
        return <AISettings />
      case "export":
        return <ExportSettings />
      case "shortcuts":
        return <ShortcutSettings />
      case "about":
        return <AboutSection />
    }
  }

  return (
    <main
      className="flex flex-1 overflow-hidden"
      style={{ background: "hsl(var(--background))" }}
    >
      <SaveToast visible={toastVisible} />

      {/* Vertical tab nav */}
      <nav
        className="flex w-[200px] shrink-0 flex-col border-r border-border bg-card/50 py-4"
        role="tablist"
        aria-label="설정 카테고리"
      >
        <h2 className="mb-4 px-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          설정
        </h2>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon
          const active = activeCategory === cat.id
          return (
            <button
              key={cat.id}
              role="tab"
              aria-selected={active}
              onClick={() => handleCategoryChange(cat.id)}
              className={cn(
                "relative flex items-center gap-3 px-5 py-2.5 text-left text-sm transition-all duration-150",
                active
                  ? "bg-secondary/60 text-foreground"
                  : "text-muted-foreground hover:bg-secondary/30 hover:text-secondary-foreground"
              )}
            >
              {/* Active indicator bar */}
              {active && (
                <div className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              <span>{cat.label}</span>
            </button>
          )
        })}

        {/* Close button at bottom */}
        <div className="mt-auto px-4">
          <button
            onClick={onClose}
            className="flex h-8 w-full items-center justify-center gap-2 rounded-md text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            설정 닫기
          </button>
        </div>
      </nav>

      {/* Content area */}
      <ScrollArea className="flex-1">
        <div
          id="settings-content"
          key={fadeKey}
          className="mx-auto max-w-[640px] animate-in fade-in duration-200 px-8 py-6 pb-16"
          role="tabpanel"
        >
          {renderContent()}
        </div>
      </ScrollArea>
    </main>
  )
}
