import { useMemo } from 'react'
import { Network } from 'lucide-react'
import { useWorkStore } from '@/stores/useWorkStore'
import { useAppStore } from '@/stores/useAppStore'
import { Board } from '@/components/mind-map/board'

export function MindMapPage() {
  const activeDocument = useAppStore((s) => s.activeDocument)
  const seriesList = useWorkStore((s) => s.series)
  const standaloneWorks = useWorkStore((s) => s.standaloneWorks)

  const workId = useMemo(() => {
    if (activeDocument?.workId) return activeDocument.workId
    const allWorks = [...seriesList.flatMap((s) => s.works), ...standaloneWorks]
    return allWorks.length > 0 ? allWorks[0].id : null
  }, [activeDocument, seriesList, standaloneWorks])

  if (!workId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <Network className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          작품을 먼저 만들어주세요.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex h-9 shrink-0 items-center gap-3 border-b border-border bg-card/50 px-4">
        <Network className="h-4 w-4 text-primary" />
        <h2 className="font-serif text-sm font-semibold text-foreground">
          디텍티브 보드
        </h2>
      </div>

      <div className="flex-1 overflow-hidden">
        <Board key={workId} workId={workId} />
      </div>
    </div>
  )
}
