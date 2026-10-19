import { format, parseISO } from 'date-fns'
import { Award, Calendar, CheckCircle2, FileText, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { ProgressReport, progressReportsApi } from '../../api/client'
import Button from '../ui/Button'

interface ReportModalProps {
  open: boolean
  onClose: () => void
  reports: ProgressReport[]
  onReportGenerated: () => void
}

export default function ReportModal({
  open,
  onClose,
  reports,
  onReportGenerated,
}: ReportModalProps) {
  const [reportType, setReportType] = useState<'daily' | 'weekly'>('weekly')
  const [loading, setLoading] = useState(false)
  const [activeReport, setActiveReport] = useState<ProgressReport | null>(() => reports[0] || null)

  if (!open) return null

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await progressReportsApi.generate(reportType)
      setActiveReport(res.data)
      onReportGenerated()
    } finally {
      setLoading(false)
    }
  }

  const selectedReport = activeReport || reports[0]
  let summaryData: any = null
  if (selectedReport?.summary_json) {
    try {
      summaryData = JSON.parse(selectedReport.summary_json)
    } catch {
      summaryData = null
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-border p-5 sm:p-6 z-10 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-dark-border">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-gray-900 dark:text-dark-text">Progress & Performance Report</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border text-gray-400"
            aria-label="Close report modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Generate Bar */}
        <div className="flex items-center justify-between gap-3 py-3 border-b border-gray-100 dark:border-dark-border flex-wrap">
          <div className="flex bg-gray-100 dark:bg-dark-border rounded-xl p-1 gap-1">
            <button
              onClick={() => setReportType('daily')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors capitalize ${
                reportType === 'daily'
                  ? 'bg-white dark:bg-dark-card text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Today's Report
            </button>
            <button
              onClick={() => setReportType('weekly')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors capitalize ${
                reportType === 'weekly'
                  ? 'bg-white dark:bg-dark-card text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Weekly Report (7 Days)
            </button>
          </div>

          <Button size="sm" onClick={handleGenerate} loading={loading}>
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Generate New Report
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {summaryData ? (
            <div className="space-y-4">
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-3.5 sm:p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {summaryData.period} Summary
                  </span>
                  <span className="text-xs text-gray-400">
                    {summaryData.date_range}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3 pt-3 border-t border-indigo-100/60 dark:border-indigo-900/30">
                  <div>
                    <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-dark-muted leading-tight">Problems Solved</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-dark-text mt-0.5">
                      {summaryData.total_problems_solved}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-dark-muted leading-tight">Active Days</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-dark-text mt-0.5">
                      {summaryData.active_days}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-dark-muted leading-tight">Contests</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-dark-text mt-0.5">
                      {summaryData.contests_attended}
                    </p>
                  </div>
                </div>
              </div>

              {/* Goals */}
              {summaryData.completed_goals?.length > 0 && (
                <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl p-3.5">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Achieved Goals
                  </p>
                  <ul className="space-y-1 text-xs text-gray-700 dark:text-dark-text">
                    {summaryData.completed_goals.map((g: string, i: number) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 dark:text-dark-muted text-xs">
              No report generated yet. Click "Generate New Report" above to compile your performance summary!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
