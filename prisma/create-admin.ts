import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createSuperAdmin() {
    const tenant = await prisma.tenant.findFirst({ where: { slug: 'default' } })

    if (!tenant) {
        console.log('No tenant found. Run seed first.')
        return
    }

    const user = await prisma.user.upsert({
        where: { email: 'himanshu@thevasa.com' },
        update: { isSuperAdmin: true },
        create: {
            tenantId: tenant.id,

            email: 'himanshu@thevasa.com',
            name: 'Himanshu',
            isSuperAdmin: true,
        },
    })

    console.log('Created/Updated super admin:', user.email)
}

createSuperAdmin()
    .finally(() => prisma.$disconnect())