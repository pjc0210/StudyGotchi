"use client";

import { ProductHeader } from "@/components/shell/ProductHeader";

/** The site header is the product header. Kept as a name so older routes keep working. */
export function SiteHeader() {
  return <ProductHeader variant="static" />;
}
