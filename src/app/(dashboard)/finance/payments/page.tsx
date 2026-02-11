import { PageHeader } from '@/components/shared/page-header'
import { PaymentList } from '@/components/finance/payment-list'

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Manage supplier payments"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Payments' },
        ]}
      />

      <PaymentList />
    </div>
  )
}
