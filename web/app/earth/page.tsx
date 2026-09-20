import { redirect } from 'next/navigation'
import { EarthView } from '@/components/EarthView'
import { readSession } from '@/lib/session'

export default async function EarthPage() {
  const user = await readSession()
  if (!user) redirect('/login')
  return <EarthView />
}
