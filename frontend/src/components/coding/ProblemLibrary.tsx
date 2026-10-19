import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  BookMarked,
  Bookmark,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Edit2,
  ExternalLink,
  Filter,
  Lightbulb,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import { PracticePlan, Problem, problemsApi } from '../../api/client'
import Button from '../ui/Button'

interface ProblemLibraryProps {
  onProblemUpdated?: () => void
}

export default function ProblemLibrary({ onProblemUpdated }: ProblemLibraryProps) {
  const [problems, setProblems] = useState<Problem[]>([])
  const [practicePlan, setPracticePlan] = useState<PracticePlan | null>(null)
  const [showPlan, setShowPlan] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState('all')
  const [difficulty, setDifficulty] = useState('all')
  const [status, setStatus] = useState('all')
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false)
  const [dueOnly, setDueOnly] = useState(false)

  // Review modal state
  const [reviewProblem, setReviewProblem] = useState<Problem | null>(null)
  const [reviewRating, setReviewRating] = useState<1 | 2 | 3 | 4>(3)
  const [reviewNotes, setReviewNotes] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Add / Edit modal state
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formPlatform, setFormPlatform] = useState('leetcode')
  const [formTopic, setFormTopic] = useState('')
  const [formDifficulty, setFormDifficulty] = useState('Medium')
  const [formStatus, setFormStatus] = useState('solved')
  const [formNotes, setFormNotes] = useState('')
  const [formBookmarked, setFormBookmarked] = useState(false)
  const [formError, setFormError] = useState('')
  const [savingProblem, setSavingProblem] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [probRes, planRes] = await Promise.allSettled([
        problemsApi.getAll({
          search: search || undefined,
          platform: platform !== 'all' ? platform : undefined,
          difficulty: difficulty !== 'all' ? difficulty : undefined,
          solve_status: status !== 'all' ? status : undefined,
          is_bookmarked: bookmarkedOnly ? true : undefined,
          due_only: dueOnly ? true : undefined,
        }),
        problemsApi.getPracticePlan(),
      ])

      if (probRes.status === 'fulfilled') setProblems(probRes.value.data)
      if (planRes.status === 'fulfilled') setPracticePlan(planRes.value.data)
    } finally {
      setLoading(false)
    }
  }, [search, platform, difficulty, status, bookmarkedOnly, dueOnly])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (reviewProblem) setReviewProblem(null)
        if (addModalOpen) setAddModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [reviewProblem, addModalOpen])

  const handleToggleBookmark = async (problem: Problem) => {
    try {
      const updated = await problemsApi.update(problem.id, {
        is_bookmarked: !problem.is_bookmarked,
      })
      setProblems((prev) => prev.map((p) => (p.id === problem.id ? updated.data : p)))
    } catch (e) {
      console.error('Failed to toggle bookmark', e)
    }
  }

  const handleDeleteProblem = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this problem from your library?')) return
    try {
      await problemsApi.delete(id)
      setProblems((prev) => prev.filter((p) => p.id !== id))
      if (onProblemUpdated) onProblemUpdated()
    } catch (e) {
      console.error('Failed to delete problem', e)
    }
  }

  const openAddModal = () => {
    setEditingProblem(null)
    setFormTitle('')
    setFormUrl('')
    setFormPlatform('leetcode')
    setFormTopic('')
    setFormDifficulty('Medium')
    setFormStatus('solved')
    setFormNotes('')
    setFormBookmarked(false)
    setFormError('')
    setAddModalOpen(true)
  }

  const openEditModal = (p: Problem) => {
    setEditingProblem(p)
    setFormTitle(p.title)
    setFormUrl(p.url || '')
    setFormPlatform(p.platform)
    setFormTopic(p.topic || '')
    setFormDifficulty(p.difficulty)
    setFormStatus(p.solve_status)
    setFormNotes(p.notes || '')
    setFormBookmarked(p.is_bookmarked)
    setFormError('')
    setAddModalOpen(true)
  }

  const handleSaveProblem = async () => {
    if (!formTitle.trim()) {
      setFormError('Problem title is required')
      return
    }

    setSavingProblem(true)
    setFormError('')
    try {
      if (editingProblem) {
        await problemsApi.update(editingProblem.id, {
          title: formTitle.trim(),
          url: formUrl.trim() || undefined,
          platform: formPlatform,
          topic: formTopic.trim() || undefined,
          difficulty: formDifficulty,
          solve_status: formStatus,
          notes: formNotes.trim() || undefined,
          is_bookmarked: formBookmarked,
        })
      } else {
        await problemsApi.create({
          title: formTitle.trim(),
          url: formUrl.trim() || undefined,
          platform: formPlatform,
          topic: formTopic.trim() || undefined,
          difficulty: formDifficulty,
          solve_status: formStatus,
          notes: formNotes.trim() || undefined,
          is_bookmarked: formBookmarked,
        })
      }
      setAddModalOpen(false)
      fetchData()
      if (onProblemUpdated) onProblemUpdated()
    } catch (e: any) {
      setFormError(e.response?.data?.detail || 'Failed to save problem')
    } finally {
      setSavingProblem(false)
    }
  }

  const handleRecordReview = async () => {
    if (!reviewProblem) return
    setSubmittingReview(true)
    try {
      await problemsApi.recordReview(reviewProblem.id, {
        rating: reviewRating,
        notes: reviewNotes.trim() || undefined,
      })
      setReviewProblem(null)
      setReviewNotes('')
      fetchData()
      if (onProblemUpdated) onProblemUpdated()
    } catch (e) {
      console.error('Failed to submit review', e)
    } finally {
      setSubmittingReview(false)
    }
  }

  const dueReviewsCount = practicePlan?.due_reviews_count || 0

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Actions & Practice Plan Toggle */}
      <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-dark-text flex items-center gap-2">
              <span>Problem Library & Revision Queue</span>
              {dueReviewsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 animate-pulse">
                  {dueReviewsCount} Due for SM-2 Review
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-400 dark:text-dark-muted mt-0.5">
              Personal problem tracking with deterministic SuperMemo-2 spaced repetition intervals
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowPlan((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-indigo-200 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 hover:bg-indigo-100/50 transition-colors"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Practice Planner</span>
              {showPlan ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Track Problem</span>
            </button>
          </div>
        </div>

        {/* Deterministic Practice Plan Accordion */}
        <AnimatePresence>
          {showPlan && practicePlan && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-gray-100 dark:border-dark-border pt-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Weak Topics */}
                <div className="bg-gray-50 dark:bg-dark-bg p-3.5 rounded-xl border border-gray-200 dark:border-dark-border">
                  <span className="text-xs font-bold text-gray-700 dark:text-dark-text flex items-center gap-1.5 mb-2">
                    <Compass className="w-3.5 h-3.5 text-indigo-500" />
                    Target Weak Topics
                  </span>
                  {practicePlan.weak_topics.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-dark-muted">
                      No weak topics detected. Great balance!
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {practicePlan.weak_topics.slice(0, 3).map((wt) => (
                        <div
                          key={wt.topic}
                          className="flex items-center justify-between text-xs p-1.5 bg-white dark:bg-dark-card rounded-lg border border-gray-100 dark:border-dark-border"
                        >
                          <span className="font-medium text-gray-800 dark:text-dark-text">{wt.topic}</span>
                          <span className="text-[11px] text-red-500 font-bold">{wt.solve_rate}% rate</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Spaced Repetition Due Queue */}
                <div className="bg-gray-50 dark:bg-dark-bg p-3.5 rounded-xl border border-gray-200 dark:border-dark-border">
                  <span className="text-xs font-bold text-gray-700 dark:text-dark-text flex items-center gap-1.5 mb-2">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                    Revision Backlog
                  </span>
                  <div className="flex items-center justify-between bg-white dark:bg-dark-card p-2.5 rounded-lg border border-gray-100 dark:border-dark-border">
                    <div>
                      <div className="text-lg font-bold text-gray-900 dark:text-dark-text">
                        {practicePlan.due_reviews_count}
                      </div>
                      <div className="text-[11px] text-gray-400 dark:text-dark-muted">
                        problems ready for review
                      </div>
                    </div>
                    {practicePlan.due_reviews_count > 0 && (
                      <button
                        onClick={() => setDueOnly(true)}
                        className="px-2.5 py-1 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                      >
                        Filter Due
                      </button>
                    )}
                  </div>
                </div>

                {/* Explicit Rules Applied */}
                <div className="bg-gray-50 dark:bg-dark-bg p-3.5 rounded-xl border border-gray-200 dark:border-dark-border">
                  <span className="text-xs font-bold text-gray-700 dark:text-dark-text flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    Deterministic Planner Rules
                  </span>
                  <ul className="text-[11px] text-gray-500 dark:text-dark-muted space-y-1">
                    {practicePlan.rules_applied.map((rule, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Filters Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 pt-2 border-t border-gray-100 dark:border-dark-border">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, topic, or notes..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-800 dark:text-dark-text placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar max-w-full">
            {/* Platform Filter */}
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text min-h-[36px]"
            >
              <option value="all">All Platforms</option>
              <option value="leetcode">LeetCode</option>
              <option value="codeforces">Codeforces</option>
              <option value="manual">Manual</option>
            </select>

            {/* Difficulty Filter */}
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text min-h-[36px]"
            >
              <option value="all">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text min-h-[36px]"
            >
              <option value="all">All Statuses</option>
              <option value="solved">Solved</option>
              <option value="attempted">Attempted</option>
              <option value="unsolved">Unsolved</option>
            </select>

            {/* Starred Only Toggle */}
            <button
              onClick={() => setBookmarkedOnly((prev) => !prev)}
              className={`p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border text-xs transition-colors shrink-0 ${
                bookmarkedOnly
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 text-amber-500'
                  : 'border-gray-200 dark:border-dark-border text-gray-400 hover:text-gray-600'
              }`}
              title="Starred Problems"
              aria-label={bookmarkedOnly ? "Showing starred problems" : "Filter by starred problems"}
            >
              <Bookmark className={`w-3.5 h-3.5 ${bookmarkedOnly ? 'fill-current' : ''}`} />
            </button>

            {/* Due for Review Toggle */}
            <button
              onClick={() => setDueOnly((prev) => !prev)}
              className={`px-3 py-1.5 min-h-[36px] rounded-xl border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors shrink-0 ${
                dueOnly
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 text-amber-600'
                  : 'border-gray-200 dark:border-dark-border text-gray-500 hover:bg-gray-50'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Due Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* Problems List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : problems.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-gray-200 dark:border-dark-border rounded-2xl bg-white/40 dark:bg-dark-card/40">
          <BookMarked className="w-8 h-8 mx-auto text-gray-300 dark:text-dark-border mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-dark-text">No problems match your filters</p>
          <p className="text-xs text-gray-400 dark:text-dark-muted mt-0.5">
            Track problems you practice or import solved problems from your profiles!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {problems.map((problem) => {
            const isDue = problem.next_review_at && new Date(problem.next_review_at) <= new Date()
            const diffColor =
              problem.difficulty === 'Easy'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : problem.difficulty === 'Medium'
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'

            return (
              <motion.div
                key={problem.id}
                layout
                className={`bg-white dark:bg-dark-card border rounded-2xl p-4 transition-all shadow-xs ${
                  problem.is_bookmarked
                    ? 'border-indigo-200 dark:border-indigo-900/40 ring-1 ring-indigo-100 dark:ring-transparent'
                    : 'border-gray-100 dark:border-dark-border hover:border-gray-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Star Button */}
                    <button
                      onClick={() => handleToggleBookmark(problem)}
                      className={`mt-0.5 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center text-gray-300 hover:text-amber-500 transition-colors shrink-0 ${
                        problem.is_bookmarked ? 'text-amber-500' : ''
                      }`}
                      aria-label={problem.is_bookmarked ? "Remove bookmark" : "Bookmark problem"}
                    >
                      <Bookmark className={`w-4 h-4 ${problem.is_bookmarked ? 'fill-current' : ''}`} />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900 dark:text-dark-text break-words">
                          {problem.title}
                        </span>

                        {problem.url && (
                          <a
                            href={problem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-indigo-600 transition-colors shrink-0 p-0.5"
                            aria-label={`Open link for ${problem.title}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {/* Difficulty Pill */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${diffColor}`}>
                          {problem.difficulty}
                        </span>

                        {/* Platform Badge */}
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-dark-muted uppercase">
                          {problem.platform}
                        </span>

                        {/* Solve Status */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            problem.solve_status === 'solved'
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
                              : problem.solve_status === 'attempted'
                              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                              : 'bg-gray-100 dark:bg-dark-border text-gray-500'
                          }`}
                        >
                          {problem.solve_status}
                        </span>
                      </div>

                      {/* Topic & Metadata */}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-dark-muted flex-wrap">
                        {problem.topic && (
                          <span className="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400">
                            <Tag className="w-3 h-3" />
                            {problem.topic}
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <RotateCcw className="w-3 h-3 text-gray-400" />
                          Reviews: {problem.review_count} (Interval: {problem.review_interval_days}d)
                        </span>

                        {problem.next_review_at && (
                          <span
                            className={`flex items-center gap-1 font-medium ${
                              isDue ? 'text-amber-600 dark:text-amber-400 font-bold' : ''
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            Next Review:{' '}
                            {isDue
                              ? 'Due Now!'
                              : formatDistanceToNow(new Date(problem.next_review_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>

                      {/* Notes Preview */}
                      {problem.notes && (
                        <p className="text-xs text-gray-400 dark:text-dark-muted mt-1 italic line-clamp-1 break-words">
                          "{problem.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-dark-border">
                    {/* Log Review Button */}
                    <button
                      onClick={() => setReviewProblem(problem)}
                      className={`flex items-center gap-1 px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-semibold border transition-colors ${
                        isDue
                          ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
                          : 'border-gray-200 dark:border-dark-border text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-border'
                      }`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Review</span>
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEditModal(problem)}
                      className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
                      title="Edit Problem"
                      aria-label={`Edit ${problem.title}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteProblem(problem.id)}
                      className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete Problem"
                      aria-label={`Delete ${problem.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* SM-2 Spaced Repetition Review Modal */}
      {reviewProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl shadow-xl max-w-md w-full p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-border pb-3">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-dark-text text-sm">
                  Log Spaced Repetition Review
                </h3>
                <p className="text-xs text-gray-400 dark:text-dark-muted truncate max-w-xs">
                  {reviewProblem.title}
                </p>
              </div>
              <button
                onClick={() => setReviewProblem(null)}
                className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-dark-text transition-colors"
                aria-label="Close review modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-dark-text block mb-2">
                How smoothly did you solve or recall this problem?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { rating: 1, label: '1 - Again', desc: 'Complete blank / reset', color: 'border-red-300 text-red-600' },
                  { rating: 2, label: '2 - Hard', desc: 'Struggled with nuances', color: 'border-amber-300 text-amber-600' },
                  { rating: 3, label: '3 - Good', desc: 'Solved with normal effort', color: 'border-blue-300 text-blue-600' },
                  { rating: 4, label: '4 - Easy', desc: 'Instant pattern mastery', color: 'border-emerald-300 text-emerald-600' },
                ].map((opt) => (
                  <button
                    key={opt.rating}
                    type="button"
                    onClick={() => setReviewRating(opt.rating as any)}
                    className={`p-3 min-h-[44px] rounded-xl border text-left transition-all ${
                      reviewRating === opt.rating
                        ? `bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800`
                        : 'border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border'
                    }`}
                  >
                    <div className="font-bold text-xs">{opt.label}</div>
                    <div className="text-[10px] text-gray-400 dark:text-dark-muted mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-dark-text block mb-1">
                Review Notes (Optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Key pattern, edge case reminder, or complexity gotcha..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-800 dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-dark-border">
              <button
                type="button"
                onClick={() => setReviewProblem(null)}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordReview}
                disabled={submittingReview}
                className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs disabled:opacity-50 transition-colors"
              >
                {submittingReview ? 'Recording...' : 'Submit SM-2 Rating'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add / Edit Problem Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl shadow-xl max-w-lg w-full p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-border pb-3">
              <h3 className="font-bold text-gray-900 dark:text-dark-text text-sm">
                {editingProblem ? 'Edit Problem' : 'Track New Problem'}
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-dark-text transition-colors"
                aria-label="Close problem modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-dark-text block mb-1">
                  Title *
                </label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. 200. Number of Islands"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-800 dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-dark-text block mb-1">
                    Platform
                  </label>
                  <select
                    value={formPlatform}
                    onChange={(e) => setFormPlatform(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-800 dark:text-dark-text"
                  >
                    <option value="leetcode">LeetCode</option>
                    <option value="codeforces">Codeforces</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-dark-text block mb-1">
                    Difficulty
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-800 dark:text-dark-text"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-dark-text block mb-1">
                    Topic / Category
                  </label>
                  <input
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    placeholder="e.g. Dynamic Programming, Graphs"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-800 dark:text-dark-text"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-dark-text block mb-1">
                    Solve Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-800 dark:text-dark-text"
                  >
                    <option value="solved">Solved</option>
                    <option value="attempted">Attempted</option>
                    <option value="unsolved">Unsolved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-dark-text block mb-1">
                  Problem URL (Optional)
                </label>
                <input
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://leetcode.com/problems/number-of-islands/"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-800 dark:text-dark-text"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-dark-text block mb-1">
                  Notes / Technique
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="BFS queue vs DFS recursion, visited set optimization..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-800 dark:text-dark-text"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="bmk"
                  checked={formBookmarked}
                  onChange={(e) => setFormBookmarked(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="bmk" className="text-xs text-gray-700 dark:text-dark-text font-medium cursor-pointer">
                  Star this problem (add to bookmarks)
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-dark-border">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProblem}
                disabled={savingProblem}
                className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs disabled:opacity-50 transition-colors"
              >
                {savingProblem ? 'Saving...' : editingProblem ? 'Update Problem' : 'Track Problem'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
