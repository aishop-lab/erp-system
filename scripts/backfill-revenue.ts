import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tenantId = 'cml3m3z9q0000hctvj38flpyb'

  // Find orders missing a SalesRevenue record
  const ordersWithoutRevenue = await prisma.salesOrder.findMany({
    where: {
      tenantId,
      salesRevenue: { is: null },
    },
    select: {
      id: true,
      orderNumber: true,
      platformId: true,
      totalAmount: true,
      orderedAt: true,
    },
  })

  console.log(`Found ${ordersWithoutRevenue.length} orders without revenue records`)

  let created = 0
  let skipped = 0

  for (const order of ordersWithoutRevenue) {
    const grossRevenue = Number(order.totalAmount || 0)

    if (!order.orderedAt) {
      skipped++
      continue
    }

    try {
      await prisma.salesRevenue.create({
        data: {
          tenantId,
          orderId: order.id,
          platformId: order.platformId,
          grossRevenue,
          netRevenue: grossRevenue,
          date: order.orderedAt,
        },
      })
      created++
    } catch {
      skipped++
    }
  }

  console.log(`Done: created ${created}, skipped ${skipped}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
