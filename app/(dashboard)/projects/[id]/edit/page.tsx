'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { fetchProjectById } from '@/lib/api/projects'
import ProjectForm from '@/components/project-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function ProjectEditPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjectById(params.id).then(p => {
      setProject(p)
      setLoading(false)
    })
  }, [params.id])

  if (loading) return (
    <div className="max-w-2xl space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  )
  if (!project) return <p className="text-slate-500">Project not found.</p>

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={`/projects/${params.id}`} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to project
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit project</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <ProjectForm
          project={project}
          onSuccess={() => router.push(`/projects/${params.id}`)}
        />
        <div className="mt-6 pt-4 border-t border-slate-100">
          <button
            type="submit"
            form="project-form"
            className="w-full bg-slate-900 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}
