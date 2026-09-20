import { redirect } from 'next/navigation'
import { FriendsView } from '@/components/FriendsView'
import { readSession } from '@/lib/session'

export default async function FriendsPage() {
  const user = await readSession()
  if (!user) redirect('/login')
  return <FriendsView />
}
