/** /earth globe vs land, and Galaxy hops from a specific concept. */

export function landParamFromSearch(search: string | URLSearchParams | null | undefined): string | null {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : (search ?? new URLSearchParams());
  const land = params.get("land")?.trim();
  return land || null;
}

export function isPlanetGlobePath(pathname: string, search?: string | URLSearchParams | null): boolean {
  return /^\/(earth|world)(\/|$)/.test(pathname) && !landParamFromSearch(search);
}

export function planetHref(): string {
  return "/earth";
}

export function landHref(courseKey: string): string {
  return `/earth?land=${encodeURIComponent(courseKey)}`;
}

const CONCEPT_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isConceptId(ref: string): boolean {
  return CONCEPT_UUID.test(ref.trim());
}

export function galaxyHrefForConcept(ref: string): string {
  const value = ref.trim();
  if (!value) return "/knowledge";
  if (CONCEPT_UUID.test(value)) return `/knowledge?concept=${encodeURIComponent(value)}`;
  return `/knowledge?q=${encodeURIComponent(value)}`;
}

export function resolveLandCourseId(
  land: string | null | undefined,
  courses: readonly { id: string; code?: string | null }[],
): string | null {
  if (!land) return null;
  const match = courses.find((course) => course.id === land || course.code === land);
  return match?.id ?? null;
}

/** Course click aims the pin. Files stay shut until the student opens them. */
export function courseFilesOpenOnFocus(): boolean {
  return false;
}

export function shouldShowLandmarkFlag(activeCourseId: string | null, courseId: string): boolean {
  return Boolean(activeCourseId && activeCourseId === courseId);
}

export function screenPointFromNdc(
  ndc: { x: number; y: number; z: number },
  size: { left: number; top: number; width: number; height: number },
): { x: number; y: number } | null {
  if (ndc.z > 1 || ndc.z < -1) return null;
  return {
    x: size.left + ((ndc.x + 1) * size.width) / 2,
    y: size.top + ((1 - ndc.y) * size.height) / 2,
  };
}
