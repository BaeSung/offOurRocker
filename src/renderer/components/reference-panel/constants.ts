import type { CharacterRole, WorldNoteCategory } from '../../../shared/types'

export const CHARACTER_ROLES: { value: CharacterRole; label: string; color: string }[] = [
  { value: '주인공', label: '주인공', color: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  { value: '조연', label: '조연', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  { value: '악역', label: '악역', color: 'bg-red-500/15 text-red-400 border-red-500/25' },
  { value: '기타', label: '기타', color: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/25' },
]

export const WORLD_NOTE_CATEGORIES: { value: WorldNoteCategory; label: string; color: string }[] = [
  { value: '장소', label: '장소', color: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  { value: '세력', label: '세력', color: 'bg-violet-500/15 text-violet-400 border-violet-500/25' },
  { value: '설정', label: '설정', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25' },
  { value: '역사', label: '역사', color: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
  { value: '기타', label: '기타', color: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/25' },
]
