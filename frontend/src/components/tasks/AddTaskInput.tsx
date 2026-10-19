import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import DatePicker from '../ui/DatePicker'
import { PRIORITY_CONFIG } from '../ui/PriorityFlag'
import { Category } from '../../hooks/useCategories'
import { Task } from '../../hooks/useTasks'

interface AddTaskInputProps {
  onAdd: (task: { title: string; priority: Task['priority']; due_date?: string; category_id?: number }) => Promise<unknown>
  categories: Category[]
}

export default function AddTaskInput({ onAdd, categories }: AddTaskInputProps) {
  const [focused, setFocused] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('medium')
  const [dueDate, setDueDate] = useState<string | undefined>()
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.key === 'n' || e.key === 'N') && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const submit = async () => {
    if (!title.trim()) return
    setLoading(true)
    try {
      await onAdd({ title: title.trim(), priority, due_date: dueDate, category_id: categoryId })
      setTitle('')
      setPriority('medium')
      setDueDate(undefined)
      setCategoryId(undefined)
      setFocused(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-4">
      <div className={`bg-white dark:bg-dark-card rounded-xl border transition-all ${
        focused
          ? 'border-indigo-400 shadow-md shadow-indigo-100 dark:shadow-none'
          : 'border-gray-200 dark:border-dark-border'
      }`}>
        <div className="flex items-center gap-3 px-4 py-3">
          <Plus className={`w-5 h-5 flex-shrink-0 transition-colors ${focused ? 'text-indigo-500' : 'text-gray-400'}`} />
          <input
            ref={inputRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={e => {
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') { setFocused(false); inputRef.current?.blur() }
            }}
            placeholder="Add a task... (press N)"
            className="flex-1 bg-transparent text-sm text-gray-800 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-muted focus:outline-none"
          />
        </div>

        <AnimatePresence>
          {focused && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 sm:px-4 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100 dark:border-dark-border pt-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Priority */}
                  <div className="flex items-center gap-1 bg-gray-50 dark:bg-dark-bg p-0.5 rounded-lg border border-gray-100 dark:border-dark-border">
                    {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => setPriority(key as Task['priority'])}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
                          priority === key
                            ? 'bg-white dark:bg-dark-card shadow-xs font-semibold'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ color: cfg.color }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                        <span className="hidden xs:inline">{cfg.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Due date */}
                  <DatePicker value={dueDate} onChange={setDueDate} />

                  {/* Category */}
                  {categories.length > 0 && (
                    <select
                      value={categoryId || ''}
                      onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text"
                    >
                      <option value="">No category</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Submit / Cancel buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-dark-border">
                  <button
                    onClick={() => setFocused(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    disabled={!title.trim() || loading}
                    className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium shadow-xs"
                  >
                    {loading ? 'Adding...' : 'Add task'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
