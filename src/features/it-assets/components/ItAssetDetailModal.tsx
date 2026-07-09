import { Activity, Building, Calendar, Cpu, HardDrive, Monitor, User, X } from 'lucide-react';
import type { ItAssetViewModel } from '../types';

type ItAssetDetailModalProps = {
  asset: ItAssetViewModel | null;
  onClose: () => void;
};

function DetailItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value ?? '-'}</p>
    </div>
  );
}

export function ItAssetDetailModal({ asset, onClose }: ItAssetDetailModalProps) {
  if (!asset) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-md bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-blue-700">
              <Monitor className="h-5 w-5" aria-hidden="true" />
              <h2 className="truncate text-xl font-semibold tracking-normal text-slate-950">{asset.computer_name || '-'}</h2>
            </div>
            <p className="mt-1 font-mono text-sm text-slate-500">{asset.asset_code}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-full border-4 text-xl font-bold ${asset.health.colorClass}`}>
                {asset.health.grade}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">สถานะคุณภาพเครื่อง</p>
                <p className="mt-1 text-sm text-slate-500">คะแนนประเมิน {asset.health.score} / 100</p>
                <div className="mt-2 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-blue-600" style={{ width: `${asset.health.score}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase text-slate-500">ข้อมูลผู้ใช้</h3>
              <div className="grid gap-4 rounded-md border border-slate-200 p-4">
                <div className="flex gap-3">
                  <User className="mt-0.5 h-5 w-5 text-slate-400" aria-hidden="true" />
                  <DetailItem label="ผู้ใช้งาน" value={asset.user_name} />
                </div>
                <div className="flex gap-3">
                  <Building className="mt-0.5 h-5 w-5 text-slate-400" aria-hidden="true" />
                  <DetailItem label="กลุ่มงาน" value={asset.work_group} />
                </div>
                <div className="flex gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-slate-400" aria-hidden="true" />
                  <DetailItem label="วันที่รับ / อายุ" value={`${asset.received_date_raw || '-'} / ${asset.ageText}`} />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase text-slate-500">สเปกเครื่อง</h3>
              <div className="grid gap-4 rounded-md border border-slate-200 p-4">
                <div className="flex gap-3">
                  <Cpu className="mt-0.5 h-5 w-5 text-slate-400" aria-hidden="true" />
                  <DetailItem label="CPU / OS" value={`${asset.cpu || '-'} / ${asset.operating_system || '-'}`} />
                </div>
                <DetailItem label="Memory" value={asset.memory_gb ? `${asset.memory_gb} GB` : '-'} />
                <div className="flex gap-3">
                  <HardDrive className="mt-0.5 h-5 w-5 text-slate-400" aria-hidden="true" />
                  <DetailItem label="Disk 1" value={`${asset.disk1_type || '-'} · ${(asset.disk1_hours || 0).toLocaleString()} ชม.`} />
                </div>
                <DetailItem label="Disk 2" value={asset.disk2_type ? `${asset.disk2_type} · ${(asset.disk2_hours || 0).toLocaleString()} ชม.` : '-'} />
              </div>
            </section>
          </div>

          <section className="rounded-md border border-slate-200 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Activity className="h-4 w-4 text-blue-700" aria-hidden="true" />
              รายละเอียดคะแนน
            </h3>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <DetailItem label="RAM" value={`+${asset.health.breakdown.ramScore}`} />
              <DetailItem label="Disk" value={`+${asset.health.breakdown.diskScore}`} />
              <DetailItem label="OS" value={`+${asset.health.breakdown.osScore}`} />

            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
