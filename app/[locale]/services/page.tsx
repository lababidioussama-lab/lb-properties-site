import { SubpageHero } from "@/components/ui/SubpageHero";
import { RelocationConcierge } from "@/components/sections/RelocationConcierge";
import { RenovationSlider } from "@/components/sections/RenovationSlider";
import { ConstructionPermits } from "@/components/sections/ConstructionPermits";
import { ContactBand } from "@/components/home/HomeSections";

export default function ServicesPage() {
  return (
    <>
      <SubpageHero page="services" image="/projects/grand-polo-equestra-5.jpg" />
      <RenovationSlider />
      <ConstructionPermits />
      <RelocationConcierge />
      <ContactBand />
    </>
  );
}
