export type MaterialKind =
  | 'slides'
  | 'reading'
  | 'homework'
  | 'instructor'
  | 'notes'
  | 'practice'

export type GraphNode = {
  id: string
  label: string
  cluster: string
  kind: MaterialKind
  course: string
  classroomShare: boolean
  owner: string
  x: number
  y: number
}

export type GraphEdge = { from: string; to: string }

export type UploadedFile = {
  id: string
  name: string
  kind: MaterialKind
  sizeLabel: string
  topics: string[]
  classroomId: string | null
  appliedToClassroom: boolean
}

export type Classroom = {
  id: string
  name: string
  code: string
  role: 'student' | 'instructor'
  members: string[]
  sharedTopics: string[]
}

export type Friend = {
  id: string
  name: string
  handle: string
  creature: string
  mood: string
  worldTint: string
}

export type Notice = {
  id: string
  title: string
  body: string
  time: string
  unread: boolean
}

export type User = {
  name: string
  email: string
  handle: string
  twoFactor: boolean
}

export type Course = {
  code: string
  name: string
}
