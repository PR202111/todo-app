import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Award, CheckCircle, Lock, ShieldCheck, Sparkles, Trophy } from 'lucide-react'
import { AchievementItem, achievementsApi } from '../../api/client'
import { format } from 'date-fns'

export default function AchievementsGrid() {
  const [achievements, setAchievements] = useState<AchievementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterUnlockedOnly, setFilterUnlockedOnly] = useState(false)

  const loadAchievements = async () => {
    try {
      setLoading(true)
      const res = await achievementsApi.getAll()
      setAchievements(res.data)
    } catch (e) {
      console.error('Failed to load achievements', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAchievements()
  }, [])

  const unlockedCount = achievements.filter((a) => a.is_unlocked).length
  const totalCount = achievements.length

  const filtered = achievements.filter((a) => {
    if (filterUnlockedOnly && !a.is_unlocked) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header with summary stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 flex-shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-dark-text">
              Milestones & Achievements
            </h2>
            <p className="text-xs text-gray-400 dark:text-dark-muted mt-0.5">
              Deterministic threshold-based badges earned through consistent practice and revision
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 min-h-[36px] bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-gray-800 dark:text-dark-text">
              {unlockedCount} / {totalCount} Badges
            </span>
          </div>

          <button
            onClick={() => setFilterUnlockedOnly((f) => !f)}
            className={`px-3 py-1.5 min-h-[36px] flex items-center justify-center rounded-xl text-xs font-semibold border transition-colors ${
              filterUnlockedOnly
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 text-amber-600 dark:text-amber-400'
                : 'border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-muted hover:bg-gray-50 dark:hover:bg-dark-border'
            }`}
          >
            {filterUnlockedOnly ? 'Showing Unlocked' : 'Show All'}
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-gray-200 dark:border-dark-border rounded-2xl bg-white/40 dark:bg-dark-card/40">
          <Award className="w-8 h-8 mx-auto text-gray-300 dark:text-dark-border mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-dark-text">No achievements to display</p>
          <p className="text-xs text-gray-400 dark:text-dark-muted mt-0.5">
            Keep solving problems and participating in contests to unlock milestones!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const isUnlocked = item.is_unlocked
            return (
              <motion.div
                key={item.key}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative rounded-2xl p-5 border transition-all ${
                  isUnlocked
                    ? 'bg-white dark:bg-dark-card border-amber-200/80 dark:border-amber-900/40 shadow-xs ring-1 ring-amber-100 dark:ring-transparent'
                    : 'bg-gray-50/60 dark:bg-dark-bg/40 border-gray-200/60 dark:border-dark-border opacity-70'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 shadow-xs ${
                      isUnlocked
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                        : 'bg-gray-200 dark:bg-dark-border text-gray-400'
                    }`}
                  >
                    {isUnlocked ? item.icon : <Lock className="w-5 h-5 text-gray-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3
                        className={`text-sm font-bold truncate ${
                          isUnlocked
                            ? 'text-gray-900 dark:text-dark-text'
                            : 'text-gray-500 dark:text-dark-muted'
                        }`}
                      >
                        {item.title}
                      </h3>
                      {isUnlocked && (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-gray-500 dark:text-dark-muted mt-1 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-dark-border flex items-center justify-between text-[11px]">
                      {isUnlocked ? (
                        <>
                          <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Unlocked
                          </span>
                          {item.unlocked_at && (
                            <span className="text-gray-400 dark:text-dark-muted">
                              {format(new Date(item.unlocked_at), 'MMM d, yyyy')}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400 dark:text-dark-muted flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      )}
                    </div>
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
