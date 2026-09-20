import { redirect } from 'next/navigation'
import { GraphView } from '@/components/GraphView'
import { readSession } from '@/lib/session'

export default async function GraphPage() {
  const user = await readSession()
  if (!user) redirect('/login')
  return <GraphView />
}
