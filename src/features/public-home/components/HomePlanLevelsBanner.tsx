type HomePlanLevelsBannerProps = {
  logoUrl: string;
};

export function HomePlanLevelsBanner({ logoUrl }: HomePlanLevelsBannerProps) {
  return (
    <div
      id="plan-levels"
      className="scroll-mt-24 overflow-hidden rounded-md border border-emerald-100 bg-white shadow-sm"
    >
      <div className="relative grid min-h-24 grid-cols-[76px_1fr] items-center gap-3 bg-gradient-to-r from-white via-emerald-50/40 to-sky-50 px-3 py-3 sm:grid-cols-[96px_1fr] sm:px-5 lg:min-h-32 lg:grid-cols-[180px_1fr_260px] lg:gap-4 lg:px-8 lg:py-5">
        <div className="flex items-center justify-start">
          <img src={logoUrl} alt="กรมควบคุมโรค" className="h-16 w-16 rounded-md object-contain sm:h-20 sm:w-20 lg:h-24 lg:w-24" />
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold leading-tight tracking-normal text-sky-950 sm:text-2xl lg:text-5xl">
            ศูนย์รวมแผนระดับต่าง ๆ
          </h2>

          <p className="text-sm font-semibold text-emerald-700 sm:text-base lg:text-3xl leading-tight">
            ด้านการป้องกันควบคุมโรค
          </p>

          <p className="text-sm font-semibold text-emerald-700 sm:text-base lg:text-3xl leading-tight">
            และภัยสุขภาพของประเทศ
          </p>
        </div>
        <div className="relative hidden min-h-28 items-end justify-center lg:flex">
          <div className="absolute bottom-0 h-24 w-40 rounded-t-full bg-sky-100" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-900/10">
            <div className="absolute h-16 w-12 rounded-md bg-white/20" />
            <div className="relative h-12 w-12 rounded-md bg-white">
              <div className="absolute left-1/2 top-2 h-8 w-3 -translate-x-1/2 rounded-sm bg-emerald-500" />
              <div className="absolute left-2 top-1/2 h-3 w-8 -translate-y-1/2 rounded-sm bg-emerald-500" />
            </div>
          </div>
          <div className="absolute bottom-1 left-6 h-12 w-5 rounded-t-full bg-emerald-300" />
          <div className="absolute bottom-1 right-5 h-16 w-6 rounded-t-full bg-sky-300" />
          <div className="absolute bottom-1 right-14 h-10 w-5 rounded-t-full bg-orange-300" />
        </div>
      </div>
    </div>
  );
}
