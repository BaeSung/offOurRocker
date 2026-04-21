import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Transaction, EditorState } from '@tiptap/pm/state'
import type { Node as ProseNode } from '@tiptap/pm/model'
import type { Editor } from '@tiptap/react'

export interface FindMatch {
  from: number
  to: number
}

export interface FindState {
  query: string
  caseSensitive: boolean
  matches: FindMatch[]
  activeIdx: number
  decorations: DecorationSet
}

export const findReplaceKey = new PluginKey<FindState>('findReplace')

function scanMatches(doc: ProseNode, query: string, caseSensitive: boolean): FindMatch[] {
  if (!query) return []
  const needle = caseSensitive ? query : query.toLowerCase()
  const nlen = needle.length
  const matches: FindMatch[] = []

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true
    const haystack = caseSensitive ? node.text : node.text.toLowerCase()
    let from = 0
    while (from <= haystack.length - nlen) {
      const hit = haystack.indexOf(needle, from)
      if (hit === -1) break
      matches.push({ from: pos + hit, to: pos + hit + nlen })
      from = hit + nlen
    }
    return true
  })

  return matches
}

function buildState(
  doc: ProseNode,
  query: string,
  caseSensitive: boolean,
  desiredActive: number
): FindState {
  const matches = scanMatches(doc, query, caseSensitive)
  const activeIdx =
    matches.length === 0 ? -1 : Math.max(0, Math.min(desiredActive, matches.length - 1))

  const decos: Decoration[] = []
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]
    decos.push(
      Decoration.inline(m.from, m.to, {
        class: i === activeIdx ? 'find-match find-match-active' : 'find-match',
      })
    )
  }

  return {
    query,
    caseSensitive,
    matches,
    activeIdx,
    decorations: decos.length ? DecorationSet.create(doc, decos) : DecorationSet.empty,
  }
}

type FindMeta = {
  query?: string
  caseSensitive?: boolean
  activeIdx?: number
  clear?: boolean
}

export const FindReplace = Extension.create({
  name: 'findReplace',

  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findReplaceKey,
        state: {
          init(_, { doc }): FindState {
            return buildState(doc, '', false, 0)
          },
          apply(
            tr: Transaction,
            old: FindState,
            _oldState: EditorState,
            newState: EditorState
          ): FindState {
            const meta = tr.getMeta(findReplaceKey) as FindMeta | undefined
            if (meta?.clear) {
              return buildState(newState.doc, '', false, 0)
            }
            if (meta) {
              const query = meta.query ?? old.query
              const caseSensitive = meta.caseSensitive ?? old.caseSensitive
              const queryChanged =
                meta.query !== undefined && meta.query !== old.query
              const desired =
                queryChanged
                  ? 0
                  : meta.activeIdx ?? old.activeIdx
              return buildState(newState.doc, query, caseSensitive, desired)
            }
            if (tr.docChanged && old.query) {
              const anchorFrom =
                old.activeIdx >= 0 && old.matches[old.activeIdx]
                  ? tr.mapping.map(old.matches[old.activeIdx].from)
                  : -1
              const preliminary = buildState(newState.doc, old.query, old.caseSensitive, 0)
              let newActive = preliminary.activeIdx
              if (anchorFrom >= 0 && preliminary.matches.length > 0) {
                const found = preliminary.matches.findIndex((m) => m.from >= anchorFrom)
                newActive = found === -1 ? preliminary.matches.length - 1 : found
              }
              if (newActive === preliminary.activeIdx) return preliminary
              return buildState(newState.doc, old.query, old.caseSensitive, newActive)
            }
            return old
          },
        },
        props: {
          decorations(state) {
            return findReplaceKey.getState(state)?.decorations ?? DecorationSet.empty
          },
        },
      }),
    ]
  },
})

export function getFindState(editor: Editor): FindState | null {
  return findReplaceKey.getState(editor.state) ?? null
}

function scrollActiveIntoView(editor: Editor): void {
  const s = getFindState(editor)
  if (!s || s.activeIdx < 0) return
  const match = s.matches[s.activeIdx]
  if (!match) return
  try {
    const resolved = editor.view.domAtPos(match.from)
    const node = resolved.node
    const el = node instanceof HTMLElement ? node : node.parentElement
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  } catch {
    // domAtPos can throw if pos is stale; ignore
  }
}

export function setFindQuery(editor: Editor, query: string, caseSensitive: boolean): void {
  const tr = editor.state.tr.setMeta(findReplaceKey, { query, caseSensitive })
  editor.view.dispatch(tr)
  scrollActiveIntoView(editor)
}

export function clearFind(editor: Editor): void {
  const tr = editor.state.tr.setMeta(findReplaceKey, { clear: true })
  editor.view.dispatch(tr)
}

export function findNext(editor: Editor): void {
  const s = getFindState(editor)
  if (!s || s.matches.length === 0) return
  const next = (s.activeIdx + 1) % s.matches.length
  editor.view.dispatch(editor.state.tr.setMeta(findReplaceKey, { activeIdx: next }))
  scrollActiveIntoView(editor)
}

export function findPrev(editor: Editor): void {
  const s = getFindState(editor)
  if (!s || s.matches.length === 0) return
  const prev = (s.activeIdx - 1 + s.matches.length) % s.matches.length
  editor.view.dispatch(editor.state.tr.setMeta(findReplaceKey, { activeIdx: prev }))
  scrollActiveIntoView(editor)
}

export function replaceCurrent(editor: Editor, replacement: string): boolean {
  const s = getFindState(editor)
  if (!s || s.activeIdx < 0) return false
  const match = s.matches[s.activeIdx]
  if (!match) return false
  const tr = editor.state.tr.insertText(replacement, match.from, match.to)
  editor.view.dispatch(tr)
  scrollActiveIntoView(editor)
  return true
}

export function replaceAll(editor: Editor, replacement: string): number {
  const s = getFindState(editor)
  if (!s || s.matches.length === 0) return 0
  const tr = editor.state.tr
  for (let i = s.matches.length - 1; i >= 0; i--) {
    const m = s.matches[i]
    tr.insertText(replacement, m.from, m.to)
  }
  editor.view.dispatch(tr)
  return s.matches.length
}
