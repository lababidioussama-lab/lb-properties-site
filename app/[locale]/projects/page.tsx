import { pageMetadata } from "@/lib/page-metadata";
import { SubpageHero } from "@/components/ui/SubpageHero";
import { ProjectsGrid } from "@/components/projects/ProjectsGrid";
import { ContactBand } from "@/components/home/HomeSections";

export function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return pageMetadata(params, "projects");
}

export default function ProjectsPage() {
  return (
    <>
      <SubpageHero page="projects" image="/projects/the-cove-creek-island.jpg" />
      <ProjectsGrid />
      <ContactBand />
    </>
  );
}
