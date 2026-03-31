import { ProductHero } from "@/components/products/ProductHero";
import { ProblemStatement } from "@/components/products/ProblemStatement";
import { FabricPillars } from "@/components/products/FabricPillars";
import { EnforcementLayers } from "@/components/products/EnforcementLayers";
import { Architecture } from "@/components/products/Architecture";
import { Integrations } from "@/components/products/Integrations";
import { Contact } from "@/components/Contact";

export const metadata = {
  title: "AI Fabric — VeloSecurity AI",
  description:
    "Discover, connect, and enforce policy across AI agents. Your infrastructure, your control, no middleman.",
};

export default function ProductsPage() {
  return (
    <>
      <ProductHero />
      <ProblemStatement />
      <FabricPillars />
      <EnforcementLayers />
      <Architecture />
      <Integrations />
      <Contact />
    </>
  );
}
