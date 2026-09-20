/**
 * Pipeline concept titles sometimes still carry failed TeX. The sky, search,
 * and inspector all go through this so a student never reads `\\frac` or `ω_p`.
 */

const NAME_OVERRIDES: Record<string, string> = {
  "Euler-Lagrange Equation Derived Frequencies \\(\\omega_p\\) and \\(\\omega_s\\)":
    "Euler-Lagrange Derived Frequencies",
  "Zero Angular Acceleration of \\( \\phi \\) Based on Euler-Lagrange Equations":
    "Zero Angular Acceleration of Phi",
  "Partial Derivative of Lagrangian with respect to \\( \\dot{\\phi} \\)":
    "Lagrangian Derivative for Phi-dot",
  "Final Formula for Orbital Energy in Terms of \\alpha": "Orbital Energy in Terms of Alpha",
  "Relation Between Scattering Angle θ and ω": "Scattering Angle and Frequency",
  "Natural Frequency of Single Pendulum (ω₀)": "Natural Frequency of a Pendulum",
  "Coupling Frequency of Oscillators (ωₖ)": "Coupling Frequency of Oscillators",
  "Constraint Equation Function \\(f(\\vec{q}_t, t) = 0\\)": "Constraint Equation",
  "Time Dependence of Angular Coordinate \\( \\theta(t) \\)": "Time Dependence of Theta",
  "Time Dependence of Angular Coordinate \\( \\phi(t) \\) with Constant Angular Velocity":
    "Constant Phi Angular Velocity",
  "Time Dependence of Angular Velocity \\( \\dot{\\theta}(t) \\)": "Time Dependence of Theta-dot",
  "Angular Acceleration of \\( \\theta \\) in Terms of System Parameters":
    "Angular Acceleration of Theta",
  "Euler-Lagrange Equation for \\( \\theta \\)": "Euler-Lagrange Equation for Theta",
  "Parameter \\alpha in Orbital Mechanics": "Alpha Parameter in Orbital Mechanics",
  "Energy Expression in Terms of \\varepsilon and Constants": "Orbital Energy in Terms of Epsilon",
  "Orbital Parameters alpha and eccentricity epsilon": "Orbital Alpha and Eccentricity",
  "Substitution u = 1/r in Orbital Mechanics": "Radial Substitution in Orbital Mechanics",
  "Angular Velocity Vector (\\(\\vec{\\omega}\\))": "Angular Velocity Vector",
  "Velocity at Contact Point (\\(\\vec{V}_{ct}\\))": "Velocity at Contact Point",
  "Velocity of Center of Mass (\\(\\vec{V}_{cm}\\))": "Velocity of Center of Mass",
  "Variation of the Action (δS)": "Variation of the Action",
};

const TEX_WORDS: Record<string, string> = {
  alpha: "Alpha",
  beta: "Beta",
  gamma: "Gamma",
  delta: "Delta",
  epsilon: "Epsilon",
  varepsilon: "Epsilon",
  theta: "Theta",
  phi: "Phi",
  varphi: "Phi",
  omega: "Omega",
  Omega: "Omega",
  psi: "Psi",
  lambda: "Lambda",
  mu: "Mu",
  nu: "Nu",
  pi: "Pi",
  sigma: "Sigma",
  tau: "Tau",
  rho: "Rho",
  eta: "Eta",
  vec: "",
  mathrm: "",
  mathbf: "",
  mathit: "",
  operatorname: "",
  text: "",
  left: "",
  right: "",
  frac: "",
  ddot: "",
  dot: "",
  bar: "",
  hat: "",
  tilde: "",
  widehat: "",
  overline: "",
};

const GREEK_CHARS: Record<string, string> = {
  α: "Alpha",
  β: "Beta",
  γ: "Gamma",
  δ: "Delta",
  ε: "Epsilon",
  θ: "Theta",
  φ: "Phi",
  ϕ: "Phi",
  ω: "Omega",
  Ω: "Omega",
  λ: "Lambda",
  μ: "Mu",
  π: "Pi",
  σ: "Sigma",
  τ: "Tau",
  ρ: "Rho",
  η: "Eta",
  δS: "Delta S",
};

function texToWords(source: string): string {
  let text = source;
  text = text.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "$1 over $2");
  text = text.replace(/\\([a-zA-Z]+)\s*\{([^{}]*)\}/g, (_, cmd: string, inner: string) => {
    if (cmd === "vec" || cmd === "mathrm" || cmd === "mathbf" || cmd === "text") return inner;
    if (cmd === "dot") return `${inner}-dot`;
    if (cmd === "ddot") return `${inner}-ddot`;
    return TEX_WORDS[cmd] ?? inner;
  });
  text = text.replace(/\\([a-zA-Z]+)/g, (_, cmd: string) => TEX_WORDS[cmd] ?? "");
  text = text.replace(/_\{([^{}]+)\}/g, " $1");
  text = text.replace(/\^\{([^{}]+)\}/g, " $1");
  text = text.replace(/[_^]/g, " ");
  text = text.replace(/[{}]/g, "");
  return text;
}

function replaceGreek(text: string): string {
  let next = text.replace(/δS/g, "Delta S");
  for (const [glyph, word] of Object.entries(GREEK_CHARS)) {
    if (glyph === "δS") continue;
    next = next.split(glyph).join(word);
  }
  return next.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, "").replace(/[ₖₚₛ]/g, "");
}

export function looksBrokenConceptName(name: string): boolean {
  return /\\|\$|\\frac|\\omega|\\vec|\\mathrm|\\left|\\right|ω|θ|φ|α|ε|δ/.test(name);
}

/** Human label for a concept or cluster. Safe to run twice. */
export function displayConceptName(raw: string | null | undefined): string {
  const source = (raw ?? "").trim();
  if (!source) return "Untitled concept";
  const override = NAME_OVERRIDES[source];
  if (override) return override;

  let text = source
    .replace(/\\\[(.+?)\\\]/gs, (_, inner: string) => texToWords(inner))
    .replace(/\\\((.+?)\\\)/gs, (_, inner: string) => texToWords(inner))
    .replace(/\$\$(.+?)\$\$/gs, (_, inner: string) => texToWords(inner))
    .replace(/\$(.+?)\$/gs, (_, inner: string) => texToWords(inner));

  text = texToWords(text);
  text = replaceGreek(text);
  text = text
    .replace(/Lagrangianfo-?/gi, "Lagrangian ")
    .replace(/\bfo-\b/g, "")
    .replace(/[\\$]/g, "")
    .replace(/\s*[·•]\s*/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/[([{\s]+$/g, "")
    .replace(/^[)\]}\s]+/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+-\s*$/g, "")
    .trim();

  if (!text) return "Untitled concept";
  return text.replace(/\b([a-z])/g, (ch, letter: string, index: number) =>
    index === 0 ? letter.toUpperCase() : ch,
  );
}

export function displayClusterName(raw: string | null | undefined): string {
  return displayConceptName(raw);
}
