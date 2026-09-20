import type {
  ConceptDetail,
  ConceptEdge,
  ConceptNode,
  CourseResource,
  Gap,
  GapsResponse,
  KnowledgeGraphResponse,
  Resource,
  StudyPlan,
  StudyTarget,
} from "./types";

/** File-derived HackMIT course fixtures. Only DEMO_STATES are simulated. */
export const MOCK_STUDENT_ID = "student_demo";
export interface MockCourse {
  id: string;
  code: string;
  name: string;
  archive: string;
  sourceFiles: string[];
}
type ResourceSeed = [
  string,
  string,
  string,
  CourseResource["artifact_type"],
  CourseResource["origin"]?,
];
type ConceptSeed = [string, string, string, string[]];
type CourseSeed = {
  course: MockCourse;
  resources: ResourceSeed[];
  concepts: ConceptSeed[];
  edges: [string, string, string?][];
};
const c = (
  id: string,
  name: string,
  cluster: string,
  resources: string[],
): ConceptSeed => [id, name, cluster, resources];
const r = (
  id: string,
  title: string,
  path: string,
  type: ResourceSeed[3],
  origin?: ResourceSeed[4],
): ResourceSeed => [id, title, path, type, origin];

// The values deliberately vary, but are deterministic demo student state—not extracted evidence.
const DEMO_STATES: Omit<ConceptNode, "id" | "name" | "cluster">[] = [
  {
    scope: "course",
    discovery_state: "active",
    importance: 0.92,
    personal_relevance: 0.82,
    understanding: 0.88,
    state: "mastered",
  },
  {
    scope: "course",
    discovery_state: "encountered",
    importance: 0.86,
    personal_relevance: 0.78,
    understanding: 0.66,
    state: "strong",
  },
  {
    scope: "course",
    discovery_state: "active",
    importance: 0.9,
    personal_relevance: 0.88,
    understanding: 0.48,
    state: "uncertain",
  },
  {
    scope: "course",
    discovery_state: "frontier",
    importance: 0.82,
    personal_relevance: 0.74,
    understanding: null,
    state: "frontier",
  },
  {
    scope: "course",
    discovery_state: "encountered",
    importance: 0.8,
    personal_relevance: 0.7,
    understanding: 0.37,
    state: "struggling",
  },
  {
    scope: "course",
    discovery_state: "active",
    importance: 0.84,
    personal_relevance: 0.8,
    understanding: 0.72,
    state: "developing",
  },
];

const COURSE_SEEDS: CourseSeed[] = [
  {
    course: {
      id: "6.1210",
      code: "6.1210",
      name: "Introduction to Algorithms",
      archive: "course-materials/6.1210.zip",
      sourceFiles: [
        "handouts/course_information.pdf",
        "lectures/L01-karatsuba.pdf",
        "lectures/L07-BSTs.pdf",
        "lectures/L10-graph-search.pdf",
        "lectures/L14-Dijkstra.pdf",
        "lectures/L19-DP.pdf",
        "lectures/L22-DP-Subset-Sum.pdf",
        "lectures/L23-Complexity.pdf",
      ],
    },
    resources: [
      r(
        "a1",
        "course_information.pdf",
        "6.1210/handouts/course_information.pdf",
        "syllabus",
      ),
      r(
        "a2",
        "L01-karatsuba.pdf",
        "6.1210/lectures/L01-karatsuba.pdf",
        "lecture",
      ),
      r("a3", "L07-BSTs.pdf", "6.1210/lectures/L07-BSTs.pdf", "lecture"),
      r(
        "a4",
        "L10-graph-search.pdf",
        "6.1210/lectures/L10-graph-search.pdf",
        "lecture",
      ),
      r(
        "a5",
        "L14-Dijkstra.pdf",
        "6.1210/lectures/L14-Dijkstra.pdf",
        "lecture",
      ),
      r("a6", "L19-DP.pdf", "6.1210/lectures/L19-DP.pdf", "lecture"),
      r(
        "a7",
        "L22-DP-Subset-Sum.pdf",
        "6.1210/lectures/L22-DP-Subset-Sum.pdf",
        "lecture",
      ),
      r(
        "a8",
        "L23-Complexity.pdf",
        "6.1210/lectures/L23-Complexity.pdf",
        "lecture",
      ),
    ],
    concepts: [
      c("a-asym", "Asymptotic Analysis", "Foundations", ["a1", "a2"]),
      c("a-divide", "Divide and Conquer", "Foundations", ["a2"]),
      c("a-karatsuba", "Karatsuba Multiplication", "Foundations", ["a2"]),
      c("a-bst", "Binary Search Trees", "Data Structures", ["a3"]),
      c("a-avl", "AVL Trees", "Data Structures", ["a3"]),
      c("a-graph", "Graph Search", "Graphs", ["a4"]),
      c("a-bfs", "Breadth-First and Depth-First Search", "Graphs", ["a4"]),
      c("a-scc", "Strongly Connected Components", "Graphs", ["a4"]),
      c("a-pq", "Priority Queues", "Graphs", ["a5"]),
      c("a-dijkstra", "Dijkstra's Algorithm", "Graphs", ["a5"]),
      c("a-bellman", "Bellman-Ford Algorithm", "Graphs", ["a5"]),
      c("a-greedy", "Greedy Algorithms", "Optimization", ["a5"]),
      c("a-dp", "Dynamic Programming", "Optimization", ["a6"]),
      c("a-subset", "Subset Sum", "Optimization", ["a7", "a8"]),
      c("a-complexity", "Complexity Theory", "Theory", ["a8"]),
    ],
    edges: [
      ["a-asym", "a-divide"],
      ["a-divide", "a-karatsuba"],
      ["a-bst", "a-avl"],
      ["a-graph", "a-bfs"],
      ["a-bfs", "a-scc"],
      ["a-pq", "a-dijkstra"],
      ["a-graph", "a-dijkstra"],
      ["a-graph", "a-bellman"],
      ["a-dijkstra", "a-bellman", "RELATED_TO"],
      ["a-greedy", "a-dp", "CONTRASTS_WITH"],
      ["a-dp", "a-subset"],
      ["a-subset", "a-complexity"],
    ],
  },
  {
    course: {
      id: "6.1400",
      code: "6.1400",
      name: "Computability and Complexity Theory",
      archive: "course-materials/6.1400.zip",
      sourceFiles: [
        "lectures/Lecture 1.pdf",
        "lectures/Lecture 3.pdf",
        "lectures/Lecture 5.pdf",
        "lectures/Lecture 7.pdf",
        "lectures/Lecture 10.pdf",
        "lectures/Lecture 14.pdf",
        "lectures/Lecture 17.pdf",
        "lectures/Lecture 21.pdf",
      ],
    },
    resources: [
      r(
        "t1",
        "Lecture 1.pdf",
        "6.1400/spring-2026/lectures/Lecture 1.pdf",
        "lecture",
      ),
      r(
        "t2",
        "Lecture 3.pdf",
        "6.1400/spring-2026/lectures/Lecture 3.pdf",
        "lecture",
      ),
      r(
        "t3",
        "Lecture 5.pdf",
        "6.1400/spring-2026/lectures/Lecture 5.pdf",
        "lecture",
      ),
      r(
        "t4",
        "Lecture 7.pdf",
        "6.1400/spring-2026/lectures/Lecture 7.pdf",
        "lecture",
      ),
      r(
        "t5",
        "Lecture 10.pdf",
        "6.1400/spring-2026/lectures/Lecture 10.pdf",
        "lecture",
      ),
      r(
        "t6",
        "Lecture 14.pdf",
        "6.1400/spring-2026/lectures/Lecture 14.pdf",
        "lecture",
      ),
      r(
        "t7",
        "Lecture 17.pdf",
        "6.1400/spring-2026/lectures/Lecture 17.pdf",
        "lecture",
      ),
      r(
        "t8",
        "Lecture 21.pdf",
        "6.1400/spring-2026/lectures/Lecture 21.pdf",
        "lecture",
      ),
    ],
    concepts: [
      c("t-lang", "Formal Languages", "Automata", ["t1"]),
      c("t-dfa", "Deterministic Finite Automata", "Automata", ["t1"]),
      c("t-nfa", "Nondeterministic Finite Automata", "Automata", ["t1", "t2"]),
      c("t-regular", "Regular Languages", "Automata", ["t1", "t2"]),
      c("t-regex", "Regular Expressions", "Automata", ["t2"]),
      c("t-cfl", "Context-Free Languages", "Grammars", ["t3"]),
      c("t-cfg", "Context-Free Grammars", "Grammars", ["t3"]),
      c("t-pda", "Pushdown Automata", "Grammars", ["t4"]),
      c("t-tm", "Turing Machines", "Computability", ["t5"]),
      c("t-church", "Church-Turing Thesis", "Computability", ["t5"]),
      c("t-decidable", "Decidable Languages", "Computability", ["t5", "t6"]),
      c("t-reductions", "Mapping Reductions", "Computability", ["t6"]),
      c("t-rice", "Rice's Theorem", "Computability", ["t6"]),
      c("t-p", "Class P", "Complexity", ["t7"]),
      c("t-np", "Class NP and NP-Completeness", "Complexity", ["t7", "t8"]),
    ],
    edges: [
      ["t-lang", "t-dfa"],
      ["t-dfa", "t-nfa", "RELATED_TO"],
      ["t-dfa", "t-regular"],
      ["t-regex", "t-regular", "RELATED_TO"],
      ["t-cfg", "t-cfl"],
      ["t-cfl", "t-pda"],
      ["t-tm", "t-church", "RELATED_TO"],
      ["t-tm", "t-decidable"],
      ["t-decidable", "t-reductions"],
      ["t-reductions", "t-rice"],
      ["t-tm", "t-p"],
      ["t-p", "t-np"],
    ],
  },
  {
    course: {
      id: "18.06",
      code: "18.06",
      name: "Linear Algebra",
      archive: "course-materials/18.06.zip",
      sourceFiles: [
        "course-info/syllabus.pdf",
        "exercises/pset1.pdf",
        "exercises/pset3.pdf",
        "exercises/pset5.pdf",
        "exercises/pset7.pdf",
        "exercises/pset9.pdf",
        "local-coursework/Comp 1.2 LA.py",
      ],
    },
    resources: [
      r(
        "l1",
        "syllabus.pdf",
        "18.06/spring-2026/course-info/syllabus.pdf",
        "syllabus",
      ),
      r("l2", "pset1.pdf", "18.06/spring-2026/exercises/pset1.pdf", "homework"),
      r("l3", "pset3.pdf", "18.06/spring-2026/exercises/pset3.pdf", "homework"),
      r("l4", "pset5.pdf", "18.06/spring-2026/exercises/pset5.pdf", "homework"),
      r("l5", "pset7.pdf", "18.06/spring-2026/exercises/pset7.pdf", "homework"),
      r("l6", "pset9.pdf", "18.06/spring-2026/exercises/pset9.pdf", "homework"),
      r(
        "l7",
        "Comp 1.2 LA.py",
        "18.06/local-coursework/Comp 1.2 LA.py",
        "worked_solution",
        "student_self",
      ),
    ],
    concepts: [
      c("l-vectors", "Vectors", "Foundations", ["l1", "l2"]),
      c("l-comb", "Linear Combinations", "Foundations", ["l2"]),
      c("l-span", "Span", "Foundations", ["l2"]),
      c("l-matrix", "Matrix Operations", "Matrices", ["l2", "l7"]),
      c("l-systems", "Linear Systems", "Matrices", ["l3"]),
      c("l-elim", "Gaussian Elimination", "Matrices", ["l3"]),
      c("l-invert", "Invertible Matrices", "Matrices", ["l3"]),
      c("l-subspaces", "Subspaces", "Vector Spaces", ["l3"]),
      c("l-fundamental", "Four Fundamental Subspaces", "Vector Spaces", ["l4"]),
      c("l-transform", "Linear Transformations", "Vector Spaces", ["l4"]),
      c("l-determinant", "Determinants", "Eigenvalues", ["l4"]),
      c("l-eigen", "Eigenvalues and Eigenvectors", "Eigenvalues", ["l5"]),
      c("l-orthogonal", "Orthogonality", "Orthogonality", ["l4"]),
      c(
        "l-projection",
        "Projection Matrices and Least Squares",
        "Orthogonality",
        ["l4"],
      ),
      c("l-svd", "Singular Value Decomposition", "Applications", ["l6"]),
    ],
    edges: [
      ["l-vectors", "l-comb"],
      ["l-comb", "l-span"],
      ["l-matrix", "l-systems"],
      ["l-systems", "l-elim"],
      ["l-elim", "l-invert"],
      ["l-span", "l-subspaces"],
      ["l-subspaces", "l-fundamental"],
      ["l-matrix", "l-transform"],
      ["l-determinant", "l-eigen"],
      ["l-orthogonal", "l-projection"],
      ["l-projection", "l-svd"],
      ["l-eigen", "l-svd"],
    ],
  },
  {
    course: {
      id: "8.223",
      code: "8.223",
      name: "Classical Mechanics II",
      archive: "course-materials/8.223.zip",
      sourceFiles: [
        "Lecture Notes/L1-notes.pdf",
        "Lecture Notes/L2-notes.pdf",
        "Lecture Notes/L4-notes.pdf",
        "Lecture Notes/L6-notes.pdf",
        "Lecture Notes/L8-notes.pdf",
        "Lecture Notes/L10-notes.pdf",
        "Lecture Notes/L11-notes.pdf",
        "local-coursework/Legendre Transforms for Dummies.pdf",
      ],
    },
    resources: [
      r("m1", "L1-notes.pdf", "8.223/Lecture Notes/L1-notes.pdf", "lecture"),
      r("m2", "L2-notes.pdf", "8.223/Lecture Notes/L2-notes.pdf", "lecture"),
      r("m3", "L4-notes.pdf", "8.223/Lecture Notes/L4-notes.pdf", "lecture"),
      r("m4", "L6-notes.pdf", "8.223/Lecture Notes/L6-notes.pdf", "lecture"),
      r("m5", "L8-notes.pdf", "8.223/Lecture Notes/L8-notes.pdf", "lecture"),
      r("m6", "L10-notes.pdf", "8.223/Lecture Notes/L10-notes.pdf", "lecture"),
      r("m7", "L11-notes.pdf", "8.223/Lecture Notes/L11-notes.pdf", "lecture"),
      r(
        "m8",
        "Legendre Transforms for Dummies.pdf",
        "8.223/local-coursework/Legendre Transforms for Dummies.pdf",
        "reading",
        "external",
      ),
    ],
    concepts: [
      c("m-action", "Principle of Stationary Action", "Lagrangian Mechanics", [
        "m1",
      ]),
      c("m-lagrange", "Lagrangian", "Lagrangian Mechanics", ["m1", "m2"]),
      c("m-coords", "Generalized Coordinates", "Lagrangian Mechanics", ["m2"]),
      c("m-euler", "Euler-Lagrange Equations", "Lagrangian Mechanics", ["m2"]),
      c("m-noninertial", "Non-Inertial Frames", "Lagrangian Mechanics", ["m3"]),
      c("m-symmetry", "Symmetry and Conservation Laws", "Conservation", ["m2"]),
      c("m-energy", "Energy Conservation", "Conservation", ["m2"]),
      c("m-angular", "Angular Momentum", "Central Forces", ["m4"]),
      c("m-central", "Central Potentials", "Central Forces", ["m4", "m5"]),
      c("m-orbits", "Two-Body Orbits", "Central Forces", ["m4"]),
      c("m-effective", "Effective Potential", "Central Forces", ["m5"]),
      c("m-precession", "Orbital Precession", "Central Forces", ["m5"]),
      c("m-legendre", "Legendre Transformation", "Hamiltonian Mechanics", [
        "m6",
        "m8",
      ]),
      c("m-canonical", "Canonical Momentum", "Hamiltonian Mechanics", ["m6"]),
      c(
        "m-hamilton",
        "Hamiltonian Mechanics and Canonical Transformations",
        "Hamiltonian Mechanics",
        ["m6", "m7"],
      ),
    ],
    edges: [
      ["m-action", "m-lagrange"],
      ["m-coords", "m-euler"],
      ["m-lagrange", "m-euler"],
      ["m-euler", "m-noninertial", "APPLICATION_OF"],
      ["m-symmetry", "m-energy"],
      ["m-symmetry", "m-angular"],
      ["m-angular", "m-central"],
      ["m-central", "m-orbits"],
      ["m-central", "m-effective"],
      ["m-effective", "m-precession"],
      ["m-lagrange", "m-legendre"],
      ["m-legendre", "m-hamilton"],
      ["m-canonical", "m-hamilton"],
    ],
  },
  {
    course: {
      id: "16.C20",
      code: "16.C20",
      name: "Computational Science and Engineering",
      archive: "course-materials/16.C20.zip",
      sourceFiles: [
        "README.md",
        "IVPlib_rev0/coffee_model_rev0.py",
        "resource-2/startercode/mylinsolver.py",
        "resource-2/startercode/mynonlinsolver.py",
        "resource-2/startercode/solve_robertson.py",
        "Lec15Code/gd1.py",
        "Lec15Code/can_opt.py",
        "resource-4/startercode/cellopt.py",
        "resource-6/startercode/neuron_model.py",
      ],
    },
    resources: [
      r("s1", "README.md", "16.C20/README.md", "study_guide"),
      r(
        "s2",
        "coffee_model_rev0.py",
        "16.C20/IVPlib_rev0/coffee_model_rev0.py",
        "worked_solution",
      ),
      r(
        "s3",
        "mylinsolver.py",
        "16.C20/resource-2/startercode/mylinsolver.py",
        "homework",
      ),
      r(
        "s4",
        "mynonlinsolver.py",
        "16.C20/resource-2/startercode/mynonlinsolver.py",
        "homework",
      ),
      r(
        "s5",
        "solve_robertson.py",
        "16.C20/resource-2/startercode/solve_robertson.py",
        "homework",
      ),
      r("s6", "gd1.py", "16.C20/Lec15Code/gd1.py", "lecture"),
      r("s7", "can_opt.py", "16.C20/Lec15Code/can_opt.py", "lecture"),
      r(
        "s8",
        "cellopt.py",
        "16.C20/resource-4/startercode/cellopt.py",
        "homework",
      ),
      r(
        "s9",
        "neuron_model.py",
        "16.C20/resource-6/startercode/neuron_model.py",
        "homework",
      ),
    ],
    concepts: [
      c("s-arrays", "NumPy Arrays", "Programming", ["s1"]),
      c("s-ivp", "Initial Value Problems", "Differential Equations", ["s2"]),
      c("s-rhs", "ODE Right-Hand Sides", "Differential Equations", [
        "s2",
        "s5",
      ]),
      c("s-timestep", "Time Stepping", "Differential Equations", ["s2"]),
      c("s-linear", "Linear Systems", "Numerical Linear Algebra", ["s3"]),
      c("s-gaussian", "Gaussian Elimination", "Numerical Linear Algebra", [
        "s3",
      ]),
      c("s-nonlinear", "Nonlinear Systems", "Numerical Methods", ["s4"]),
      c("s-newton", "Newton's Method", "Numerical Methods", ["s4"]),
      c("s-jacobian", "Jacobians", "Numerical Methods", ["s4", "s5"]),
      c("s-reaction", "Robertson Reaction Model", "Differential Equations", [
        "s5",
      ]),
      c("s-objective", "Objective Functions", "Optimization", ["s7", "s8"]),
      c("s-gradient", "Gradient Descent", "Optimization", ["s6", "s8"]),
      c("s-constrained", "Constrained Optimization", "Optimization", ["s7"]),
      c("s-pnorm", "p-Norm Approximation", "Optimization", ["s8"]),
      c("s-neuron", "Neuron Simulation", "Applications", ["s9"]),
    ],
    edges: [
      ["s-arrays", "s-linear"],
      ["s-linear", "s-gaussian"],
      ["s-ivp", "s-rhs"],
      ["s-rhs", "s-timestep"],
      ["s-jacobian", "s-newton"],
      ["s-nonlinear", "s-newton"],
      ["s-newton", "s-reaction", "APPLICATION_OF"],
      ["s-rhs", "s-reaction", "APPLICATION_OF"],
      ["s-objective", "s-gradient"],
      ["s-gradient", "s-constrained"],
      ["s-objective", "s-pnorm"],
      ["s-ivp", "s-neuron", "APPLICATION_OF"],
    ],
  },
];

export const MOCK_COURSES = COURSE_SEEDS.map(({ course }) => course);
export const MOCK_COURSE = MOCK_COURSES[0];
function build(seed: CourseSeed) {
  const nodes: ConceptNode[] = seed.concepts.map(([id, name, cluster], i) => ({
    ...DEMO_STATES[i % DEMO_STATES.length],
    id,
    name,
    cluster,
  }));
  const resources: CourseResource[] = seed.resources.map(
    ([id, title, _path, artifact_type, origin = "instructor"]) => {
      const concept_ids = seed.concepts
        .filter(([, , , ids]) => ids.includes(id))
        .map(([conceptId]) => conceptId);
      return {
        id,
        title,
        origin,
        artifact_type,
        concept_ids,
        concept_count: concept_ids.length,
        status: "complete",
        uploaded_at: "2026-02-01T00:00:00Z",
      };
    },
  );
  const edges: ConceptEdge[] = seed.edges.map(([source, target, type]) => ({
    source,
    target,
    type: type ?? "PREREQUISITE_FOR",
    origin: "course",
    confidence: 1,
  }));
  return {
    course: seed.course,
    concepts: seed.concepts,
    resources,
    graph: {
      course_id: seed.course.id,
      student_id: MOCK_STUDENT_ID,
      graph_version: 1,
      nodes,
      edges,
      hidden_concept_count: 0,
    } satisfies KnowledgeGraphResponse,
  };
}
const DATA = new Map(COURSE_SEEDS.map((seed) => [seed.course.id, build(seed)]));
export type MockCourseData = ReturnType<typeof build>;
export function getMockCourseData(courseId: string): MockCourseData {
  return DATA.get(courseId) ?? DATA.get(MOCK_COURSE.id)!;
}
export const MOCK_GRAPH = getMockCourseData(MOCK_COURSE.id).graph;
export const MOCK_RESOURCES = getMockCourseData(MOCK_COURSE.id).resources;
export const MOCK_TARGETS = MOCK_GRAPH.nodes.slice(0, 8).map((n) => n.name);
export const MOCK_GAPS: GapsResponse = {
  target: { id: MOCK_GRAPH.nodes[0].id, label: MOCK_GRAPH.nodes[0].name },
  gaps: [],
};
export const MOCK_STUDY_PLAN: StudyPlan = {
  target: MOCK_GAPS.target,
  steps: [],
};
function detail(courseId: string, id: string): ConceptDetail {
  const data = getMockCourseData(courseId);
  const concept = data.concepts.find(([key]) => key === id);
  const resources = (concept?.[3] ?? [])
    .map((resourceId) => data.resources.find((x) => x.id === resourceId))
    .filter((x): x is CourseResource => Boolean(x))
    .map(({ id, title, origin, artifact_type }) => ({
      id,
      title,
      origin,
      artifact_type,
      role: "Course material",
    }));
  return { concept_id: id, definition: "", evidence: [], resources };
}
export function mockConceptDetail(courseId: string, conceptId?: string) {
  return detail(conceptId ? courseId : MOCK_COURSE.id, conceptId ?? courseId);
}
export function mockTargets(courseId: string): StudyTarget[] {
  return getMockCourseData(courseId)
    .graph.nodes.slice(0, 8)
    .map((n) => ({ id: n.id, label: n.name }));
}
export function mockGaps(courseId: string, target: StudyTarget): GapsResponse {
  const gaps: Gap[] = getMockCourseData(courseId)
    .graph.nodes.filter(
      (n) =>
        n.id !== target.id &&
        (n.understanding === null || n.understanding < 0.55),
    )
    .slice(0, 4)
    .map((n, i) => ({
      concept_id: n.id,
      concept_name: n.name,
      understanding: n.understanding ?? 0,
      priority: 1 - i * 0.12,
      action: n.understanding === null ? "STUDY" : "REVIEW",
      reason:
        "Deterministic demo state marks this file-supported concept for review.",
    }));
  return { target, gaps };
}
export function mockStudyPlan(
  courseId: string,
  target: StudyTarget,
): StudyPlan {
  const data = getMockCourseData(courseId);
  const ids = [
    ...data.graph.edges
      .filter((e) => e.target === target.id)
      .map((e) => e.source)
      .slice(0, 2),
    target.id,
  ];
  return {
    target,
    steps: ids.map((id, i) => {
      const n = data.graph.nodes.find((x) => x.id === id)!;
      return {
        order: i + 1,
        concept_id: id,
        concept_name: n.name,
        reason:
          id === target.id
            ? "Selected course target."
            : "Prerequisite relationship in this course graph.",
        understanding: n.understanding,
        resources: detail(courseId, id).resources,
      };
    }),
  };
}
