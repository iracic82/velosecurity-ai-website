import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { Journey } from "@/components/Journey";
import { CaseStudies } from "@/components/CaseStudies";
import { Demos } from "@/components/Demos";
import { Contact } from "@/components/Contact";

export default function Home() {
  return (
    <>
      <Hero />
      <Services />
      <Journey />
      <CaseStudies />
      <Demos />
      <Contact />
    </>
  );
}
