import { PageHeader } from '../../../components/ui/PageHeader';
import { useAuthStore } from '../../../stores/auth.store';
import { useSiteContentDraft } from '../../site-content/hooks/useSiteContent';
import { SiteManagerBannerPreview } from '../components/SiteManagerBannerPreview';
import { SiteManagerBrandingEditor } from '../components/SiteManagerBrandingEditor';
import { SiteManagerContentEditor } from '../components/SiteManagerContentEditor';
import { SiteManagerEditableAreas } from '../components/SiteManagerEditableAreas';
import { SiteManagerPlanDocumentsEditor } from '../components/SiteManagerPlanDocumentsEditor';
import { SiteManagerSecuritySettings } from '../components/SiteManagerSecuritySettings';
import { SiteManagerSummaryGrid } from '../components/SiteManagerSummaryGrid';
import { SiteManagerWorkflowPanel } from '../components/SiteManagerWorkflowPanel';
import { siteManagerEditableAreas, siteManagerSummaryItems } from '../data/siteManager.mock';
import { useState } from 'react';

type SiteManagerTab =
  | 'branding'
  | 'home-content'
  | 'plan-documents'
  | 'disease-control-plan'
  | 'annual-guidelines'
  | 'risk-management'
  | 'executive-policy'
  | 'security';

const siteManagerTabs: Array<{ id: SiteManagerTab; label: string; superAdminOnly?: boolean }> = [
  { id: 'branding', label: 'โลโก้/แบรนด์' },
  { id: 'home-content', label: 'ป้าย/ข่าวประชาสัมพันธ์' },
  { id: 'plan-documents', label: 'แผนระดับต่าง ๆ' },
  { id: 'disease-control-plan', label: 'แผนงานควบคุมโรค' },
  { id: 'annual-guidelines', label: 'แนวทางประจำปี' },
  { id: 'risk-management', label: 'แผนบริหารความเสี่ยง' },
  { id: 'executive-policy', label: 'นโยบายผู้บริหาร' },
  { id: 'security', label: 'ความปลอดภัย', superAdminOnly: true },
];

export function SiteManagerPage() {
  const { contentDraft, setContentDraft, loadingSource, saveDraft, resetDraft } = useSiteContentDraft();
  const profile = useAuthStore((state) => state.profile);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SiteManagerTab>('branding');
  const canManageSecurity = profile?.role === 'super_admin';
  const visibleTabs = siteManagerTabs.filter((tab) => !tab.superAdminOnly || canManageSecurity);

  const handleSaveDraft = async () => {
    setIsSaving(true);
    const saveTarget = await saveDraft();
    setIsSaving(false);
    setDraftMessage(
      saveTarget === 'supabase'
        ? 'บันทึกข้อมูลลง Supabase เรียบร้อย หน้า Home จะใช้ข้อมูลชุดนี้'
        : 'บันทึกแบบ fallback ลงเครื่องนี้เรียบร้อย ยังไม่สามารถบันทึก Supabase ได้',
    );
  };

  const handleResetDraft = () => {
    resetDraft();
    setDraftMessage('คืนค่าเริ่มต้นเรียบร้อย');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="จัดการหน้าเว็บไซต์"
        description="พื้นที่สำหรับ SuperAdmin และ Admin จัดการ Home banner ข่าวประชาสัมพันธ์ ปุ่มนำทาง และหมวดเอกสารของหน้า public"
      />

      {draftMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {draftMessage}
        </div>
      ) : null}

      <div className="space-y-6">
        <SiteManagerBannerPreview banner={contentDraft.heroBanner} />

        <section className="rounded-md border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-w-max rounded-md px-3 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {activeTab === 'branding' ? (
          <SiteManagerBrandingEditor
            brandSettings={contentDraft.brandSettings}
            onBrandSettingsChange={(nextBrandSettings) => {
              setContentDraft((currentContent) => ({ ...currentContent, brandSettings: nextBrandSettings }));
              setDraftMessage(null);
            }}
            onSaveDraft={handleSaveDraft}
            onResetDraft={handleResetDraft}
            isSaving={isSaving}
          />
        ) : activeTab === 'home-content' ? (
          <SiteManagerContentEditor
            banner={contentDraft.heroBanner}
            newsDrafts={contentDraft.newsItems}
            onBannerChange={(nextBanner) => {
              setContentDraft((currentContent) => ({ ...currentContent, heroBanner: nextBanner }));
              setDraftMessage(null);
            }}
            onNewsChange={(nextNewsDrafts) => {
              setContentDraft((currentContent) => ({ ...currentContent, newsItems: nextNewsDrafts }));
              setDraftMessage(null);
            }}
            onSaveDraft={handleSaveDraft}
            onResetDraft={handleResetDraft}
            isSaving={isSaving}
          />
        ) : activeTab === 'plan-documents' ? (
          <SiteManagerPlanDocumentsEditor
            title="จัดการแผนระดับต่าง ๆ"
            description="เพิ่ม แก้ไข ใส่ลิงก์ PDF และเตรียมช่องเลือกไฟล์ไว้ก่อนเชื่อมระบบจัดเก็บไฟล์จริง"
            planCards={contentDraft.planLevelCards}
            onPlanCardsChange={(nextPlanCards) => {
              setContentDraft((currentContent) => ({ ...currentContent, planLevelCards: nextPlanCards }));
              setDraftMessage(null);
            }}
            onSaveDraft={handleSaveDraft}
            onResetDraft={handleResetDraft}
            isSaving={isSaving}
          />
        ) : activeTab === 'disease-control-plan' ? (
          <SiteManagerPlanDocumentsEditor
            title="จัดการแผนงานด้านการป้องกันควบคุมโรคและภัยสุขภาพ"
            description="เพิ่ม แก้ไข ใส่ลิงก์ PDF และเตรียมช่องเลือกไฟล์ไว้ก่อนเชื่อมระบบจัดเก็บไฟล์จริง"
            planCards={contentDraft.diseaseControlPlanCards}
            onPlanCardsChange={(nextPlanCards) => {
              setContentDraft((currentContent) => ({ ...currentContent, diseaseControlPlanCards: nextPlanCards }));
              setDraftMessage(null);
            }}
            onSaveDraft={handleSaveDraft}
            onResetDraft={handleResetDraft}
            isSaving={isSaving}
          />
        ) : activeTab === 'annual-guidelines' ? (
          <SiteManagerPlanDocumentsEditor
            title="จัดการแนวทางดำเนินงานประจำปี"
            description="เพิ่ม แก้ไข ใส่ลิงก์ PDF และเตรียมช่องเลือกไฟล์ไว้ก่อนเชื่อมระบบจัดเก็บไฟล์จริง"
            planCards={contentDraft.annualGuidelineCards}
            onPlanCardsChange={(nextPlanCards) => {
              setContentDraft((currentContent) => ({ ...currentContent, annualGuidelineCards: nextPlanCards }));
              setDraftMessage(null);
            }}
            onSaveDraft={handleSaveDraft}
            onResetDraft={handleResetDraft}
            isSaving={isSaving}
          />
        ) : activeTab === 'risk-management' ? (
          <SiteManagerPlanDocumentsEditor
            title="จัดการแผนบริหารความเสี่ยงยุทธศาสตร์"
            description="เพิ่ม แก้ไข ใส่ลิงก์ PDF และเตรียมช่องเลือกไฟล์ไว้ก่อนเชื่อมระบบจัดเก็บไฟล์จริง"
            planCards={contentDraft.riskManagementPlanCards}
            onPlanCardsChange={(nextPlanCards) => {
              setContentDraft((currentContent) => ({ ...currentContent, riskManagementPlanCards: nextPlanCards }));
              setDraftMessage(null);
            }}
            onSaveDraft={handleSaveDraft}
            onResetDraft={handleResetDraft}
            isSaving={isSaving}
          />
        ) : activeTab === 'executive-policy' ? (
          <SiteManagerPlanDocumentsEditor
            title="จัดการนโยบายผู้บริหาร"
            description="เพิ่ม แก้ไข ใส่ลิงก์ PDF/URL รายละเอียด และเตรียมช่องเลือกไฟล์ไว้ก่อนเชื่อมระบบจัดเก็บไฟล์จริง"
            planCards={contentDraft.executivePolicyCards}
            onPlanCardsChange={(nextPlanCards) => {
              setContentDraft((currentContent) => ({ ...currentContent, executivePolicyCards: nextPlanCards }));
              setDraftMessage(null);
            }}
            onSaveDraft={handleSaveDraft}
            onResetDraft={handleResetDraft}
            isSaving={isSaving}
          />
        ) : canManageSecurity ? (
          <SiteManagerSecuritySettings />
        ) : (
          <SiteManagerBrandingEditor
            brandSettings={contentDraft.brandSettings}
            onBrandSettingsChange={(nextBrandSettings) => {
              setContentDraft((currentContent) => ({ ...currentContent, brandSettings: nextBrandSettings }));
              setDraftMessage(null);
            }}
            onSaveDraft={handleSaveDraft}
            onResetDraft={handleResetDraft}
            isSaving={isSaving}
          />
        )}

        <SiteManagerEditableAreas areas={siteManagerEditableAreas} />
        <SiteManagerWorkflowPanel />
        <SiteManagerSummaryGrid items={siteManagerSummaryItems} />

        {loadingSource ? (
          <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            แหล่งข้อมูลปัจจุบัน: {loadingSource === 'supabase' ? 'Supabase' : 'localStorage fallback'}
          </div>
        ) : null}
      </div>
    </div>
  );
}
