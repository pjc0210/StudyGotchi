import { redirect } from 'next/navigation'
import { GraphApp } from '@/components/GraphApp'
import { readSession } from '@/lib/session'

export default async function GraphPage() {
  const user = await readSession()
  if (!user) redirect('/login')
  return <GraphApp />
}
