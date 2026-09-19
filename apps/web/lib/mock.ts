import type {
  ConceptDetail,
  ConceptNode,
  CourseResource,
  Evidence,
  GapsResponse,
  KnowledgeGraphResponse,
  Resource,
  StudyPlan,
  WhyExplanation,
} from "./types";

export const MOCK_COURSE = {
  id: "6.7900",
  name: "Intermediate Machine Learning",
};

export const MOCK_STUDENT_ID = "student_demo";

// ---------------------------------------------------------------------------
// Resources (provenance is never hidden)
// ---------------------------------------------------------------------------

export const RESOURCES: Record<string, Resource> = {
  lec5: { id: "lec5", title: "Professor Lecture 5", origin: "instructor", artifact_type: "lecture" },
  lec6: { id: "lec6", title: "Professor Lecture 6", origin: "instructor", artifact_type: "lecture" },
  lec7: { id: "lec7", title: "Professor Lecture 7", origin: "instructor", artifact_type: "lecture" },
  hw2: { id: "hw2", title: "Homework 2", origin: "instructor", artifact_type: "homework" },
  hw3: { id: "hw3", title: "Homework 3", origin: "instructor", artifact_type: "homework" },
  midterm: { id: "midterm", title: "Midterm", origin: "instructor", artifact_type: "exam" },
  notes4: { id: "notes4", title: "My Week 4 Notes", origin: "student_self", artifact_type: "student_notes" },
  notes5: { id: "notes5", title: "My Week 5 Notes", origin: "student_self", artifact_type: "student_notes" },
  sarah: { id: "sarah", title: "Sarah's Notes", origin: "classmate", artifact_type: "classmate_notes" },
  recitation: { id: "recitation", title: "TA Recitation 4", origin: "ta", artifact_type: "study_guide" },
  bishop: { id: "bishop", title: "Bishop Ch. 6 - Kernel Methods", origin: "instructor", artifact_type: "reading" },
  blog: { id: "blog", title: "Random Features blog post", origin: "external", artifact_type: "other" },
};

// ---------------------------------------------------------------------------
// The student's personal knowledge graph
// ---------------------------------------------------------------------------

type NodeSeed = Omit<ConceptNode, "scope" | "cluster"> &
  Partial<Pick<ConceptNode, "scope" | "cluster">>;

const NODE_SEEDS: NodeSeed[] = [
  {
    id: "linear-algebra",
    name: "Linear Algebra",
    cluster: "Foundations",
    discovery_state: "active",
    importance: 0.9,
    personal_relevance: 0.86,
    mastery: 0.92,
    familiarity: 0.95,
    confidence: 0.85,
    readiness: 0.94,
    fragility: 0.06,
    state: "mastered",
  },
  {
    id: "eigendecomposition",
    name: "Eigendecomposition",
    cluster: "Foundations",
    discovery_state: "active",
    importance: 0.74,
    personal_relevance: 0.71,
    mastery: 0.81,
    familiarity: 0.88,
    confidence: 0.77,
    readiness: 0.83,
    fragility: 0.12,
    state: "strong",
  },
  {
    id: "inner-products",
    name: "Inner Products",
    cluster: "Foundations",
    discovery_state: "active",
    importance: 0.82,
    personal_relevance: 0.8,
    mastery: 0.84,
    familiarity: 0.9,
    confidence: 0.79,
    readiness: 0.86,
    fragility: 0.1,
    state: "strong",
  },
  {
    id: "gram-matrix",
    name: "Gram Matrices",
    cluster: "Kernels",
    discovery_state: "encountered",
    importance: 0.63,
    personal_relevance: 0.68,
    mastery: 0.52,
    familiarity: 0.71,
    confidence: 0.44,
    readiness: 0.58,
    fragility: 0.31,
    state: "uncertain",
  },
  {
    id: "psd-matrices",
    name: "Positive Semidefinite Matrices",
    cluster: "Kernels",
    discovery_state: "active",
    importance: 0.88,
    personal_relevance: 0.93,
    mastery: 0.31,
    familiarity: 0.74,
    confidence: 0.78,
    readiness: 0.34,
    fragility: 0.22,
    state: "struggling",
  },
  {
    id: "mercer",
    name: "Mercer's Theorem",
    cluster: "Kernels",
    discovery_state: "active",
    importance: 0.85,
    personal_relevance: 0.89,
    mastery: 0.39,
    familiarity: 0.68,
    confidence: 0.65,
    readiness: 0.41,
    fragility: 0.27,
    state: "struggling",
  },
  {
    id: "rkhs",
    name: "Reproducing Kernel Hilbert Spaces",
    cluster: "Kernels",
    discovery_state: "frontier",
    importance: 0.57,
    personal_relevance: 0.48,
    mastery: null,
    familiarity: 0.12,
    confidence: 0.0,
    readiness: 0.29,
    fragility: 0.0,
    state: "frontier",
  },
  {
    id: "kernel-functions",
    name: "Kernel Functions",
    cluster: "Kernels",
    discovery_state: "active",
    importance: 0.91,
    personal_relevance: 0.9,
    mastery: 0.68,
    familiarity: 0.83,
    confidence: 0.52,
    readiness: 0.66,
    fragility: 0.34,
    state: "uncertain",
  },
  {
    id: "kernel-trick",
    name: "The Kernel Trick",
    cluster: "Kernels",
    discovery_state: "active",
    importance: 0.86,
    personal_relevance: 0.84,
    mastery: 0.73,
    familiarity: 0.85,
    confidence: 0.69,
    readiness: 0.72,
    fragility: 0.21,
    state: "developing",
  },
  {
    id: "svm",
    name: "Support Vector Machines",
    cluster: "Models",
    discovery_state: "encountered",
    importance: 0.7,
    personal_relevance: 0.55,
    mastery: 0.41,
    familiarity: 0.49,
    confidence: 0.38,
    readiness: 0.52,
    fragility: 0.29,
    state: "exposed",
  },
  {
    id: "regularization",
    name: "Regularization",
    cluster: "Models",
    discovery_state: "active",
    importance: 0.76,
    personal_relevance: 0.72,
    mastery: 0.66,
    familiarity: 0.79,
    confidence: 0.7,
    readiness: 0.74,
    fragility: 0.18,
    state: "developing",
  },
  {
    id: "kernel-regression",
    name: "Kernel Regression",
    cluster: "Models",
    discovery_state: "active",
    importance: 0.93,
    personal_relevance: 0.95,
    mastery: 0.74,
    familiarity: 0.81,
    confidence: 0.71,
    readiness: 0.48,
    fragility: 0.72,
    state: "fragile",
  },
  {
    id: "cross-validation",
    name: "Cross Validation",
    cluster: "Models",
    discovery_state: "encountered",
    importance: 0.64,
    personal_relevance: 0.6,
    mastery: 0.58,
    familiarity: 0.66,
    confidence: 0.49,
    readiness: 0.61,
    fragility: 0.33,
    state: "stale",
  },
  {
    id: "bandwidth-selection",
    name: "Bandwidth Selection",
    cluster: "Models",
    discovery_state: "frontier",
    importance: 0.69,
    personal_relevance: 0.77,
    mastery: null,
    familiarity: 0.08,
    confidence: 0.0,
    readiness: 0.44,
    fragility: 0.0,
    state: "frontier",
  },
  {
    id: "random-fourier-features",
    name: "Random Fourier Features",
    scope: "personal",
    cluster: "Personal",
    discovery_state: "encountered",
    importance: 0.35,
    personal_relevance: 0.81,
    mastery: 0.45,
    familiarity: 0.62,
    confidence: 0.4,
    readiness: 0.47,
    fragility: 0.38,
    state: "uncertain",
  },
];

export const MOCK_NODES: ConceptNode[] = NODE_SEEDS.map((n) => ({
  scope: "course",
  ...n,
})) as ConceptNode[];

export const MOCK_EDGES: KnowledgeGraphResponse["edges"] = [
  { source: "linear-algebra", target: "eigendecomposition", type: "prerequisite", origin: "course", confidence: 0.95 },
  { source: "linear-algebra", target: "inner-products", type: "prerequisite", origin: "course", confidence: 0.94 },
  { source: "inner-products", target: "gram-matrix", type: "prerequisite", origin: "course", confidence: 0.88 },
  { source: "eigendecomposition", target: "psd-matrices", type: "prerequisite", origin: "course", confidence: 0.91 },
  { source: "gram-matrix", target: "psd-matrices", type: "prerequisite", origin: "course", confidence: 0.86 },
  { source: "psd-matrices", target: "mercer", type: "prerequisite", origin: "course", confidence: 0.93 },
  { source: "mercer", target: "kernel-functions", type: "prerequisite", origin: "course", confidence: 0.9 },
  { source: "mercer", target: "rkhs", type: "extends", origin: "course", confidence: 0.72 },
  { source: "kernel-functions", target: "kernel-trick", type: "prerequisite", origin: "course", confidence: 0.89 },
  { source: "kernel-trick", target: "svm", type: "applies_to", origin: "course", confidence: 0.8 },
  { source: "kernel-trick", target: "kernel-regression", type: "prerequisite", origin: "course", confidence: 0.92 },
  { source: "regularization", target: "kernel-regression", type: "prerequisite", origin: "course", confidence: 0.78 },
  { source: "kernel-regression", target: "bandwidth-selection", type: "prerequisite", origin: "course", confidence: 0.87 },
  { source: "cross-validation", target: "bandwidth-selection", type: "prerequisite", origin: "course", confidence: 0.83 },
  { source: "kernel-functions", target: "random-fourier-features", type: "approximates", origin: "personal", confidence: 0.64 },
];

export const MOCK_GRAPH: KnowledgeGraphResponse = {
  student_id: MOCK_STUDENT_ID,
  course_id: MOCK_COURSE.id,
  graph_version: 7,
  nodes: MOCK_NODES,
  edges: MOCK_EDGES,
  hidden_concept_count: 41,
};

// ---------------------------------------------------------------------------
// Evidence + resources per concept
// ---------------------------------------------------------------------------

function ev(
  id: string,
  label: string,
  detail: string,
  kind: Evidence["kind"],
  polarity: Evidence["polarity"],
  source: Resource,
): Evidence {
  return { id, label, detail, kind, polarity, source };
}

const DETAILS: Record<string, ConceptDetail> = {
  "psd-matrices": {
    concept_id: "psd-matrices",
    evidence: [
      ev("e1", "Midterm Q4", "2 / 8", "mastery", "negative", RESOURCES.midterm),
      ev("e2", "Homework 2 Q5", "3 / 6", "mastery", "negative", RESOURCES.hw2),
      ev("e3", "My Week 4 Notes", "Covered concept", "familiarity", "neutral", RESOURCES.notes4),
      ev("e4", "Lecture 6", "Concept introduced", "familiarity", "positive", RESOURCES.lec6),
    ],
    resources: [
      { ...RESOURCES.lec6, role: "Primary explanation" },
      { ...RESOURCES.sarah, role: "Alternate intuition" },
      { ...RESOURCES.recitation, role: "Worked practice" },
    ],
  },
  mercer: {
    concept_id: "mercer",
    evidence: [
      ev("e1", "Midterm Q4", "2 / 8", "mastery", "negative", RESOURCES.midterm),
      ev("e2", "Homework 3 Q2", "4 / 5", "mastery", "positive", RESOURCES.hw3),
      ev("e3", "My Week 4 Notes", "Covered concept", "familiarity", "neutral", RESOURCES.notes4),
      ev("e4", "Sarah's Notes", "Cross-referenced", "familiarity", "positive", RESOURCES.sarah),
    ],
    resources: [
      { ...RESOURCES.lec6, role: "Primary explanation" },
      { ...RESOURCES.sarah, role: "Alternate intuition" },
      { ...RESOURCES.hw3, role: "Worked example" },
      { ...RESOURCES.bishop, role: "Formal treatment" },
    ],
  },
  "kernel-functions": {
    concept_id: "kernel-functions",
    evidence: [
      ev("e1", "Homework 3 Q1", "7 / 10", "mastery", "positive", RESOURCES.hw3),
      ev("e2", "Self-report", "Low stated certainty", "confidence", "negative", RESOURCES.notes5),
      ev("e3", "Lecture 7", "Concept introduced", "familiarity", "positive", RESOURCES.lec7),
    ],
    resources: [
      { ...RESOURCES.lec7, role: "Primary explanation" },
      { ...RESOURCES.bishop, role: "Formal treatment" },
    ],
  },
  "kernel-regression": {
    concept_id: "kernel-regression",
    evidence: [
      ev("e1", "Homework 3 Q4", "8 / 10", "mastery", "positive", RESOURCES.hw3),
      ev("e2", "Prerequisite check", "Foundations are weak", "mastery", "negative", RESOURCES.midterm),
      ev("e3", "Lecture 7", "Concept introduced", "familiarity", "positive", RESOURCES.lec7),
    ],
    resources: [
      { ...RESOURCES.lec7, role: "Primary explanation" },
      { ...RESOURCES.hw3, role: "Worked example" },
    ],
  },
  "random-fourier-features": {
    concept_id: "random-fourier-features",
    evidence: [
      ev("e1", "Random Features blog post", "Read and annotated", "familiarity", "positive", RESOURCES.blog),
      ev("e2", "Self-report", "Unsure of the proof", "confidence", "negative", RESOURCES.notes5),
    ],
    resources: [{ ...RESOURCES.blog, role: "Only source so far" }],
  },
};

const GENERIC_DETAIL = (id: string): ConceptDetail => ({
  concept_id: id,
  evidence: [
    ev("e1", "Lecture coverage", "Concept introduced", "familiarity", "positive", RESOURCES.lec5),
  ],
  resources: [{ ...RESOURCES.lec5, role: "Primary explanation" }],
});

export function mockConceptDetail(conceptId: string): ConceptDetail {
  return DETAILS[conceptId] ?? GENERIC_DETAIL(conceptId);
}

const WHY: Record<string, WhyExplanation> = {
  "psd-matrices": {
    concept_id: "psd-matrices",
    summary:
      "Your mastery is low because graded work consistently misses the definiteness condition, even though you report high confidence. That gap between confidence and mastery is why this ranks first.",
    strongest_evidence: "Lecture 6 notes show you followed the derivation",
    weakest_evidence: "Midterm Q4: 2/8",
    prerequisite_reason:
      "Lecture 6 introduces PSD matrices before Mercer's theorem, and three HW3 concepts depend on it.",
  },
  mercer: {
    concept_id: "mercer",
    summary:
      "You can apply the theorem on homework but not under exam conditions. Mastery is held down by the midterm result and by weak PSD foundations underneath it.",
    strongest_evidence: "Homework 3 Q2: 4/5",
    weakest_evidence: "Midterm Q4: 2/8",
    prerequisite_reason:
      "Mercer's theorem requires the kernel matrix to be positive semidefinite, so PSD matrices come first.",
  },
  "kernel-regression": {
    concept_id: "kernel-regression",
    summary:
      "Your scores here are good, but this concept is marked fragile: it rests on PSD matrices and Mercer's theorem, both of which are weak. Performance is likely pattern-matching rather than understanding.",
    strongest_evidence: "Homework 3 Q4: 8/10",
    weakest_evidence: "Prerequisite mastery averages 0.35",
  },
  "kernel-functions": {
    concept_id: "kernel-functions",
    summary:
      "Mastery is moderate but confidence is much lower, so the engine is unsure this score is real. A short diagnostic would resolve it.",
    strongest_evidence: "Homework 3 Q1: 7/10",
    weakest_evidence: "Self-reported low certainty",
  },
};

export function mockWhy(conceptId: string): WhyExplanation | null {
  return WHY[conceptId] ?? null;
}

// ---------------------------------------------------------------------------
// Gaps + study plan
// ---------------------------------------------------------------------------

export const MOCK_TARGET = "Prepare for HW3";

export const MOCK_GAPS: GapsResponse = {
  target: MOCK_TARGET,
  gaps: [
    {
      concept_id: "psd-matrices",
      concept_name: "Positive Semidefinite Matrices",
      mastery: 0.31,
      confidence: 0.78,
      priority: 0.93,
      action: "STUDY",
      reason: "Foundational prerequisite for 3 concepts required by HW3.",
    },
    {
      concept_id: "mercer",
      concept_name: "Mercer's Theorem",
      mastery: 0.39,
      confidence: 0.65,
      priority: 0.84,
      action: "STUDY",
      reason: "Directly assessed on HW3 Q2 and currently unstable under exam conditions.",
    },
    {
      concept_id: "kernel-functions",
      concept_name: "Kernel Functions",
      mastery: 0.68,
      confidence: 0.52,
      priority: 0.55,
      action: "DIAGNOSE",
      reason: "Mastery looks adequate but confidence is low - the score may not be trustworthy.",
    },
    {
      concept_id: "cross-validation",
      concept_name: "Cross Validation",
      mastery: 0.58,
      confidence: 0.49,
      priority: 0.34,
      action: "REVIEW",
      reason: "Not touched in four weeks and needed downstream for bandwidth selection.",
    },
  ],
};

export const MOCK_STUDY_PLAN: StudyPlan = {
  target: MOCK_TARGET,
  steps: [
    {
      order: 1,
      concept_id: "psd-matrices",
      concept_name: "Positive Semidefinite Matrices",
      reason: "It is a prerequisite for three concepts needed for HW3.",
      mastery: 0.31,
      resources: [
        { ...RESOURCES.lec6, role: "Start here" },
        { ...RESOURCES.sarah, role: "If the lecture does not land" },
      ],
    },
    {
      order: 2,
      concept_id: "mercer",
      concept_name: "Mercer's Theorem",
      reason: "Builds directly on PSD matrices and is assessed on HW3 Q2.",
      mastery: 0.39,
      resources: [
        { ...RESOURCES.lec6, role: "Start here" },
        { ...RESOURCES.bishop, role: "Formal treatment" },
      ],
    },
    {
      order: 3,
      concept_id: "kernel-functions",
      concept_name: "Kernel Functions",
      reason: "Confidence is low here - a short diagnostic will confirm whether 68% is real.",
      mastery: 0.68,
      resources: [{ ...RESOURCES.hw3, role: "Self-check with Q1" }],
    },
    {
      order: 4,
      concept_id: "kernel-regression",
      concept_name: "Kernel Regression",
      reason: "Marked fragile - re-derive it once the foundations underneath are solid.",
      mastery: 0.74,
      resources: [{ ...RESOURCES.lec7, role: "Re-derive from here" }],
    },
  ],
};

export const MOCK_TARGETS = [
  "Prepare for HW3",
  "Prepare for the Final",
  "Shore up weak foundations",
];

// ---------------------------------------------------------------------------
// Files view
// ---------------------------------------------------------------------------

export const MOCK_RESOURCES: CourseResource[] = [
  { id: "lec6", title: "Professor Lecture 6", origin: "instructor", artifact_type: "lecture", concept_count: 12, status: "complete", uploaded_at: "2026-09-14" },
  { id: "lec7", title: "Professor Lecture 7", origin: "instructor", artifact_type: "lecture", concept_count: 9, status: "complete", uploaded_at: "2026-09-16" },
  { id: "notes4", title: "My Week 4 Notes", origin: "student_self", artifact_type: "student_notes", concept_count: 6, status: "complete", uploaded_at: "2026-09-15" },
  { id: "hw3", title: "Homework 3", origin: "instructor", artifact_type: "homework", concept_count: 8, status: "complete", uploaded_at: "2026-09-17" },
  { id: "sarah", title: "Sarah's Notes", origin: "classmate", artifact_type: "classmate_notes", concept_count: 5, status: "complete", uploaded_at: "2026-09-17" },
  { id: "midterm", title: "Midterm", origin: "instructor", artifact_type: "exam", concept_count: 11, status: "complete", uploaded_at: "2026-09-12" },
  { id: "recitation", title: "TA Recitation 4", origin: "ta", artifact_type: "study_guide", concept_count: 4, status: "processing", uploaded_at: "2026-09-18" },
];
