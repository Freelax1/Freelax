import { redirect } from 'next/navigation'

export default function IR35Redirect() {
  redirect('/projects?filter=needs_review')
}
