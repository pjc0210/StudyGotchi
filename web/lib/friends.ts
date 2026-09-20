import { getMockCourseData, MOCK_COURSES, type MockCourseData } from '@/lib/kg/mock'
import type { ConceptNode } from '@/lib/kg/types'
import type { Course } from '@/lib/types'

export type Friend = {
  id: string
  name: string
  handle: string
  school: string
  blurb: string
  courses: Course[]
  graphCourseId: string
  /** Rotates demo mastery so each friend's graph reads differently. */
  stateShift: number
}

const byCode = (code: string): Course => {
  const course = MOCK_COURSES.find((item) => item.id === code)
  return course
    ? { code: course.code, name: course.name }
    : { code, name: code }
}

export const FRIENDS: Friend[] = [
  {
    id: 'maya',
    name: 'Maya Chen',
    handle: '@maya',
    school: 'MIT',
    blurb: 'Deep into algorithms this term. Loves graph search more than psets.',
    courses: [byCode('6.1210'), byCode('18.06')],
    graphCourseId: '6.1210',
    stateShift: 1,
  },
  {
    id: 'jules',
    name: 'Jules Park',
    handle: '@jules',
    school: 'MIT',
    blurb: 'Complexity theory first, everything else second.',
    courses: [byCode('6.1400'), byCode('6.1210')],
    graphCourseId: '6.1400',
    stateShift: 2,
  },
  {
    id: 'ari',
    name: 'Ari Mensah',
    handle: '@ari',
    school: 'MIT',
    blurb: 'Mechanics and numerical toys. Will explain Lagrange if you let them.',
    courses: [byCode('8.223'), byCode('16.C20')],
    graphCourseId: '8.223',
    stateShift: 3,
  },
  {
    id: 'noor',
    name: 'Noor Haddad',
    handle: '@noor',
    school: 'MIT',
    blurb: 'Linear algebra and computational science, usually at the same desk.',
    courses: [byCode('18.06'), byCode('16.C20')],
    graphCourseId: '18.06',
    stateShift: 4,
  },
  {
    id: 'sam',
    name: 'Sam Rivera',
    handle: '@sam',
    school: 'MIT',
    blurb: 'Taking the theory stack. Still negotiating with dynamic programming.',
    courses: [byCode('6.1210'), byCode('6.1400'), byCode('18.06')],
    graphCourseId: '6.1210',
    stateShift: 5,
  },
  {
    id: 'priya',
    name: 'Priya Shah',
    handle: '@priya',
    school: 'MIT',
    blurb: 'Computational science, coffee-cooling models, and tidy notebooks.',
    courses: [byCode('16.C20')],
    graphCourseId: '16.C20',
    stateShift: 0,
  },
]

const STATE_RING: Array<
  Pick<ConceptNode, 'state' | 'understanding' | 'discovery_state'>
> = [
  { state: 'mastered', understanding: 0.9, discovery_state: 'active' },
  { state: 'strong', understanding: 0.7, discovery_state: 'encountered' },
  { state: 'developing', understanding: 0.55, discovery_state: 'active' },
  { state: 'uncertain', understanding: 0.42, discovery_state: 'active' },
  { state: 'struggling', understanding: 0.3, discovery_state: 'encountered' },
  { state: 'frontier', understanding: null, discovery_state: 'frontier' },
]

function rotateState(node: ConceptNode, shift: number): ConceptNode {
  const current = STATE_RING.findIndex((entry) => entry.state === node.state)
  const index = (current + shift + STATE_RING.length) % STATE_RING.length
  return { ...node, ...STATE_RING[index] }
}

export function getFriend(id: string) {
  return FRIENDS.find((friend) => friend.id === id)
}

export function friendHasGraph(courseCode: string) {
  return MOCK_COURSES.some((course) => course.id === courseCode)
}

export function getFriendCourseData(
  friend: Friend,
  courseId?: string,
): MockCourseData {
  const requested =
    courseId && friend.courses.some((course) => course.code === courseId)
      ? courseId
      : friend.graphCourseId
  const base = getMockCourseData(requested)
  return {
    ...base,
    graph: {
      ...base.graph,
      student_id: friend.id,
      nodes: base.graph.nodes.map((node, index) =>
        rotateState(node, friend.stateShift + index),
      ),
    },
  }
}
