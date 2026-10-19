import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Task } from '../../hooks/useTasks'
import TaskCard from '../tasks/TaskCard'

interface Column {
  id: number | null
  name: string
  color: string
}

interface KanbanColumnProps {
  column: Column
  tasks: Task[]
  onToggle: (id: number, completed: boolean) => void
  onUpdate: (id: number, data: Partial<Task>) => void
  onDelete: (id: number) => void
  onEdit: (task: Task) => void
}

export default function KanbanColumn({ column, tasks, onToggle, onUpdate, onDelete, onEdit }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: String(column.id) })

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[82vw] sm:w-72 flex flex-col rounded-2xl border transition-colors snap-center ${
        isOver
          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/10'
          : 'border-gray-200/80 dark:border-dark-border bg-gray-50/70 dark:bg-dark-bg/60'
      }`}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-dark-border">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: column.color }} />
        <span className="text-sm font-semibold text-gray-700 dark:text-dark-text flex-1">{column.name}</span>
        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-dark-border px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>

      <div className="p-3 flex-1 overflow-y-auto">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
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
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-gray-300 dark:text-dark-border">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  )
}
