export type ConceptState =
  | 'frontier'
  | 'exposed'
  | 'uncertain'
  | 'struggling'
  | 'developing'
  | 'strong'
  | 'mastered'
  | 'fragile'
  | 'stale'

export type SourceOrigin =
  | 'instructor'
  | 'ta'
  | 'student_self'
  | 'classmate'
  | 'external'

export type ArtifactType =
  | 'lecture'
  | 'reading'
  | 'study_guide'
  | 'homework'
  | 'exam'
  | 'student_notes'
  | 'classmate_notes'
  | 'other'

export interface ConceptNode {
  id: string
  name: string
  scope: 'course' | 'personal'
  cluster?: string
  importance: number
  personal_relevance: number
  mastery: number | null
  familiarity: number
  confidence: number
  readiness: number
  fragility: number
  state: ConceptState
}

export interface ConceptEdge {
  source: string
  target: string
  type: string
}

export interface Resource {
  id: string
  title: string
  origin: SourceOrigin
  artifact_type: ArtifactType
  role?: string
}

export interface Evidence {
  id: string
  label: string
  detail: string
  kind: 'mastery' | 'familiarity' | 'confidence'
  polarity: 'positive' | 'negative' | 'neutral'
  source?: Resource
}

export interface ConceptDetail {
  concept_id: string
  evidence: Evidence[]
  resources: Resource[]
}

export interface WhyExplanation {
  concept_id: string
  summary: string
  strongest_evidence?: string
  weakest_evidence?: string
  prerequisite_reason?: string
}

export const STATE_LABEL: Record<ConceptState, string> = {
  mastered: 'Mastered',
  strong: 'Strong',
  developing: 'Developing',
  uncertain: 'Uncertain',
  exposed: 'Exposed',
  struggling: 'Struggling',
  fragile: 'Fragile',
  stale: 'Stale',
  frontier: 'Frontier',
}

export const ORIGIN_LABEL: Record<SourceOrigin, string> = {
  instructor: 'Instructor',
  ta: 'TA',
  student_self: 'My Material',
  classmate: 'Classmate',
  external: 'External',
}

export const ARTIFACT_LABEL: Record<ArtifactType, string> = {
  lecture: 'Lecture',
  reading: 'Reading',
  study_guide: 'Study Guide',
  homework: 'Homework',
  exam: 'Exam',
  student_notes: 'Student Notes',
  classmate_notes: 'Classmate Notes',
  other: 'Other',
}

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--'
  return `${Math.round(value * 100)}%`
}

const RESOURCES: Record<string, Resource> = {
  lec5: { id: 'lec5', title: 'Professor Lecture 5', origin: 'instructor', artifact_type: 'lecture' },
  lec6: { id: 'lec6', title: 'Professor Lecture 6', origin: 'instructor', artifact_type: 'lecture' },
  lec7: { id: 'lec7', title: 'Professor Lecture 7', origin: 'instructor', artifact_type: 'lecture' },
  hw2: { id: 'hw2', title: 'Homework 2', origin: 'instructor', artifact_type: 'homework' },
  hw3: { id: 'hw3', title: 'Homework 3', origin: 'instructor', artifact_type: 'homework' },
  midterm: { id: 'midterm', title: 'Midterm', origin: 'instructor', artifact_type: 'exam' },
  notes4: { id: 'notes4', title: 'My Week 4 Notes', origin: 'student_self', artifact_type: 'student_notes' },
  notes5: { id: 'notes5', title: 'My Week 5 Notes', origin: 'student_self', artifact_type: 'student_notes' },
  sarah: { id: 'sarah', title: "Sarah's Notes", origin: 'classmate', artifact_type: 'classmate_notes' },
  recitation: { id: 'recitation', title: 'TA Recitation 4', origin: 'ta', artifact_type: 'study_guide' },
  bishop: { id: 'bishop', title: 'Bishop Ch. 6 - Kernel Methods', origin: 'instructor', artifact_type: 'reading' },
  blog: { id: 'blog', title: 'Random Features blog post', origin: 'external', artifact_type: 'other' },
}

export const GRAPH_NODES: ConceptNode[] = [
  { id: 'linear-algebra', name: 'Linear Algebra', scope: 'course', cluster: 'Foundations', importance: 0.9, personal_relevance: 0.86, mastery: 0.92, familiarity: 0.95, confidence: 0.85, readiness: 0.94, fragility: 0.06, state: 'mastered' },
  { id: 'eigendecomposition', name: 'Eigendecomposition', scope: 'course', cluster: 'Foundations', importance: 0.74, personal_relevance: 0.71, mastery: 0.81, familiarity: 0.88, confidence: 0.77, readiness: 0.83, fragility: 0.12, state: 'strong' },
  { id: 'inner-products', name: 'Inner Products', scope: 'course', cluster: 'Foundations', importance: 0.82, personal_relevance: 0.8, mastery: 0.84, familiarity: 0.9, confidence: 0.79, readiness: 0.86, fragility: 0.1, state: 'strong' },
  { id: 'gram-matrix', name: 'Gram Matrices', scope: 'course', cluster: 'Kernels', importance: 0.63, personal_relevance: 0.68, mastery: 0.52, familiarity: 0.71, confidence: 0.44, readiness: 0.58, fragility: 0.31, state: 'uncertain' },
  { id: 'psd-matrices', name: 'Positive Semidefinite Matrices', scope: 'course', cluster: 'Kernels', importance: 0.88, personal_relevance: 0.93, mastery: 0.31, familiarity: 0.74, confidence: 0.78, readiness: 0.34, fragility: 0.22, state: 'struggling' },
  { id: 'mercer', name: "Mercer's Theorem", scope: 'course', cluster: 'Kernels', importance: 0.85, personal_relevance: 0.89, mastery: 0.39, familiarity: 0.68, confidence: 0.65, readiness: 0.41, fragility: 0.27, state: 'struggling' },
  { id: 'rkhs', name: 'Reproducing Kernel Hilbert Spaces', scope: 'course', cluster: 'Kernels', importance: 0.57, personal_relevance: 0.48, mastery: null, familiarity: 0.12, confidence: 0.0, readiness: 0.29, fragility: 0.0, state: 'frontier' },
  { id: 'kernel-functions', name: 'Kernel Functions', scope: 'course', cluster: 'Kernels', importance: 0.91, personal_relevance: 0.9, mastery: 0.68, familiarity: 0.83, confidence: 0.52, readiness: 0.66, fragility: 0.34, state: 'uncertain' },
  { id: 'kernel-trick', name: 'The Kernel Trick', scope: 'course', cluster: 'Kernels', importance: 0.86, personal_relevance: 0.84, mastery: 0.73, familiarity: 0.85, confidence: 0.69, readiness: 0.72, fragility: 0.21, state: 'developing' },
  { id: 'svm', name: 'Support Vector Machines', scope: 'course', cluster: 'Models', importance: 0.7, personal_relevance: 0.55, mastery: 0.41, familiarity: 0.49, confidence: 0.38, readiness: 0.52, fragility: 0.29, state: 'exposed' },
  { id: 'regularization', name: 'Regularization', scope: 'course', cluster: 'Models', importance: 0.76, personal_relevance: 0.72, mastery: 0.66, familiarity: 0.79, confidence: 0.7, readiness: 0.74, fragility: 0.18, state: 'developing' },
  { id: 'kernel-regression', name: 'Kernel Regression', scope: 'course', cluster: 'Models', importance: 0.93, personal_relevance: 0.95, mastery: 0.74, familiarity: 0.81, confidence: 0.71, readiness: 0.48, fragility: 0.72, state: 'fragile' },
  { id: 'cross-validation', name: 'Cross Validation', scope: 'course', cluster: 'Models', importance: 0.64, personal_relevance: 0.6, mastery: 0.58, familiarity: 0.66, confidence: 0.49, readiness: 0.61, fragility: 0.33, state: 'stale' },
  { id: 'bandwidth-selection', name: 'Bandwidth Selection', scope: 'course', cluster: 'Models', importance: 0.69, personal_relevance: 0.77, mastery: null, familiarity: 0.08, confidence: 0.0, readiness: 0.44, fragility: 0.0, state: 'frontier' },
  { id: 'random-fourier-features', name: 'Random Fourier Features', scope: 'personal', cluster: 'Personal', importance: 0.35, personal_relevance: 0.81, mastery: 0.45, familiarity: 0.62, confidence: 0.4, readiness: 0.47, fragility: 0.38, state: 'uncertain' },
]

export const GRAPH_EDGES: ConceptEdge[] = [
  { source: 'linear-algebra', target: 'eigendecomposition', type: 'prerequisite' },
  { source: 'linear-algebra', target: 'inner-products', type: 'prerequisite' },
  { source: 'inner-products', target: 'gram-matrix', type: 'prerequisite' },
  { source: 'eigendecomposition', target: 'psd-matrices', type: 'prerequisite' },
  { source: 'gram-matrix', target: 'psd-matrices', type: 'prerequisite' },
  { source: 'psd-matrices', target: 'mercer', type: 'prerequisite' },
  { source: 'mercer', target: 'kernel-functions', type: 'prerequisite' },
  { source: 'mercer', target: 'rkhs', type: 'extends' },
  { source: 'kernel-functions', target: 'kernel-trick', type: 'prerequisite' },
  { source: 'kernel-trick', target: 'svm', type: 'applies_to' },
  { source: 'kernel-trick', target: 'kernel-regression', type: 'prerequisite' },
  { source: 'regularization', target: 'kernel-regression', type: 'prerequisite' },
  { source: 'kernel-regression', target: 'bandwidth-selection', type: 'prerequisite' },
  { source: 'cross-validation', target: 'bandwidth-selection', type: 'prerequisite' },
  { source: 'kernel-functions', target: 'random-fourier-features', type: 'approximates' },
]

function ev(
  id: string,
  label: string,
  detail: string,
  kind: Evidence['kind'],
  polarity: Evidence['polarity'],
  source: Resource,
): Evidence {
  return { id, label, detail, kind, polarity, source }
}

const DETAILS: Record<string, ConceptDetail> = {
  'psd-matrices': {
    concept_id: 'psd-matrices',
    evidence: [
      ev('e1', 'Midterm Q4', '2 / 8', 'mastery', 'negative', RESOURCES.midterm),
      ev('e2', 'Homework 2 Q5', '3 / 6', 'mastery', 'negative', RESOURCES.hw2),
      ev('e3', 'My Week 4 Notes', 'Covered concept', 'familiarity', 'neutral', RESOURCES.notes4),
      ev('e4', 'Lecture 6', 'Concept introduced', 'familiarity', 'positive', RESOURCES.lec6),
    ],
    resources: [
      { ...RESOURCES.lec6, role: 'Primary explanation' },
      { ...RESOURCES.sarah, role: 'Alternate intuition' },
      { ...RESOURCES.recitation, role: 'Worked practice' },
    ],
  },
  mercer: {
    concept_id: 'mercer',
    evidence: [
      ev('e1', 'Midterm Q4', '2 / 8', 'mastery', 'negative', RESOURCES.midterm),
      ev('e2', 'Homework 3 Q2', '4 / 5', 'mastery', 'positive', RESOURCES.hw3),
      ev('e3', 'My Week 4 Notes', 'Covered concept', 'familiarity', 'neutral', RESOURCES.notes4),
      ev('e4', "Sarah's Notes", 'Cross-referenced', 'familiarity', 'positive', RESOURCES.sarah),
    ],
    resources: [
      { ...RESOURCES.lec6, role: 'Primary explanation' },
      { ...RESOURCES.sarah, role: 'Alternate intuition' },
      { ...RESOURCES.hw3, role: 'Worked example' },
      { ...RESOURCES.bishop, role: 'Formal treatment' },
    ],
  },
  'kernel-functions': {
    concept_id: 'kernel-functions',
    evidence: [
      ev('e1', 'Homework 3 Q1', '7 / 10', 'mastery', 'positive', RESOURCES.hw3),
      ev('e2', 'Self-report', 'Low stated certainty', 'confidence', 'negative', RESOURCES.notes5),
      ev('e3', 'Lecture 7', 'Concept introduced', 'familiarity', 'positive', RESOURCES.lec7),
    ],
    resources: [
      { ...RESOURCES.lec7, role: 'Primary explanation' },
      { ...RESOURCES.bishop, role: 'Formal treatment' },
    ],
  },
  'kernel-regression': {
    concept_id: 'kernel-regression',
    evidence: [
      ev('e1', 'Homework 3 Q4', '8 / 10', 'mastery', 'positive', RESOURCES.hw3),
      ev('e2', 'Prerequisite check', 'Foundations are weak', 'mastery', 'negative', RESOURCES.midterm),
      ev('e3', 'Lecture 7', 'Concept introduced', 'familiarity', 'positive', RESOURCES.lec7),
    ],
    resources: [
      { ...RESOURCES.lec7, role: 'Primary explanation' },
      { ...RESOURCES.hw3, role: 'Worked example' },
    ],
  },
  'random-fourier-features': {
    concept_id: 'random-fourier-features',
    evidence: [
      ev('e1', 'Random Features blog post', 'Read and annotated', 'familiarity', 'positive', RESOURCES.blog),
      ev('e2', 'Self-report', 'Unsure of the proof', 'confidence', 'negative', RESOURCES.notes5),
    ],
    resources: [{ ...RESOURCES.blog, role: 'Only source so far' }],
  },
}

const GENERIC_DETAIL = (id: string): ConceptDetail => ({
  concept_id: id,
  evidence: [
    ev('e1', 'Lecture coverage', 'Concept introduced', 'familiarity', 'positive', RESOURCES.lec5),
  ],
  resources: [{ ...RESOURCES.lec5, role: 'Primary explanation' }],
})

export function conceptDetail(conceptId: string): ConceptDetail {
  return DETAILS[conceptId] ?? GENERIC_DETAIL(conceptId)
}

const WHY: Record<string, WhyExplanation> = {
  'psd-matrices': {
    concept_id: 'psd-matrices',
    summary:
      'Your mastery is low because graded work consistently misses the definiteness condition, even though you report high confidence. That gap between confidence and mastery is why this ranks first.',
    strongest_evidence: 'Lecture 6 notes show you followed the derivation',
    weakest_evidence: 'Midterm Q4: 2/8',
    prerequisite_reason:
      "Lecture 6 introduces PSD matrices before Mercer's theorem, and three HW3 concepts depend on it.",
  },
  mercer: {
    concept_id: 'mercer',
    summary:
      'You can apply the theorem on homework but not under exam conditions. Mastery is held down by the midterm result and by weak PSD foundations underneath it.',
    strongest_evidence: 'Homework 3 Q2: 4/5',
    weakest_evidence: 'Midterm Q4: 2/8',
    prerequisite_reason:
      "Mercer's theorem requires the kernel matrix to be positive semidefinite, so PSD matrices come first.",
  },
  'kernel-regression': {
    concept_id: 'kernel-regression',
    summary:
      'Your scores here are good, but this concept is marked fragile: it rests on PSD matrices and Mercer\'s theorem, both of which are weak. Performance is likely pattern-matching rather than understanding.',
    strongest_evidence: 'Homework 3 Q4: 8/10',
    weakest_evidence: 'Prerequisite mastery averages 0.35',
  },
  'kernel-functions': {
    concept_id: 'kernel-functions',
    summary:
      'Mastery is moderate but confidence is much lower, so the engine is unsure this score is real. A short diagnostic would resolve it.',
    strongest_evidence: 'Homework 3 Q1: 7/10',
    weakest_evidence: 'Self-reported low certainty',
  },
}

export function conceptWhy(conceptId: string): WhyExplanation | null {
  return WHY[conceptId] ?? null
}

export function layoutGraph() {
  const incoming = new Map<string, string[]>()
  for (const node of GRAPH_NODES) incoming.set(node.id, [])
  for (const edge of GRAPH_EDGES) incoming.get(edge.target)?.push(edge.source)

  const level = new Map<string, number>()
  const visit = (id: string): number => {
    const cached = level.get(id)
    if (cached !== undefined) return cached
    const parents = incoming.get(id) ?? []
    const next = parents.length === 0 ? 0 : Math.max(...parents.map(visit)) + 1
    level.set(id, next)
    return next
  }
  for (const node of GRAPH_NODES) visit(node.id)

  const columns = new Map<number, ConceptNode[]>()
  for (const node of GRAPH_NODES) {
    const col = level.get(node.id) ?? 0
    const list = columns.get(col) ?? []
    list.push(node)
    columns.set(col, list)
  }

  const maxLevel = Math.max(...level.values(), 1)
  const positions = new Map<string, { x: number; y: number }>()

  for (const [col, nodes] of columns) {
    const x = maxLevel === 0 ? 0.5 : col / maxLevel
    nodes.forEach((node, i) => {
      const y = nodes.length <= 1 ? 0.5 : i / (nodes.length - 1)
      positions.set(node.id, { x, y })
    })
  }

  return { positions, maxLevel }
}
