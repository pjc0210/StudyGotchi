import { notFound, redirect } from 'next/navigation'
import { GraphView } from '@/components/GraphView'
import { getFriend } from '@/lib/friends'
import { readSession } from '@/lib/session'

export default async function FriendGraphPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await readSession()
  if (!user) redirect('/login')
  const { id } = await params
  const friend = getFriend(id)
  if (!friend) notFound()
  return <GraphView peer={friend} />
}
