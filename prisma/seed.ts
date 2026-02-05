import { PrismaClient, PurchaseType, EntryMode, EntityType, ExternalVendorType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Tenant',
      slug: 'default',
    },
  })

  console.log('Created tenant:', tenant.name)

  // Create entities
  const entities = [
    { name: 'Fulton', type: EntityType.in_house, isExternal: false },
    { name: 'Shivaang', type: EntityType.external, isExternal: true },
    { name: 'MSE', type: EntityType.in_house, isExternal: false },
    { name: 'SNA', type: EntityType.in_house, isExternal: false },
  ]

  for (const entity of entities) {
    await prisma.entity.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: entity.name } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: entity.name,
        type: entity.type,
        isExternal: entity.isExternal,
      },
    })
  }

  console.log('Created entities')

  // Create sales channels
  const salesChannels = [
    { name: 'Amazon', code: 'amazon' },
    { name: 'Myntra', code: 'myntra' },
    { name: 'Nykaa', code: 'nykaa' },
    { name: 'Thevasa', code: 'thevasa' },
    { name: 'Free Sample', code: 'free_sample' },
    { name: 'Amz FC', code: 'amz_fc' },
  ]

  for (const channel of salesChannels) {
    await prisma.salesChannel.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: channel.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: channel.name,
        code: channel.code,
      },
    })
  }

  console.log('Created sales channels')

  // Create purchase type configurations
  const purchaseTypes: {
    purchaseType: PurchaseType
    name: string
    prefix: string
    allowedEntryModes: EntryMode[]
    trackInventory: boolean
  }[] = [
    {
      purchaseType: PurchaseType.finished,
      name: 'Finished Goods',
      prefix: 'FIN',
      allowedEntryModes: [EntryMode.catalog, EntryMode.link_finished],
      trackInventory: true,
    },
    {
      purchaseType: PurchaseType.fabric,
      name: 'Fabric',
      prefix: 'FAB',
      allowedEntryModes: [EntryMode.catalog, EntryMode.free_text],
      trackInventory: true,
    },
    {
      purchaseType: PurchaseType.raw_material,
      name: 'Raw Materials',
      prefix: 'RAW',
      allowedEntryModes: [EntryMode.catalog, EntryMode.free_text],
      trackInventory: true,
    },
    {
      purchaseType: PurchaseType.packaging,
      name: 'Packaging',
      prefix: 'PKG',
      allowedEntryModes: [EntryMode.catalog, EntryMode.free_text],
      trackInventory: true,
    },
    {
      purchaseType: PurchaseType.corporate_assets,
      name: 'Corporate Assets',
      prefix: 'AST',
      allowedEntryModes: [EntryMode.free_text],
      trackInventory: false,
    },
    {
      purchaseType: PurchaseType.samples,
      name: 'Samples',
      prefix: 'SMP',
      allowedEntryModes: [EntryMode.free_text],
      trackInventory: false,
    },
    {
      purchaseType: PurchaseType.influencer_samples,
      name: 'Influencer Samples',
      prefix: 'INF',
      allowedEntryModes: [EntryMode.free_text],
      trackInventory: false,
    },
    {
      purchaseType: PurchaseType.transportation,
      name: 'Transportation',
      prefix: 'TRN',
      allowedEntryModes: [EntryMode.free_text],
      trackInventory: false,
    },
    {
      purchaseType: PurchaseType.advertisement,
      name: 'Advertisement',
      prefix: 'ADV',
      allowedEntryModes: [EntryMode.free_text],
      trackInventory: false,
    },
    {
      purchaseType: PurchaseType.office_expenses,
      name: 'Office Expenses',
      prefix: 'OFF',
      allowedEntryModes: [EntryMode.free_text],
      trackInventory: false,
    },
    {
      purchaseType: PurchaseType.software,
      name: 'Software',
      prefix: 'SFT',
      allowedEntryModes: [EntryMode.free_text],
      trackInventory: false,
    },
    {
      purchaseType: PurchaseType.feedback,
      name: 'Feedback',
      prefix: 'FBK',
      allowedEntryModes: [EntryMode.free_text],
      trackInventory: false,
    },
    {
      purchaseType: PurchaseType.misc,
      name: 'Miscellaneous',
      prefix: 'MSC',
      allowedEntryModes: [EntryMode.free_text],
      trackInventory: false,
    },
    {
      purchaseType: PurchaseType.customer_refunds,
      name: 'Customer Refunds',
      prefix: 'REF',
      allowedEntryModes: [EntryMode.special],
      trackInventory: false,
    },
  ]

  for (const pt of purchaseTypes) {
    await prisma.purchaseTypeConfig.upsert({
      where: { tenantId_purchaseType: { tenantId: tenant.id, purchaseType: pt.purchaseType } },
      update: {},
      create: {
        tenantId: tenant.id,
        purchaseType: pt.purchaseType,
        name: pt.name,
        prefix: pt.prefix,
        allowedEntryModes: pt.allowedEntryModes,
        trackInventory: pt.trackInventory,
      },
    })
  }

  console.log('Created purchase type configurations')

  // Create external vendor (Shivaang)
  await prisma.externalVendor.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'shivaang' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Shivaang',
      code: 'shivaang',
      vendorType: ExternalVendorType.other,
    },
  })

  console.log('Created external vendors')

  // Create product categories
  const categories = [
    { name: 'Finished Goods', level: 1 },
    { name: 'Raw Materials', level: 1 },
    { name: 'Packaging Materials', level: 1 },
    { name: 'Fabric', level: 1 },
  ]

  for (const category of categories) {
    await prisma.productCategory.upsert({
      where: { id: `${tenant.id}-${category.name}` },
      update: {},
      create: {
        id: `${tenant.id}-${category.name}`,
        tenantId: tenant.id,
        name: category.name,
        level: category.level,
      },
    })
  }

  console.log('Created product categories')

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
