import type { LucideIcon } from 'lucide-react';

export type HomeBannerAction = {
  label: string;
  href: string;
  variant: 'primary' | 'secondary';
};

export type HomeHeroBanner = {
  eyebrow: string;
  title: string;
  description: string;
  imageUrl: string;
  imageOverlayOpacity: number;
  actions: HomeBannerAction[];
};

export type HomeQuickNavItem = {
  label: string;
  targetId: string;
  icon: LucideIcon;
};

export type HomePlanCard = {
  title: string;
  subtitle: string;
  description?: string;
  icon: LucideIcon;
  color: string;
  actionLabel: string;
  pdfUrl?: string;
  coverImageUrl?: string;
};

export type HomePlanSection = {
  id: string;
  number: string;
  title: string;
  tone: string;
  cards: HomePlanCard[];
};

export type HomeNewsItem = {
  title: string;
  category: string;
  dateLabel: string;
  description: string;
};

export type HomeFaqItem = {
  question: string;
  answer: string;
};
