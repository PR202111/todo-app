import { Calendar, CheckSquare, Clock, Code2, Inbox, LayoutGrid, Menu } from 'lucide-react'

interface MobileNavProps {
  selectedView: string
  onViewChange: (view: string) => void
  onCategoryChange: (id: number | undefined) => void
  taskCounts: Record<string, number>
  displayMode: 'list' | 'kanban'
  onDisplayModeChange: (mode: 'list' | 'kanban') => void
  onOpenDrawer: () => void
}

export default function MobileNav({
  selectedView,
  onViewChange,
  onCategoryChange,
  taskCounts,
  displayMode,
  onDisplayModeChange,
  onOpenDrawer,
}: MobileNavProps) {
  const tabs = [
    {
      id: 'all',
      label: 'All',
      icon: Inbox,
      count: taskCounts.all,
      active: selectedView === 'all' && displayMode === 'list',
      onClick: () => {
        onViewChange('all')
        onCategoryChange(undefined)
        onDisplayModeChange('list')
      },
    },
    {
      id: 'today',
      label: 'Today',
      icon: Clock,
      count: taskCounts.today,
      active: selectedView === 'today' && displayMode === 'list',
      onClick: () => {
        onViewChange('today')
        onCategoryChange(undefined)
        onDisplayModeChange('list')
      },
    },
    {
      id: 'upcoming',
      label: 'Upcoming',
      icon: Calendar,
      count: taskCounts.upcoming,
      active: selectedView === 'upcoming' && displayMode === 'list',
      onClick: () => {
        onViewChange('upcoming')
        onCategoryChange(undefined)
        onDisplayModeChange('list')
      },
    },
    {
      id: 'kanban',
      label: 'Board',
      icon: LayoutGrid,
      count: 0,
      active: displayMode === 'kanban',
      onClick: () => {
        onDisplayModeChange('kanban')
      },
    },
    {
      id: 'coding',
      label: 'Coding',
      icon: Code2,
      count: 0,
      active: selectedView.startsWith('coding'),
      onClick: () => {
        onViewChange('coding-overview')
        onCategoryChange(undefined)
      },
    },
    {
      id: 'menu',
      label: 'Categories',
      icon: Menu,
      count: 0,
      active: selectedView === 'category',
      onClick: onOpenDrawer,
    },
  ]

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-dark-card/95 backdrop-blur-md border-t border-gray-200/80 dark:border-dark-border px-1 sm:px-2 pt-1.5 pb-safe shadow-lg"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={tab.onClick}
              aria-label={tab.label}
              aria-current={tab.active ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 px-0.5 sm:px-1 rounded-xl transition-all ${
                tab.active
                  ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-gray-500 dark:text-dark-muted hover:text-gray-800 dark:hover:text-dark-text'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${tab.active ? 'scale-110' : ''}`} />
                {tab.count > 0 && (
                  <span className="absolute -top-1 -right-1.5 bg-indigo-600 text-white text-[9px] font-bold px-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full leading-none">
                    {tab.count > 99 ? '99+' : tab.count}
                  </span>
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] mt-0.5 tracking-tight truncate max-w-full">
                {tab.label}
              </span>
              {tab.active && (
                <span className="absolute bottom-0.5 w-6 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
