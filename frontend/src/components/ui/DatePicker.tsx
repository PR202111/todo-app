import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'

interface DatePickerProps {
  value?: string
  onChange: (date: string | undefined) => void
}

export default function DatePicker({ value, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = value ? new Date(value) : undefined

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-dark-muted hover:text-indigo-500 transition-colors px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-dark-border"
      >
        <CalendarIcon className="w-3.5 h-3.5" />
        {selected ? format(selected, 'MMM d') : 'Due date'}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-xl p-2">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={day => {
              onChange(day ? day.toISOString() : undefined)
              setOpen(false)
            }}
            footer={
              selected ? (
                <button className="text-xs text-red-400 hover:text-red-500 mt-1" onClick={() => { onChange(undefined); setOpen(false) }}>
                  Clear date
                </button>
              ) : null
            }
          />
        </div>
      )}
    </div>
  )
}
