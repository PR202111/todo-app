import { DndContext, DragEndEvent, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useState } from 'react'
import { Category } from '../../hooks/useCategories'
import { Task } from '../../hooks/useTasks'
import KanbanColumn from './KanbanColumn'
import TaskCard from '../tasks/TaskCard'

interface KanbanBoardProps {
  tasks: Task[]
  categories: Category[]
  onToggle: (id: number, completed: boolean) => void
  onUpdate: (id: number, data: Partial<Task>) => void
  onDelete: (id: number) => void
  onEdit: (task: Task) => void
}

export default function KanbanBoard({ tasks, categories, onToggle, onUpdate, onDelete, onEdit }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } })
  )

  const columns = [
    { id: null as number | null, name: 'Uncategorized', color: '#9ca3af' },
    ...categories.map(c => ({ id: c.id as number | null, name: c.name, color: c.color })),
  ]

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return
    const taskId = Number(active.id)
    const colId = over.id === 'null' ? null : Number(over.id)
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    if (task.category_id !== colId) {
      onUpdate(taskId, { category_id: colId ?? undefined })
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={e => setActiveTask(tasks.find(t => t.id === Number(e.active.id)) || null)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3.5 sm:gap-4 overflow-x-auto pb-6 h-full snap-x snap-mandatory scroll-px-4 px-1">
        {columns.map(col => (
          <KanbanColumn
            key={String(col.id)}
            column={col}
            tasks={tasks.filter(t => (t.category_id ?? null) === col.id)}
            onToggle={onToggle}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="rotate-2 opacity-90">
            <TaskCard
              task={activeTask}
              onToggle={onToggle}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
