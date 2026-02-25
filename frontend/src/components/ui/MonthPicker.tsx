import { useMonthStore } from '../../lib/stores'
import { formatMonth } from '../../lib/utils'
import dayjs from 'dayjs'

export function MonthPicker() {
  const { year, month, setMonth } = useMonthStore()

  const months = []
  const now = dayjs()
  for (let i = 0; i < 12; i++) {
    const date = now.subtract(i, 'month')
    months.push({ year: date.year(), month: date.month() + 1 })
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [y, m] = e.target.value.split('-').map(Number)
    setMonth(y, m)
  }

  return (
    <select
      value={`${year}-${month}`}
      onChange={handleChange}
      className="
        px-4 py-2 rounded-[16px]
        bg-surface border border-border
        text-text text-sm font-medium
        focus:outline-none focus:ring-2 focus:ring-accent/50
        cursor-pointer capitalize
      "
    >
      {months.map(({ year: y, month: m }) => (
        <option key={`${y}-${m}`} value={`${y}-${m}`}>
          {formatMonth(y, m)}
        </option>
      ))}
    </select>
  )
}