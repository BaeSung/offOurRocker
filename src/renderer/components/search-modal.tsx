import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, FileText, BookOpen, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/useAppStore'

interface SearchResult {
  type: 'work' | 'chapter'
  workId: string
  workTitle: string
  chapterId: string | null
  chapterTitle: string | null
  snippet: string
}

export function SearchModal() {
  const { searchModalOpen, setSearchModalOpen, setActiveDocument } = useAppStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Focus input on open
  useEffect(() => {
    if (searchModalOpen) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [searchModalOpen])

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await window.api.search.query(q.trim())
      setResults(res)
      setSelectedIndex(0)
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (value: string) => {
    setQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(value), 250)
  }

  const handleSelect = (result: SearchResult) => {
    setActiveDocument(result.workId, result.chapterId)
    setSearchModalOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    } else if (e.key === 'Escape') {
      setSearchModalOpen(false)
    }
  }

  if (!searchModalOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setSearchModalOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="작품 제목, 내용 검색..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]) }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {loading && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              검색 중...
            </div>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              검색 결과가 없습니다.
            </div>
          )}

          {!loading && query.trim().length < 2 && query.length > 0 && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              2글자 이상 입력해주세요.
            </div>
          )}

          {!loading && results.length > 0 && (
            <div>
              {results.map((result, idx) => (
                <button
                  key={`${result.workId}-${result.chapterId ?? 'w'}-${idx}`}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors',
                    idx === selectedIndex ? 'bg-secondary' : 'hover:bg-secondary/50'
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {result.type === 'work' ? (
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {result.workTitle}
                      </span>
                      {result.chapterTitle && (
                        <>
                          <span className="text-muted-foreground/50">›</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {result.chapterTitle}
                          </span>
                        </>
                      )}
                    </div>
                    {result.snippet && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {result.snippet}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && !query && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              작품 제목이나 본문 내용을 검색하세요.
            </div>
          )}
        </div>

        {/* Footer hints */}
        {results.length > 0 && (
          <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
            <span>
              <kbd className="rounded border border-border bg-muted px-1 py-0.5">↑↓</kbd>
              {' 이동'}
            </span>
            <span>
              <kbd className="rounded border border-border bg-muted px-1 py-0.5">Enter</kbd>
              {' 열기'}
            </span>
            <span className="ml-auto">{results.length}개 결과</span>
          </div>
        )}
      </div>
    </div>
  )
}
