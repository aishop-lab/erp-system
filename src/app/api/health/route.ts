import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, 'ok' | 'fail'> = {}
  let healthy = true

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch {
    checks.database = 'fail'
    healthy = false
  }

  // Check required env vars
  const requiredEnvVars = ['DATABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
  const missingEnvVars = requiredEnvVars.filter(v => !process.env[v])
  checks.env = missingEnvVars.length === 0 ? 'ok' : 'fail'
  if (missingEnvVars.length > 0) healthy = false

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'degraded',
      checks,
      ...(missingEnvVars.length > 0 && { missingEnvVars }),
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  )
}
