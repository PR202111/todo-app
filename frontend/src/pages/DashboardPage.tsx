import { AnimatePresence, motion } from 'framer-motion'
import { isToday, parseISO, isFuture } from 'date-fns'
import { LayoutGrid, List, Menu, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import KanbanBoard from '../components/kanban/KanbanBoard'
import MobileNav from '../components/layout/MobileNav'
import Sidebar from '../components/layout/Sidebar'
import AddTaskInput from '../components/tasks/AddTaskInput'
import TaskDetailModal from '../components/tasks/TaskDetailModal'
import TaskList from '../components/tasks/TaskList'
import ThemeToggle from '../components/ui/ThemeToggle'
import { useCategories } from '../hooks/useCategories'
import { Task, useTasks } from '../hooks/useTasks'
import { useAuth } from '../context/AuthContext'

export default function DashboardPage() {
  const [selectedView, setSelectedView] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>()
  const [displayMode, setDisplayMode] = useState<'list' | 'kanban'>(() =>
    (localStorage.getItem('displayMode') as 'list' | 'kanban') || 'list'
  )
  const [search, setSearch] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>()
  const searchRef = useRef<HTMLInputElement>(null)

  const { tasks, loading, addTask, updateTask, deleteTask, reorderTasks } = useTasks(
    selectedView === 'completed' ? { completed: true }
    : selectedView === 'category' && selectedCategory ? { category_id: selectedCategory }
    : {}
  )
  const { categories } = useCategories()
  const { user } = useAuth()

  useEffect(() => {
    localStorage.setItem('displayMode', displayMode)
  }, [displayMode])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault()
        setMobileSearchOpen(true)
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const filteredTasks = useMemo(() => {
    let result = tasks
    if (selectedView === 'today') result = result.filter(t => t.due_date && isToday(parseISO(t.due_date)))
    if (selectedView === 'upcoming') result = result.filter(t => t.due_date && isFuture(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)))
    if (search) result = result.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    if (priorityFilter) result = result.filter(t => t.priority === priorityFilter)
    return result
  }, [tasks, selectedView, search, priorityFilter])

  const taskCounts = useMemo(() => ({
    all: tasks.filter(t => !t.completed).length,
    today: tasks.filter(t => t.due_date && isToday(parseISO(t.due_date))).length,
    upcoming: tasks.filter(t => t.due_date && isFuture(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))).length,
    completed: tasks.filter(t => t.completed).length,
  }), [tasks])

  const viewTitle = {
    all: 'All Tasks',
    today: 'Today',
    upcoming: 'Upcoming',
    completed: 'Completed',
    category: categories.find(c => c.id === selectedCategory)?.name || 'Category',
  }[selectedView] || 'Tasks'

  const handleToggle = (id: number, completed: boolean) => updateTask(id, { completed })
  const handleUpdate = (id: number, data: Partial<Task>) => updateTask(id, data)
  const handleDelete = (id: number) => deleteTask(id)

  const remainingCount = filteredTasks.filter(t => !t.completed).length

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-bg overflow-hidden">
      <Sidebar
        selectedView={selectedView}
        onViewChange={setSelectedView}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        taskCounts={taskCounts}
        mobileOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Unified Responsive Header */}
        <header className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Mobile Menu Trigger + Title */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="md:hidden p-2 -ml-1 text-gray-600 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-border rounded-xl transition-colors"
                aria-label="Open sidebar menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-dark-text truncate">
                    {viewTitle}
                  </h1>
                  <span className="text-xs bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                    {remainingCount}
                  </span>
                </div>
                <p className="hidden sm:block text-xs text-gray-400 dark:text-dark-muted mt-0.5">
                  {remainingCount} tasks remaining
                </p>
              </div>
            </div>

            {/* Right: Search, View Switcher & Theme */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Desktop Search Bar */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search... (/ or ⌘K)"
                  className="pl-9 pr-4 py-1.5 text-sm rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-800 dark:text-dark-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 transition-all focus:w-60"
                />
              </div>

              {/* Mobile Search Toggle */}
              <button
                onClick={() => setMobileSearchOpen(s => !s)}
                className={`md:hidden p-2 rounded-xl text-gray-500 dark:text-dark-muted hover:bg-gray-100 dark:hover:bg-dark-border transition-colors ${
                  mobileSearchOpen || search ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : ''
                }`}
                aria-label="Toggle search"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* View toggle (List vs Kanban) */}
              <div className="flex bg-gray-100 dark:bg-dark-border rounded-xl p-1 gap-0.5">
                <button
                  onClick={() => setDisplayMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${
                    displayMode === 'list'
                      ? 'bg-white dark:bg-dark-card shadow-xs text-indigo-600 font-semibold'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDisplayMode('kanban')}
                  className={`p-1.5 rounded-lg transition-all ${
                    displayMode === 'kanban'
                      ? 'bg-white dark:bg-dark-card shadow-xs text-indigo-600 font-semibold'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="Kanban board"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

              <ThemeToggle />
            </div>
          </div>

          {/* Expandable Mobile Search Bar */}
          <AnimatePresence>
            {mobileSearchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden pt-2.5 md:hidden"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search tasks..."
                    className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-800 dark:text-dark-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-8">
          {displayMode === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-2xl mx-auto"
            >
              {selectedView !== 'completed' && (
                <AddTaskInput onAdd={addTask} categories={categories} />
              )}

              {/* Priority filter chips */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1 flex-nowrap sm:flex-wrap items-center">
                {['all', 'urgent', 'high', 'medium', 'low'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPriorityFilter(p === 'all' ? undefined : p)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                      (p === 'all' && !priorityFilter) || priorityFilter === p
                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-semibold shadow-2xs'
                        : 'bg-gray-100 dark:bg-dark-border text-gray-500 dark:text-dark-muted hover:bg-gray-200'
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <TaskList
                  tasks={filteredTasks}
                  onToggle={handleToggle}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onEdit={setEditingTask}
                  onReorder={reorderTasks}
                />
              )}
            </motion.div>
          ) : (
            <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
              <KanbanBoard
                tasks={filteredTasks}
                categories={categories}
                onToggle={handleToggle}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onEdit={setEditingTask}
              />
            </motion.div>
          )}
        </div>
      </main>

      <MobileNav
        selectedView={selectedView}
        onViewChange={setSelectedView}
        onCategoryChange={setSelectedCategory}
        taskCounts={taskCounts}
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
        onOpenDrawer={() => setMobileDrawerOpen(true)}
      />

      <TaskDetailModal
        task={editingTask}
        categories={categories}
        onClose={() => setEditingTask(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  )
}
