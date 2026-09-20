import { ProductShell } from "@/components/shell/ProductShell";

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <ProductShell>{children}</ProductShell>;
}
