import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { FileCheck, CreditCard, BarChart3, FileText, ArrowRight } from 'lucide-react'

const modules = [
  {
    title: 'Reconciliation',
    description: 'PO, GRN & invoice matching',
    detail: 'Three-way match & submit for payment',
    href: '/finance/reconciliation',
    icon: FileCheck,
    color: 'bg-blue-50 text-blue-600',
    border: 'border-l-blue-500',
    active: true,
  },
  {
    title: 'Payments',
    description: 'Supplier payments',
    detail: 'Approve & execute payments',
    href: '/finance/payments',
    icon: CreditCard,
    color: 'bg-emerald-50 text-emerald-600',
    border: 'border-l-emerald-500',
    active: true,
  },
  {
    title: 'Settlements',
    description: 'Marketplace settlements',
    detail: 'Track platform payouts & reconciliation',
    href: '/finance/settlements',
    icon: BarChart3,
    color: 'bg-purple-50 text-purple-600',
    border: 'border-l-purple-500',
    active: false,
  },
  {
    title: 'Invoices',
    description: 'Customer invoices',
    detail: 'Generate & track invoices',
    href: '/finance/invoices',
    icon: FileText,
    color: 'bg-amber-50 text-amber-600',
    border: 'border-l-amber-500',
    active: false,
  },
]

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Manage reconciliation, payments, settlements, and invoices"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {modules.map((mod) => {
          const Icon = mod.icon
          const content = (
            <Card
              className={`border-l-4 ${mod.border} ${
                mod.active
                  ? 'cursor-pointer hover:shadow-md transition-all group'
                  : 'opacity-50 border-dashed'
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`rounded-lg p-2.5 ${mod.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-base">{mod.title}</h3>
                      {mod.active ? (
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      ) : (
                        <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          Soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{mod.description}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">{mod.detail}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )

          if (mod.active) {
            return (
              <Link key={mod.title} href={mod.href}>
                {content}
              </Link>
            )
          }
          return <div key={mod.title}>{content}</div>
        })}
      </div>
    </div>
  )
}
