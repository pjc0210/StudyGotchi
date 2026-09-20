/** Manually authored HackMIT demo interpretation, keyed only by stable concept id. */
export interface DemoConceptAnalysis {
  understandingAnalysis: string;
  whyItMatters: string;
}
const a = (
  understandingAnalysis: string,
  whyItMatters: string,
): DemoConceptAnalysis => ({
  understandingAnalysis,
  whyItMatters,
});

export const DEMO_CONCEPT_ANALYSIS: Record<string, DemoConceptAnalysis> = {
  "a-asym": a(
    "You can compare broad growth rates, but translating a recurrence into a tight bound is still uneven.",
    "Asymptotic analysis is how the course judges whether an algorithm scales before implementation details distract from the main cost.",
  ),
  "a-divide": a(
    "You recognize how splitting a problem can reduce work; combining subproblem results remains the less reliable step.",
    "Divide and conquer frames Karatsuba and many later recursive algorithms as smaller problems plus a merge rule.",
  ),
  "a-karatsuba": a(
    "You can follow the three-product trick, but choosing the algebraic rearrangement without notes is not yet consistent.",
    "Karatsuba shows that changing an algorithm's structure can beat the obvious multiplication routine.",
  ),
  "a-bst": a(
    "You can trace ordered lookup paths, while deletion cases and preserving tree order need more practice.",
    "Binary search trees connect comparison ordering to efficient dynamic lookup and lead directly to balanced trees.",
  ),
  "a-avl": a(
    "You understand why height matters, but selecting and applying the correct rotation still takes deliberate reasoning.",
    "AVL trees make the search-tree performance guarantee concrete by repairing imbalance after updates.",
  ),
  "a-graph": a(
    "You recognize vertices, edges, and reachability, but converting a story problem into the right graph remains tentative.",
    "Graph search is the foundation for traversal, components, and shortest-path algorithms in this course.",
  ),
  "a-bfs": a(
    "You can distinguish breadth-first from depth-first exploration; using their traversal order to justify an algorithm needs work.",
    "BFS and DFS supply the traversal machinery behind connectivity and component algorithms.",
  ),
  "a-scc": a(
    "There is not enough evidence yet to estimate your understanding of strongly connected components. Practice tracing reachability in both graph directions.",
    "SCCs turn mutual reachability into a compressed graph that makes directed-network structure manageable.",
  ),
  "a-pq": a(
    "You know that a priority queue repeatedly exposes the best current item; heap update costs are less settled.",
    "Priority queues are the data-structure engine that lets greedy graph algorithms choose their next candidate efficiently.",
  ),
  "a-dijkstra": a(
    "You can follow settled distances on nonnegative graphs, but explaining why a settled path cannot improve remains inconsistent.",
    "Dijkstra combines graph structure, priorities, and greedy choice into a core shortest-path method.",
  ),
  "a-bellman": a(
    "You recognize repeated edge relaxation, but diagnosing negative cycles and iteration bounds needs attention.",
    "Bellman-Ford handles cases Dijkstra cannot and clarifies the limits of greedy shortest paths.",
  ),
  "a-greedy": a(
    "You can spot locally attractive choices, but deciding whether they prove a global optimum remains uncertain.",
    "Greedy algorithms provide fast solutions when an exchange or staying-ahead argument makes a local choice safe.",
  ),
  "a-dp": a(
    "You recognize overlapping subproblems, while defining a state that captures exactly what remains is still developing.",
    "Dynamic programming turns recursive structure into efficient tables for problems where greedy choices fail.",
  ),
  "a-subset": a(
    "There is not enough evidence yet to estimate your understanding of subset sum. Work through the include-or-exclude state table and its pseudo-polynomial cost.",
    "Subset sum is a concrete dynamic-programming problem that also motivates questions about computational hardness.",
  ),
  "a-complexity": a(
    "You can distinguish efficient from exponential search at a high level, but reductions between decision problems need more evidence.",
    "Complexity theory explains why some computational problems resist the techniques developed earlier in the course.",
  ),

  "t-lang": a(
    "You can read a language definition, but expressing its membership condition precisely is still inconsistent.",
    "Formal languages give the course a common object for automata, computability, and complexity arguments.",
  ),
  "t-dfa": a(
    "You can trace deterministic transitions, while designing states that remember exactly the needed history remains difficult.",
    "DFAs are the first rigorous computational model and define what regular languages can recognize.",
  ),
  "t-nfa": a(
    "You understand that several paths may be explored at once; converting that intuition into a subset construction needs work.",
    "NFAs show that nondeterministic description can be concise without changing the class of regular languages.",
  ),
  "t-regular": a(
    "You can recognize common regular patterns, but proving that a language falls outside the class is not yet reliable.",
    "Regular languages establish the boundary between finite-memory computation and richer models.",
  ),
  "t-regex": a(
    "You can read union, concatenation, and star, but building a compact expression for a constraint is still developing.",
    "Regular expressions provide an algebraic description of the same languages recognized by finite automata.",
  ),
  "t-cfl": a(
    "You recognize nested structure that finite automata cannot track, but choosing the right grammar rules remains tentative.",
    "Context-free languages extend the course to recursive syntax and the limits of regular descriptions.",
  ),
  "t-cfg": a(
    "You can follow simple productions, while proving what a grammar generates still requires careful tracing.",
    "Context-free grammars are the primary language for describing recursively nested strings before pushdown automata appear.",
  ),
  "t-pda": a(
    "There is not enough evidence yet to estimate your understanding of pushdown automata. Practice relating stack contents to a context-free grammar's nesting.",
    "PDAs explain how a stack gives an automaton enough memory to recognize context-free languages.",
  ),
  "t-tm": a(
    "You can follow tape and state changes, but encoding a full algorithm as a machine remains an open skill.",
    "Turing machines define the course's central model of general computation and decidability.",
  ),
  "t-church": a(
    "You recognize the claim that reasonable machine models compute the same functions, but its scope needs more practice.",
    "The Church-Turing thesis connects formal machines to the informal idea of what any algorithm can compute.",
  ),
  "t-decidable": a(
    "You can separate halting algorithms from recognizers, while classifying borderline languages is still uneven.",
    "Decidability is the line between problems with guaranteed algorithms and problems that cannot always be resolved.",
  ),
  "t-reductions": a(
    "You understand that a computable transformation transfers difficulty, but constructing the transformation is the main gap.",
    "Mapping reductions are the course's reusable tool for proving undecidability and later NP-completeness.",
  ),
  "t-rice": a(
    "There is not enough evidence yet to estimate your understanding of Rice's theorem. Practice identifying nontrivial semantic properties of machine-recognized languages.",
    "Rice's theorem packages many undecidability proofs into one criterion about language properties.",
  ),
  "t-p": a(
    "You can identify polynomial running time, while connecting an algorithm to a formal complexity class needs reinforcement.",
    "Class P provides the course's baseline for efficiently solvable decision problems.",
  ),
  "t-np": a(
    "You recognize verification by a certificate, but distinguishing NP from NP-completeness is still developing.",
    "NP and NP-completeness organize many hard decision problems around reductions and efficient verification.",
  ),
  "l-vectors": a(
    "You can work with coordinates, but interpreting vectors as directions and displacements needs more evidence.",
    "Vectors are the objects every later matrix and subspace calculation acts on.",
  ),
  "l-comb": a(
    "You can form simple combinations; choosing coefficients to reach a target remains uneven.",
    "Linear combinations define how vectors generate spaces and solve systems.",
  ),
  "l-span": a(
    "There is not enough evidence yet to estimate your understanding of span. Practice deciding whether a target lies in vectors' span.",
    "Span identifies every vector a collection can produce and leads directly to subspaces.",
  ),
  "l-matrix": a(
    "You can multiply small matrices, but tracking what a matrix does as a transformation needs practice.",
    "Matrices encode linear systems and transformations throughout the course.",
  ),
  "l-systems": a(
    "You recognize equations in matrix form, while reading solution structure from them is still developing.",
    "Linear systems motivate elimination, invertibility, and the fundamental subspaces.",
  ),
  "l-elim": a(
    "You can perform row operations, but pivot choices and free variables remain inconsistent.",
    "Gaussian elimination is the practical route from a system to rank, solutions, and inverses.",
  ),
  "l-invert": a(
    "You know an inverse undoes a matrix, but linking invertibility to pivots and rank needs reinforcement.",
    "Invertibility ties together unique solutions, determinants, and linear transformations.",
  ),
  "l-subspaces": a(
    "There is not enough evidence yet to estimate your understanding of subspaces. Test closure under addition and scalar multiplication in examples.",
    "Subspaces organize the pieces of a vector space that matrices preserve or map between.",
  ),
  "l-fundamental": a(
    "You recognize column and null spaces, but relating all four spaces to a matrix is not yet stable.",
    "The four fundamental subspaces explain what a linear system can produce and what constraints remain.",
  ),
  "l-transform": a(
    "You can apply a matrix to a vector; reasoning about kernel and image needs more practice.",
    "Linear transformations give matrices their geometric meaning across the course.",
  ),
  "l-determinant": a(
    "You can compute small determinants, but interpreting singularity and volume change is less secure.",
    "Determinants signal invertibility and connect square matrices to eigenvalue structure.",
  ),
  "l-eigen": a(
    "There is not enough evidence yet to estimate your understanding of eigenvectors. Work on eigenspaces and the geometry of invariant directions.",
    "Eigenvectors reveal directions a transformation only scales and lead into diagonalization and SVD.",
  ),
  "l-orthogonal": a(
    "You recognize perpendicular vectors, while using inner products to prove orthogonality needs practice.",
    "Orthogonality makes coordinates independent and supports projections and least squares.",
  ),
  "l-projection": a(
    "You can identify a projection, but building the matrix for a subspace is still developing.",
    "Projection matrices turn nearest-point questions into linear algebra and support least-squares fitting.",
  ),
  "l-svd": a(
    "You recognize singular values, but assembling the UΣVᵀ interpretation needs more evidence.",
    "SVD gives a stable factorization for rank, approximation, and data applications.",
  ),
  "m-action": a(
    "You can state that motion extremizes action, but connecting variations to equations of motion needs practice.",
    "Stationary action supplies the principle from which the Lagrangian formulation is derived.",
  ),
  "m-lagrange": a(
    "You can identify kinetic minus potential energy; choosing a useful Lagrangian for a new system is less secure.",
    "The Lagrangian is the compact object that produces equations of motion in generalized coordinates.",
  ),
  "m-coords": a(
    "You recognize coordinates adapted to constraints, but translating velocities between choices remains uneven.",
    "Generalized coordinates make constrained motion tractable before applying Euler-Lagrange equations.",
  ),
  "m-euler": a(
    "There is not enough evidence yet to estimate your understanding of Euler-Lagrange equations. Derive them for a simple coordinate and interpret each term.",
    "Euler-Lagrange equations turn a Lagrangian into predictive mechanics and support non-inertial applications.",
  ),
  "m-noninertial": a(
    "You can recognize accelerating frames, while accounting for the frame's time-dependent motion needs work.",
    "The Lagrangian method makes inertial effects systematic in moving and accelerating coordinate systems.",
  ),
  "m-symmetry": a(
    "You see that symmetries imply conserved quantities, but matching a specific symmetry to its charge remains tentative.",
    "Symmetry connects the course's spacetime assumptions to energy and angular-momentum conservation.",
  ),
  "m-energy": a(
    "You can use a conserved-energy expression, but recognizing when time dependence breaks conservation needs reinforcement.",
    "Energy conservation reduces motion problems to constraints on allowed states and orbits.",
  ),
  "m-angular": a(
    "There is not enough evidence yet to estimate your understanding of angular momentum. Work on torque-free motion and its geometric direction.",
    "Angular momentum controls central-force motion and leads directly to orbital analysis.",
  ),
  "m-central": a(
    "You recognize forces directed through a center, but reducing the two-body problem to radial motion is still developing.",
    "Central potentials organize gravity and effective-potential reasoning in the orbital unit.",
  ),
  "m-orbits": a(
    "You can identify elliptical orbital features, while deriving trajectories from conserved quantities needs practice.",
    "Two-body orbits connect Newtonian gravity to observable Kepler laws.",
  ),
  "m-effective": a(
    "You understand that angular motion contributes a radial barrier, but reading turning points from the effective potential is uneven.",
    "Effective potentials turn a two-dimensional orbit problem into a one-dimensional energy picture.",
  ),
  "m-precession": a(
    "You recognize that non-Newtonian potentials can rotate an orbit, but relating frequency shifts to the potential needs more evidence.",
    "Orbital precession reveals which features of closed Newtonian orbits are exceptional.",
  ),
  "m-legendre": a(
    "There is not enough evidence yet to estimate your understanding of Legendre transforms. Practice exchanging velocity for canonical momentum in a Lagrangian.",
    "The Legendre transform is the bridge from Lagrangian variables to Hamiltonian mechanics.",
  ),
  "m-canonical": a(
    "You can name canonical momentum, but computing it for nontrivial coordinates remains tentative.",
    "Canonical momentum is the variable paired with position in Hamilton's equations.",
  ),
  "m-hamilton": a(
    "You recognize the Hamiltonian form, while following canonical transformations through both variables needs practice.",
    "Hamiltonian mechanics reorganizes dynamics for later statistical and quantum-mechanical ideas.",
  ),
  "s-arrays": a(
    "You can create and index arrays, but broadcasting and view-versus-copy behavior need more evidence.",
    "NumPy arrays are the representation used by every numerical solver and model in the coursework.",
  ),
  "s-ivp": a(
    "You recognize initial data and a time interval, while turning a physical model into an IVP is still developing.",
    "Initial value problems provide the common interface for coffee, HVAC, reaction, and neuron simulations.",
  ),
  "s-rhs": a(
    "You can read a derivative function, but assembling coupled right-hand sides from a model needs practice.",
    "The right-hand side determines how every simulated state changes in time.",
  ),
  "s-timestep": a(
    "There is not enough evidence yet to estimate your understanding of time stepping. Compare step sizes and observe how numerical error accumulates.",
    "Time stepping converts differential equations into computations a program can carry forward.",
  ),
  "s-linear": a(
    "You can express Ku=f, while recognizing conditioning and solver assumptions is less reliable.",
    "Linear systems appear inside numerical updates and are the base case for more advanced solvers.",
  ),
  "s-gaussian": a(
    "You can follow elimination, but zero pivots and back-substitution edge cases need attention.",
    "Gaussian elimination is the implemented solver behind the course's linear-system exercises.",
  ),
  "s-nonlinear": a(
    "You recognize that nonlinear residuals cannot be solved by one matrix inversion, but choosing an iterative approach is tentative.",
    "Nonlinear systems motivate Newton iterations and Jacobians in realistic models.",
  ),
  "s-newton": a(
    "There is not enough evidence yet to estimate your understanding of Newton's method. Practice linking residuals, Jacobians, and update steps.",
    "Newton's method is the course's main local method for solving nonlinear equations.",
  ),
  "s-jacobian": a(
    "You can identify derivative matrices, while deriving entries for coupled equations needs more practice.",
    "Jacobians supply the local linear model used by Newton solvers and stiff reaction calculations.",
  ),
  "s-reaction": a(
    "You recognize the three-state reaction model, but relating its rates to stiffness and solver behavior is still developing.",
    "The Robertson model tests numerical methods on a physically motivated coupled chemical system.",
  ),
  "s-objective": a(
    "You can identify a quantity to minimize, while designing one that captures all constraints remains uneven.",
    "Objective functions state exactly what optimization code is trying to improve.",
  ),
  "s-gradient": a(
    "You can follow a descent update, but selecting a step size that converges rather than oscillates needs practice.",
    "Gradient descent links derivatives to computational optimization in the lecture and cell-placement work.",
  ),
  "s-constrained": a(
    "There is not enough evidence yet to estimate your understanding of constrained optimization. Practice separating a feasible constraint from the objective being optimized.",
    "Constraints make optimization models reflect physical and design limits instead of unconstrained ideal cases.",
  ),
  "s-pnorm": a(
    "You recognize that a p-norm smooths min-max behavior, but explaining the approximation tradeoff needs more evidence.",
    "The p-norm approximation makes a difficult fairness-style objective differentiable enough to optimize.",
  ),
  "s-neuron": a(
    "You can identify simulated state variables, while connecting currents to membrane dynamics needs practice.",
    "Neuron simulation applies the IVP tools to a biological system with interpretable dynamics.",
  ),
};
