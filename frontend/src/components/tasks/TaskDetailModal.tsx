import { useCallback, useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import Modal from '../ui/Modal'
import { Task } from '../../hooks/useTasks'
import { Category } from '../../hooks/useCategories'
import DatePicker from '../ui/DatePicker'
import { PRIORITY_CONFIG } from '../ui/PriorityFlag'

interface TaskDetailModalProps {
  task: Task | null
  categories: Category[]
  onClose: () => void
  onUpdate: (id: number, data: Partial<Task>) => void
  onDelete: (id: number) => void
}

export default function TaskDetailModal({ task, categories, onClose, onUpdate, onDelete }: TaskDetailModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || '')
    }
  }, [task?.id])

  const debouncedSave = useCallback((data: Partial<Task>) => {
    if (!task) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      onUpdate(task.id, data)
    }, 600)
  }, [task, onUpdate])

  if (!task) return null

  const handleDelete = () => {
    onDelete(task.id)
    onClose()
  }

  return (
    <Modal open={!!task} onClose={onClose} title="Task details">
      <div className="space-y-5">
        <textarea
          value={title}
          onChange={e => { setTitle(e.target.value); debouncedSave({ title: e.target.value }) }}
          className="w-full text-lg font-semibold text-gray-900 dark:text-dark-text bg-transparent resize-none focus:outline-none border-b border-transparent focus:border-gray-200 dark:focus:border-dark-border pb-1 transition-colors"
          rows={2}
        />

        <textarea
          value={description}
          onChange={e => { setDescription(e.target.value); debouncedSave({ description: e.target.value }) }}
          placeholder="Add a description..."
          className="w-full text-sm text-gray-600 dark:text-dark-muted bg-transparent resize-none focus:outline-none placeholder-gray-300 dark:placeholder-dark-border"
          rows={4}
        />

        {/* Priority */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-dark-muted mb-2 uppercase tracking-wide">Priority</p>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => onUpdate(task.id, { priority: key as Task['priority'] })}
                className={`flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-xl text-xs font-medium border transition-all ${
                  task.priority === key
                    ? 'border-current'
                    : 'border-gray-200 dark:border-dark-border hover:border-gray-300'
                }`}
                style={{ color: task.priority === key ? cfg.color : undefined }}
                aria-label={`Set priority to ${cfg.label}`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due date */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-dark-muted mb-2 uppercase tracking-wide">Due Date</p>
          <DatePicker value={task.due_date} onChange={(date) => onUpdate(task.id, { due_date: date })} />
        </div>

        {/* Category */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-dark-muted mb-2 uppercase tracking-wide">Category</p>
          <select
            value={task.category_id || ''}
            onChange={e => onUpdate(task.id, { category_id: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full text-sm px-3 py-2.5 min-h-[44px] rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-700 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">No category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-dark-border">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 min-h-[44px]"
          >
            <Trash2 className="w-4 h-4" />
            Delete task
          </button>
        </div>
      </div>
    </Modal>
  )
}
