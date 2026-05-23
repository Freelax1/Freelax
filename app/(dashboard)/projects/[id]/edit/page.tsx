'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { fetchProjectById } from '@/lib/api/projects'
import ProjectForm from '@/components/project-form'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react'
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

  if (loading) return (
    <div className="max-w-2xl space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-16 bg-surface-sunken rounded-xl animate-pulse" />)}
    </div>
  )
  if (!project) return <p className="text-text-muted">Project not found.</p>

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={`/projects/${params.id}`} className="flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary mb-3">
          <ArrowLeft weight="regular" className="w-4 h-4" /> Back to project
        </Link>
        <h1 className="text-2xl font-serif font-semibold text-text-primary">Edit project</h1>
      </div>

      <div className="bg-surface-card rounded-xl border border-border-default p-6">
        <ProjectForm
          project={project}
          onSuccess={() => router.push(`/projects/${params.id}`)}
        />
        <div className="mt-6 pt-4 border-t border-border-subtle">
          <button
            type="submit"
            form="project-form"
            className="w-full bg-forest-900 text-white py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-forest-900 transition-colors"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}
