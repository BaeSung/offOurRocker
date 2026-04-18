import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import type { Node as ProseNode } from '@tiptap/pm/model'

export type HighlightKind = 'world' | 'character'

export interface HighlightTerm {
  id: string
  text: string
  kind: HighlightKind
  preview: string
}

interface PluginState {
  enabled: boolean
  terms: HighlightTerm[]
  decorations: DecorationSet
}

export const referenceHighlightKey = new PluginKey<PluginState>('referenceHighlight')

function buildDecorations(
  doc: ProseNode,
  terms: HighlightTerm[],
  enabled: boolean
): DecorationSet {
  if (!enabled || terms.length === 0) return DecorationSet.empty

  // Longest-first so "검사반" matches before "검사"
  const sorted = [...terms]
    .filter((t) => t.text && t.text.length > 0)
    .sort((a, b) => b.text.length - a.text.length)

  const decos: Decoration[] = []

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true
    const text = node.text
    const occupied = new Array(text.length).fill(false)

    for (const term of sorted) {
      const needle = term.text
      const nlen = needle.length
      let idx = 0
      while (idx <= text.length - nlen) {
        const found = text.indexOf(needle, idx)
        if (found === -1) break

        let overlap = false
        for (let i = found; i < found + nlen; i++) {
          if (occupied[i]) {
            overlap = true
            break
          }
        }

        if (!overlap) {
          for (let i = found; i < found + nlen; i++) occupied[i] = true
          decos.push(
            Decoration.inline(pos + found, pos + found + nlen, {
              class: `reference-highlight reference-highlight-${term.kind}`,
              'data-ref-kind': term.kind,
              'data-ref-id': term.id,
              'data-ref-preview': term.preview,
            })
          )
        }
        idx = found + nlen
      }
    }
    return true
  })

  return DecorationSet.create(doc, decos)
}

export interface ReferenceHighlightOptions {
  enabled: boolean
  terms: HighlightTerm[]
}

export const ReferenceHighlight = Extension.create<ReferenceHighlightOptions>({
  name: 'referenceHighlight',

  addOptions() {
    return {
      enabled: false,
      terms: [],
    }
  },

  addProseMirrorPlugins() {
    const ext = this
    return [
      new Plugin<PluginState>({
        key: referenceHighlightKey,
        state: {
          init(_, { doc }): PluginState {
            return {
              enabled: ext.options.enabled,
              terms: ext.options.terms,
              decorations: buildDecorations(doc, ext.options.terms, ext.options.enabled),
            }
          },
          apply(tr: Transaction, old: PluginState, _oldState: EditorState, newState: EditorState): PluginState {
            const meta = tr.getMeta(referenceHighlightKey) as
              | { enabled?: boolean; terms?: HighlightTerm[] }
              | undefined
            if (meta) {
              const enabled = meta.enabled ?? old.enabled
              const terms = meta.terms ?? old.terms
              return {
                enabled,
                terms,
                decorations: buildDecorations(newState.doc, terms, enabled),
              }
            }
            if (tr.docChanged) {
              return {
                ...old,
                decorations: buildDecorations(newState.doc, old.terms, old.enabled),
              }
            }
            return old
          },
        },
        props: {
          decorations(state) {
            return referenceHighlightKey.getState(state)?.decorations ?? DecorationSet.empty
          },
        },
      }),
    ]
  },
})
