import { useEffect, useState } from 'react';
import { 
  FileDown, 
  Search, 
  Calendar, 
  Filter,
  Users,
  ChevronRight
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { listTrainingRecords, type TrainingRecordRow } from '../../services/training.service';
import { formatThaiDate, getCurrentThaiFiscalYear } from '../../utils/thaiDate';

export function ReportsPage() {
  const [records, setRecords] = useState<TrainingRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [year, setYear] = useState<number>(getCurrentThaiFiscalYear());
  
  const years = Array.from({ length: 5 }, (_, i) => getCurrentThaiFiscalYear() - i);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await listTrainingRecords({ year });
        setRecords(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลรายงานได้');
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [year]);

  const filteredRecords = records.filter(r => 
    r.course.toLowerCase().includes(search.toLowerCase()) ||
    r.personnel_name.toLowerCase().includes(search.toLowerCase()) ||
    r.department.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;

    const headers = ['ลำดับ', 'ชื่อ-สกุล', 'หน่วยงาน', 'หลักสูตร', 'ประเภท', 'วันที่', 'ปีงบประมาณ', 'ผู้จัด'];
    const csvContent = [
      headers.join(','),
      ...filteredRecords.map((r, i) => [
        i + 1,
        `"${r.personnel_name}"`,
        `"${r.department}"`,
        `"${r.course}"`,
        `"${r.category}"`,
        formatThaiDate(r.date),
        r.year,
        `"${r.organizer}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `training_report_${year}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training Reports"
        description="สร้างรายงานสรุปการอบรมรายบุคคลและรายหน่วยงาน พร้อมส่งออกข้อมูลเป็น CSV"
      />

      {/* Filters Section */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อหลักสูตร หรือชื่อบุคลากร..."
            className="w-full rounded-md border border-slate-300 pl-10 pr-4 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 bg-slate-50">
            <Calendar className="h-4 w-4 text-slate-500" />
            <select 
              className="bg-transparent text-sm font-medium outline-none"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map(y => <option key={y} value={y}>ปีงบประมาณ {y}</option>)}
            </select>
          </div>
          <button 
            onClick={handleExportCSV}
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      {/* Report Table Summary */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Filter className="h-4 w-4 text-brand-600" />
            ตารางสรุปผลการอบรม ({filteredRecords.length} รายการ)
          </h3>
          <div className="text-xs text-slate-500">
            แสดงข้อมูลปีงบประมาณ {year}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-4">ชื่อ-สกุล / หน่วยงาน</th>
                <th className="px-6 py-4">หลักสูตร / ประเภท</th>
                <th className="px-6 py-4">วันที่ / ปีงบประมาณ</th>
                <th className="px-6 py-4">ผู้จัด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-6 py-4"><div className="h-10 bg-slate-100 rounded"></div></td>
                  </tr>
                ))
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-500">ไม่พบข้อมูลการอบรมตามเงื่อนไขที่ระบุ</td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{record.personnel_name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Users className="h-3 w-3" /> {record.department}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{record.course}</div>
                      <div className="inline-flex mt-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                        {record.category}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900">{formatThaiDate(record.date)}</div>
                      <div className="text-xs text-slate-500">ปี {record.year}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600">{record.organizer}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
