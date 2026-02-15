import { PageHeader } from '@/components/shared/page-header'
import { EntityPaymentList } from '@/components/finance/entity-payment-list'

export default function MSEPaymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="MSE Payments"
        description="Payments routed through MSE entity"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'MSE' },
        ]}
      />
      <EntityPaymentList entityName="MSE" />
    </div>
  )
}
