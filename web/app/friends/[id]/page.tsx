import { notFound, redirect } from 'next/navigation'
import { getFriend } from '@/lib/friends'
import { readSession } from '@/lib/session'

export default async function FriendProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await readSession()
  if (!user) redirect('/login')
  const { id } = await params
  if (!getFriend(id)) notFound()
  redirect(`/friends/${id}/earth`)
}
