import { Link } from 'react-router-dom';

const cookiePolicyUrl = 'https://ddc.moph.go.th/uploads/ckeditor2/dddc/files/Cookie_Consent69.pdf';

type LegalFooterProps = {
  variant?: 'light' | 'dark';
};

export function LegalFooter({ variant = 'light' }: LegalFooterProps) {
  const isDark = variant === 'dark';
  const textClass = isDark ? 'text-white/70' : 'text-slate-500';
  const linkClass = isDark ? 'text-white hover:text-pink-100' : 'text-pink-700 hover:text-pink-600';
  const dividerClass = isDark ? 'bg-white/25' : 'bg-slate-300';

  return (
    <footer className={`text-center text-xs ${textClass}`}>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link className={`font-medium transition ${linkClass}`} to="/privacy-notice">
          Privacy Notice
        </Link>
        <span className={`h-3 w-px ${dividerClass}`} aria-hidden="true" />
        <a className={`font-medium transition ${linkClass}`} href={cookiePolicyUrl} target="_blank" rel="noreferrer">
          นโยบายคุกกี้
        </a>
      </div>
      <p className="mt-2">SmartDSP · กองยุทธศาสตร์และแผนงาน กรมควบคุมโรค</p>
    </footer>
  );
}