import type { Note, NoteCategory } from '@/types'

export const noteCategories = [
  { value: 'diary', label: '日记' },
  { value: 'thought', label: '随手记' },
  { value: 'cycle', label: '身体周期' },
] as const

export function personalNoteCategory(note: Note): NoteCategory {
  return note.category ?? 'diary'
}
