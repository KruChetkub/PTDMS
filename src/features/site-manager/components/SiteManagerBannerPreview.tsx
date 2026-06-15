import type { SiteContentHeroBanner } from '../../site-content/types/siteContent.types';

type SiteManagerBannerPreviewProps = {
  banner: SiteContentHeroBanner & { placement?: string };
};

export function SiteManagerBannerPreview({ banner }: SiteManagerBannerPreviewProps) {
  const imageOverlayOpacity = Number.isFinite(banner.imageOverlayOpacity) ? banner.imageOverlayOpacity : 58;
  const overlayOpacity = Math.min(100, Math.max(0, imageOverlayOpacity)) / 100;

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold tracking-normal text-slate-950">ตัวอย่างป้ายประชาสัมพันธ์</h2>
          <p className="mt-1 text-sm text-slate-500">{banner.placement || 'Home hero banner'}</p>
        </div>
        <span className="w-fit rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
          {banner.status}
        </span>
      </div>

      <div className="mt-5 overflow-hidden rounded-md border border-slate-200 bg-slate-950">
        <div className="relative min-h-72">
          <img src={banner.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-slate-950" style={{ opacity: overlayOpacity }} />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/35 via-transparent to-transparent" />
          <div className="relative flex min-h-72 max-w-xl flex-col justify-end p-5 text-white sm:p-7">
            <h3 className="text-2xl font-semibold leading-tight tracking-normal">{banner.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-100">{banner.description}</p>
            <p className="mt-4 text-xs text-slate-300">ช่วงเผยแพร่: {banner.publishWindow}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
