const PRIORITY_CONFIG = {
  low:    { color: '#9ca3af', label: 'Low' },
  medium: { color: '#6366f1', label: 'Medium' },
  high:   { color: '#f97316', label: 'High' },
  urgent: { color: '#ef4444', label: 'Urgent' },
}

interface PriorityFlagProps {
  priority: string
  showLabel?: boolean
  onClick?: () => void
}

export default function PriorityFlag({ priority, showLabel = false, onClick }: PriorityFlagProps) {
  const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 group cursor-default"
      title={`Priority: ${config.label}`}
    >
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform group-hover:scale-125"
        style={{ backgroundColor: config.color }} />
      {showLabel && <span className="text-xs font-medium" style={{ color: config.color }}>{config.label}</span>}
    </button>
  )
}

export { PRIORITY_CONFIG }
