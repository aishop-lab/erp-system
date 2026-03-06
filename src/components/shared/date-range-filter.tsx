'use client'

import * as React from 'react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface DateRangeValue {
  startDate: string | null
  endDate: string | null
}

interface DateRangeFilterProps {
  value: DateRangeValue
  onChange: (value: DateRangeValue) => void
  className?: string
}

const PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
  { label: 'All', days: 0 },
]

function formatDateRange(value: DateRangeValue): string {
  if (!value.startDate && !value.endDate) return 'All time'
  if (value.startDate && value.endDate) {
    return `${format(new Date(value.startDate), 'dd MMM yyyy')} - ${format(new Date(value.endDate), 'dd MMM yyyy')}`
  }
  if (value.startDate) return `From ${format(new Date(value.startDate), 'dd MMM yyyy')}`
  return `Until ${format(new Date(value.endDate!), 'dd MMM yyyy')}`
}

function getActivePreset(value: DateRangeValue): number | null {
  if (!value.startDate && !value.endDate) return 0
  if (!value.startDate || !value.endDate) return null

  const end = new Date(value.endDate)
  const start = new Date(value.startDate)
  const now = new Date()

  // Check if endDate is today (within a day)
  if (Math.abs(end.getTime() - endOfDay(now).getTime()) > 86400000) return null

  const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000)
  const match = PRESETS.find(p => p.days > 0 && Math.abs(diffDays - p.days) <= 1)
  return match ? match.days : null
}

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const [open, setOpen] = React.useState(false)
  const activePreset = getActivePreset(value)

  const handlePreset = (days: number) => {
    if (days === 0) {
      onChange({ startDate: null, endDate: null })
    } else {
      const end = endOfDay(new Date())
      const start = startOfDay(subDays(new Date(), days))
      onChange({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      })
    }
  }

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (!range) return
    if (range.from && range.to) {
      onChange({
        startDate: startOfDay(range.from).toISOString(),
        endDate: endOfDay(range.to).toISOString(),
      })
      setOpen(false)
    } else if (range.from) {
      // User selected first date, keep popover open for second
      onChange({
        startDate: startOfDay(range.from).toISOString(),
        endDate: null,
      })
    }
  }

  const calendarValue: DateRange | undefined = value.startDate
    ? {
        from: new Date(value.startDate),
        to: value.endDate ? new Date(value.endDate) : undefined,
      }
    : undefined

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {PRESETS.map(preset => (
        <Button
          key={preset.days}
          variant={activePreset === preset.days ? 'default' : 'outline'}
          size="sm"
          className="h-8 px-2.5 text-xs"
          onClick={() => handlePreset(preset.days)}
        >
          {preset.label}
        </Button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={activePreset === null ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-8 text-xs gap-1.5',
              activePreset === null ? 'px-2.5' : 'px-2'
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {activePreset === null ? (
              <span className="max-w-[180px] truncate">{formatDateRange(value)}</span>
            ) : (
              <span>Custom</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={calendarValue}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
            defaultMonth={value.startDate ? new Date(value.startDate) : subDays(new Date(), 30)}
            disabled={{ after: new Date() }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
