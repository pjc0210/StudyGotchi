import { redirect } from 'next/navigation'
import { FriendPeerGraph } from '@/components/FriendPeer'
import { readSession } from '@/lib/session'

export default async function FriendGraphPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await readSession()
  if (!user) redirect('/login')
  const { id } = await params
  return <FriendPeerGraph id={id} />
}
