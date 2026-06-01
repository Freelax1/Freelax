import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const results: Record<string, unknown> = {}

  // Test 1: does the service client initialise?
  try {
    const supabase = createServiceClient()
    results.serviceClientInit = 'ok'

    // Test 2: can it query ai_calls?
    const { data, error, count } = await supabase
      .from('ai_calls')
      .select('*', { count: 'exact', head: true })
      .limit(1)

    results.aiCallsQuery = error
      ? { error: error.message, code: error.code, details: error.details }
      : { count, ok: true }
  } catch (e: unknown) {
    results.serviceClientError = e instanceof Error ? e.message : String(e)
  }

  // Test 3: check env vars are present (don't log values, just presence)
  results.envVars = {
    SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    ANTHROPIC_KEY: !!process.env.ANTHROPIC_API_KEY,
  }

  return NextResponse.json(results)
}
