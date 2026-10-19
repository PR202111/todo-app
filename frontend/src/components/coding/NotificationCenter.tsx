import { formatDistanceToNow, parseISO } from 'date-fns'
import { motion } from 'framer-motion'
import { Bell, Check, CheckCheck, Clock, Trophy } from 'lucide-react'
import { InAppNotification } from '../../api/client'

interface NotificationCenterProps {
  notifications: InAppNotification[]
  onMarkRead: (id: number) => Promise<void>
  onMarkAllRead: () => Promise<void>
}

export default function NotificationCenter({
  notifications,
  onMarkRead,
  onMarkAllRead,
}: NotificationCenterProps) {
  const unreadCount = notifications.filter((n) => !n.is_read).length

  const getIcon = (type: string) => {
    switch (type) {
      case 'contest_reminder':
        return <Clock className="w-4 h-4 text-amber-500" />
      case 'goal_completed':
        return <Trophy className="w-4 h-4 text-emerald-500" />
      default:
        return <Bell className="w-4 h-4 text-indigo-500" />
    }
  }

  return (
    <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-text">In-App Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              {unreadCount} new
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-400 dark:text-dark-muted">
          No notifications at this time.
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              layout
              className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                notif.is_read
                  ? 'border-gray-100 dark:border-dark-border bg-gray-50/40 dark:bg-dark-bg/30 opacity-75'
                  : 'border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/20 dark:bg-indigo-950/20'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-white dark:bg-dark-card shadow-xs flex-shrink-0 mt-0.5">
                {getIcon(notif.notification_type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-gray-900 dark:text-dark-text truncate">
                    {notif.title}
                  </p>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">
                    {formatDistanceToNow(parseISO(notif.created_at))} ago
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-dark-muted mt-0.5 leading-relaxed break-words">
                  {notif.message}
                </p>
              </div>

              {!notif.is_read && (
                <button
                  onClick={() => onMarkRead(notif.id)}
                  className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-dark-card transition-colors shrink-0"
                  title="Mark as read"
                  aria-label="Mark notification as read"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
