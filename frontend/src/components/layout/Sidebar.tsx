import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, CheckCircle2, CheckSquare, Clock, Code2, Flame, Inbox, LogOut, Plus, Target, Trash2, Trophy, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useCategories } from '../../hooks/useCategories'
import ThemeToggle from '../ui/ThemeToggle'

interface SidebarProps {
  selectedView: string
  onViewChange: (view: string) => void
  selectedCategory: number | undefined
  onCategoryChange: (id: number | undefined) => void
  taskCounts: Record<string, number>
  mobileOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({
  selectedView,
  onViewChange,
  selectedCategory,
  onCategoryChange,
  taskCounts,
  mobileOpen = false,
  onClose,
}: SidebarProps) {
  const { user, logout } = useAuth()
  const { categories, addCategory, deleteCategory } = useCategories()
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#6366f1')

  const navItems = [
    { id: 'all', label: 'All Tasks', icon: Inbox, count: taskCounts.all },
    { id: 'today', label: 'Today', icon: Clock, count: taskCounts.today },
    { id: 'upcoming', label: 'Upcoming', icon: Calendar, count: taskCounts.upcoming },
    { id: 'completed', label: 'Completed', icon: CheckCircle2, count: taskCounts.completed },
  ]

  const codingNavItems = [
    { id: 'coding-overview', label: 'Coding Hub', icon: Code2 },
    { id: 'coding-contests', label: 'Contests', icon: Trophy },
    { id: 'coding-streaks', label: 'Streaks & Charts', icon: Flame },
    { id: 'coding-goals', label: 'Goals', icon: Target },
  ]

  const colors = ['#6366f1', '#ec4899', '#f97316', '#22c55e', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6']

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    await addCategory({ name: newCatName.trim(), color: newCatColor })
    setNewCatName('')
    setAddingCategory(false)
  }

  const handleNavClick = (id: string) => {
    onViewChange(id)
    onCategoryChange(undefined)
    if (onClose) onClose()
  }

  const handleCategoryClick = (id: number) => {
    onCategoryChange(id)
    onViewChange('category')
    if (onClose) onClose()
  }

  const initials = user?.username.slice(0, 2).toUpperCase() || 'TF'

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-dark-card">
      {/* Logo & Close on mobile */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-dark-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <CheckSquare className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-dark-text">TodoFlow</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User */}
      <div className="flex items-center gap-3 px-5 py-3.5 bg-gray-50/50 dark:bg-dark-bg/40">
        <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-dark-text truncate">{user?.username}</p>
          <p className="text-xs text-gray-400 dark:text-dark-muted truncate">{user?.email}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 pt-3 space-y-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              selectedView === item.id && !selectedCategory
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-gray-600 dark:text-dark-muted hover:bg-gray-50 dark:hover:bg-dark-border'
            }`}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.count > 0 && (
              <span className="text-xs bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-dark-muted px-2 py-0.5 rounded-full font-medium">
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Coding Hub */}
      <div className="mt-4 px-3">
        <div className="px-3 py-1 mb-1">
          <span className="text-[11px] font-bold text-gray-400 dark:text-dark-muted uppercase tracking-wider">Coding Command</span>
        </div>
        <div className="space-y-0.5">
          {codingNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                selectedView === item.id && !selectedCategory
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-gray-600 dark:text-dark-muted hover:bg-gray-50 dark:hover:bg-dark-border'
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="mt-4 px-3 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-1 mb-1">
          <span className="text-xs font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider">Categories</span>
          <button
            onClick={() => setAddingCategory(a => !a)}
            className="p-1 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border text-gray-400 hover:text-indigo-600 transition-colors"
            title="Add category"
            aria-label="Add new category"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence>
          {addingCategory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-2"
            >
              <div className="p-3 bg-gray-50 dark:bg-dark-bg rounded-xl border border-gray-100 dark:border-dark-border space-y-2.5">
                <input
                  autoFocus
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') setAddingCategory(false) }}
                  placeholder="Category name..."
                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-800 dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex gap-2 flex-wrap">
                  {colors.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewCatColor(c)}
                      className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                        newCatColor === c ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button onClick={() => setAddingCategory(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">Cancel</button>
                  <button onClick={handleAddCategory} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 font-medium">Add</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-0.5">
          {categories.map(cat => (
            <div
              key={cat.id}
              className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-indigo-50 dark:bg-indigo-900/30'
                  : 'hover:bg-gray-50 dark:hover:bg-dark-border'
              }`}
              onClick={() => handleCategoryClick(cat.id)}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
              <span className={`text-sm flex-1 truncate ${
                selectedCategory === cat.id ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-600 dark:text-dark-muted'
              }`}>{cat.name}</span>
              <button
                onClick={e => { e.stopPropagation(); deleteCategory(cat.id) }}
                className="opacity-70 md:opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:text-red-500 text-gray-400 transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
                title="Delete category"
                aria-label={`Delete category ${cat.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-dark-muted px-3 py-2 italic">No categories yet</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-dark-border flex items-center justify-between">
        <ThemeToggle />
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen border-r border-gray-100 dark:border-dark-border flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile slide-out drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation drawer"
              className="relative w-[85vw] max-w-xs h-full shadow-2xl z-10"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
