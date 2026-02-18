import { useState, useEffect, useMemo } from 'react'
import { Network } from 'lucide-react'
import { useWorkStore } from '@/stores/useWorkStore'
import { useAppStore } from '@/stores/useAppStore'
import { Board } from '@/components/mind-map/board'

export function MindMapPage() {
  const activeDocument = useAppStore((s) => s.activeDocument)
  const seriesList = useWorkStore((s) => s.series)
  const standaloneWorks = useWorkStore((s) => s.standaloneWorks)

  const allWorks = useMemo(() => {
    const fromSeries = seriesList.flatMap((s) => s.works)
    return [...fromSeries, ...standaloneWorks]
  }, [seriesList, standaloneWorks])

  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null)

  useEffect(() => {
    if (activeDocument?.workId) {
      setSelectedWorkId(activeDocument.workId)
    } else if (allWorks.length > 0 && !selectedWorkId) {
      setSelectedWorkId(allWorks[0].id)
    }
  }, [activeDocument, allWorks, selectedWorkId])

  if (allWorks.length === 0) {
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
      {/* Top bar */}
      <div className="flex h-10 shrink-0 items-center gap-3 border-b border-border bg-card/50 px-4">
        <Network className="h-4 w-4 text-primary" />
        <h2 className="font-serif text-sm font-semibold text-foreground">
          디텍티브 보드
        </h2>
        {allWorks.length > 1 && (
          <>
            <div className="h-4 w-px bg-border" />
            <select
              value={selectedWorkId || ''}
              onChange={(e) => setSelectedWorkId(e.target.value)}
              className="h-7 rounded-md border border-border bg-card px-2 text-xs text-foreground outline-none transition-colors focus:border-primary/50"
            >
              {allWorks.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        {selectedWorkId ? (
          <Board key={selectedWorkId} workId={selectedWorkId} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              작품을 선택해주세요.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
