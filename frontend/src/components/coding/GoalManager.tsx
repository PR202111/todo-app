import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Plus, Target, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { CodingGoal, codingGoalsApi } from '../../api/client'
import Button from '../ui/Button'
import Input from '../ui/Input'

interface GoalManagerProps {
  goals: CodingGoal[]
  onGoalUpdated: () => void
}

export default function GoalManager({ goals, onGoalUpdated }: GoalManagerProps) {
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [goalType, setGoalType] = useState<CodingGoal['goal_type']>('daily_problems')
  const [targetValue, setTargetValue] = useState('5')
  const [platform, setPlatform] = useState('all')
  const [loading, setLoading] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      await codingGoalsApi.create({
        title: title.trim(),
        goal_type: goalType,
        target_value: parseFloat(targetValue) || 1,
        platform,
      })
      setShowModal(false)
      setTitle('')
      onGoalUpdated()
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    await codingGoalsApi.delete(id)
    onGoalUpdated()
  }

  const handleToggleComplete = async (goal: CodingGoal) => {
    await codingGoalsApi.update(goal.id, { is_completed: !goal.is_completed })
    onGoalUpdated()
  }

  const getGoalTypeLabel = (type: string) => {
    switch (type) {
      case 'daily_problems':
        return 'Daily Problems'
      case 'weekly_problems':
        return 'Weekly Problems'
      case 'weekly_days':
        return 'Active Days / Week'
      case 'target_rating':
        return 'Target Rating'
      case 'contest_prep':
        return 'Contest Prep'
      default:
        return type
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-dark-text">Coding Goals</h2>
          <p className="text-xs text-gray-400 dark:text-dark-muted">
            Personal targets for daily consistency, weekly volume, and rating milestones
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Goal
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="p-8 border border-dashed border-gray-200 dark:border-dark-border rounded-2xl text-center bg-white/40 dark:bg-dark-card/40">
          <Target className="w-8 h-8 mx-auto text-gray-300 dark:text-dark-border mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-dark-text">No active goals</p>
          <p className="text-xs text-gray-400 dark:text-dark-muted mt-1 max-w-sm mx-auto">
            Set daily or weekly targets to stay consistent and level up your competitive programming skills.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-3 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {goals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.current_value / (goal.target_value || 1)) * 100))

            return (
              <motion.div
                key={goal.id}
                layout
                className={`bg-white dark:bg-dark-card border rounded-2xl p-4 shadow-sm relative transition-all ${
                  goal.is_completed
                    ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20'
                    : 'border-gray-100 dark:border-dark-border'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => handleToggleComplete(goal)}
                      className={`mt-0.5 transition-colors ${
                        goal.is_completed
                          ? 'text-emerald-500'
                          : 'text-gray-300 dark:text-dark-border hover:text-indigo-500'
                      }`}
                    >
                      {goal.is_completed ? (
                        <CheckCircle2 className="w-5 h-5 fill-emerald-100 dark:fill-emerald-950" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div>
                      <h4
                        className={`text-sm font-semibold text-gray-900 dark:text-dark-text ${
                          goal.is_completed ? 'line-through opacity-70' : ''
                        }`}
                      >
                        {goal.title}
                      </h4>
                      <p className="text-xs text-gray-400 dark:text-dark-muted mt-0.5">
                        {getGoalTypeLabel(goal.goal_type)} • Target: {goal.target_value}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 transition-colors"
                    title="Delete goal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-600 dark:text-dark-muted">
                      Progress: {goal.current_value} / {goal.target_value}
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-dark-border h-2 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5 }}
                      className={`h-full rounded-full ${
                        goal.is_completed
                          ? 'bg-emerald-500'
                          : 'bg-indigo-600 dark:bg-indigo-500'
                      }`}
                    />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Create Goal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-border p-4 sm:p-6 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-dark-text text-sm sm:text-base">Set New Coding Goal</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border text-gray-400"
                aria-label="Close goal modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <Input
                label="Goal Title"
                placeholder="e.g. Solve 3 LeetCode problems daily"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                required
              />

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Goal Type
                </label>
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value as CodingGoal['goal_type'])}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text"
                >
                  <option value="daily_problems">Daily Problems Solved</option>
                  <option value="weekly_problems">Weekly Problems Solved</option>
                  <option value="weekly_days">Weekly Active Days</option>
                  <option value="target_rating">Target Rating Milestone</option>
                </select>
              </div>

              <Input
                label="Target Number"
                type="number"
                step="any"
                min="1"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                required
              />

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={loading}>
                  Set Goal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
