import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AnimatePresence, motion } from 'framer-motion'
import { format, isToday, isPast } from 'date-fns'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Task } from '../../hooks/useTasks'
import Badge from '../ui/Badge'
import DatePicker from '../ui/DatePicker'
import PriorityFlag from '../ui/PriorityFlag'

interface TaskCardProps {
  task: Task
  onToggle: (id: number, completed: boolean) => void
  onUpdate: (id: number, data: Partial<Task>) => void
  onDelete: (id: number) => void
  onEdit: (task: Task) => void
}

export default function TaskCard({ task, onToggle, onUpdate, onDelete, onEdit }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const [hovered, setHovered] = useState(false)
  const [completing, setCompleting] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const handleToggle = async () => {
    setCompleting(true)
    await onToggle(task.id, !task.completed)
    setTimeout(() => setCompleting(false), 500)
  }

  const getDueDateColor = () => {
    if (!task.due_date) return 'text-gray-400 dark:text-dark-muted'
    const d = new Date(task.due_date)
    if (isPast(d) && !isToday(d)) return 'text-red-500'
    if (isToday(d)) return 'text-amber-500'
    return 'text-gray-500 dark:text-dark-muted'
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: task.completed ? 0.55 : 1, y: 0 }}
      exit={{ opacity: 0, x: -60, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group flex items-start gap-3 p-3 bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border hover:border-gray-200 dark:hover:border-dark-muted hover:shadow-sm transition-all mb-2"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className={`mt-0.5 p-1 -m-1 flex-shrink-0 text-gray-300 dark:text-dark-border hover:text-gray-500 cursor-grab active:cursor-grabbing transition-opacity ${
          hovered ? 'opacity-100' : 'opacity-40 md:opacity-0 md:group-hover:opacity-100'
        }`}
        title="Drag to reorder"
        aria-label="Drag handle"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Checkbox with generous touch target */}
      <div className="flex-shrink-0 p-1 -m-1 flex items-center justify-center">
        <motion.button
          onClick={handleToggle}
          whileTap={{ scale: 0.7 }}
          animate={{ scale: completing ? [1, 1.3, 1] : 1 }}
          transition={{ duration: 0.3, ease: 'backOut' }}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            task.completed
              ? 'bg-green-500 border-green-500'
              : 'border-gray-300 dark:border-dark-border hover:border-indigo-400'
          }`}
          aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        >
          {task.completed && (
            <motion.svg
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-2.5 h-2.5 text-white"
              viewBox="0 0 10 10"
              fill="none"
            >
              <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          )}
        </motion.button>
      </div>

      {/* Content - Click to edit */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onEdit(task)}
      >
        <div className="flex items-start gap-2">
          <span
            className={`text-sm leading-5 text-gray-800 dark:text-dark-text flex-1 task-complete-text ${
              task.completed ? 'line-through text-gray-400 dark:text-dark-muted done' : ''
            }`}
          >
            {task.title}
          </span>
          <PriorityFlag priority={task.priority} />
        </div>

        {task.description && (
          <p className="text-xs text-gray-400 dark:text-dark-muted mt-0.5 line-clamp-2">{task.description}</p>
        )}

        <div className="flex items-center gap-2 mt-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
          {task.due_date && (
            <DatePicker
              value={task.due_date}
              onChange={(date) => onUpdate(task.id, { due_date: date })}
            />
          )}
          {!task.due_date && (
            <DatePicker value={undefined} onChange={(date) => onUpdate(task.id, { due_date: date })} />
          )}
          {task.category && (
            <Badge color={task.category.color} label={task.category.name} />
          )}
        </div>
      </div>

      {/* Actions - visible on mobile, hover-revealed on desktop */}
      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(task)}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border text-gray-400 hover:text-indigo-600 transition-colors"
          title="Edit task"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
          title="Delete task"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}
