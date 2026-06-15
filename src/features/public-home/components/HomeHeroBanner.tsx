import type { HomeHeroBanner as HomeHeroBannerData } from '../types/publicHome.types';

type HomeHeroBannerProps = {
  banner: HomeHeroBannerData;
};

export function HomeHeroBanner({ banner }: HomeHeroBannerProps) {
  const imageOverlayOpacity = Number.isFinite(banner.imageOverlayOpacity) ? banner.imageOverlayOpacity : 58;
  const overlayOpacity = Math.min(100, Math.max(0, imageOverlayOpacity)) / 100;

  return (
    <section id="home-hero" className="relative overflow-hidden bg-slate-950 pt-14 text-white sm:min-h-[100svh] sm:pt-16">
      <div className="relative border-b border-white/10 bg-slate-950 sm:hidden">
        <img src={banner.imageUrl} alt="" className="block h-auto w-full object-contain" />
        <div className="absolute inset-0 bg-slate-950" style={{ opacity: overlayOpacity * 0.35 }} />
      </div>

      <div className="hidden sm:block">
        <div className="relative min-h-[calc(100svh-4rem)] overflow-hidden bg-slate-950">
          <img src={banner.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-slate-950" style={{ opacity: overlayOpacity * 0.55 }} />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/55 via-slate-950/20 to-transparent" />
          <div className="absolute bottom-2 left-8 max-w-4xl lg:bottom-6 lg:left-16">
            <h1 className="text-5xl font-semibold leading-tight tracking-normal lg:text-6xl">
              {banner.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-100 lg:text-lg">{banner.description}</p>
          </div>
        </div>
      </div>

    </section>
  );
}
