export type SiteContentStatus = 'published' | 'draft' | 'scheduled';
export type SiteContentPlanCoverLayout = 'portrait' | 'landscape';

export type SiteContentHeroBanner = {
  eyebrow: string;
  title: string;
  description: string;
  imageUrl: string;
  imageOverlayOpacity: number;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel: string;
  secondaryActionHref: string;
  publishWindow: string;
  status: SiteContentStatus;
};

export type SiteContentBrandSettings = {
  siteName: string;
  logoUrl: string;
};

export type SiteContentNewsItem = {
  title: string;
  category: string;
  dateLabel: string;
  description: string;
  status: SiteContentStatus;
};

export type SiteContentFaqItem = {
  question: string;
  answer: string;
  status: SiteContentStatus;
};

export type SiteContentPlanIconKey =
  | 'landmark'
  | 'goal'
  | 'puzzle'
  | 'growth'
  | 'heart'
  | 'health'
  | 'shield-users'
  | 'file';

export type SiteContentPlanCard = {
  title: string;
  subtitle: string;
  description?: string;
  iconKey: SiteContentPlanIconKey;
  color: string;
  actionLabel: string;
  pdfUrl: string;
  coverImageUrl?: string;
  coverImageLayout?: SiteContentPlanCoverLayout;
  uploadedFileName?: string;
  status: SiteContentStatus;
};

export type SiteContentState = {
  brandSettings: SiteContentBrandSettings;
  heroBanner: SiteContentHeroBanner;
  newsItems: SiteContentNewsItem[];
  faqItems: SiteContentFaqItem[];
  planLevelCards: SiteContentPlanCard[];
  diseaseControlPlanCards: SiteContentPlanCard[];
  annualGuidelineCards: SiteContentPlanCard[];
  riskManagementPlanCards: SiteContentPlanCard[];
  executivePolicyCards: SiteContentPlanCard[];
};
