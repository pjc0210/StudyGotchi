import type {
  Classroom,
  Friend,
  GraphEdge,
  GraphNode,
  Notice,
  UploadedFile,
} from './types'

export const DEMO_PASSWORD_HINT = 'Any password works in this mock. Use 123456 for 2FA.'

export const initialFiles: UploadedFile[] = [
  {
    id: 'f1',
    name: '18.06-lecture-01-ax-equals-b.pdf',
    kind: 'slides',
    sizeLabel: '2.4 MB',
    topics: ['linear systems', 'row reduction'],
    classroomId: 'c-1806',
    appliedToClassroom: true,
  },
  {
    id: 'f2',
    name: 'handwritten-notes-nullspace.jpg',
    kind: 'notes',
    sizeLabel: '812 KB',
    topics: ['nullspace', 'rank'],
    classroomId: 'c-1806',
    appliedToClassroom: false,
  },
  {
    id: 'f3',
    name: '6.1400-pset-2.zip',
    kind: 'homework',
    sizeLabel: '1.1 MB',
    topics: ['automata', 'regular languages'],
    classroomId: 'c-61400',
    appliedToClassroom: true,
  },
  {
    id: 'f4',
    name: 'sipser-ch1-reading.pdf',
    kind: 'reading',
    sizeLabel: '4.8 MB',
    topics: ['DFAs', 'NFAs'],
    classroomId: 'c-61400',
    appliedToClassroom: true,
  },
  {
    id: 'f5',
    name: 'practice-eigenvalues.pdf',
    kind: 'practice',
    sizeLabel: '640 KB',
    topics: ['eigenvalues', 'diagonalization'],
    classroomId: null,
    appliedToClassroom: false,
  },
]

export const initialClassrooms: Classroom[] = [
  {
    id: 'c-1806',
    name: '18.06 Linear Algebra',
    code: 'LANTERN-06',
    role: 'student',
    members: ['you', 'mira', 'jun', 'ada'],
    sharedTopics: ['linear systems', 'nullspace', 'eigenvalues'],
  },
  {
    id: 'c-61400',
    name: '6.1400 Computability',
    code: 'SPORE-1400',
    role: 'instructor',
    members: ['you', 'ravi', 'nori'],
    sharedTopics: ['automata', 'regular languages'],
  },
]

export const initialFriends: Friend[] = [
  {
    id: 'mira',
    name: 'Mira Chen',
    handle: '@mira',
    creature: 'Inkcap',
    mood: 'reviewing pset 3',
    worldTint: '#3d6b58',
  },
  {
    id: 'jun',
    name: 'Jun Park',
    handle: '@jun',
    creature: 'Lumen',
    mood: 'napping on a theorem',
    worldTint: '#35506e',
  },
  {
    id: 'nori',
    name: 'Nori Okada',
    handle: '@nori',
    creature: 'Pebble',
    mood: 'trading flashcards',
    worldTint: '#6a4a38',
  },
]

export const initialNotices: Notice[] = [
  {
    id: 'n1',
    title: 'Classroom map updated',
    body: 'Ada shared “row reduction” into 18.06.',
    time: '12m',
    unread: true,
  },
  {
    id: 'n2',
    title: 'Inkcap is hungry for proofs',
    body: 'Study 20 minutes to feed your world.',
    time: '1h',
    unread: true,
  },
  {
    id: 'n3',
    title: '@jun visited your habitat',
    body: 'Left a lantern seed. Exchange when you visit back.',
    time: 'yesterday',
    unread: false,
  },
]

export const nodes: GraphNode[] = [
  { id: 'axb', label: 'Ax = b', cluster: 'systems', kind: 'slides', course: '18.06', classroomShare: true, owner: 'you', x: 180, y: 160 },
  { id: 'rref', label: 'Row reduction', cluster: 'systems', kind: 'slides', course: '18.06', classroomShare: true, owner: 'mira', x: 260, y: 210 },
  { id: 'null', label: 'Nullspace', cluster: 'spaces', kind: 'notes', course: '18.06', classroomShare: false, owner: 'you', x: 420, y: 150 },
  { id: 'col', label: 'Column space', cluster: 'spaces', kind: 'instructor', course: '18.06', classroomShare: true, owner: 'ada', x: 500, y: 210 },
  { id: 'rank', label: 'Rank', cluster: 'spaces', kind: 'homework', course: '18.06', classroomShare: true, owner: 'jun', x: 460, y: 280 },
  { id: 'eig', label: 'Eigenvalues', cluster: 'spectra', kind: 'practice', course: '18.06', classroomShare: false, owner: 'you', x: 680, y: 140 },
  { id: 'diag', label: 'Diagonalization', cluster: 'spectra', kind: 'reading', course: '18.06', classroomShare: true, owner: 'mira', x: 760, y: 210 },
  { id: 'dfa', label: 'DFA', cluster: 'automata', kind: 'reading', course: '6.1400', classroomShare: true, owner: 'you', x: 220, y: 420 },
  { id: 'nfa', label: 'NFA', cluster: 'automata', kind: 'slides', course: '6.1400', classroomShare: true, owner: 'nori', x: 310, y: 480 },
  { id: 'regex', label: 'Regular languages', cluster: 'automata', kind: 'homework', course: '6.1400', classroomShare: true, owner: 'ravi', x: 180, y: 520 },
  { id: 'pump', label: 'Pumping lemma', cluster: 'limits', kind: 'practice', course: '6.1400', classroomShare: false, owner: 'you', x: 520, y: 460 },
  { id: 'cfg', label: 'Context-free', cluster: 'limits', kind: 'instructor', course: '6.1400', classroomShare: true, owner: 'you', x: 610, y: 520 },
  { id: 'tm', label: 'Turing machines', cluster: 'compute', kind: 'reading', course: '6.1400', classroomShare: true, owner: 'nori', x: 780, y: 430 },
  { id: 'halt', label: 'Halting problem', cluster: 'compute', kind: 'notes', course: '6.1400', classroomShare: false, owner: 'you', x: 860, y: 500 },
]

export const edges: GraphEdge[] = [
  { from: 'axb', to: 'rref' },
  { from: 'rref', to: 'null' },
  { from: 'null', to: 'col' },
  { from: 'col', to: 'rank' },
  { from: 'rank', to: 'eig' },
  { from: 'eig', to: 'diag' },
  { from: 'dfa', to: 'nfa' },
  { from: 'nfa', to: 'regex' },
  { from: 'regex', to: 'pump' },
  { from: 'pump', to: 'cfg' },
  { from: 'cfg', to: 'tm' },
  { from: 'tm', to: 'halt' },
  { from: 'rank', to: 'pump' },
]

export const clusterHomes: Record<string, { x: number; y: number }> = {
  systems: { x: 210, y: 190 },
  spaces: { x: 460, y: 210 },
  spectra: { x: 720, y: 180 },
  automata: { x: 240, y: 470 },
  limits: { x: 560, y: 500 },
  compute: { x: 820, y: 470 },
}

export function scoreNode(node: GraphNode, query: string): number {
  if (!query.trim()) return 0.55
  const q = query.toLowerCase()
  const hay = `${node.label} ${node.cluster} ${node.course} ${node.kind} ${node.owner}`.toLowerCase()
  if (hay.includes(q)) return 1
  if (q.split(/\s+/).some((w) => hay.includes(w) && w.length > 2)) return 0.72
  return 0.18
}

export function layoutForQuery(query: string, source: GraphNode[]): GraphNode[] {
  return source.map((node) => {
    const score = scoreNode(node, query)
    const home = clusterHomes[node.cluster] ?? { x: node.x, y: node.y }
    const pull = query.trim() ? score : 0.35
    const cx = 520
    const cy = 340
    return {
      ...node,
      x: node.x * (1 - pull * 0.35) + (home.x * 0.4 + cx * 0.6) * pull * 0.35,
      y: node.y * (1 - pull * 0.35) + (home.y * 0.4 + cy * 0.6) * pull * 0.35,
    }
  })
}
