import { DndContext, DragEndEvent, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { AnimatePresence } from 'framer-motion'
import { Task } from '../../hooks/useTasks'
import TaskCard from './TaskCard'

interface TaskListProps {
  tasks: Task[]
  onToggle: (id: number, completed: boolean) => void
  onUpdate: (id: number, data: Partial<Task>) => void
  onDelete: (id: number) => void
  onEdit: (task: Task) => void
  onReorder: (tasks: Task[]) => void
}

export default function TaskList({ tasks, onToggle, onUpdate, onDelete, onEdit, onReorder }: TaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = tasks.findIndex(t => t.id === active.id)
    const newIndex = tasks.findIndex(t => t.id === over.id)
    onReorder(arrayMove(tasks, oldIndex, newIndex))
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-gray-400 dark:text-dark-muted text-sm">No tasks here. Add one above!</p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <AnimatePresence initial={false}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={onToggle}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </AnimatePresence>
      </SortableContext>
    </DndContext>
  )
}
