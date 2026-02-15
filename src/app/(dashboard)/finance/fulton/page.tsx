import { PageHeader } from '@/components/shared/page-header'
import { EntityPaymentList } from '@/components/finance/entity-payment-list'

export default function FultonPaymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Fulton Payments"
        description="Payments routed through Fulton entity"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Fulton' },
        ]}
      />
      <EntityPaymentList entityName="Fulton" />
    </div>
  )
}
