import { Badge, type BadgeProps } from '@/components/ui/badge'
import type { StatusMap } from '@/types'

interface StatusBadgeProps {
  status: string
  statusMap: StatusMap
}

export function StatusBadge({ status, statusMap }: StatusBadgeProps) {
  const config = statusMap[status]

  if (!config) {
    return <Badge variant="outline">{status}</Badge>
  }

  return <Badge variant={config.variant as BadgeProps['variant']}>{config.label}</Badge>
}
