import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/api-auth'

interface ProductSearchResult {
  id: string
  sku: string
  title: string
  gstPct: number
  uom: string
  costPrice: number
  productType: string
}

// GET /api/product-info/search - Search products across all libraries
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // finished, fabric, raw_material, packaging
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!type) {
      return NextResponse.json(
        { error: 'Product type is required' },
        { status: 400 }
      )
    }

    let results: ProductSearchResult[] = []

    switch (type) {
      case 'finished':
        const finishedProducts = await prisma.finishedProduct.findMany({
          where: {
            tenantId: auth.user.tenantId,
            status: 'active',
            OR: query ? [
              { childSku: { contains: query, mode: 'insensitive' } },
              { parentSku: { contains: query, mode: 'insensitive' } },
              { title: { contains: query, mode: 'insensitive' } },
            ] : undefined,
          },
          select: {
            id: true,
            childSku: true,
            title: true,
            gstRatePct: true,
            costAmount: true,
            color: true,
            size: true,
          },
          take: limit,
          orderBy: { childSku: 'asc' },
        })

        results = finishedProducts.map(p => ({
          id: p.id,
          sku: p.childSku,
          title: `${p.title} - ${p.color} (${p.size})`,
          gstPct: Number(p.gstRatePct),
          uom: 'Pcs',
          costPrice: Number(p.costAmount),
          productType: 'finished',
        }))
        break

      case 'fabric':
        const fabrics = await prisma.fabric.findMany({
          where: {
            tenantId: auth.user.tenantId,
            status: 'active',
            OR: query ? [
              { fabricSku: { contains: query, mode: 'insensitive' } },
              { material: { contains: query, mode: 'insensitive' } },
              { color: { contains: query, mode: 'insensitive' } },
            ] : undefined,
          },
          select: {
            id: true,
            fabricSku: true,
            material: true,
            color: true,
            gstRatePct: true,
            costAmount: true,
            uom: true,
          },
          take: limit,
          orderBy: { fabricSku: 'asc' },
        })

        results = fabrics.map(f => ({
          id: f.id,
          sku: f.fabricSku,
          title: `${f.material} - ${f.color}`,
          gstPct: Number(f.gstRatePct),
          uom: f.uom || 'Meters',
          costPrice: Number(f.costAmount),
          productType: 'fabric',
        }))
        break

      case 'raw_material':
        const rawMaterials = await prisma.rawMaterial.findMany({
          where: {
            tenantId: auth.user.tenantId,
            status: 'active',
            OR: query ? [
              { rmSku: { contains: query, mode: 'insensitive' } },
              { rmType: { contains: query, mode: 'insensitive' } },
              { color: { contains: query, mode: 'insensitive' } },
            ] : undefined,
          },
          select: {
            id: true,
            rmSku: true,
            rmType: true,
            color: true,
            gstRatePct: true,
            costPerSku: true,
            measurementUnit: true,
          },
          take: limit,
          orderBy: { rmSku: 'asc' },
        })

        results = rawMaterials.map(rm => ({
          id: rm.id,
          sku: rm.rmSku,
          title: rm.color ? `${rm.rmType} - ${rm.color}` : rm.rmType,
          gstPct: Number(rm.gstRatePct),
          uom: rm.measurementUnit || 'Pcs',
          costPrice: Number(rm.costPerSku),
          productType: 'raw_material',
        }))
        break

      case 'packaging':
        const packagingItems = await prisma.packaging.findMany({
          where: {
            tenantId: auth.user.tenantId,
            status: 'active',
            OR: query ? [
              { pkgSku: { contains: query, mode: 'insensitive' } },
              { pkgType: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ] : undefined,
          },
          select: {
            id: true,
            pkgSku: true,
            pkgType: true,
            description: true,
            gstRatePct: true,
            costPerUnit: true,
            measurementUnit: true,
          },
          take: limit,
          orderBy: { pkgSku: 'asc' },
        })

        results = packagingItems.map(pkg => ({
          id: pkg.id,
          sku: pkg.pkgSku,
          title: pkg.description ? `${pkg.pkgType} - ${pkg.description}` : pkg.pkgType,
          gstPct: Number(pkg.gstRatePct),
          uom: pkg.measurementUnit || 'Pcs',
          costPrice: Number(pkg.costPerUnit),
          productType: 'packaging',
        }))
        break

      default:
        return NextResponse.json(
          { error: 'Invalid product type. Must be: finished, fabric, raw_material, or packaging' },
          { status: 400 }
        )
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error searching products:', error)
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    )
  }
}
