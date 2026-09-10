import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { buildHierarchyRollupMap, formatBudgetAmount, getNetAllocationTotal, normalizeAmount } from '../utils/budgetUtilizationCalculations';
import type { BudgetUtilizationDashboardSummary, BudgetUtilizationReportPeriod } from '../types/budgetUtilization.types';

type Props = {
  primary: BudgetUtilizationDashboardSummary;
  comparison: BudgetUtilizationDashboardSummary | null;
  reportPeriods: BudgetUtilizationReportPeriod[];
  selectedComparisonReportPeriodId: string;
  loading: boolean;
  onSelectComparison: (reportPeriodId: string) => void;
};

function getAllocationTotals(summary: BudgetUtilizationDashboardSummary) {
  const childItemIds = new Set(
    summary.items.map((item) => item.parent_id).filter((id): id is string => Boolean(id)),
  );
  const leaves = summary.items.filter((item) => item.row_type !== 'total' && !childItemIds.has(item.id));
  const dynamicTotals = summary.allocationTranches.map((tranche) => ({
    trancheNumber: tranche.tranche_number,
    label: tranche.label,
    value: leaves.some((item) => item.allocations?.some((allocation) => allocation.tranche_id === tranche.id))
      ? leaves.reduce((total, item) => total + (item.allocations?.find((allocation) => allocation.tranche_id === tranche.id)?.amount ?? 0), 0)
      : summary.totalItem?.allocations?.find((allocation) => allocation.tranche_id === tranche.id)?.amount ?? 0,
  }));

  if (dynamicTotals.length > 0) return dynamicTotals;
  return [
    { trancheNumber: 1, label: 'จัดสรรงวด 1', value: summary.totals.allocation_tranche_1_amount },
    { trancheNumber: 2, label: 'จัดสรรงวด 2', value: summary.totals.allocation_tranche_2_amount },
    { trancheNumber: 3, label: 'จัดสรรงวด 3', value: summary.totals.allocation_tranche_3_amount },
  ];
}

function getCategoryTotals(summary: BudgetUtilizationDashboardSummary) {
  const rollup = buildHierarchyRollupMap(summary.items);
  return summary.categoryItems.map((item) => {
    const amount = rollup.get(item.id) ?? normalizeAmount(item.amount);
    return {
      key: item.item_name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('th'),
      name: item.item_name,
      net: getNetAllocationTotal(amount),
      disbursed: amount.disbursed_total_amount,
    };
  });
}

function getProjectTotals(summary: BudgetUtilizationDashboardSummary) {
  const rollup = buildHierarchyRollupMap(summary.items);
  return summary.items
    .filter((item) => item.row_type === 'major_project')
    .map((item) => {
      const amount = rollup.get(item.id) ?? normalizeAmount(item.amount);
      return {
        key: item.item_name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('th'),
        name: item.item_name,
        disbursed: amount.disbursed_total_amount,
      };
    });
}

function mergeNamedValues(
  primaryRows: Array<{ key: string; name: string; value: number }>,
  comparisonRows: Array<{ key: string; name: string; value: number }>,
) {
  const primaryMap = new Map(primaryRows.map((row) => [row.key, row]));
  const comparisonMap = new Map(comparisonRows.map((row) => [row.key, row]));
  return Array.from(new Set([...primaryMap.keys(), ...comparisonMap.keys()])).map((key) => ({
    name: primaryMap.get(key)?.name ?? comparisonMap.get(key)?.name ?? key,
    primary: primaryMap.get(key)?.value ?? 0,
    comparison: comparisonMap.get(key)?.value ?? 0,
  }));
}

function MoneyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="mb-2 font-semibold text-slate-900">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {formatBudgetAmount(Number(entry.value), 2)} บาท
        </p>
      ))}
    </div>
  );
}

export function BudgetYearComparisonSection({
  primary,
  comparison,
  reportPeriods,
  selectedComparisonReportPeriodId,
  loading,
  onSelectComparison,
}: Props) {
  const primaryYear = primary.reportPeriod?.fiscal_year;
  if (!primaryYear) return null;

  const comparisonYear = comparison?.reportPeriod?.fiscal_year;
  const primaryTotals = primary.totals;
  const comparisonTotals = comparison?.totals;
  const overviewData = comparisonTotals ? [
    { name: 'วงเงินตามแผน', primary: primaryTotals.planned_budget_amount, comparison: comparisonTotals.planned_budget_amount },
    { name: 'ยอดสุทธิหลังโอน', primary: primaryTotals.net_budget_after_transfer_amount, comparison: comparisonTotals.net_budget_after_transfer_amount },
    { name: 'เบิกจ่ายรวม', primary: primaryTotals.disbursed_total_amount, comparison: comparisonTotals.disbursed_total_amount },
    { name: 'คงเหลือ', primary: primaryTotals.remaining_amount, comparison: comparisonTotals.remaining_amount },
  ] : [];
  const statusData = comparisonTotals ? [
    {
      name: `ปี ${primaryYear}`,
      disbursed: primaryTotals.disbursed_total_amount,
      committed: primaryTotals.committed_total_amount,
      remaining: primaryTotals.remaining_amount,
    },
    {
      name: `ปี ${comparisonYear}`,
      disbursed: comparisonTotals.disbursed_total_amount,
      committed: comparisonTotals.committed_total_amount,
      remaining: comparisonTotals.remaining_amount,
    },
  ] : [];
  const transferData = comparisonTotals ? [
    { name: 'ส่วนกลางรับโอน', primary: primaryTotals.central_transfer_in_amount, comparison: comparisonTotals.central_transfer_in_amount },
    { name: 'ส่วนกลางโอนออก', primary: -primaryTotals.central_transfer_out_amount, comparison: -comparisonTotals.central_transfer_out_amount },
    { name: 'ภายในกรมขอเพิ่ม', primary: primaryTotals.department_request_increase_amount, comparison: comparisonTotals.department_request_increase_amount },
    { name: 'ภายในกรมโอนออก', primary: -primaryTotals.department_transfer_out_amount, comparison: -comparisonTotals.department_transfer_out_amount },
    { name: 'ภายในกองรับโอน', primary: primaryTotals.division_transfer_in_amount, comparison: comparisonTotals.division_transfer_in_amount },
    { name: 'ภายในกองโอนออก', primary: -primaryTotals.division_transfer_out_amount, comparison: -comparisonTotals.division_transfer_out_amount },
  ] : [];
  const allocationData = comparison ? (() => {
    const primaryMap = new Map(getAllocationTotals(primary).map((row) => [row.trancheNumber, row]));
    const comparisonMap = new Map(getAllocationTotals(comparison).map((row) => [row.trancheNumber, row]));
    return Array.from(new Set([...primaryMap.keys(), ...comparisonMap.keys()])).sort((a, b) => a - b).map((key) => ({
      name: primaryMap.get(key)?.label ?? comparisonMap.get(key)?.label ?? `จัดสรรงวด ${key}`,
      primary: primaryMap.get(key)?.value ?? 0,
      comparison: comparisonMap.get(key)?.value ?? 0,
    }));
  })() : [];
  const categoryData = comparison ? (() => {
    const primaryCategories = getCategoryTotals(primary);
    const comparisonCategories = getCategoryTotals(comparison);
    return mergeNamedValues(
      primaryCategories.map((row) => ({ key: row.key, name: row.name, value: row.disbursed })),
      comparisonCategories.map((row) => ({ key: row.key, name: row.name, value: row.disbursed })),
    );
  })() : [];
  const projectData = comparison ? mergeNamedValues(
    getProjectTotals(primary).map((row) => ({ key: row.key, name: row.name, value: row.disbursed })),
    getProjectTotals(comparison).map((row) => ({ key: row.key, name: row.name, value: row.disbursed })),
  )
    .sort((left, right) => Math.abs(right.primary - right.comparison) - Math.abs(left.primary - left.comparison))
    .slice(0, 10) : [];
  const tableRows = comparisonTotals ? [
    { label: 'วงเงินตามแผน', primary: primaryTotals.planned_budget_amount, comparison: comparisonTotals.planned_budget_amount, rate: false },
    { label: 'ยอดสุทธิหลังโอน', primary: primaryTotals.net_budget_after_transfer_amount, comparison: comparisonTotals.net_budget_after_transfer_amount, rate: false },
    { label: 'ผูกพันรวม', primary: primaryTotals.committed_total_amount, comparison: comparisonTotals.committed_total_amount, rate: false },
    { label: 'เบิกจ่ายรวม', primary: primaryTotals.disbursed_total_amount, comparison: comparisonTotals.disbursed_total_amount, rate: false },
    { label: 'คงเหลือ', primary: primaryTotals.remaining_amount, comparison: comparisonTotals.remaining_amount, rate: false },
    { label: 'ร้อยละเบิกจ่าย', primary: primaryTotals.disbursement_rate ?? 0, comparison: comparisonTotals.disbursement_rate ?? 0, rate: true },
    { label: 'ร้อยละใช้จ่ายรวมผูกพัน', primary: primaryTotals.utilization_with_po_rate ?? 0, comparison: comparisonTotals.utilization_with_po_rate ?? 0, rate: true },
  ] : [];
  const chartMargin = { top: 12, right: 12, bottom: 44, left: 12 };

  return (
    <section className="mt-8 border-t-4 border-teal-700 pt-6" aria-labelledby="budget-year-comparison-title">
      <div className="rounded-md border border-teal-200 bg-teal-50/40 p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id="budget-year-comparison-title" className="text-xl font-bold text-slate-950">เปรียบเทียบข้อมูลระหว่างปีงบประมาณ</h2>
            <p className="mt-1 text-sm text-slate-600">แสดงข้อมูลจากรายการที่กรอกในแต่ละปี โดยไม่เปลี่ยนแปลง Dashboard หลักด้านบน</p>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">เปรียบเทียบปี {primaryYear} กับ</span>
            <select
              value={selectedComparisonReportPeriodId}
              onChange={(event) => onSelectComparison(event.target.value)}
              disabled={loading}
              className="mt-1 h-10 min-w-56 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
            >
              <option value="">เลือกปีงบประมาณ</option>
              {reportPeriods.filter((period) => period.id !== primary.reportPeriod?.id).map((period) => (
                <option key={period.id} value={period.id}>ปีงบประมาณ {period.fiscal_year}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {comparison && comparisonYear ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-slate-950">ภาพรวมงบประมาณ: ปี {primaryYear} เทียบกับปี {comparisonYear}</h3>
              <p className="mt-1 text-xs text-slate-500">วงเงินตามแผน ยอดสุทธิหลังโอน เบิกจ่ายรวม และคงเหลือ · หน่วย: บาท</p>
              <div className="mt-3 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overviewData} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-10} textAnchor="end" height={58} />
                    <YAxis tickFormatter={(value) => `${Number(value) / 1_000_000}ล.`} />
                    <Tooltip content={<MoneyTooltip />} />
                    <Legend />
                    <Bar dataKey="primary" name={`ปี ${primaryYear}`} fill="#0f766e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="comparison" name={`ปี ${comparisonYear}`} fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-slate-950">สถานะการใช้จ่ายงบประมาณของแต่ละปี</h3>
              <p className="mt-1 text-xs text-slate-500">ยอดเบิกจ่าย ยอดผูกพัน และงบประมาณคงเหลือ · หน่วย: บาท</p>
              <div className="mt-3 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `${Number(value) / 1_000_000}ล.`} />
                    <Tooltip content={<MoneyTooltip />} />
                    <Legend />
                    <Bar dataKey="disbursed" name="เบิกจ่ายแล้ว" stackId="status" fill="#ea580c" />
                    <Bar dataKey="committed" name="ผูกพัน" stackId="status" fill="#f59e0b" />
                    <Bar dataKey="remaining" name="คงเหลือ" stackId="status" fill="#0f766e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-slate-950">การรับโอนและโอนออก: ปี {primaryYear} เทียบกับปี {comparisonYear}</h3>
              <p className="mt-1 text-xs text-slate-500">ค่าบวกคือรับโอนหรือขอเพิ่ม ค่าลบคือโอนออก · หน่วย: บาท</p>
              <div className="mt-3 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={transferData} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={72} />
                    <YAxis tickFormatter={(value) => `${Number(value) / 1_000_000}ล.`} />
                    <Tooltip content={<MoneyTooltip />} />
                    <Legend />
                    <Bar dataKey="primary" name={`ปี ${primaryYear}`} fill="#0f766e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="comparison" name={`ปี ${comparisonYear}`} fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-slate-950">การรับจัดสรรตามงวด: ปี {primaryYear} เทียบกับปี {comparisonYear}</h3>
              <p className="mt-1 text-xs text-slate-500">ยอดรับจัดสรรของงวดหมายเลขเดียวกันในแต่ละปี · หน่วย: บาท</p>
              <div className="mt-3 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allocationData} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(value) => `${Number(value) / 1_000_000}ล.`} />
                    <Tooltip content={<MoneyTooltip />} />
                    <Legend />
                    <Bar dataKey="primary" name={`ปี ${primaryYear}`} fill="#0f766e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="comparison" name={`ปี ${comparisonYear}`} fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
              <h3 className="font-semibold text-slate-950">ผลเบิกจ่ายตามหมวดงบประมาณ: ปี {primaryYear} เทียบกับปี {comparisonYear}</h3>
              <p className="mt-1 text-xs text-slate-500">ยอดเบิกจ่ายรวมของหมวดชื่อเดียวกัน หากมีข้อมูลเพียงปีเดียวอีกปีจะแสดงเป็นศูนย์ · หน่วย: บาท</p>
              <div className="mt-3 h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ top: 12, right: 20, bottom: 12, left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(value) => `${Number(value) / 1_000_000}ล.`} />
                    <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11 }} />
                    <Tooltip content={<MoneyTooltip />} />
                    <Legend />
                    <Bar dataKey="primary" name={`ปี ${primaryYear}`} fill="#0f766e" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="comparison" name={`ปี ${comparisonYear}`} fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            {projectData.length > 0 ? (
              <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
                <h3 className="font-semibold text-slate-950">10 โครงการที่ยอดเบิกจ่ายเปลี่ยนแปลงมากที่สุด</h3>
                <p className="mt-1 text-xs text-slate-500">จับคู่ด้วยชื่อโครงการและเรียงตามส่วนต่างระหว่างปีจากมากไปน้อย · หน่วย: บาท</p>
                <div className="mt-3 h-[440px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectData} layout="vertical" margin={{ top: 12, right: 20, bottom: 12, left: 70 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={(value) => `${Number(value) / 1_000_000}ล.`} />
                      <YAxis type="category" dataKey="name" width={220} tick={{ fontSize: 10 }} />
                      <Tooltip content={<MoneyTooltip />} />
                      <Legend />
                      <Bar dataKey="primary" name={`ปี ${primaryYear}`} fill="#0f766e" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="comparison" name={`ปี ${comparisonYear}`} fill="#2563eb" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>
            ) : null}
          </div>

          <article className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="font-semibold text-slate-950">ตารางสรุปส่วนต่างระหว่างปีงบประมาณ</h3>
              <p className="mt-1 text-xs text-slate-500">ส่วนต่างคำนวณจากปี {primaryYear} ลบปี {comparisonYear}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">รายการ</th>
                    <th className="px-4 py-3 text-right font-semibold">ปี {primaryYear}</th>
                    <th className="px-4 py-3 text-right font-semibold">ปี {comparisonYear}</th>
                    <th className="px-4 py-3 text-right font-semibold">ส่วนต่าง</th>
                    <th className="px-4 py-3 text-right font-semibold">เปลี่ยนแปลง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tableRows.map((row) => {
                    const difference = row.primary - row.comparison;
                    const changeRate = row.comparison !== 0 ? (difference * 100) / Math.abs(row.comparison) : null;
                    const formatValue = (value: number) => row.rate ? `${formatBudgetAmount(value)}%` : `${formatBudgetAmount(value)} บาท`;
                    return (
                      <tr key={row.label}>
                        <td className="px-4 py-3 font-medium text-slate-900">{row.label}</td>
                        <td className="px-4 py-3 text-right text-slate-800">{formatValue(row.primary)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{formatValue(row.comparison)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${difference > 0 ? 'text-emerald-700' : difference < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                          {difference > 0 ? '+' : ''}{formatValue(difference)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {changeRate === null ? 'ไม่มีฐานเปรียบเทียบ' : `${changeRate > 0 ? '+' : ''}${formatBudgetAmount(changeRate)}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>

          <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            ยังไม่แสดงกราฟแนวโน้มยอดจริงรายไตรมาส เนื่องจากระบบปัจจุบันเก็บยอดล่าสุดของแต่ละปี แต่ยังไม่ได้เก็บ snapshot ยอดแยกไตรมาส การสร้างกราฟจากยอดรวมเดียวจะทำให้ข้อมูลคลาดเคลื่อน
          </p>
        </div>
      ) : (
        <div className="mt-5 rounded-md border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
          เลือกปีงบประมาณด้านบนเพื่อแสดงกราฟและตารางเปรียบเทียบ
        </div>
      )}
    </section>
  );
}
