const navLinks = [
  { label: 'หน้าแรก', href: '#home-hero' },
  { label: 'แผนงาน', href: '#plan-levels' },
  { label: 'ข่าวประชาสัมพันธ์', href: '#public-news' },
  { label: 'คำถามที่พบบ่อย', href: '#public-faq' },
];

type PublicHomeHeaderProps = {
  logoUrl: string;
  siteName: string;
};

export function PublicHomeHeader({ logoUrl, siteName }: PublicHomeHeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/20 bg-slate-950/70 text-white backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:gap-4 sm:px-6 lg:px-8">
        <a href="#home-hero" className="flex min-w-0 items-center gap-3" aria-label={siteName}>
          <img src={logoUrl} alt={siteName} className="h-8 w-8 shrink-0 rounded-md bg-white p-1 object-contain sm:h-9 sm:w-9" />
          <div className="hidden min-w-0 sm:block">
            <div className="truncate text-sm font-semibold sm:text-base">{siteName}</div>
            <div className="hidden text-xs text-white/70 sm:block"></div>
          </div>
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="/login"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50 sm:px-4"
        >
          เข้าสู่ระบบ
        </a>
      </div>
    </header>
  );
}
