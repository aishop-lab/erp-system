import { PageHeader } from '@/components/shared/page-header'
import { EntityPaymentList } from '@/components/finance/entity-payment-list'

export default function SNAPaymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="SNA Payments"
        description="Payments routed through SNA entity"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'SNA' },
        ]}
      />
      <EntityPaymentList entityName="SNA" />
    </div>
  )
}
