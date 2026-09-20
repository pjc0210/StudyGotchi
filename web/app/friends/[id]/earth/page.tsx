import { redirect } from 'next/navigation'
import { FriendPeerEarth } from '@/components/FriendPeer'
import { readSession } from '@/lib/session'

export default async function FriendEarthPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await readSession()
  if (!user) redirect('/login')
  const { id } = await params
  return <FriendPeerEarth id={id} />
}
