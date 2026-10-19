import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, CheckCircle2, CheckSquare, Clock, ExternalLink, ListChecks, Plus, Save, Trash2, X } from 'lucide-react'
import { Contest, ContestPrepPlan, prepPlansApi, contestsApi } from '../../api/client'
import Button from '../ui/Button'

interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

interface ContestPrepModalProps {
  contest: Contest | null
  onClose: () => void
  onTaskCreated?: () => void
}

export default function ContestPrepModal({ contest, onClose, onTaskCreated }: ContestPrepModalProps) {
  const [plan, setPlan] = useState<ContestPrepPlan | null>(null)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [newChecklistText, setNewChecklistText] = useState('')
  const [virtualNotes, setVirtualNotes] = useState('')
  const [reflection, setReflection] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [creatingTask, setCreatingTask] = useState(false)
  const [hasTask, setHasTask] = useState(false)

  const loadPrepPlan = useCallback(async (contestId: number) => {
    setLoading(true)
    try {
      const res = await prepPlansApi.get(contestId)
      setPlan(res.data)
      setVirtualNotes(res.data.virtual_practice_notes || '')
      setReflection(res.data.post_contest_reflection || '')
      if (res.data.checklist_json) {
        try {
          const items = JSON.parse(res.data.checklist_json)
          setChecklist(Array.isArray(items) ? items : [])
        } catch {
          setChecklist([])
        }
      }
    } catch (e) {
      console.error('Failed to load contest prep plan', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && contest) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [contest, onClose])

  if (!contest) return null

  const calculateCompletion = (items: ChecklistItem[]) => {
    if (items.length === 0) return 0
    const completed = items.filter((i) => i.completed).length
    return Math.round((completed / items.length) * 100)
  }

  const handleToggleChecklist = (id: string) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    )
    setChecklist(updated)
    autoSave(updated, virtualNotes, reflection)
  }

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return
    const newItem: ChecklistItem = {
      id: `custom_${Date.now()}`,
      text: newChecklistText.trim(),
      completed: false,
    }
    const updated = [...checklist, newItem]
    setChecklist(updated)
    setNewChecklistText('')
    autoSave(updated, virtualNotes, reflection)
  }

  const handleDeleteChecklistItem = (id: string) => {
    const updated = checklist.filter((item) => item.id !== id)
    setChecklist(updated)
    autoSave(updated, virtualNotes, reflection)
  }

  const autoSave = async (
    currentChecklist: ChecklistItem[],
    notes: string,
    refl: string
  ) => {
    setSaving(true)
    try {
      const percentage = calculateCompletion(currentChecklist)
      const res = await prepPlansApi.update(contest.id, {
        checklist_json: JSON.stringify(currentChecklist),
        virtual_practice_notes: notes,
        post_contest_reflection: refl,
        completion_percentage: percentage,
      })
      setPlan(res.data)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2000)
    } catch (e) {
      console.error('Failed to save prep plan', e)
    } finally {
      setSaving(false)
    }
  }

  const handleCreatePrepTask = async () => {
    setCreatingTask(true)
    try {
      await contestsApi.createPrepareTask(contest.id)
      setHasTask(true)
      if (onTaskCreated) onTaskCreated()
    } catch (e) {
      console.error('Failed to create prep task', e)
    } finally {
      setCreatingTask(false)
    }
  }

  const completionPct = calculateCompletion(checklist)
  const isCF = contest.platform === 'codeforces'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        role="dialog"
        aria-modal="true"
        aria-label="Contest Preparation Workspace"
        className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl shadow-2xl max-w-2xl w-full my-auto sm:my-8 flex flex-col max-h-[94vh] sm:max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-gray-100 dark:border-dark-border">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                isCF ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-gradient-to-br from-amber-500 to-orange-600'
              }`}
            >
              {isCF ? 'CF' : 'LC'}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-gray-900 dark:text-dark-text text-sm sm:text-base leading-tight truncate">
                {contest.name}
              </h3>
              <p className="text-xs text-gray-400 dark:text-dark-muted mt-0.5 truncate">
                Contest Preparation Workspace & Spaced Checklists
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close workspace"
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-border transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Readiness Progress Meter */}
              <div className="bg-gray-50 dark:bg-dark-bg p-3.5 sm:p-4 rounded-xl border border-gray-100 dark:border-dark-border">
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="flex items-center gap-1.5 text-gray-700 dark:text-dark-text">
                    <ListChecks className="w-4 h-4 text-indigo-500" />
                    Readiness Score
                  </span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">{completionPct}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-dark-border h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-3 text-xs">
                  <a
                    href={contest.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    <span>Official Contest Registration</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    onClick={handleCreatePrepTask}
                    disabled={hasTask || creatingTask}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border min-h-[36px] transition-colors ${
                      hasTask
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 text-emerald-600'
                        : 'border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-border'
                    }`}
                  >
                    {hasTask ? (
                      <>
                        <Check className="w-3 h-3" />
                        TodoFlow Task Active
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3 h-3 text-indigo-500" />
                        {creatingTask ? 'Linking...' : 'Add to TodoFlow Tasks'}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Interactive Checklist */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 dark:text-dark-muted uppercase tracking-wider mb-2">
                  Preparation & Upsolving Checklist
                </h4>
                <div className="space-y-2">
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-gray-100 dark:border-dark-border hover:border-gray-200 bg-white dark:bg-dark-card transition-all"
                    >
                      <button
                        onClick={() => handleToggleChecklist(item.id)}
                        className="flex items-center gap-2.5 text-left flex-1 min-w-0 group py-1"
                      >
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            item.completed
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-gray-300 dark:border-dark-border group-hover:border-indigo-400'
                          }`}
                        >
                          {item.completed && <Check className="w-3 h-3" />}
                        </div>
                        <span
                          className={`text-xs break-words min-w-0 ${
                            item.completed
                              ? 'line-through text-gray-400 dark:text-dark-muted'
                              : 'text-gray-800 dark:text-dark-text font-medium'
                          }`}
                        >
                          {item.text}
                        </span>
                      </button>

                      {item.id.startsWith('custom_') && (
                        <button
                          onClick={() => handleDeleteChecklistItem(item.id)}
                          className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                          title="Delete checklist item"
                          aria-label="Delete checklist item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Custom Item */}
                <div className="flex gap-2 mt-3">
                  <input
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddChecklistItem()
                    }}
                    placeholder="Add custom prep task (e.g., practice SegTree templates)..."
                    className="flex-1 text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-800 dark:text-dark-text placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleAddChecklistItem}
                    disabled={!newChecklistText.trim()}
                    className="px-3 py-2 min-h-[36px] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Virtual Practice & Notes */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 dark:text-dark-muted uppercase tracking-wider mb-1.5">
                  Virtual Simulation & Strategy Notes
                </h4>
                <textarea
                  value={virtualNotes}
                  onChange={(e) => setVirtualNotes(e.target.value)}
                  placeholder="Record edge cases, time complexity targets, templates tested during warm-up..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-800 dark:text-dark-text placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>

              {/* Post-Contest Reflection & Upsolve */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 dark:text-dark-muted uppercase tracking-wider mb-1.5">
                  Post-Contest Reflection & Upsolve Log
                </h4>
                <textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="What went wrong? (e.g. TLE on Problem C, missed corner case on D). Notes on upsolved solutions..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-800 dark:text-dark-text placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-4 border-t border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/50">
          <div className="text-xs text-gray-400 dark:text-dark-muted text-center sm:text-left">
            {savedSuccess ? (
              <span className="text-emerald-500 inline-flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" /> Saved successfully
              </span>
            ) : saving ? (
              <span>Saving changes...</span>
            ) : (
              <span>Deterministic persistence enabled</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 min-h-[38px] text-xs font-semibold text-gray-600 dark:text-dark-muted hover:bg-gray-100 dark:hover:bg-dark-border rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => autoSave(checklist, virtualNotes, reflection)}
              disabled={saving}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 min-h-[38px] text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Workspace</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
