import { notFound, redirect } from 'next/navigation'
import { EarthView } from '@/components/EarthView'
import { getFriend } from '@/lib/friends'
import { readSession } from '@/lib/session'

export default async function FriendEarthPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await readSession()
  if (!user) redirect('/login')
  const { id } = await params
  const friend = getFriend(id)
  if (!friend) notFound()
  return <EarthView peer={friend} />
}
