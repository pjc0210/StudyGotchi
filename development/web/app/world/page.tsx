import { redirect } from 'next/navigation'
import { WorldView } from '@/components/WorldView'
import { readSession } from '@/lib/session'

export default async function WorldPage() {
  const user = await readSession()
  if (!user) redirect('/login')
  return <WorldView />
}
