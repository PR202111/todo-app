import { useState } from 'react'
import { TrendingUp } from 'lucide-react'

interface RatingPoint {
  platform: string
  date: string
  rating: number
  contest_name?: string
  rank?: number
}

interface RatingChartProps {
  data: RatingPoint[]
}

export default function RatingChart({ data }: RatingChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<RatingPoint | null>(null)

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-6 text-center shadow-sm">
        <TrendingUp className="w-8 h-8 mx-auto text-gray-300 dark:text-dark-border mb-2" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text">No Rating History Yet</h3>
        <p className="text-xs text-gray-400 dark:text-dark-muted mt-1 max-w-sm mx-auto">
          Participate in Codeforces rounds or LeetCode weekly contests to see your rating progression over time.
        </p>
      </div>
    )
  }

  // Filter or separate by platform if needed
  const cfPoints = data.filter((d) => d.platform === 'codeforces')
  const lcPoints = data.filter((d) => d.platform === 'leetcode')

  // Calculate scales
  const allRatings = data.map((d) => d.rating).filter(Boolean)
  const minRating = Math.max(0, Math.min(...allRatings) - 100)
  const maxRating = Math.max(...allRatings) + 100
  const ratingRange = maxRating - minRating || 1

  const width = 600
  const height = 180
  const paddingX = 40
  const paddingY = 25
  const chartWidth = width - paddingX * 2
  const chartHeight = height - paddingY * 2

  const getPointsString = (points: RatingPoint[]) => {
    if (points.length === 0) return ''
    if (points.length === 1) {
      const y = height - paddingY - ((points[0].rating - minRating) / ratingRange) * chartHeight
      return `${paddingX},${y} ${width - paddingX},${y}`
    }
    return points
      .map((p, i) => {
        const x = paddingX + (i / (points.length - 1)) * chartWidth
        const y = height - paddingY - ((p.rating - minRating) / ratingRange) * chartHeight
        return `${x},${y}`
      })
      .join(' ')
  }

  return (
    <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-text">Contest Rating Progress</h3>
          <p className="text-xs text-gray-400 dark:text-dark-muted">Historical performance from official contests</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          {cfPoints.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-gray-600 dark:text-dark-muted font-medium">Codeforces</span>
            </div>
          )}
          {lcPoints.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-gray-600 dark:text-dark-muted font-medium">LeetCode</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative overflow-x-auto pb-1">
        <div className="min-w-[420px] sm:min-w-full">
          <svg className="w-full" viewBox={`0 0 ${width} ${height}`}>
            {/* Horizontal gridlines */}
            {[0, 0.33, 0.66, 1].map((ratio, i) => {
              const y = height - paddingY - ratio * chartHeight
              const val = Math.round(minRating + ratio * ratingRange)
              return (
                <g key={i}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={width - paddingX}
                    y2={y}
                    className="stroke-gray-100 dark:stroke-dark-border stroke-1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] fill-gray-400 dark:fill-dark-muted"
                  >
                    {val}
                  </text>
                </g>
              )
            })}

            {/* Codeforces line */}
            {cfPoints.length > 0 && (
              <>
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={getPointsString(cfPoints)}
                />
                {cfPoints.map((p, i) => {
                  const x = paddingX + (cfPoints.length === 1 ? chartWidth / 2 : (i / (cfPoints.length - 1)) * chartWidth)
                  const y = height - paddingY - ((p.rating - minRating) / ratingRange) * chartHeight
                  return (
                    <circle
                      key={`cf-${i}`}
                      cx={x}
                      cy={y}
                      r={hoveredPoint === p ? 6 : 4}
                      className="fill-blue-500 stroke-white dark:stroke-dark-card stroke-2 cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredPoint(p)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      onClick={() => setHoveredPoint(prev => prev === p ? null : p)}
                    />
                  )
                })}
              </>
            )}

            {/* LeetCode line */}
            {lcPoints.length > 0 && (
              <>
                <polyline
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={getPointsString(lcPoints)}
                />
                {lcPoints.map((p, i) => {
                  const x = paddingX + (lcPoints.length === 1 ? chartWidth / 2 : (i / (lcPoints.length - 1)) * chartWidth)
                  const y = height - paddingY - ((p.rating - minRating) / ratingRange) * chartHeight
                  return (
                    <circle
                      key={`lc-${i}`}
                      cx={x}
                      cy={y}
                      r={hoveredPoint === p ? 6 : 4}
                      className="fill-amber-500 stroke-white dark:stroke-dark-card stroke-2 cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredPoint(p)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      onClick={() => setHoveredPoint(prev => prev === p ? null : p)}
                    />
                  )
                })}
              </>
            )}
          </svg>
        </div>
      </div>

      {/* Pinned hover detail tooltip */}
      <div className="min-h-[28px] text-xs flex items-center justify-center font-medium text-gray-700 dark:text-dark-text pt-1">
        {hoveredPoint ? (
          <span className="bg-gray-100 dark:bg-dark-border px-3 py-1 rounded-full text-xs text-center break-words max-w-full">
            <strong className="capitalize">{hoveredPoint.platform}</strong>: {hoveredPoint.rating} rating
            {hoveredPoint.contest_name ? ` • ${hoveredPoint.contest_name}` : ''}
            {hoveredPoint.rank ? ` (Rank #${hoveredPoint.rank})` : ''} • {hoveredPoint.date}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-dark-muted text-[11px]">Hover or tap nodes to inspect contest rank & date</span>
        )}
      </div>
    </div>
  )
}
