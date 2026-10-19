import { format, parseISO } from 'date-fns'
import { Award, Flame, Plus, TrendingUp, Trophy, X } from 'lucide-react'
import { useState } from 'react'
import { StreakAnalytics, codingAnalyticsApi } from '../../api/client'
import Button from '../ui/Button'
import Input from '../ui/Input'

interface PracticeHeatmapProps {
  analytics: StreakAnalytics | null
  onActivityLogged: () => void
}

export default function PracticeHeatmap({ analytics, onActivityLogged }: PracticeHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number; platforms: string[] } | null>(null)
  const [showLogModal, setShowLogModal] = useState(false)
  const [logPlatform, setLogPlatform] = useState('manual')
  const [logDate, setLogDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [logCount, setLogCount] = useState('1')
  const [logNotes, setLogNotes] = useState('')
  const [loading, setLoading] = useState(false)

  if (!analytics) return null

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await codingAnalyticsApi.logActivity({
        platform: logPlatform,
        activity_date: logDate,
        problems_solved: parseInt(logCount) || 1,
        details: logNotes.trim() || undefined,
      })
      setShowLogModal(false)
      setLogNotes('')
      onActivityLogged()
    } finally {
      setLoading(false)
    }
  }

  // Group heatmap into columns of 7 days (weeks)
  const heatmap = analytics.heatmap || []
  const weeks: { date: string; count: number; platforms: string[] }[][] = []
  let currentWeek: { date: string; count: number; platforms: string[] }[] = []

  heatmap.forEach((day, index) => {
    currentWeek.push(day)
    if (currentWeek.length === 7 || index === heatmap.length - 1) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })

  const getColorClass = (count: number) => {
    if (count === 0) return 'fill-gray-100 dark:fill-dark-border'
    if (count <= 2) return 'fill-indigo-300 dark:fill-indigo-900'
    if (count <= 4) return 'fill-indigo-400 dark:fill-indigo-700'
    if (count <= 7) return 'fill-indigo-500 dark:fill-indigo-500'
    return 'fill-indigo-700 dark:fill-indigo-400'
  }

  return (
    <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-gray-50/70 dark:bg-dark-bg/60 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold mb-1">
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
            Current Streak
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-gray-900 dark:text-dark-text">{analytics.current_streak}</span>
            <span className="text-xs text-gray-400">days</span>
          </div>
        </div>

        <div className="p-3 bg-gray-50/70 dark:bg-dark-bg/60 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-1">
            <Trophy className="w-4 h-4 text-indigo-500" />
            Longest Streak
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-gray-900 dark:text-dark-text">{analytics.longest_streak}</span>
            <span className="text-xs text-gray-400">days</span>
          </div>
        </div>

        <div className="p-3 bg-gray-50/70 dark:bg-dark-bg/60 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            28d Consistency
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-gray-900 dark:text-dark-text">{analytics.weekly_consistency}%</span>
          </div>
        </div>

        <div className="p-3 bg-gray-50/70 dark:bg-dark-bg/60 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-semibold mb-1">
            <Award className="w-4 h-4 text-purple-500" />
            Total Solved
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-gray-900 dark:text-dark-text">{analytics.total_problems_solved}</span>
            <span className="text-xs text-gray-400">problems</span>
          </div>
        </div>
      </div>

      {/* Heatmap header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-text">Activity Heatmap</h3>
          <p className="text-xs text-gray-400 dark:text-dark-muted">Daily problem solving activity over the past 90 days</p>
        </div>

        <button
          onClick={() => setShowLogModal(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-dark-border text-gray-700 dark:text-dark-text hover:bg-gray-200 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Log Practice
        </button>
      </div>

      {/* SVG Heatmap */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[620px]">
          <svg className="w-full" viewBox="0 0 620 90" height="90">
            {weeks.map((week, wIdx) => (
              <g key={wIdx} transform={`translate(${wIdx * 14}, 0)`}>
                {week.map((day, dIdx) => (
                  <rect
                    key={day.date}
                    x={0}
                    y={dIdx * 12}
                    width={10}
                    height={10}
                    rx={2.5}
                    className={`${getColorClass(day.count)} transition-all hover:stroke-indigo-600 hover:stroke-1 cursor-pointer`}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    onClick={() => setHoveredDay(prev => prev?.date === day.date ? null : day)}
                  />
                ))}
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Pinned tooltips & legend - stays visible on screen regardless of horizontal scroll */}
      <div className="min-h-[24px] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-gray-400 dark:text-dark-muted pt-2 border-t border-gray-100 dark:border-dark-border">
        {hoveredDay ? (
          <span className="font-medium text-indigo-600 dark:text-indigo-400">
            {format(parseISO(hoveredDay.date), 'MMMM d, yyyy')}: {hoveredDay.count} problem{hoveredDay.count === 1 ? '' : 's'} solved
            {hoveredDay.platforms.length > 0 ? ` (${hoveredDay.platforms.join(', ')})` : ''}
          </span>
        ) : (
          <span>Hover or tap a block to view daily statistics</span>
        )}

        <div className="flex items-center gap-1.5 text-[10px] self-end sm:self-auto">
          <span>Less</span>
          <span className="w-2.5 h-2.5 rounded-sm bg-gray-100 dark:bg-dark-border" />
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-300 dark:bg-indigo-900" />
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-700 dark:bg-indigo-400" />
          <span>More</span>
        </div>
      </div>

      {/* Manual Activity Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLogModal(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-border p-4 sm:p-6 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-dark-text text-sm sm:text-base">Log Practice Activity</h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border text-gray-400"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLog} className="space-y-3.5">
              <Input
                label="Date"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                required
              />

              <Input
                label="Problems Solved"
                type="number"
                min="1"
                max="100"
                value={logCount}
                onChange={(e) => setLogCount(e.target.value)}
                required
              />

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Platform
                </label>
                <select
                  value={logPlatform}
                  onChange={(e) => setLogPlatform(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text"
                >
                  <option value="manual">Manual / Offline</option>
                  <option value="leetcode">LeetCode</option>
                  <option value="codeforces">Codeforces</option>
                  <option value="atcoder">AtCoder</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Notes / Problem Names
                </label>
                <input
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="e.g. Dynamic Programming, Two Sum"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-sm text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowLogModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={loading}>
                  Save Activity
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
