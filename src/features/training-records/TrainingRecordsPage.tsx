import { useEffect, useState } from 'react';
import { Edit2, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { 
  listTrainingRecords, 
  deleteTrainingRecord, 
  getTrainingRecordDetails, 
  updateTrainingRecord,
  type TrainingRecordRow 
} from '../../services/training.service';
import { TrainingForm } from '../../components/training/TrainingForm';
import { normalizeTrainingType, type TrainingFormValues } from '../self-service/training-form.schema';
import { formatThaiDate } from '../../utils/thaiDate';

export function TrainingRecordsPage() {
  const [records, setRecords] = useState<TrainingRecordRow[]>([]);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<TrainingFormValues> | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadRecords = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await listTrainingRecords({
        search,
        year: year ? Number(year) : undefined,
        month: month ? Number(month) : undefined,
        category: category || undefined,
      });
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลอบรมได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecords();
  }, []);

  const handleDelete = async (id: string, course: string) => {
    if (!confirm(`คุณต้องการลบข้อมูลการอบรมหลักสูตร "${course}" ใช่หรือไม่?`)) return;

    try {
      await deleteTrainingRecord(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ไม่สามารถลบข้อมูลได้');
    }
  };

  const handleEditClick = async (id: string) => {
    setEditingId(id);
    setEditError(null);
    setIsFetchingDetails(true);
    try {
      const { record, certificate, analysis } = await getTrainingRecordDetails(id);
      
      setEditValues({
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
      alert(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลรายละเอียดได้');
      setEditingId(null);
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const handleUpdate = async (values: TrainingFormValues) => {
    if (!editingId) return;

    setEditError(null);
    setIsUpdating(true);
    try {
      await updateTrainingRecord(editingId, values);
      
      setEditingId(null);
      setEditValues(null);
      void loadRecords();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'ไม่สามารถอัปเดตข้อมูลได้');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Training Records"
        description="ตารางข้อมูลอบรมหลัก เชื่อม Supabase และถูกจำกัดข้อมูลด้วย RLS ตามสิทธิ์ผู้ใช้งาน"
      />

      <section className="mb-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_120px_180px_auto]">
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Search</span>
            <div className="mt-1 flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
                placeholder="ชื่อบุคลากร / หลักสูตร / ผู้จัด"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-500">ปีงบประมาณ</span>
            <input
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="2569"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-500">เดือน</span>
            <input
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="1-12"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-500">ประเภท</span>
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="ประเภทการอบรม"
            />
          </label>

          <button
            type="button"
            onClick={() => void loadRecords()}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Load
          </button>
        </div>
      </section>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">บุคลากร</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">ประเภทหลักสูตร</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">หลักสูตร</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">วันที่</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">หน่วยงาน</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">ผู้จัด</th>
                <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={7}>
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={7}>
                    ยังไม่มีข้อมูลอบรมตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{record.personnel_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.category}</td>
                    <td className="min-w-64 px-4 py-3 text-slate-700">{record.course}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatThaiDate(record.date)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.department}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.organizer}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => void handleEditClick(record.id)}
                          className="rounded p-1 text-brand-600 transition hover:bg-brand-50"
                          title="แก้ไข"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => void handleDelete(record.id, record.course)}
                          className="rounded p-1 text-red-600 transition hover:bg-red-50"
                          title="ลบ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">แก้ไขข้อมูลการอบรม</h2>
              <button 
                onClick={() => {
                  setEditingId(null);
                  setEditValues(null);
                  setEditError(null);
                }}
                disabled={isUpdating}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isFetchingDetails ? (
              <div className="py-12 text-center text-slate-500">กำลังโหลดรายละเอียด...</div>
            ) : (
              editValues && (
                <>
                  {editError ? (
                    <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {editError}
                    </div>
                  ) : null}
                  <TrainingForm 
                    key={`edit-${editingId}`}
                    initialValues={editValues} 
                    onSubmit={handleUpdate} 
                    onCancel={() => {
                      setEditingId(null);
                      setEditValues(null);
                      setEditError(null);
                    }}
                    isLoading={isUpdating}
                    submitLabel="บันทึกการแก้ไข"
                  />
                </>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
