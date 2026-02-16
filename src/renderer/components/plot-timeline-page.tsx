import { useState, useEffect, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TimelineView } from '@/components/plot-timeline/timeline-view'
import { useWorkStore } from '@/stores/useWorkStore'
import { useAppStore } from '@/stores/useAppStore'

export function PlotTimelinePage() {
  const activeDocument = useAppStore((s) => s.activeDocument)
  const seriesList = useWorkStore((s) => s.series)
  const standaloneWorks = useWorkStore((s) => s.standaloneWorks)

  // Flatten all works
  const allWorks = useMemo(() => {
    const fromSeries = seriesList.flatMap((s) => s.works)
    return [...fromSeries, ...standaloneWorks]
  }, [seriesList, standaloneWorks])

  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null)
  const [chapters, setChapters] = useState<{ id: string; title: string }[]>([])

  useEffect(() => {
    if (activeDocument?.workId) {
      setSelectedWorkId(activeDocument.workId)
    } else if (allWorks.length > 0 && !selectedWorkId) {
      setSelectedWorkId(allWorks[0].id)
    }
  }, [activeDocument, allWorks, selectedWorkId])

  useEffect(() => {
    if (!selectedWorkId) return
    window.api.works.getById(selectedWorkId).then((work) => {
      if (work?.chapters) {
        setChapters(work.chapters.map((c) => ({ id: c.id, title: c.title })))
      }
    }).catch(() => {})
  }, [selectedWorkId])

  return (
    <ScrollArea className="flex-1">
      <div className="mx-auto max-w-[960px] px-6 md:px-12 py-10">
        {/* Header */}
        <div
          className="mb-8"
          style={{
            opacity: 0,
            animation: 'fadeSlideUp 500ms 0ms ease-out forwards',
          }}
        >
          <h1 className="font-serif text-3xl font-bold text-foreground">
            플롯 타임라인
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            이야기의 흐름을 시각적으로 관리하세요.
          </p>
        </div>

        {/* Work selector */}
        {allWorks.length > 1 && (
          <div
            className="mb-6"
            style={{
              opacity: 0,
              animation: 'fadeSlideUp 400ms 100ms ease-out forwards',
            }}
          >
            <select
              value={selectedWorkId || ''}
              onChange={(e) => setSelectedWorkId(e.target.value)}
              className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary/50"
            >
              {allWorks.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Timeline */}
        <div
          style={{
            opacity: 0,
            animation: 'fadeSlideUp 400ms 200ms ease-out forwards',
          }}
        >
          {selectedWorkId ? (
            <TimelineView workId={selectedWorkId} chapters={chapters} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <p className="text-sm text-muted-foreground">
                작품을 선택해주세요.
              </p>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}
