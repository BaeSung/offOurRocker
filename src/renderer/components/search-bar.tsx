import { Search } from "lucide-react"
import { useAppStore } from "@/stores/useAppStore"

interface SearchBarProps {
  collapsed: boolean
}

export function SearchBar({ collapsed }: SearchBarProps) {
  const setSearchModalOpen = useAppStore((s) => s.setSearchModalOpen)

  if (collapsed) {
    return (
      <button
        onClick={() => setSearchModalOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:text-foreground hover:bg-secondary"
        aria-label="검색"
      >
        <Search className="h-4 w-4" />
      </button>
    )
  }

  return (
    <button
      onClick={() => setSearchModalOpen(true)}
      className="relative flex h-8 w-full items-center rounded-md border border-border bg-secondary/50 pl-8 pr-14 text-xs text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
      aria-label="작품 제목, 내용 검색"
    >
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
      <span>작품 검색...</span>
      <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 flex items-center rounded border border-border bg-muted px-1 py-0.5 text-[10px]">
        {"⌘K"}
      </kbd>
    </button>
  )
}
