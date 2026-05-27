'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { fetchProjectById } from '@/lib/api/projects'
import ProjectForm from '@/components/project-form'
import Button from '@/components/ui/button'
import PageHeader from '@/components/ui/page-header'
import { FormPageSkeleton, FormSection } from '@/components/ui'
import PageLayout from '@/components/page-layout'
import type { Project } from '@/types/database'

export default function ProjectEditPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjectById(params.id).then(p => {
      setProject(p)
      setLoading(false)
    })
  }, [params.id])

  if (loading) {
    return (
      <PageLayout width="document">
        <FormPageSkeleton />
      </PageLayout>
    )
  }

  if (!project) {
    return (
      <PageLayout width="document">
        <p className="text-text-muted">Project not found.</p>
      </PageLayout>
    )
  }

  return (
    <PageLayout width="document" className="space-y-6">
      <PageHeader
        back={{ href: `/projects/${params.id}`, label: 'Back to project' }}
        title="Edit project"
      />

      <FormSection density="none">
        <ProjectForm
          project={project}
          onSuccess={() => router.push(`/projects/${params.id}`)}
        />
        <div className="mt-6 pt-4 border-t border-border-subtle">
          <Button type="submit" form="project-form" intent="primary" size="md" fullWidth>
            Save changes
          </Button>
        </div>
      </FormSection>
    </PageLayout>
  )
}
