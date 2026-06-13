import { computed, signal } from '@angular/core'
import type { EditorElement } from '../../shared/venue-map/venue-elements'

const HISTORY_CAP = 50

// Editor state for one venue map: elements, selection, dirty flag and a
// snapshot-based undo/redo history. Plain class (one instance per editor).
export class MapState {
  readonly elements = signal<EditorElement[]>([])
  readonly selectedId = signal<number | null>(null)
  readonly dirty = signal(false)

  private undoStack = signal<EditorElement[][]>([])
  private redoStack = signal<EditorElement[][]>([])
  private tempId = -1

  readonly canUndo = computed(() => this.undoStack().length > 0)
  readonly canRedo = computed(() => this.redoStack().length > 0)

  readonly selected = computed(() => {
    const id = this.selectedId()
    return id === null ? null : this.elements().find((e) => e.id === id) ?? null
  })

  readonly capacityTotal = computed(() =>
    this.elements().reduce((sum, e) => sum + (e.capacity ?? 0), 0),
  )

  load(elements: EditorElement[]): void {
    this.elements.set(elements.map((e) => ({ ...e })))
    this.selectedId.set(null)
    this.undoStack.set([])
    this.redoStack.set([])
    this.dirty.set(false)
  }

  // Call BEFORE a mutation batch (drag gesture, add, delete, panel edit).
  snapshot(): void {
    const copy = this.elements().map((e) => ({ ...e }))
    this.undoStack.update((s) => [...s.slice(-(HISTORY_CAP - 1)), copy])
    this.redoStack.set([])
  }

  apply(id: number, patch: Partial<EditorElement>): void {
    this.elements.update((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)))
    this.dirty.set(true)
  }

  add(element: Omit<EditorElement, 'id'>): number {
    this.snapshot()
    const id = this.tempId--
    this.elements.update((list) => [...list, { ...element, id }])
    this.selectedId.set(id)
    this.dirty.set(true)
    return id
  }

  duplicate(id: number): void {
    const src = this.elements().find((e) => e.id === id)
    if (!src) return
    this.snapshot()
    const newId = this.tempId--
    this.elements.update((list) => [...list, { ...src, id: newId, x: src.x + 24, y: src.y + 24 }])
    this.selectedId.set(newId)
    this.dirty.set(true)
  }

  remove(id: number): void {
    this.snapshot()
    this.elements.update((list) => list.filter((e) => e.id !== id))
    if (this.selectedId() === id) this.selectedId.set(null)
    this.dirty.set(true)
  }

  undo(): void {
    const stack = this.undoStack()
    const prev = stack[stack.length - 1]
    if (!prev) return
    this.redoStack.update((s) => [...s, this.elements().map((e) => ({ ...e }))])
    this.undoStack.set(stack.slice(0, -1))
    this.elements.set(prev)
    this.dirty.set(true)
  }

  redo(): void {
    const stack = this.redoStack()
    const next = stack[stack.length - 1]
    if (!next) return
    this.undoStack.update((s) => [...s, this.elements().map((e) => ({ ...e }))])
    this.redoStack.set(stack.slice(0, -1))
    this.elements.set(next)
    this.dirty.set(true)
  }
}
