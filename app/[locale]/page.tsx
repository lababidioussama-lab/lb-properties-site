import { HeroSection } from "@/components/hero/HeroSection";
import { WhyDubai } from "@/components/sections/WhyDubai";
import { RoiCalculator } from "@/components/sections/RoiCalculator";
import { AcquisitionProcess } from "@/components/sections/AcquisitionProcess";
import { FeaturedOpportunities } from "@/components/sections/FeaturedOpportunities";
import { ProjectListings } from "@/components/sections/ProjectListings";
import { NetRoiEngine } from "@/components/sections/NetRoiEngine";
import { MortgageAdvisory } from "@/components/sections/MortgageAdvisory";
import { MarketCharts } from "@/components/sections/MarketCharts";
import { RelocationConcierge } from "@/components/sections/RelocationConcierge";
import { MaintenancePlans } from "@/components/sections/MaintenancePlans";
import { RenovationSlider } from "@/components/sections/RenovationSlider";
import { ConstructionPermits } from "@/components/sections/ConstructionPermits";
import { Testimonials } from "@/components/sections/Testimonials";
import { ResourceLibrary } from "@/components/sections/ResourceLibrary";

/**
 * Ordered by intent, not by service catalogue: acquisition first (the
 * highest-value enquiry), then the two owner-economics engines, then the
 * services that follow once somebody actually owns something.
 *
 * Sections do NOT move as blocks. Translating and tilting a whole section
 * makes the page read as sheets of paper sliding over one another, which is
 * the opposite of expensive. The motion lives one level in — imagery drifts
 * inside its own frame, and content arrives in sequence — so the page feels
 * alive while the layout itself stays still.
 */
/**
 * The testimonials currently in the dictionaries are SAMPLE COPY, not real
 * clients — see the comment on `testimonials` in lib/i18n/en.ts.
 *
 * They render in dev so the section can be designed and shown, and the whole
 * section is omitted from a production build. Publishing invented reviews for
 * a RERA-registered agency would be a false advertising claim, and it would
 * undermine the one thing this site sells on: that its figures are labelled
 * honestly. A forgotten placeholder is a very easy way for that to happen by
 * accident, so the default is "does not ship" rather than "remember to check".
 *
 * Setting ALLOW_SAMPLE_TESTIMONIALS=true forces them on in production — for
 * a client demo on a staging URL, not for launch. When real permissioned
 * quotes go in, delete this gate rather than flipping the flag.
 */
const SHOW_TESTIMONIALS =
  process.env.NODE_ENV !== "production" ||
  process.env.ALLOW_SAMPLE_TESTIMONIALS === "true";

export default function HomePage() {
  return (
    <>
      <HeroSection />

      <WhyDubai />

      <RoiCalculator />

      <AcquisitionProcess />

      <FeaturedOpportunities />

      <ProjectListings />

      <NetRoiEngine />

      {/* Financing sits with the acquisition engines, not with the ownership
          services: it is a question asked before signing, and the cash-required
          figure it produces is what the ROI numbers above are actually gated on. */}
      <MortgageAdvisory />

      {/* The evidence behind everything above it. It closes the investor
          block rather than opening it: a visitor who has just modelled a
          yield is the one who wants to see where the inputs came from. */}
      <MarketCharts />

      <RelocationConcierge />

      <MaintenancePlans />

      <RenovationSlider />

      <ConstructionPermits />

      {SHOW_TESTIMONIALS && <Testimonials />}

      <ResourceLibrary />
    </>
  );
}
