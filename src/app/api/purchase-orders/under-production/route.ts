import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/api-auth'

// GET /api/purchase-orders/under-production
// Returns PO line items where ordered qty > received qty (aggregated by product)
export async function GET() {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const tenantId = auth.user.tenantId

    // Fetch POs that are in production-related statuses (approved, partially_received, rm_issued_pending_goods)
    const pos = await prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        status: {
          in: ['approved', 'partially_received', 'approved_pending_rm_issuance', 'rm_issued_pending_goods'],
        },
      },
      include: {
        supplier: { select: { id: true, name: true, code: true } },
        lineItems: {
          include: {
            grnLineItems: {
              select: { acceptedQty: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Enrich line items with product names
    const items: Array<{
      productId: string
      productType: string
      productSku: string
      productName: string
      poNumber: string
      poId: string
      supplierId: string | null
      supplierName: string
      supplierCode: string
      orderedQty: number
      receivedQty: number
      pendingQty: number
      expectedDelivery: string | null
    }> = []

    for (const po of pos) {
      for (const li of po.lineItems) {
        const orderedQty = Number(li.quantity)
        const receivedQty = li.grnLineItems.reduce((sum, g) => sum + g.acceptedQty, 0)
        const pendingQty = orderedQty - receivedQty

        if (pendingQty <= 0) continue

        // Resolve product name & SKU
        let productName = 'Unknown Product'
        let productSku = li.productId || 'N/A'

        if (li.productId) {
          try {
            switch (li.productType) {
              case 'finished': {
                const p = await prisma.finishedProduct.findUnique({
                  where: { id: li.productId },
                  select: { title: true, childSku: true },
                })
                if (p) { productName = p.title; productSku = p.childSku || productSku }
                break
              }
              case 'fabric': {
                const p = await prisma.fabric.findUnique({
                  where: { id: li.productId },
                  select: { material: true, color: true, fabricSku: true },
                })
                if (p) { productName = `${p.material} - ${p.color}`; productSku = p.fabricSku || productSku }
                break
              }
              case 'raw_material': {
                const p = await prisma.rawMaterial.findUnique({
                  where: { id: li.productId },
                  select: { rmType: true, color: true, rmSku: true },
                })
                if (p) { productName = `${p.rmType}${p.color ? ` - ${p.color}` : ''}`; productSku = p.rmSku || productSku }
                break
              }
              case 'packaging': {
                const p = await prisma.packaging.findUnique({
                  where: { id: li.productId },
                  select: { pkgType: true, dimensions: true, pkgSku: true },
                })
                if (p) { productName = `${p.pkgType}${p.dimensions ? ` (${p.dimensions})` : ''}`; productSku = p.pkgSku || productSku }
                break
              }
              default: {
                const p = await prisma.finishedProduct.findUnique({
                  where: { id: li.productId },
                  select: { title: true, childSku: true },
                }).catch(() => null)
                if (p) { productName = p.title; productSku = p.childSku || productSku }
              }
            }
          } catch {
            // Product may have been deleted
          }
        }

        items.push({
          productId: li.productId || li.id,
          productType: li.productType || 'unknown',
          productSku,
          productName,
          poNumber: po.poNumber,
          poId: po.id,
          supplierId: po.supplier?.id || null,
          supplierName: po.supplier?.name || 'N/A',
          supplierCode: po.supplier?.code || '',
          orderedQty,
          receivedQty,
          pendingQty,
          expectedDelivery: po.expectedDelivery?.toISOString() || null,
        })
      }
    }

    return NextResponse.json({ data: items })
  } catch (error) {
    console.error('Error fetching under-production items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch under-production items' },
      { status: 500 }
    )
  }
}
