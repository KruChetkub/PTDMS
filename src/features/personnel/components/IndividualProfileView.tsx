import { useEffect, useState } from 'react';
import { Calendar, BookOpen, Award, BarChart3, Clock, ExternalLink, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell 
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { getPersonnelDetails } from '../../../services/personnel.service';
import type { Profile, TrainingRecord, Certificate, DevelopmentAnalysis } from '../../../types/database.types';
import { roleLabels } from '../../../types/roles';
import { useAuthStore } from '../../../stores/auth.store';
import { Edit2, X, Plus, FileDown } from 'lucide-react';
import { TrainingForm } from '../../../components/training/TrainingForm';
import { formatThaiDate, getCurrentThaiFiscalYear } from '../../../utils/thaiDate';
import { 
  updateTrainingRecord, 
  deleteTrainingRecord, 
  getTrainingRecordDetails 
} from '../../../services/training.service';
import { normalizeTrainingType, type TrainingFormValues } from '../../self-service/training-form.schema';
import { Trash2 } from 'lucide-react';
import { recordAuditLog } from '../../../services/audit.service';
import { getSafeUserErrorMessage, reportClientError } from '../../../utils/errorHandling';

type IndividualProfileViewProps = {
  userId: string;
  isMyProfile?: boolean;
};

const trainingPageSize = 5;

function getExportDatePart() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
}

export function IndividualProfileView({ userId, isMyProfile }: IndividualProfileViewProps) {
  const [data, setData] = useState<{
    profile: Profile;
    records: TrainingRecord[];
    certificates: Certificate[];
    analysis: DevelopmentAnalysis[];
    chartData: { year: number; count: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trainingPage, setTrainingPage] = useState(1);
  const [trainingExportMessage, setTrainingExportMessage] = useState<string | null>(null);
  const [trainingDeleteTarget, setTrainingDeleteTarget] = useState<{ id: string; course: string } | null>(null);
  const [isDeletingTraining, setIsDeletingTraining] = useState(false);

  const [isSubmittingTraining, setIsSubmittingTraining] = useState(false);
  const [trainingSubmitError, setTrainingSubmitError] = useState<string | null>(null);
  
  // Edit Training State
  const [editingTrainingId, setEditingTrainingId] = useState<string | null>(null);
  const [editTrainingValues, setEditTrainingValues] = useState<Partial<TrainingFormValues> | null>(null);
  const [isFetchingTrainingDetails, setIsFetchingTrainingDetails] = useState(false);

  const currentUser = useAuthStore((state) => state.profile);
  const authUser = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const canEdit = isMyProfile || currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.role === 'hr';

  const loadData = async (options: { showLoading?: boolean } = {}) => {
    const showLoading = options.showLoading ?? !data;

    if (showLoading) {
      setLoading(true);
    }

    setError(null);
    try {
      const result = await getPersonnelDetails(userId);
      setData(result);

    } catch (err) {
      const message = getSafeUserErrorMessage(err, 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
      if (showLoading || !data) {
        setError(message);
      } else {
        void reportClientError('Profile refresh failed:', err);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!userId) return;
    setTrainingPage(1);
    setTrainingExportMessage(null);
    void loadData({ showLoading: true });
  }, [userId]);

  const trainingTotalPages = Math.max(1, Math.ceil((data?.records.length || 0) / trainingPageSize));

  useEffect(() => {
    if (trainingPage > trainingTotalPages) {
      setTrainingPage(trainingTotalPages);
    }
  }, [trainingPage, trainingTotalPages]);

  const refreshTrainingData = () => {
    void loadData({ showLoading: false });
  };

  const handleAddTrainingNavigate = (profile: Profile) => {
    navigate('/self-service', {
      state: {
        targetUserId: profile.user_id,
        targetName: profile.full_name,
        returnTo: isMyProfile ? '/profile' : `/personnel/${profile.user_id}`,
      },
    });
  };


  const handleEditTrainingClick = async (id: string) => {
    setTrainingSubmitError(null);
    setEditingTrainingId(id);
    setIsFetchingTrainingDetails(true);
    try {
      const { record, certificate, analysis } = await getTrainingRecordDetails(id);
      
      setEditTrainingValues({
        trainingType: normalizeTrainingType(record.category),
        courseName: record.course,
        organizer: record.organizer,
        date: record.date,
        year: record.year,
        certificateName: certificate?.certificate_name || '',
        certificateLink: certificate?.certificate_link || '',
        developmentArea: analysis?.development_area || '',
        skillGroup: analysis?.skill_group || '',
        targetDirection: analysis?.target_direction || '',
      });
    } catch (err) {
      setTrainingSubmitError(getSafeUserErrorMessage(err, 'ไม่สามารถโหลดรายละเอียดข้อมูลได้'));
      setEditingTrainingId(null);
    } finally {
      setIsFetchingTrainingDetails(false);
    }
  };

  const handleUpdateTraining = async (values: TrainingFormValues) => {
    setTrainingSubmitError(null);

    if (!authUser || !editingTrainingId) {
      setTrainingSubmitError('ไม่พบข้อมูลผู้ใช้งานหรือรายการอบรมที่ต้องการแก้ไข');
      return;
    }

    setIsSubmittingTraining(true);
    try {
      await updateTrainingRecord(editingTrainingId, values);
      setEditingTrainingId(null);
      setEditTrainingValues(null);
      refreshTrainingData();
    } catch (err) {
      setTrainingSubmitError(getSafeUserErrorMessage(err, 'ไม่สามารถอัปเดตข้อมูลได้'));
    } finally {
      setIsSubmittingTraining(false);
    }
  };

  const handleDeleteTraining = (id: string, course: string) => {
    if (!authUser) return;
    setTrainingDeleteTarget({ id, course });
  };

  const confirmDeleteTraining = async () => {
    if (!trainingDeleteTarget) return;

    setIsDeletingTraining(true);
    try {
      await deleteTrainingRecord(trainingDeleteTarget.id);
      setTrainingDeleteTarget(null);
      await loadData({ showLoading: false });
    } catch (err) {
      setTrainingSubmitError(getSafeUserErrorMessage(err, 'ไม่สามารถลบข้อมูลได้'));
    } finally {
      setIsDeletingTraining(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-500">กำลังโหลดข้อมูล...</div>;
  }

  if (error || !data) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-600">{error || 'ไม่พบข้อมูล'}</p>
      </div>
    );
  }

  const { profile, records, certificates, analysis, chartData } = data;
  const certMap = new Map(certificates.map(c => [c.training_id, c]));
  const analysisMap = new Map(analysis.map(a => [a.training_id, a]));
  const exportTrainingRecords = records;
  const trainingCurrentPage = Math.min(trainingPage, trainingTotalPages);
  const trainingPageStart = (trainingCurrentPage - 1) * trainingPageSize;
  const visibleTrainingRecords = records.slice(trainingPageStart, trainingPageStart + trainingPageSize);

  const handleExportTrainingHistory = async () => {
    if (exportTrainingRecords.length === 0) {
      setTrainingExportMessage('ไม่พบประวัติการอบรมสำหรับบุคคลนี้');
      return;
    }

    const XLSX = await import('xlsx');
    const rows = exportTrainingRecords.map((record, index) => {
      const cert = certMap.get(record.id);
      const dev = analysisMap.get(record.id);

      return {
        'ลำดับที่': index + 1,
        'ชื่อ-นามสกุล': profile.full_name,
        'ตำแหน่ง': profile.position || '',
        'หน่วยงาน': profile.department || '',
        'กลุ่มงาน': profile.work_group || '',
        'ประเภทหลักสูตร': record.category,
        'หลักสูตร': record.course,
        'ผู้จัด': record.organizer,
        'วันที่อบรม': formatThaiDate(record.date),
        'ปีงบประมาณ': record.year,
        'ใบประกาศ': cert?.certificate_name || '',
        'ลิงก์ใบประกาศ': cert?.certificate_link || '',
        'ประเด็นการพัฒนา': dev?.development_area || '',
        'กลุ่มทักษะ': dev?.skill_group || '',
        'ทิศทางการพัฒนา': dev?.target_direction || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 10 },
      { wch: 30 },
      { wch: 28 },
      { wch: 30 },
      { wch: 30 },
      { wch: 28 },
      { wch: 46 },
      { wch: 30 },
      { wch: 16 },
      { wch: 14 },
      { wch: 28 },
      { wch: 48 },
      { wch: 34 },
      { wch: 28 },
      { wch: 42 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Training History');
    const fileName = `training-history-${sanitizeFileName(profile.full_name)}-all-${getExportDatePart()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    setTrainingExportMessage(`Export Excel ประวัติการอบรมทั้งหมดสำเร็จ ${exportTrainingRecords.length.toLocaleString('th-TH')} รายการ`);

    void recordAuditLog({
      module: 'personnel',
      action: 'export_individual_training_history',
      targetType: 'profile',
      targetId: profile.user_id,
      metadata: {
        format: 'xlsx',
        file_name: fileName,
        scope: 'all',
        record_count: exportTrainingRecords.length,
        target_name: profile.full_name,
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title={isMyProfile ? "My Profile" : profile.full_name} 
        description={isMyProfile ? "จัดการข้อมูลประวัติการพัฒนาของตนเอง" : `รายละเอียดข้อมูลและสถิติการพัฒนาของ ${profile.full_name}`} 
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-24 w-24 rounded-full object-cover ring-4 ring-brand-50" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-4 ring-brand-50">
                <span className="text-3xl font-bold">{profile.full_name.charAt(0)}</span>
              </div>
            )}
            <h2 className="mt-4 text-xl font-bold text-slate-900">{profile.full_name}</h2>
            <p className="text-sm font-medium text-brand-600">{roleLabels[profile.role]}</p>
          </div>

          <div className="mt-8 space-y-4 border-t border-slate-100 pt-6">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-slate-500">ตำแหน่ง</span>
              <div className="font-semibold text-slate-900">{profile.position || '-'}</div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-sm text-slate-500">หน่วยงาน</span>
              <div className="font-semibold text-slate-900">{profile.department || '-'}</div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-sm text-slate-500">กลุ่มงาน</span>
              <div className="font-semibold text-slate-900">{profile.work_group || '-'}</div>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-brand-50 p-2 text-brand-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{records.length}</p>
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">หลักสูตรทั้งหมด</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {records.filter(r => r.year === getCurrentThaiFiscalYear()).length}
                  </p>
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">ปีงบประมาณนี้</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-50 p-2 text-orange-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {formatThaiDate(records[0]?.date)}
                  </p>
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">อบรมล่าสุด</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
              <BarChart3 className="h-4 w-4 text-brand-600" />
              Training Trend
            </h3>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [`${value} รายการ`, 'จำนวน']}
                    labelFormatter={(label) => `ปี: ${label}`}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                    {chartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill="#2563eb" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-bold text-slate-900">ประวัติการอบรม</h3>
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => handleAddTrainingNavigate(profile)}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                <Plus className="h-3.5 w-3.5" />
                เพิ่มข้อมูลการอบรม
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleExportTrainingHistory()}
              disabled={exportTrainingRecords.length === 0}
              title="Export ประวัติการอบรมทั้งหมด"
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileDown className="h-3.5 w-3.5" />
              Export ประวัติการอบรม
            </button>
          </div>
        </div>
        {trainingExportMessage ? (
          <div className="border-b border-slate-100 bg-emerald-50 px-6 py-2 text-xs font-medium text-emerald-700">
            {trainingExportMessage}
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="whitespace-nowrap px-6 py-4">ลำดับที่</th>
                <th className="px-6 py-4">วันที่ / ปีงบประมาณ</th>
                <th className="px-6 py-4">หลักสูตร / ผู้จัด</th>
                <th className="px-6 py-4">ประเภท</th>
                <th className="px-6 py-4">ใบประกาศ / การพัฒนา</th>
                {canEdit && <th className="px-6 py-4 text-center">จัดการ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr><td colSpan={canEdit ? 6 : 5} className="px-6 py-8 text-center text-slate-500">ยังไม่มีข้อมูลประวัติการอบรม</td></tr>
              ) : (
                visibleTrainingRecords.map((record, index) => {
                  const cert = certMap.get(record.id);
                  const dev = analysisMap.get(record.id);
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition">
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-600">{trainingPageStart + index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-medium text-slate-900"><Calendar className="h-3 w-3 text-slate-400" />{formatThaiDate(record.date)}</div>
                        <div className="mt-1 text-xs text-slate-500">ปีงบประมาณ {record.year}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{record.course}</div>
                        <div className="mt-1 text-xs text-slate-500">{record.organizer}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 uppercase">{record.category}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          {cert && (
                            <a 
                              href={cert.certificate_link || '#'} 
                              target={cert.certificate_link ? "_blank" : undefined} 
                              rel="noopener noreferrer" 
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
                            >
                              <Award className="h-3.5 w-3.5" />
                              {cert.certificate_name || 'ดูใบประกาศ'}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {dev && (
                            <div className="flex items-start gap-1.5 text-xs text-slate-600">
                              <Lightbulb className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
                              <div className="line-clamp-2">{dev.development_area}: {dev.target_direction}</div>
                            </div>
                          )}
                          {!cert && !dev && <span className="text-slate-300">-</span>}
                        </div>
                      </td>
                      {canEdit && (
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEditTrainingClick(record.id)}
                              className="rounded p-1.5 text-brand-600 hover:bg-brand-50 transition"
                              title="แก้ไข"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTraining(record.id, record.course)}
                              className="rounded p-1.5 text-red-600 hover:bg-red-50 transition"
                              title="ลบ"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {records.length > trainingPageSize ? (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
              แสดง {trainingPageStart + 1}-{Math.min(trainingPageStart + visibleTrainingRecords.length, records.length)} จาก {records.length} รายการ
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTrainingPage((current) => Math.max(1, current - 1))}
                disabled={trainingCurrentPage <= 1}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                ก่อนหน้า
              </button>
              <span className="min-w-16 text-center text-sm font-medium text-slate-700">
                {trainingCurrentPage} / {trainingTotalPages}
              </span>
              <button
                type="button"
                onClick={() => setTrainingPage((current) => Math.min(trainingTotalPages, current + 1))}
                disabled={trainingCurrentPage >= trainingTotalPages}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ถัดไป
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <ConfirmModal
        isOpen={!!trainingDeleteTarget}
        title="ยืนยันการลบประวัติการอบรม"
        message={trainingDeleteTarget ? `ต้องการลบข้อมูลการอบรมหลักสูตร "${trainingDeleteTarget.course}" ใช่หรือไม่? เมื่อลบแล้วข้อมูลจะถูกลบออกจากฐานข้อมูล` : ''}
        confirmLabel={isDeletingTraining ? 'กำลังลบ...' : 'ลบข้อมูล'}
        cancelLabel="ยกเลิก"
        variant="danger"
        onConfirm={() => void confirmDeleteTraining()}
        onClose={() => {
          if (!isDeletingTraining) setTrainingDeleteTarget(null);
        }}
        isLoading={isDeletingTraining}
      />
      <TrainingModal
        isOpen={!!editingTrainingId}
        onClose={() => {
          setEditingTrainingId(null);
          setEditTrainingValues(null);
          setTrainingSubmitError(null);
        }}
        onSubmit={handleUpdateTraining}
        isLoading={isSubmittingTraining || isFetchingTrainingDetails}
        errorMessage={trainingSubmitError}
        initialValues={editTrainingValues || undefined}
        title="แก้ไขข้อมูลการอบรม"
        description={`แก้ไขรายละเอียดประวัติการอบรมสำหรับ ${profile.full_name}`}
        isFetching={isFetchingTrainingDetails}
      />
    </div>
  );
}

// Modal Helper
function TrainingModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading, 
  title,
  description,
  initialValues,
  errorMessage,
  isFetching = false
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSubmit: (values: TrainingFormValues) => Promise<void>, 
  isLoading: boolean, 
  title: string,
  description: string,
  initialValues?: Partial<TrainingFormValues>,
  errorMessage?: string | null,
  isFetching?: boolean
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isFetching ? (
          <div className="py-12 text-center text-slate-500">กำลังโหลดรายละเอียดข้อมูล...</div>
        ) : (
          <>
            {errorMessage ? (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}
            <TrainingForm 
              key={initialValues ? `edit-${initialValues.courseName}` : 'add'}
              initialValues={initialValues}
              onSubmit={onSubmit} 
              onCancel={onClose}
              isLoading={isLoading}
              submitLabel={initialValues ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลอบรม'}
            />
          </>
        )}
      </div>
    </div>
  );
}
