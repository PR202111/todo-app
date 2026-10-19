import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Award,
  Bell,
  BookMarked,
  Code2,
  Download,
  FileSpreadsheet,
  FileText,
  Flame,
  Plus,
  RefreshCw,
  Target,
  Trophy,
} from 'lucide-react'
import {
  CodingGoal,
  CodingProfile,
  Contest,
  InAppNotification,
  ProgressReport,
  StreakAnalytics,
  codingAnalyticsApi,
  codingGoalsApi,
  codingProfilesApi,
  contestsApi,
  exportsApi,
  notificationsApi,
  progressReportsApi,
} from '../../api/client'
import AchievementsGrid from './AchievementsGrid'
import ContestList from './ContestList'
import ContestPrepModal from './ContestPrepModal'
import GoalManager from './GoalManager'
import NotificationCenter from './NotificationCenter'
import PracticeHeatmap from './PracticeHeatmap'
import ProblemLibrary from './ProblemLibrary'
import ProfileCard from './ProfileCard'
import RatingChart from './RatingChart'
import ReportModal from './ReportModal'

interface CodingDashboardProps {
  initialSubTab?: string
  onTaskCreated?: () => void
}

export default function CodingDashboard({
  initialSubTab = 'overview',
  onTaskCreated,
}: CodingDashboardProps) {
  const [subTab, setSubTab] = useState<
    'overview' | 'contests' | 'problems' | 'streaks' | 'goals' | 'achievements'
  >('overview')
  const [profiles, setProfiles] = useState<CodingProfile[]>([])
  const [contests, setContests] = useState<Contest[]>([])
  const [goals, setGoals] = useState<CodingGoal[]>([])
  const [analytics, setAnalytics] = useState<StreakAnalytics | null>(null)
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [reports, setReports] = useState<ProgressReport[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshingAll, setRefreshingAll] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [activePrepContest, setActivePrepContest] = useState<Contest | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [pRes, cRes, gRes, aRes, nRes, rRes] = await Promise.allSettled([
        codingProfilesApi.getAll(),
        contestsApi.getAll(),
        codingGoalsApi.getAll(),
        codingAnalyticsApi.get(),
        notificationsApi.getAll(),
        progressReportsApi.getAll(),
      ])

      if (pRes.status === 'fulfilled') setProfiles(pRes.value.data)
      if (cRes.status === 'fulfilled') setContests(cRes.value.data)
      if (gRes.status === 'fulfilled') setGoals(gRes.value.data)
      if (aRes.status === 'fulfilled') setAnalytics(aRes.value.data)
      if (nRes.status === 'fulfilled') setNotifications(nRes.value.data)
      if (rRes.status === 'fulfilled') setReports(rRes.value.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (
      initialSubTab &&
      ['overview', 'contests', 'problems', 'streaks', 'goals', 'achievements'].includes(
        initialSubTab
      )
    ) {
      setSubTab(initialSubTab as any)
    }
  }, [initialSubTab])

  const handleRefreshProfile = async (id: number) => {
    await codingProfilesApi.refresh(id)
    fetchData()
  }

  const handleUnlinkProfile = async (id: number) => {
    await codingProfilesApi.unlink(id)
    fetchData()
  }

  const handleToggleInterest = async (contestId: number, isInterested: boolean) => {
    await contestsApi.setPreference(contestId, isInterested)
    setContests((prev) =>
      prev.map((c) => (c.id === contestId ? { ...c, is_interested: isInterested } : c))
    )
  }

  const handleCreatePrepTask = async (contestId: number) => {
    const res = await contestsApi.createPrepareTask(contestId)
    setContests((prev) =>
      prev.map((c) =>
        c.id === contestId
          ? { ...c, is_interested: true, preparation_task_id: res.data.id }
          : c
      )
    )
    if (onTaskCreated) onTaskCreated()
    notificationsApi.getAll().then((r) => setNotifications(r.data))
  }

  const handleMarkNotificationRead = async (id: number) => {
    await notificationsApi.markRead(id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
  }

  const handleMarkAllNotificationsRead = async () => {
    await notificationsApi.markAllRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const handleSyncAll = async () => {
    setRefreshingAll(true)
    try {
      for (const p of profiles) {
        await codingProfilesApi.refresh(p.id)
      }
      await fetchData()
    } finally {
      setRefreshingAll(false)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Command Hub', icon: Code2 },
    {
      id: 'contests',
      label: 'Contests',
      icon: Trophy,
      count: contests.filter((c) => c.phase === 'BEFORE').length,
    },
    { id: 'problems', label: 'Problem Library', icon: BookMarked },
    {
      id: 'streaks',
      label: 'Streaks & Charts',
      icon: Flame,
      badge: analytics ? `${analytics.current_streak}d` : undefined,
    },
    {
      id: 'goals',
      label: 'Goals',
      icon: Target,
      count: goals.filter((g) => !g.is_completed).length,
    },
    { id: 'achievements', label: 'Achievements', icon: Award },
  ]

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-gray-400 dark:text-dark-muted">
          Loading Coding Command Center...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner with Subtabs & Global Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-2.5 sm:p-3 shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1.5 lg:pb-0 no-scrollbar overscroll-x-contain">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = subTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id as any)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap min-h-[36px] transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-dark-muted hover:bg-gray-100 dark:hover:bg-dark-border'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      active
                        ? 'bg-indigo-700 text-white'
                        : 'bg-gray-200 dark:bg-dark-border text-gray-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      active
                        ? 'bg-indigo-700 text-white'
                        : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Global Action Buttons */}
        <div className="w-full lg:w-auto grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-1.5 sm:gap-2 pt-2.5 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-dark-border">
          {/* Reports */}
          <button
            onClick={() => setReportModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border text-gray-700 dark:text-dark-text min-h-[36px] transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
            <span>Reports</span>
          </button>

          {/* Export JSON */}
          <a
            href={exportsApi.getJsonExportUrl()}
            download
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border text-gray-700 dark:text-dark-text min-h-[36px] transition-colors"
            title="Export full personal dataset as JSON"
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span>JSON</span>
          </a>

          {/* Export CSV */}
          <a
            href={exportsApi.getProblemsCsvUrl()}
            download
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border text-gray-700 dark:text-dark-text min-h-[36px] transition-colors"
            title="Download personal problem library as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>CSV</span>
          </a>

          {profiles.length > 0 && (
            <button
              onClick={handleSyncAll}
              disabled={refreshingAll}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-gray-100 dark:bg-dark-border hover:bg-gray-200 text-gray-700 dark:text-dark-text min-h-[36px] transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshingAll ? 'animate-spin text-indigo-600' : ''}`}
              />
              <span>{refreshingAll ? 'Syncing...' : 'Sync All'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Views */}
      {subTab === 'overview' && (
        <motion.div
          key="overview"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Linked profiles */}
          <ProfileCard
            profiles={profiles}
            onRefreshProfile={handleRefreshProfile}
            onUnlinkProfile={handleUnlinkProfile}
            onProfileLinked={fetchData}
          />

          {/* Activity Heatmap & Streaks */}
          <PracticeHeatmap analytics={analytics} onActivityLogged={fetchData} />

          {/* Contests Quick Overview */}
          <ContestList
            contests={contests.slice(0, 5)}
            onToggleInterest={handleToggleInterest}
            onCreatePrepTask={handleCreatePrepTask}
            onOpenPrepWorkspace={(c) => setActivePrepContest(c)}
          />

          {/* Goals & Notifications Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GoalManager goals={goals} onGoalUpdated={fetchData} />
            <NotificationCenter
              notifications={notifications}
              onMarkRead={handleMarkNotificationRead}
              onMarkAllRead={handleMarkAllNotificationsRead}
            />
          </div>
        </motion.div>
      )}

      {subTab === 'contests' && (
        <motion.div
          key="contests"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ContestList
            contests={contests}
            onToggleInterest={handleToggleInterest}
            onCreatePrepTask={handleCreatePrepTask}
            onOpenPrepWorkspace={(c) => setActivePrepContest(c)}
          />
        </motion.div>
      )}

      {subTab === 'problems' && (
        <motion.div
          key="problems"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ProblemLibrary onProblemUpdated={fetchData} />
        </motion.div>
      )}

      {subTab === 'streaks' && (
        <motion.div
          key="streaks"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <PracticeHeatmap analytics={analytics} onActivityLogged={fetchData} />
          <RatingChart data={analytics?.rating_history || []} />
        </motion.div>
      )}

      {subTab === 'goals' && (
        <motion.div
          key="goals"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <GoalManager goals={goals} onGoalUpdated={fetchData} />
          <RatingChart data={analytics?.rating_history || []} />
        </motion.div>
      )}

      {subTab === 'achievements' && (
        <motion.div
          key="achievements"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AchievementsGrid />
        </motion.div>
      )}

      {/* Progress Report Modal */}
      <ReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        reports={reports}
        onReportGenerated={fetchData}
      />

      {/* Contest Preparation Workspace Modal */}
      <ContestPrepModal
        contest={activePrepContest}
        onClose={() => setActivePrepContest(null)}
        onTaskCreated={() => {
          if (onTaskCreated) onTaskCreated()
          fetchData()
        }}
      />
    </div>
  )
}
