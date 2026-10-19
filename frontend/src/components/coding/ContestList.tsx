import { format, formatDistanceToNow, isPast } from 'date-fns'
import { motion } from 'framer-motion'
import { Bookmark, Calendar, Check, CheckSquare, Clock, ExternalLink, Filter, ListChecks, Plus } from 'lucide-react'
import { useState } from 'react'
import { Contest } from '../../api/client'
import Button from '../ui/Button'

interface ContestListProps {
  contests: Contest[]
  onToggleInterest: (contestId: number, isInterested: boolean) => Promise<void>
  onCreatePrepTask: (contestId: number) => Promise<void>
  onOpenPrepWorkspace?: (contest: Contest) => void
  loading?: boolean
}

export default function ContestList({
  contests,
  onToggleInterest,
  onCreatePrepTask,
  onOpenPrepWorkspace,
  loading = false,
}: ContestListProps) {
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [filterInterested, setFilterInterested] = useState(false)
  const [creatingTaskId, setCreatingTaskId] = useState<number | null>(null)

  const handleCreateTask = async (id: number) => {
    setCreatingTaskId(id)
    try {
      await onCreatePrepTask(id)
    } finally {
      setCreatingTaskId(null)
    }
  }

  const filtered = contests.filter((c) => {
    if (filterPlatform !== 'all' && c.platform !== filterPlatform) return false
    if (filterInterested && !c.is_interested) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-dark-text">Upcoming Contests</h2>
          <p className="text-xs text-gray-400 dark:text-dark-muted">
            Unified schedule from Codeforces & LeetCode with countdowns and prep tasks
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Platform Pills */}
          <div className="flex bg-gray-100 dark:bg-dark-border rounded-xl p-1 gap-1 overflow-x-auto no-scrollbar max-w-full">
            {['all', 'codeforces', 'leetcode'].map((plat) => (
              <button
                key={plat}
                onClick={() => setFilterPlatform(plat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize whitespace-nowrap min-h-[32px] ${
                  filterPlatform === plat
                    ? 'bg-white dark:bg-dark-card text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold'
                    : 'text-gray-500 dark:text-dark-muted hover:text-gray-800'
                }`}
              >
                {plat === 'all' ? 'All Platforms' : plat}
              </button>
            ))}
          </div>

          {/* Interested filter toggle */}
          <button
            onClick={() => setFilterInterested((f) => !f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border min-h-[36px] transition-colors ${
              filterInterested
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 text-amber-600 dark:text-amber-400 font-semibold'
                : 'border-gray-200 dark:border-dark-border text-gray-500 hover:bg-gray-50 dark:hover:bg-dark-border'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${filterInterested ? 'fill-current' : ''}`} />
            Starred
          </button>
        </div>
      </div>

      {/* Contests Grid/List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-gray-200 dark:border-dark-border rounded-2xl bg-white/40 dark:bg-dark-card/40">
          <Calendar className="w-8 h-8 mx-auto text-gray-300 dark:text-dark-border mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-dark-text">No contests found</p>
          <p className="text-xs text-gray-400 dark:text-dark-muted mt-0.5">
            {filterInterested ? 'You have not starred any upcoming contests yet.' : 'Check back later for new rounds!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((contest) => {
            const startDate = new Date(contest.start_time)
            const isCF = contest.platform === 'codeforces'
            const durationHours = Math.round((contest.duration_seconds / 3600) * 10) / 10
            const isOngoing = contest.phase === 'CODING'
            const hasTask = !!contest.preparation_task_id

            return (
              <motion.div
                key={contest.id}
                layout
                className={`bg-white dark:bg-dark-card border rounded-2xl p-4 transition-all shadow-sm ${
                  contest.is_interested
                    ? 'border-indigo-200 dark:border-indigo-900/50 ring-1 ring-indigo-100 dark:ring-transparent'
                    : 'border-gray-100 dark:border-dark-border hover:border-gray-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Platform Tag */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white flex-shrink-0 mt-0.5 ${
                        isCF ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-gradient-to-br from-amber-500 to-orange-600'
                      }`}
                    >
                      {isCF ? 'CF' : 'LC'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900 dark:text-dark-text break-words">
                          {contest.name}
                        </span>
                        {isOngoing ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 animate-pulse">
                            LIVE NOW
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-dark-muted">
                            in {formatDistanceToNow(startDate)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-dark-muted flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {format(startDate, 'EEE, MMM d, yyyy • h:mm a')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {durationHours} hrs
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end pt-2.5 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-dark-border">
                    {/* Star toggle */}
                    <button
                      onClick={() => onToggleInterest(contest.id, !contest.is_interested)}
                      className={`p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border transition-colors ${
                        contest.is_interested
                          ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-500'
                          : 'border-gray-200 dark:border-dark-border text-gray-400 hover:text-gray-600 dark:hover:text-dark-text'
                      }`}
                      title={contest.is_interested ? 'Remove from starred' : 'Star contest'}
                      aria-label={contest.is_interested ? 'Remove star' : 'Star contest'}
                    >
                      <Bookmark className={`w-4 h-4 ${contest.is_interested ? 'fill-current' : ''}`} />
                    </button>

                    {/* Prep Task Button */}
                    <button
                      onClick={() => handleCreateTask(contest.id)}
                      disabled={hasTask || creatingTaskId === contest.id}
                      className={`flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-xl text-xs font-semibold border transition-all ${
                        hasTask
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 text-emerald-600 dark:text-emerald-400 cursor-default'
                          : 'border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border text-gray-700 dark:text-dark-text'
                      }`}
                    >
                      {hasTask ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Task Linked</span>
                        </>
                      ) : creatingTaskId === contest.id ? (
                        <>
                          <span className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Prep Task</span>
                        </>
                      )}
                    </button>

                    {/* Open Prep Workspace Modal */}
                    {onOpenPrepWorkspace && (
                      <button
                        onClick={() => onOpenPrepWorkspace(contest)}
                        className="flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-xl text-xs font-semibold border border-indigo-200 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-900/10 hover:bg-indigo-100/50 transition-colors"
                        title="Open interactive contest prep checklist & notes"
                      >
                        <ListChecks className="w-3.5 h-3.5" />
                        <span>Workspace</span>
                      </button>
                    )}

                    {/* Open Contest URL */}
                    <a
                      href={contest.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                    >
                      <span>Register</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
