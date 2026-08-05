import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FileText, LoaderCircle } from 'lucide-react';
import type { PDFDocumentLoadingTask, RenderTask } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

type PdfFirstPageCoverProps = {
  pdfUrl: string;
  title: string;
  className?: string;
  fallback?: ReactNode;
};

export function PdfFirstPageCover({ pdfUrl, title, className = '', fallback }: PdfFirstPageCoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const normalizedPdfUrl = pdfUrl.trim();

  useEffect(() => {
    const element = containerRef.current;
    if (!element || !normalizedPdfUrl) return;

    if (!('IntersectionObserver' in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: '240px' });

    observer.observe(element);
    return () => observer.disconnect();
  }, [normalizedPdfUrl]);

  useEffect(() => {
    if (!shouldLoad || !normalizedPdfUrl) return;

    let active = true;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    let renderTask: RenderTask | null = null;

    const renderFirstPage = async () => {
      setStatus('loading');

      try {
        const { GlobalWorkerOptions, getDocument } = await import('pdfjs-dist');
        GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        if (!active) return;

        loadingTask = getDocument({ url: normalizedPdfUrl });
        const document = await loadingTask.promise;
        const page = await document.getPage(1);
        const initialViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(2, 720 / initialViewport.width) });
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d', { alpha: false });

        if (!active || !canvas || !context) return;

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;

        if (active) setStatus('loaded');
      } catch (error) {
        if (active && (!(error instanceof Error) || error.name !== 'RenderingCancelledException')) {
          setStatus('error');
        }
      }
    };

    void renderFirstPage();

    return () => {
      active = false;
      renderTask?.cancel();
      void loadingTask?.destroy();
    };
  }, [normalizedPdfUrl, shouldLoad]);

  const fallbackContent = fallback ?? (
    <span className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500">
      <FileText className="h-8 w-8" aria-hidden="true" />
    </span>
  );

  return (
    <div ref={containerRef} className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-slate-100 ${className}`}>
      {status === 'error' ? fallbackContent : null}
      {status === 'idle' || status === 'loading' ? (
        <span className="flex h-full w-full items-center justify-center text-slate-500" aria-label="กำลังสร้างภาพปกจาก PDF">
          <LoaderCircle className="h-6 w-6 animate-spin" aria-hidden="true" />
        </span>
      ) : null}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`ภาพหน้าแรกของ PDF ${title}`}
        className={`max-h-full max-w-full bg-white object-contain ${status === 'loaded' ? 'block' : 'hidden'}`}
      />
    </div>
  );
}
