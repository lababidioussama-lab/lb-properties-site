import { HomeHero } from "@/components/home/HomeHero";
import {
  BrandIntro,
  DeveloperStrip,
  FeaturedProjects,
  ServicesShowcase,
  FiguresBand,
  ProcessSteps,
  InvestorToolsTeaser,
  ContactBand,
  FounderStory,
} from "@/components/home/HomeSections";
import { Testimonials } from "@/components/sections/Testimonials";

/* The sample testimonials in the dictionaries are not real clients, so the
   section never ships in a production build unless explicitly forced for a
   staging demo. Replace with real, permissioned quotes and delete this gate. */
const SHOW_TESTIMONIALS =
  process.env.NODE_ENV !== "production" || process.env.ALLOW_SAMPLE_TESTIMONIALS === "true";

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <DeveloperStrip />
      <BrandIntro />
      <FeaturedProjects />
      <ServicesShowcase />
      <FiguresBand />
      <ProcessSteps />
      <InvestorToolsTeaser />
      <FounderStory />
      {SHOW_TESTIMONIALS && <Testimonials />}
      <ContactBand />
    </>
  );
}
