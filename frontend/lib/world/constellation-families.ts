import { displayConceptName } from "./concept-labels";

/** Broader sky labels. Zoomed out the canvas shows these, not every topic. */
export const CONSTELLATION_FAMILIES = [
  "Lagrangian mechanics",
  "Hamiltonian mechanics",
  "Conserved quantities",
  "Constrained motion",
  "Electromagnetism",
  "Oscillations",
  "Orbital motion",
  "Rigid body motion",
] as const;

export type ConstellationFamily = (typeof CONSTELLATION_FAMILIES)[number];

const FAMILY_SET = new Set<string>(CONSTELLATION_FAMILIES);

export function isConstellationFamily(value: string | null | undefined): value is ConstellationFamily {
  return Boolean(value && FAMILY_SET.has(value));
}

/**
 * Collapse a pipeline cluster (or a concept title) into one of the eight
 * general constellations. Unknown text falls through to Lagrangian mechanics
 * only when it still reads as 8.223 mechanics; otherwise the cleaned name stays.
 */
export function constellationFamily(
  cluster?: string | null,
  name?: string | null,
): ConstellationFamily | undefined {
  const hay = `${cluster ?? ""} ${name ?? ""}`.toLowerCase();
  if (!hay.trim()) return undefined;

  if (/lorentz|electromagnet|electric and magnetic|velocity-dependent electromagnetic|canonical momentum in electromagnetic/.test(hay)) {
    return "Electromagnetism";
  }
  if (
    /poisson|hamilton|canonical momentum|conjugate momentum|canonical transformation|generalized momentum/.test(
      hay,
    )
  ) {
    return "Hamiltonian mechanics";
  }
  if (
    /noether|conserved|conservation of|conservation law|angular momentum conservation|energy conservation|spatial translational invariance|time translation/.test(
      hay,
    )
  ) {
    return "Conserved quantities";
  }
  if (
    /holonomic|nonholonomic|constraint|lagrange multiplier|rolling without|rolling cylinder|rolling (body|object|sphere|disc)|constrained rolling|reducing coordinates|generalized force from constraint/.test(
      hay,
    )
  ) {
    return "Constrained motion";
  }
  if (/orbit|conic|scattering|central force|radial equation|u = 1\/r|orbital|polar coordinate/.test(hay)) {
    return "Orbital motion";
  }
  if (
    /coupled|oscillator|harmonic|small angle|normal mode|coupling frequency|pendulum angles|simple harmonic|linear oscillatory/.test(
      hay,
    )
  ) {
    return "Oscillations";
  }
  if (
    /angular velocity|torque|centrifugal|coriolis|moment of inertia|rotating frame|center of mass|rigid body|contact point|angular acceleration/.test(
      hay,
    )
  ) {
    return "Rigid body motion";
  }
  if (
    /lagrangian|euler-lagrange|kinetic energy|potential energy|action principle|action functional|variational|generalized coordinat|equations of motion|physics|assumption|coordinate transformation|dimensionless|partial derivative|conservative system|integration|friction|determinant|velocity component|translational|substitution/.test(
      hay,
    )
  ) {
    return "Lagrangian mechanics";
  }

  return undefined;
}

export function constellationLabel(cluster?: string | null, name?: string | null): string {
  return constellationFamily(cluster, name) ?? displayConceptName(cluster || name || "Topic");
}
