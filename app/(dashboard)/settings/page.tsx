import React, { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/page-header'
import SettingsForm from '@/components/settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('*').eq('id', user!.id).single()

  return (
    <div>
      <PageHeader title="Settings" />
      <Suspense fallback={<div />}>
        <SettingsForm profile={profile} email={user?.email ?? ''} />
      </Suspense>
    </div>
  )
}
