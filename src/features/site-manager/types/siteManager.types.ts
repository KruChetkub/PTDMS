import type { LucideIcon } from 'lucide-react';
import type { SiteContentHeroBanner, SiteContentNewsItem, SiteContentStatus } from '../../site-content/types/siteContent.types';

export type SiteManagerContentStatus = SiteContentStatus;

export type SiteManagerSummaryItem = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
};

export type SiteManagerEditableArea = {
  title: string;
  description: string;
  status: SiteManagerContentStatus;
  updatedAt: string;
  icon: LucideIcon;
};

export type SiteManagerBannerDraft = SiteContentHeroBanner & {
  placement: string;
};

export type SiteManagerNewsDraft = SiteContentNewsItem;
