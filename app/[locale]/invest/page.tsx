import { pageMetadata } from "@/lib/page-metadata";
import { SubpageHero } from "@/components/ui/SubpageHero";
import { ApproxNotice } from "@/components/ui/ApproxNotice";
import { WhyDubai } from "@/components/sections/WhyDubai";
import { RoiCalculator } from "@/components/sections/RoiCalculator";
import { FeaturedOpportunities } from "@/components/sections/FeaturedOpportunities";
import { NetRoiEngine } from "@/components/sections/NetRoiEngine";
import { MortgageAdvisory } from "@/components/sections/MortgageAdvisory";
import { MarketCharts } from "@/components/sections/MarketCharts";
import { ResourceLibrary } from "@/components/sections/ResourceLibrary";
import { ContactBand } from "@/components/home/HomeSections";

export function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return pageMetadata(params, "invest");
}

export default function InvestPage() {
  return (
    <>
      <SubpageHero page="invest" image="/projects/aquarise.jpg" />
      <ApproxNotice />
      <RoiCalculator />
      <NetRoiEngine />
      <MortgageAdvisory />
      <MarketCharts />
      <FeaturedOpportunities />
      <WhyDubai />
      <ResourceLibrary />
      <ContactBand />
    </>
  );
}
