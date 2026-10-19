import { motion } from 'framer-motion'
import { CheckCircle, ExternalLink, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { CodingProfile, codingProfilesApi } from '../../api/client'
import Button from '../ui/Button'
import Input from '../ui/Input'

interface ProfileCardProps {
  profiles: CodingProfile[]
  onRefreshProfile: (id: number) => Promise<void>
  onUnlinkProfile: (id: number) => Promise<void>
  onProfileLinked: () => void
}

export default function ProfileCard({
  profiles,
  onRefreshProfile,
  onUnlinkProfile,
  onProfileLinked,
}: ProfileCardProps) {
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [platform, setPlatform] = useState<'codeforces' | 'leetcode'>('codeforces')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshingId, setRefreshingId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return
    setLoading(true)
    setError('')
    try {
      await codingProfilesApi.link({ platform, username: username.trim() })
      setShowLinkModal(false)
      setUsername('')
      onProfileLinked()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Failed to link profile. Please verify handle.')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async (id: number) => {
    setRefreshingId(id)
    try {
      await onRefreshProfile(id)
    } finally {
      setRefreshingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-dark-text">Coding Profiles</h2>
          <p className="text-xs text-gray-400 dark:text-dark-muted">
            Track Codeforces and LeetCode ratings & solved statistics
          </p>
        </div>
        <button
          onClick={() => setShowLinkModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Link Profile
        </button>
      </div>

      {profiles.length === 0 ? (
        <div className="p-8 border border-dashed border-gray-200 dark:border-dark-border rounded-2xl text-center bg-white/50 dark:bg-dark-card/50">
          <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
            <Plus className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-dark-text">No profiles linked yet</p>
          <p className="text-xs text-gray-400 dark:text-dark-muted mt-1 max-w-sm mx-auto">
            Connect your Codeforces handle and LeetCode username to sync problem counts, contest ratings, and track streaks.
          </p>
          <button
            onClick={() => setShowLinkModal(true)}
            className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Connect First Profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profiles.map((p) => {
            const isCF = p.platform === 'codeforces'
            const isRefreshing = refreshingId === p.id

            return (
              <motion.div
                key={p.id}
                layout
                className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden"
              >
                {/* Platform badge banner */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 ${
                        isCF ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-gradient-to-br from-amber-500 to-orange-600'
                      }`}
                    >
                      {isCF ? 'CF' : 'LC'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-bold text-gray-900 dark:text-dark-text truncate">{p.username}</span>
                        <a
                          href={p.profile_url || (isCF ? `https://codeforces.com/profile/${p.username}` : `https://leetcode.com/${p.username}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-indigo-600 transition-colors shrink-0 p-1"
                          title="Open official profile"
                          aria-label={`Open ${p.platform} profile for ${p.username}`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-dark-muted capitalize truncate">
                        {p.platform} {p.rank_name ? `• ${p.rank_name}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => handleRefresh(p.id)}
                      disabled={isRefreshing}
                      className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
                      title="Sync profile data"
                      aria-label={`Sync ${p.platform} profile`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
                    </button>
                    <button
                      onClick={() => onUnlinkProfile(p.id)}
                      className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                      title="Unlink profile"
                      aria-label={`Unlink ${p.platform} profile`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Rating & Stats */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mt-4 pt-3 border-t border-gray-100 dark:border-dark-border">
                  <div className="bg-gray-50/70 dark:bg-dark-bg/60 rounded-xl p-2.5">
                    <p className="text-[11px] font-medium text-gray-400 dark:text-dark-muted uppercase tracking-wider">
                      Rating
                    </p>
                    <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-dark-text">
                        {p.rating != null ? p.rating : 'Unrated'}
                      </span>
                      {p.max_rating != null && (
                        <span className="text-[10px] sm:text-[11px] text-gray-400">max {p.max_rating}</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50/70 dark:bg-dark-bg/60 rounded-xl p-2.5">
                    <p className="text-[11px] font-medium text-gray-400 dark:text-dark-muted uppercase tracking-wider">
                      Solved
                    </p>
                    <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400">
                        {p.problems_solved}
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-gray-400">problems</span>
                    </div>
                  </div>
                </div>

                {/* Difficulty breakdown for LeetCode */}
                {!isCF && p.problems_solved > 0 && (
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-3 pt-2 text-[11px] flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-medium">
                      Easy: {p.easy_solved}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-medium">
                      Med: {p.medium_solved}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium">
                      Hard: {p.hard_solved}
                    </span>
                  </div>
                )}

                {/* Last synced timestamp */}
                {p.last_refreshed_at && (
                  <p className="text-[10px] text-gray-400 dark:text-dark-muted mt-2 text-right">
                    Synced {new Date(p.last_refreshed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Link Profile Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowLinkModal(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Link Coding Handle"
            className="relative w-full max-w-sm bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-border p-4 sm:p-6 z-10 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-dark-text text-sm sm:text-base">Link Coding Handle</h3>
              <button
                onClick={() => setShowLinkModal(false)}
                aria-label="Close modal"
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border text-gray-400 min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLink} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Platform
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPlatform('codeforces')}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border text-center min-h-[40px] transition-all ${
                      platform === 'codeforces'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                        : 'border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border text-gray-600 dark:text-dark-muted'
                    }`}
                  >
                    Codeforces
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlatform('leetcode')}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border text-center min-h-[40px] transition-all ${
                      platform === 'leetcode'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                        : 'border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border text-gray-600 dark:text-dark-muted'
                    }`}
                  >
                    LeetCode
                  </button>
                </div>
              </div>

              <Input
                label="Handle / Username"
                placeholder={platform === 'codeforces' ? 'e.g. tourist' : 'e.g. neetcode'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />

              {error && (
                <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2.5 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowLinkModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={loading}>
                  Verify & Connect
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
