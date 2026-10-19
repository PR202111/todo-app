interface BadgeProps {
  color?: string
  label: string
  dot?: boolean
}

export default function Badge({ color = '#6366f1', label, dot = true }: BadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}22`, color }}>
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />}
      {label}
    </span>
  )
}
