import { HomePlanSections } from '../components/HomePlanSections';
import type { HomePlanSection } from '../types/publicHome.types';

type PublicResearchViewProps = {
  sections: HomePlanSection[];
  logoUrl: string;
};

export function PublicResearchView({ sections, logoUrl }: PublicResearchViewProps) {
  return (
    <HomePlanSections
      sections={sections}
      logoUrl={logoUrl}
      sectionId="r2r-research"
      showPlanBanner={false}
      showSectionNumbers={false}
      heading="งานวิจัยจากงานประจำ"
      description="การวิจัยเพื่อพัฒนาคุณภาพงาน รวบรวมผลงานวิจัยจากงานประจำเพื่อสนับสนุนการพัฒนางานของกองยุทธศาสตร์และแผนงาน"
    />
  );
}
