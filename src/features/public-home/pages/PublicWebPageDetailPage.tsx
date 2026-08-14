import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileQuestion, FileText } from 'lucide-react';
import { CookieConsentBanner } from '../components/CookieConsentBanner';
import { HomeFooter } from '../components/HomeFooter';
import { HomePlanSections } from '../components/HomePlanSections';
import { incrementPublicWebPageViewCount, loadPublishedPublicWebPage, type PublicWebPage } from '../services/publicWebPages.service';

export function PublicWebPageDetailPage() {
  const { slug = '' } = useParams();
  const [page, setPage] = useState<PublicWebPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    void loadPublishedPublicWebPage(slug)
      .then((loadedPage) => {
        if (isMounted) {
          setPage(loadedPage);
          document.title = loadedPage ? `${loadedPage.title} | SmartDSP` : 'ไม่พบหน้าเว็บไซต์ | SmartDSP';
          if (loadedPage) void incrementPublicWebPageViewCount(loadedPage.id);
        }
      })
      .catch(() => {
        if (isMounted) setPage(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      document.title = 'SmartDSP';
    };
  }, [slug]);

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <main className="flex-1 bg-white">
        <div className="bg-slate-50 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/strategic-repository" className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            กลับคลังข้อมูล
          </Link>
        </div>

        {isLoading ? <section className="min-h-[360px] bg-white py-12 sm:py-16"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><p className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-500">กำลังโหลดหน้าเว็บไซต์...</p></div></section> : null}

        {!isLoading && !page ? (
          <section className="mx-auto mt-8 max-w-5xl rounded-md border border-dashed border-slate-300 bg-white p-8 text-center">
            <FileQuestion className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
            <h1 className="mt-4 text-xl font-bold text-slate-950">ไม่พบหน้าเว็บไซต์</h1>
            <p className="mt-2 text-sm text-slate-500">ลิงก์นี้อาจยังไม่เปิดใช้งาน หรือถูกลบออกจากระบบแล้ว</p>
          </section>
        ) : null}

        {page ? (
          <>
            <section className="relative isolate overflow-hidden bg-[#073B74] px-3 py-1.5 text-white sm:px-4 sm:py-2 lg:px-5">
              <div className="absolute inset-0 bg-[linear-gradient(120deg,#073B74_0%,#0878D8_46%,#11A37F_100%)]" aria-hidden="true" />
              <div className="relative grid gap-2 lg:grid-cols-[minmax(0,1fr)_32rem] lg:items-center">
                <div>
                  <h1 className="text-sm font-bold leading-tight tracking-normal text-white sm:text-lg lg:text-xl">{page.title}</h1>
                  {page.description ? <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-cyan-50 sm:text-sm">{page.description}</p> : null}
                </div>
                <div className="grid grid-cols-2 gap-1.5 rounded-md border border-white/25 bg-white/15 p-1.5 shadow-2xl backdrop-blur-md">
                  <div className="rounded-md bg-white/95 px-2.5 py-1 text-slate-900"><div className="text-base font-bold text-[#075DA8]">1</div><div className="text-[10px] font-semibold text-slate-600">รายการเผยแพร่</div></div>
                  <div className="rounded-md bg-white/95 px-2.5 py-1 text-slate-900"><div className="text-base font-bold text-[#008B8B]">{page.pdfUrl ? 'PDF' : '-'}</div><div className="text-[10px] font-semibold text-slate-600">เอกสาร</div></div>
                </div>
              </div>
            </section>

            <HomePlanSections
              sections={[{
                id: `web-page-${page.id}`,
                number: '1',
                title: page.title,
                tone: 'blue',
                cards: [{
                  title: page.title,
                  subtitle: page.description || '-',
                  description: page.description,
                  icon: FileText,
                  color: 'bg-brand-600',
                  actionLabel: page.pdfUrl ? 'เปิดเอกสาร' : 'รายละเอียด',
                  pdfUrl: page.pdfUrl,
                  coverImageUrl: page.coverImageUrl,
                  coverImageLayout: page.coverImageLayout,
                }],
              }]}
              logoUrl=""
              displayMode="shelf"
              showPlanBanner={false}
            />
          </>
        ) : null}
      </main>
      <HomeFooter />
      <CookieConsentBanner />
    </div>
  );
}
