import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { APP_SYSTEM_SURVEY_CONFIGS } from '../../surveys/satisfactionSurvey.service';
import { SiteManagerSatisfactionSurveyEditor } from './SiteManagerSatisfactionSurveyEditor';

export function SiteManagerSystemSatisfactionSurveysEditor() {
  const [selectedCode, setSelectedCode] = useState(APP_SYSTEM_SURVEY_CONFIGS[0].code);
  const selectedSystem = APP_SYSTEM_SURVEY_CONFIGS.find((config) => config.code === selectedCode) || APP_SYSTEM_SURVEY_CONFIGS[0];

  return (
    <section className="space-y-5">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">แบบสำรวจความพึงพอใจแยกตามระบบ</h2>
            <p className="mt-1 text-sm text-slate-600">เลือก APP เพื่อจัดการรอบ คำถาม ผลการประเมิน และแดชบอร์ดของแต่ละระบบโดยแยกข้อมูลออกจากกัน</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {APP_SYSTEM_SURVEY_CONFIGS.map((config) => {
            const active = config.code === selectedSystem.code;
            return (
              <button
                key={config.code}
                type="button"
                onClick={() => setSelectedCode(config.code)}
                className={`min-h-20 rounded-md border px-4 py-3 text-left transition ${active ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-200' : 'border-slate-200 bg-white hover:border-brand-200 hover:bg-slate-50'}`}
              >
                <span className={`block text-sm font-semibold ${active ? 'text-brand-800' : 'text-slate-900'}`}>{config.shortTitle}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{config.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <SiteManagerSatisfactionSurveyEditor
        key={selectedSystem.code}
        surveyCode={selectedSystem.code}
        heading={`แบบสำรวจความพึงพอใจ: ${selectedSystem.title}`}
        description="ตั้งค่า คำถามและคะแนน ผลการประเมิน และแดชบอร์ดสำหรับระบบนี้"
      />
    </section>
  );
}
