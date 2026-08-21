import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, BarChart3, Coins, DatabaseZap, RefreshCw, TrendingUp, WalletCards } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useAuditPageAccess } from '../../../hooks/useAuditPageAccess';
import { getBudgetDashboardSummary, getBudgetImportFileDetail, listBudgetDatasetOptions } from '../services/budgetUtilization.service';
import { formatBudgetAmount, getNetAllocationTotal, percent, sumBudgetAmounts, toNumber } from '../utils/budgetUtilizationCalculations';
import type { BudgetUtilizationAmount, BudgetUtilizationDashboardSummary, BudgetUtilizationDatasetOption, BudgetUtilizationImportFileDetail, BudgetUtilizationItemWithAmount, BudgetUtilizationRawWorkbook } from '../types/budgetUtilization.types';
import { getSafeUserErrorMessage } from '../../../utils/errorHandling';

const chartColors = ['#2563eb', '#8b5cf6', '#f59e0b', '#0f766e', '#e11d48'];
const quarterColors = {
  q1: 'bg-emerald-100 text-emerald-950',
  q2: 'bg-yellow-100 text-yellow-950',
  q3: 'bg-orange-100 text-orange-950',
  q4: 'bg-sky-100 text-sky-950',
  total: 'bg-lime-100 text-lime-950',
};

type QuarterKey = 'q1' | 'q2' | 'q3' | 'q4';
type AssessmentGroupKey = 'overall' | 'recurrent' | 'investment';
type TargetTone = 'blue' | 'amber' | 'emerald';
type RawBudgetRow = {
  id: string;
  name: string;
  planned: number;
  allocation1: number;
  allocation2: number;
  allocation3: number;
  netTotal: number;
  centralIn: number;
  centralOut: number;
  divisionIn: number;
  divisionOut: number;
  committedPo: number;
  committedWithoutPo: number;
  committedTotal: number;
  disbursedGeneral: number;
  disbursedAdvance: number;
  disbursedTotal: number;
  utilizationTotal: number;
  remaining: number;
  disbursementRate: number;
  utilizationWithPoRate: number;
};

const quarterOptions: Array<{ key: QuarterKey; label: string; period: string }> = [
  { key: 'q1', label: 'ไตรมาสที่ 1', period: '1 ต.ค. - 31 ธ.ค.' },
  { key: 'q2', label: 'ไตรมาสที่ 2', period: '1 ม.ค. - 31 มี.ค.' },
  { key: 'q3', label: 'ไตรมาสที่ 3', period: '1 เม.ย. - 30 มิ.ย.' },
  { key: 'q4', label: 'ไตรมาสที่ 4', period: '1 ก.ค. - 30 ก.ย.' },
];

const assessmentTargets: Record<AssessmentGroupKey, { label: string; q1: { spending: number; disbursement: number }; q2: { spending: number; disbursement: number }; q3: { spending: number; disbursement: number }; q4: { spending: number; disbursement: number }; total: { spending: number; disbursement: number } }> = {
  overall: {
    label: 'ภาพรวม',
    q1: { spending: 38, disbursement: 33 },
    q2: { spending: 61, disbursement: 55 },
    q3: { spending: 81, disbursement: 76 },
    q4: { spending: 100, disbursement: 93 },
    total: { spending: 100, disbursement: 93 },
  },
  recurrent: {
    label: 'รายจ่ายประจำ',
    q1: { spending: 38, disbursement: 37 },
    q2: { spending: 61, disbursement: 60 },
    q3: { spending: 84, disbursement: 83 },
    q4: { spending: 100, disbursement: 98 },
    total: { spending: 100, disbursement: 98 },
  },
  investment: {
    label: 'รายจ่ายลงทุน',
    q1: { spending: 36, disbursement: 20 },
    q2: { spending: 59, disbursement: 38 },
    q3: { spending: 69, disbursement: 55 },
    q4: { spending: 100, disbursement: 75 },
    total: { spending: 100, disbursement: 75 },
  },
};

const assessmentGroupOrder: AssessmentGroupKey[] = ['overall', 'recurrent', 'investment'];
const targetToneByGroup: Record<AssessmentGroupKey, TargetTone> = {
  overall: 'blue',
  recurrent: 'amber',
  investment: 'emerald',
};

const plannedBudgetCategoryDefinitions = [
  { key: "personnel", label: "งบบุคลากร", matcher: /งบบุคลากร/, color: "#2563eb" },
  { key: "investment", label: "งบลงทุน", matcher: /งบลงทุน/, color: "#f59e0b" },
  { key: "operations_total", label: "งบดำเนินงาน (รวม)", matcher: /งบดำเนินงาน\(รวม\)/, color: "#0f766e" },
  { key: "operations", label: "งบดำเนินงาน (ดำเนินงานปกติ)", matcher: /^งบดำเนินงาน$/, color: "#0d9488" },
  { key: "project", label: "งบโครงการ (รวม)", matcher: /งบโครงการ/, color: "#8b5cf6" },
];

function formatExactBaht(value: number) {
  return `${formatBudgetAmount(value, Number.isInteger(value) ? 0 : 2)} บาท`;
}

function isProjectBudgetCategory(name: string) {
  return /งบโครงการ/.test(name);
}

function StatCard({ title, value, subtext = '', icon: Icon, tone }: { title: string; value: string; subtext?: string; icon: typeof Coins; tone: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 break-words text-2xl font-semibold text-slate-950">{value}</p>
          {subtext ? <p className="mt-1 text-xs text-slate-500">{subtext}</p> : null}
        </div>
        <span className={`rounded-md p-2 ring-1 ${tone}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

function TargetCard({ title, value, target, tone = 'blue' }: { title: string; value: number; target: number; tone?: TargetTone }) {
  const capped = Math.max(0, Math.min(100, value));
  const reached = value >= target;
  const toneClass = {
    blue: {
      border: 'border-blue-100',
      bar: 'bg-blue-600',
      target: reached ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700',
    },
    amber: {
      border: 'border-amber-100',
      bar: 'bg-amber-500',
      target: reached ? 'bg-amber-50 text-amber-700' : 'bg-orange-50 text-orange-700',
    },
    emerald: {
      border: 'border-emerald-100',
      bar: 'bg-emerald-600',
      target: reached ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
    },
  }[tone];

  return (
    <div className={`rounded-md border bg-white p-4 shadow-sm ${toneClass.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{formatBudgetAmount(value)}%</p>
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${toneClass.target}`}>
          เป้าหมาย {target}%
        </span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${toneClass.bar}`} style={{ width: `${capped}%` }} />
      </div>
    </div>
  );
}

function getDashboardAmountMetrics(amount: BudgetUtilizationAmount) {
  const netAllocationTotal = getNetAllocationTotal(amount);
  const remaining = Math.max(0, netAllocationTotal - amount.utilization_total_amount);

  return {
    netAllocationTotal,
    disbursementRate: percent(amount.disbursed_total_amount, netAllocationTotal),
    utilizationRate: percent(amount.utilization_total_amount, netAllocationTotal),
    remaining,
  };
}

function getCategoryAmount(category: BudgetUtilizationItemWithAmount, items: BudgetUtilizationItemWithAmount[]) {
  const descendantIds = new Set([category.id]);
  let hasChange = true;

  while (hasChange) {
    hasChange = false;
    for (const item of items) {
      if (item.parent_id && descendantIds.has(item.parent_id) && !descendantIds.has(item.id)) {
        descendantIds.add(item.id);
        hasChange = true;
      }
    }
  }

  const childAmounts = items
    .filter((item) => descendantIds.has(item.id) && item.id !== category.id)
    .map((item) => item.amount);

  return sumBudgetAmounts(childAmounts.length ? childAmounts : [category.amount]);
}

function isInvestmentCategory(name: string) {
  return /ลงทุน/.test(name);
}

function getActualByGroup(group: AssessmentGroupKey, totals: BudgetUtilizationAmount, categoryData: Array<{ name: string; amount: BudgetUtilizationAmount }>) {
  if (group === 'overall') {
    return getDashboardAmountMetrics(totals);
  }

  const categoryAmounts = categoryData
    .filter((item) => (group === 'investment' ? isInvestmentCategory(item.name) : !isInvestmentCategory(item.name)))
    .map((item) => item.amount);

  return getDashboardAmountMetrics(sumBudgetAmounts(categoryAmounts));
}

function getRawCell(row: string[], index: number) {
  return String(row[index] ?? '').trim();
}

function mapRawBudgetRow(row: string[], index: number): RawBudgetRow {
  const name = getRawCell(row, 5) || getRawCell(row, 1) || getRawCell(row, 0) || `แถวที่ ${index + 1}`;
  const committedTotal = toNumber(row[19]) || toNumber(row[17]) + toNumber(row[18]);
  const disbursedTotal = toNumber(row[22]) || toNumber(row[20]) + toNumber(row[21]);
  const utilizationTotal = toNumber(row[23]) || committedTotal + disbursedTotal;
  const netTotal = toNumber(row[12]) || toNumber(row[9]) + toNumber(row[10]) + toNumber(row[11]) + toNumber(row[13]) - toNumber(row[14]);

  return {
    id: `raw-${index}`,
    name,
    planned: toNumber(row[8]),
    allocation1: toNumber(row[9]),
    allocation2: toNumber(row[10]),
    allocation3: toNumber(row[11]),
    netTotal,
    centralIn: toNumber(row[13]),
    centralOut: toNumber(row[14]),
    divisionIn: toNumber(row[15]),
    divisionOut: toNumber(row[16]),
    committedPo: toNumber(row[17]),
    committedWithoutPo: toNumber(row[18]),
    committedTotal,
    disbursedGeneral: toNumber(row[20]),
    disbursedAdvance: toNumber(row[21]),
    disbursedTotal,
    utilizationTotal,
    remaining: toNumber(row[24]),
    disbursementRate: toNumber(row[25]) || percent(disbursedTotal, netTotal),
    utilizationWithPoRate: toNumber(row[26]) || percent(utilizationTotal, netTotal),
  };
}

function getRawDashboardRows(rawWorkbook: BudgetUtilizationRawWorkbook | null | undefined) {
  if (!rawWorkbook) {
    return { total: null as RawBudgetRow | null, categories: [] as RawBudgetRow[] };
  }

  const mappedRows = rawWorkbook.rows
    .map((row, index) => ({ row, mapped: mapRawBudgetRow(row, index) }))
    .filter(({ mapped }) => mapped.netTotal || mapped.planned || mapped.disbursedTotal || mapped.utilizationTotal);
  const total = mappedRows.find(({ row }) => row.some((cell) => /รวมทั้งสิ้น/.test(cell)))?.mapped ?? mappedRows[0]?.mapped ?? null;
  const categories = mappedRows
    .filter(({ row }) => {
      const cell0 = getRawCell(row, 0);
      return (/\(รวม\)/.test(cell0) || cell0 === "งบดำเนินงาน") && !/รวมทั้งสิ้น/.test(cell0);
    })
    .map(({ mapped }) => mapped);

  return { total, categories };
}

function sumRawBudgetRows(rows: RawBudgetRow[]): RawBudgetRow {
  const sum = rows.reduce(
    (total, row) => ({
      planned: total.planned + row.planned,
      allocation1: total.allocation1 + row.allocation1,
      allocation2: total.allocation2 + row.allocation2,
      allocation3: total.allocation3 + row.allocation3,
      netTotal: total.netTotal + row.netTotal,
      centralIn: total.centralIn + row.centralIn,
      centralOut: total.centralOut + row.centralOut,
      divisionIn: total.divisionIn + row.divisionIn,
      divisionOut: total.divisionOut + row.divisionOut,
      committedPo: total.committedPo + row.committedPo,
      committedWithoutPo: total.committedWithoutPo + row.committedWithoutPo,
      committedTotal: total.committedTotal + row.committedTotal,
      disbursedGeneral: total.disbursedGeneral + row.disbursedGeneral,
      disbursedAdvance: total.disbursedAdvance + row.disbursedAdvance,
      disbursedTotal: total.disbursedTotal + row.disbursedTotal,
      utilizationTotal: total.utilizationTotal + row.utilizationTotal,
      remaining: total.remaining + row.remaining,
    }),
    {
      planned: 0,
      allocation1: 0,
      allocation2: 0,
      allocation3: 0,
      netTotal: 0,
      centralIn: 0,
      centralOut: 0,
      divisionIn: 0,
      divisionOut: 0,
      committedPo: 0,
      committedWithoutPo: 0,
      committedTotal: 0,
      disbursedGeneral: 0,
      disbursedAdvance: 0,
      disbursedTotal: 0,
      utilizationTotal: 0,
      remaining: 0,
    },
  );

  return {
    id: 'raw-sum',
    name: 'รวม',
    ...sum,
    disbursementRate: percent(sum.disbursedTotal, sum.netTotal),
    utilizationWithPoRate: percent(sum.utilizationTotal, sum.netTotal),
  };
}

function getRawPlanCategoryData(categories: RawBudgetRow[]) {
  return plannedBudgetCategoryDefinitions.map((definition) => {
    const rows = categories.filter((category) => definition.matcher.test(category.name));
    const totals = sumRawBudgetRows(rows);

    return {
      ...totals,
      key: definition.key,
      name: definition.label,
      color: definition.color,
      planned: rows.reduce((sum, category) => sum + category.planned, 0),
    };
  });
}

function getRawPlanDetailRows(rawWorkbook: BudgetUtilizationRawWorkbook | null | undefined, categoryKey: string) {
  if (!rawWorkbook) return [];

  const definition = plannedBudgetCategoryDefinitions.find((item) => item.key === categoryKey);
  if (!definition) return [];

  return rawWorkbook.rows
    .map((row, index) => ({ row, mapped: mapRawBudgetRow(row, index) }))
    .filter(({ row, mapped }) => {
      const categoryName = getRawCell(row, 2);
      const itemName = getRawCell(row, 5);
      const hasMoney = mapped.planned || mapped.netTotal || mapped.utilizationTotal || mapped.remaining || mapped.disbursedTotal;

      if (!definition.matcher.test(categoryName) || /\(รวม\)|ดึงมา/.test(categoryName) || !itemName || !hasMoney) {
        return false;
      }

      if (categoryKey === "project") {
        const output = getRawCell(row, 3);
        const activity = getRawCell(row, 4);
        const isTargetMatch = 
          (output === "2" && activity === "2.2") ||
          (output === "7" && (activity === "7.2" || activity === "7.4"));
        return isTargetMatch && itemName.includes("โครงการใหญ่");
      }

      return true;
    })
    .map(({ row, mapped }) => ({
      ...mapped,
      output: getRawCell(row, 3),
      activity: getRawCell(row, 4),
    }));
}

function getRawActualByGroup(group: AssessmentGroupKey, total: RawBudgetRow | null, categories: RawBudgetRow[]) {
  if (!total) return null;
  if (group === 'overall') {
    return total;
  }

  const groupCategories = categories.filter((item) => (group === 'investment' ? isInvestmentCategory(item.name) : !isInvestmentCategory(item.name)));
  return sumRawBudgetRows(groupCategories);
}

function getRawMerge(rawWorkbook: BudgetUtilizationRawWorkbook, rowIndex: number, columnIndex: number) {
  return rawWorkbook.merges.find((merge) => merge.startRow === rowIndex && merge.startCol === columnIndex) ?? null;
}

function isCoveredRawCell(rawWorkbook: BudgetUtilizationRawWorkbook, rowIndex: number, columnIndex: number) {
  return rawWorkbook.merges.some((merge) => (
    rowIndex >= merge.startRow &&
    rowIndex <= merge.endRow &&
    columnIndex >= merge.startCol &&
    columnIndex <= merge.endCol &&
    (rowIndex !== merge.startRow || columnIndex !== merge.startCol)
  ));
}

function RawWorkbookTable({ rawWorkbook }: { rawWorkbook: BudgetUtilizationRawWorkbook }) {
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs" style={{ minWidth: `${Math.max(rawWorkbook.columnCount, 1) * 132}px` }}>
        <tbody>
          {rawWorkbook.rows.map((row, rowIndex) => (
            <tr key={`raw-dashboard-row-${rowIndex}`} className={rowIndex < 2 ? 'bg-slate-100 font-semibold text-slate-950' : undefined}>
              {Array.from({ length: rawWorkbook.columnCount }, (_, columnIndex) => {
                if (isCoveredRawCell(rawWorkbook, rowIndex, columnIndex)) return null;
                const merge = getRawMerge(rawWorkbook, rowIndex, columnIndex);
                const value = row[columnIndex] || '';
                const isProjectNameColumn = columnIndex === 4;

                return (
                  <td
                    key={`raw-dashboard-cell-${rowIndex}-${columnIndex}`}
                    colSpan={merge ? merge.endCol - merge.startCol + 1 : undefined}
                    rowSpan={merge ? merge.endRow - merge.startRow + 1 : undefined}
                    className={`border border-slate-300 px-2 py-2 align-middle text-slate-800 ${isProjectNameColumn ? 'w-56 max-w-56' : 'whitespace-pre-wrap'}`}
                  >
                    {value ? (
                      <span
                        className={isProjectNameColumn ? 'block overflow-hidden text-ellipsis break-words leading-5' : undefined}
                        style={isProjectNameColumn ? {
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 2,
                        } : undefined}
                        title={isProjectNameColumn ? value : undefined}
                      >
                        {value}
                      </span>
                    ) : <span className="text-slate-300">-</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BudgetUtilizationDashboardPage() {
  useAuditPageAccess({ module: 'budget_utilization', action: 'budget_dashboard_access', route: '/budget-utilization' });
  const [searchParams, setSearchParams] = useSearchParams();
  const [summary, setSummary] = useState<BudgetUtilizationDashboardSummary | null>(null);
  const [rawDetail, setRawDetail] = useState<BudgetUtilizationImportFileDetail | null>(null);
  const [datasetOptions, setDatasetOptions] = useState<BudgetUtilizationDatasetOption[]>([]);
  const [selectedReportPeriodId, setSelectedReportPeriodId] = useState(searchParams.get('reportPeriodId') ?? '');
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterKey>('q4');
  const [selectedRawPlanCategoryKey, setSelectedRawPlanCategoryKey] = useState('personnel');
  const [showProjectBar, setShowProjectBar] = useState<boolean>(false);
  const [showBottomTable, setShowBottomTable] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (reportPeriodId = selectedReportPeriodId) => {
    try {
      setLoading(true);
      setError(null);
      setShowProjectBar(false);
      setShowBottomTable(false);
      setSelectedRawPlanCategoryKey('personnel');
      const options = await listBudgetDatasetOptions();
      const selectedOption = options.find((option) => option.reportPeriodId === reportPeriodId) ?? null;

      setDatasetOptions(options);

      if (selectedOption?.sourceType === 'raw_workbook' && selectedOption.importBatchId) {
        const detail = await getBudgetImportFileDetail(selectedOption.importBatchId);
        setRawDetail(detail);
        setSummary(null);
        setSelectedReportPeriodId(selectedOption.reportPeriodId);
        return;
      }

      if (!reportPeriodId) {
        const firstRawOption = options.find((option) => option.sourceType === 'raw_workbook');
        if (firstRawOption?.importBatchId) {
          const detail = await getBudgetImportFileDetail(firstRawOption.importBatchId);
          setRawDetail(detail);
          setSummary(null);
          setSelectedReportPeriodId(firstRawOption.reportPeriodId);
          return;
        }
      }

      const dashboardSummary = await getBudgetDashboardSummary(reportPeriodId || null);
      setRawDetail(null);
      setSummary(dashboardSummary);
      setSelectedReportPeriodId(dashboardSummary.reportPeriod?.id ?? '');
    } catch (loadError) {
      setError(getSafeUserErrorMessage(loadError, 'ไม่สามารถโหลด Dashboard งบประมาณได้'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(searchParams.get('reportPeriodId') ?? '');
  }, []);

  const handleDatasetChange = (reportPeriodId: string) => {
    setSelectedReportPeriodId(reportPeriodId);
    setSearchParams(reportPeriodId ? { reportPeriodId } : {});
    setShowProjectBar(false);
    setShowBottomTable(false);
    setSelectedRawPlanCategoryKey('personnel');
    void loadData(reportPeriodId);
  };

  const totals = summary?.totals ?? null;
  const rawWorkbook = rawDetail?.rawWorkbook ?? null;
  const rawDashboard = useMemo(() => getRawDashboardRows(rawWorkbook), [rawWorkbook]);
  const rawTotal = rawDashboard.total;
  const rawCategoryData = rawDashboard.categories;

  const rawPlanCategoryData = useMemo(() => getRawPlanCategoryData(rawCategoryData), [rawCategoryData]);

  const visiblePlanCategoryData = useMemo(() => {
    const keys = ["personnel", "investment", "operations_total"];
    if (showProjectBar) {
      keys.push("project");
    }
    return rawPlanCategoryData.filter((item) => keys.includes(item.key));
  }, [rawPlanCategoryData, showProjectBar]);

  const selectedRawPlanCategory = rawPlanCategoryData.find((item) => item.key === selectedRawPlanCategoryKey) ?? rawPlanCategoryData[0] ?? rawTotal;
  const selectedRawPlanDetailRows = useMemo(() => {
    const keyToFetch = selectedRawPlanCategoryKey === "operations_total" ? "operations" : selectedRawPlanCategoryKey;
    return getRawPlanDetailRows(rawWorkbook, keyToFetch);
  }, [rawWorkbook, selectedRawPlanCategoryKey]);

  const projectPlanDetailRows = useMemo(() => {
    return getRawPlanDetailRows(rawWorkbook, "project");
  }, [rawWorkbook]);

  const groupedProjectPlanRows = useMemo(() => {
    const groups: Record<string, { label: string; output: string; activity: string; committedTotal: number; utilizationTotal: number; remaining: number; disbursedTotal: number; netTotal: number }> = {};
    for (const item of projectPlanDetailRows) {
      const key = `${item.output}-${item.activity}`;
      if (!groups[key]) {
        groups[key] = {
          label: `ผลผลิตที่ ${item.output} กิจกรรมหลักที่ ${item.activity}`,
          output: item.output ?? '',
          activity: item.activity ?? '',
          committedTotal: 0,
          utilizationTotal: 0,
          remaining: 0,
          disbursedTotal: 0,
          netTotal: 0,
        };
      }
      groups[key].committedTotal += item.committedTotal;
      groups[key].utilizationTotal += item.utilizationTotal;
      groups[key].remaining += item.remaining;
      groups[key].disbursedTotal += item.disbursedTotal;
      groups[key].netTotal += item.netTotal;
    }
    return Object.values(groups).map(g => ({
      ...g,
      disbursementRate: percent(g.disbursedTotal, g.netTotal),
    }));
  }, [projectPlanDetailRows]);

  const rawAssessmentRows = useMemo(() => assessmentGroupOrder.map((group) => {
    const actual = getRawActualByGroup(group, rawTotal, rawCategoryData);
    const target = assessmentTargets[group][selectedQuarter];

    return {
      group,
      label: assessmentTargets[group].label,
      target,
      actualSpending: actual?.utilizationWithPoRate ?? 0,
      actualDisbursement: actual?.disbursementRate ?? 0,
    };
  }), [rawCategoryData, rawTotal, selectedQuarter]);
  const dashboardMetrics = totals ? getDashboardAmountMetrics(totals) : null;
  const allocationData = useMemo(() => [
    { name: 'รับจัดสรร(งวด 1)', value: totals?.allocation_tranche_1_amount ?? 0 },
    { name: 'รับจัดสรร(งวด 2)', value: totals?.allocation_tranche_2_amount ?? 0 },
    { name: 'รับจัดสรร(งวด 3)', value: totals?.allocation_tranche_3_amount ?? 0 },
  ].filter((item) => item.value > 0), [totals]);

  const categoryData = useMemo(() => (summary?.categoryItems ?? []).map((item) => {
    const amount = getCategoryAmount(item, summary?.items ?? []);
    const budget = getNetAllocationTotal(amount);

    return {
      ...getDashboardAmountMetrics(amount),
      id: item.id,
      name: item.item_name,
      budget,
      disbursed: amount.disbursed_total_amount,
      rate: percent(amount.disbursed_total_amount, budget),
      amount,
    };
  }), [summary]);

  const dbPersonnelPlanned = useMemo(() => categoryData.find(item => /บุคลากร/.test(item.name))?.amount.planned_budget_amount ?? 0, [categoryData]);
  const dbInvestmentPlanned = useMemo(() => categoryData.find(item => /ลงทุน/.test(item.name))?.amount.planned_budget_amount ?? 0, [categoryData]);
  const dbOperationsPlanned = useMemo(() => categoryData.find(item => /ดำเนินงาน/.test(item.name))?.amount.planned_budget_amount ?? 0, [categoryData]);
  const dbPlannedTotal = useMemo(() => dbPersonnelPlanned + dbInvestmentPlanned + dbOperationsPlanned, [dbPersonnelPlanned, dbInvestmentPlanned, dbOperationsPlanned]);

  const assessmentRows = useMemo(() => assessmentGroupOrder.map((group) => {
    const actual = totals ? getActualByGroup(group, totals, categoryData) : null;
    const target = assessmentTargets[group][selectedQuarter];

    return {
      group,
      label: assessmentTargets[group].label,
      target,
      actualSpending: actual?.utilizationRate ?? 0,
      actualDisbursement: actual?.disbursementRate ?? 0,
    };
  }), [categoryData, selectedQuarter, totals]);

  const hasData = Boolean((summary?.reportPeriod && totals) || rawTotal);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Budget Utilization Dashboard"
          description="การใช้จ่ายงบประมาณ กองยุทธศาสตร์และแผนงาน"
        />
        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          โหลดใหม่
        </button>
      </div>

      <section className="mb-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">เลือกชุดข้อมูลจากไฟล์นำเข้า</span>
          <select
            value={selectedReportPeriodId}
            onChange={(event) => handleDatasetChange(event.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          >
            <option value="">ชุดข้อมูลล่าสุดที่เปิดใช้งาน</option>
            {datasetOptions.map((option) => (
              <option key={option.reportPeriodId} value={option.reportPeriodId}>
                {option.sourceFileName ? `${option.sourceFileName} · ` : ''}
                {option.title}
                {option.sourceType === 'raw_workbook' ? ' · ตาราง Excel' : ''}
                {option.isActive ? ' · ใช้งานอยู่' : ''}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error ? (
        <div className="mb-5 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      ) : null}

      {!loading && !hasData ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <DatabaseZap className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-slate-950">ยังไม่มีข้อมูล Dashboard</h2>
          <p className="mt-2 text-sm text-slate-600">ให้ผู้ดูแลระบบนำเข้าข้อมูลจาก template ก่อน Dashboard จะแสดงผล</p>
        </div>
      ) : null}

      {rawWorkbook && rawTotal ? (
        <div className="space-y-5">
          <section className="grid items-start gap-4 xl:grid-cols-[250px_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-semibold text-slate-950">วงเงินตามแผนปฏิบัติราชการ</h2>
                <div className="relative mt-3 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'งบบุคลากร (รวม)', value: rawPlanCategoryData.find(item => item.key === 'personnel')?.planned ?? 0 },
                          { name: 'งบลงทุน (รวม)', value: rawPlanCategoryData.find(item => item.key === 'investment')?.planned ?? 0 },
                          { name: 'งบดำเนินงาน (รวม)', value: rawPlanCategoryData.find(item => item.key === 'operations_total')?.planned ?? 0 },
                        ].filter((item) => item.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={2}
                      >
                        {[
                          { key: 'personnel', color: '#2563eb' },
                          { key: 'investment', color: '#f59e0b' },
                          { key: 'operations_total', color: '#0f766e' },
                        ].filter(item => (rawPlanCategoryData.find(x => x.key === item.key)?.planned ?? 0) > 0).map((item, index) => (
                          <Cell key={index} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatExactBaht(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
                    <div className="max-w-[110px]">
                      <p className="text-[10px] font-semibold text-slate-500">วงเงินตามแผนรวม</p>
                      <p className="text-[16px] font-bold leading-none text-slate-950 my-0.5">
                        {formatBudgetAmount(
                          (rawPlanCategoryData.find(item => item.key === 'personnel')?.planned ?? 0) +
                          (rawPlanCategoryData.find(item => item.key === 'investment')?.planned ?? 0) +
                          (rawPlanCategoryData.find(item => item.key === 'operations_total')?.planned ?? 0)
                        )}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-500">บาท</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { name: 'งบบุคลากร (รวม)', value: rawPlanCategoryData.find(item => item.key === 'personnel')?.planned ?? 0 },
                    { name: 'งบลงทุน (รวม)', value: rawPlanCategoryData.find(item => item.key === 'investment')?.planned ?? 0 },
                    { name: 'งบดำเนินงาน (รวม)', value: rawPlanCategoryData.find(item => item.key === 'operations_total')?.planned ?? 0 },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
                      <span className="min-w-0 truncate text-slate-900">{item.name}</span>
                      <span className="shrink-0 font-semibold text-slate-950">{formatBudgetAmount(item.value, 0)} บาท</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-semibold text-slate-950">งบประมาณที่รับจัดสรร</h2>
                <div className="relative mt-3 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'รับจัดสรรงวด 1', value: rawTotal.allocation1 },
                          { name: 'รับจัดสรรงวด 2', value: rawTotal.allocation2 },
                          { name: 'รับจัดสรรงวด 3', value: rawTotal.allocation3 },
                        ].filter((item) => item.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={2}
                      >
                        {[rawTotal.allocation1, rawTotal.allocation2, rawTotal.allocation3].filter((value) => value > 0).map((_, index) => (
                          <Cell key={index} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatExactBaht(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
                    <div className="max-w-[110px]">
                      <p className="text-[10px] font-semibold text-slate-500">ยอดสุทธิภาพรวม</p>
                      <p className="text-[16px] font-bold leading-none text-slate-950 my-0.5">{formatBudgetAmount(rawTotal.netTotal)}</p>
                      <p className="text-[9px] font-semibold text-slate-500">บาท</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { name: 'รับจัดสรรงวด 1', value: rawTotal.allocation1 },
                    { name: 'รับจัดสรรงวด 2', value: rawTotal.allocation2 },
                    { name: 'รับจัดสรรงวด 3', value: rawTotal.allocation3 },
                  ].filter((item) => item.value > 0).map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
                      <span className="min-w-0 truncate text-slate-900">{item.name}</span>
                      <span className="shrink-0 font-semibold text-slate-950">{formatBudgetAmount(item.value, 0)} บาท</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="flex flex-col gap-4">
              <div className="order-1 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="ยอดรวมสุทธิ" value={formatExactBaht(rawTotal.netTotal)}  icon={Coins} tone="bg-blue-50 text-blue-700 ring-blue-100" />
                <StatCard title="เบิกจ่ายรวม" value={formatExactBaht(rawTotal.disbursedTotal)}  icon={WalletCards} tone="bg-emerald-50 text-emerald-700 ring-emerald-100" />
                <StatCard title="คงเหลือ" value={formatExactBaht(rawTotal.remaining)} icon={BarChart3} tone="bg-slate-50 text-slate-700 ring-slate-200" />
                <StatCard title="ร้อยละเบิกจ่าย" value={`${formatBudgetAmount(rawTotal.disbursementRate)}%`} icon={TrendingUp} tone="bg-amber-50 text-amber-700 ring-amber-100" />
              </div>

              <div className="order-2 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-semibold text-slate-950">วงเงินตามแผนปฏิบัติราชการ</h2>
                <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(540px,0.9fr)_minmax(520px,1fr)]">
                  <div>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={visiblePlanCategoryData} margin={{ bottom: 28, left: 18, right: 12, top: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 13, fontWeight: 600 }} interval={0} angle={-8} textAnchor="end" height={42} />
                          <YAxis tick={{ fontSize: 13, fontWeight: 600 }} tickFormatter={(value) => `${Number(value) / 1_000_000}ล.`} />
                          <Tooltip formatter={(value) => formatBudgetAmount(Number(value))} />
                          <Bar dataKey="planned" name="วงเงินตามแผน" radius={[4, 4, 0, 0]}>
                            {visiblePlanCategoryData.map((item) => {
                              const isActive = showBottomTable
                                ? item.key === "project"
                                : item.key === selectedRawPlanCategoryKey;

                              return (
                                <Cell
                                  key={item.key}
                                  fill={item.color}
                                  fillOpacity={isActive ? 1 : 0.45}
                                  stroke={isActive ? "#0f172a" : item.color}
                                  strokeWidth={isActive ? 2 : 1}
                                  className="cursor-pointer"
                                  onClick={() => {
                                    if (item.key === "operations_total") {
                                      setSelectedRawPlanCategoryKey("operations_total");
                                      setShowProjectBar(true);
                                      setShowBottomTable(false);
                                    } else if (item.key === "project") {
                                      setShowBottomTable(true);
                                    } else {
                                      setSelectedRawPlanCategoryKey(item.key);
                                      setShowProjectBar(false);
                                      setShowBottomTable(false);
                                    }
                                  }}
                                />
                              );
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="rounded-md border border-slate-200 bg-slate-50 shadow-sm">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2">
                        <h3 className="text-sm font-semibold text-slate-950">
                          {selectedRawPlanCategoryKey === "operations_total" ? "รายการงบดำเนินงาน (ดำเนินงานปกติ)" : `รายการ${selectedRawPlanCategory?.name ?? "งบประมาณ"}`}
                        </h3>
                        <span className="text-xs font-medium text-slate-500">{selectedRawPlanDetailRows.length.toLocaleString()} รายการ</span>
                      </div>
                      <div className="max-h-56 overflow-auto">
                        <table className="w-full min-w-[480px] divide-y divide-slate-200 text-xs">
                          <thead className="sticky top-0 bg-slate-100 text-left font-semibold text-slate-600">
                            <tr>
                              <th className="w-[40%] px-2 py-2">รายการ</th>
                              <th className="w-[15%] px-2 py-2 text-right">ผูกพัน รวม PO</th>
                              <th className="w-[15%] px-2 py-2 text-right">รวม (10)</th>
                              <th className="w-[15%] px-2 py-2 text-right">คงเหลือ (11)</th>
                              <th className="w-[15%] px-2 py-2 text-right">ร้อยละ (12)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {selectedRawPlanDetailRows.length ? selectedRawPlanDetailRows.map((item) => (
                              <tr key={item.id}>
                                <td className="w-[40%] max-w-0 px-2 py-2 font-medium text-slate-900">
                                  <span className="line-clamp-2">{item.name}</span>
                                  <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                                    ผลผลิตที่ {item.output || "-"} · กิจกรรมหลักที่ {item.activity || "-"}
                                  </span>
                                </td>
                                <td className="w-[15%] px-2 py-2 text-right font-semibold text-indigo-700">{formatBudgetAmount(item.committedTotal)}</td>
                                <td className="w-[15%] px-2 py-2 text-right font-semibold text-slate-950">{formatBudgetAmount(item.utilizationTotal)}</td>
                                <td className="w-[15%] px-2 py-2 text-right font-semibold text-slate-950">{formatBudgetAmount(item.remaining)}</td>
                                <td className="w-[15%] px-2 py-2 text-right font-semibold text-teal-700">{formatBudgetAmount(item.disbursementRate)}%</td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan={5} className="px-3 py-4 text-center text-slate-500">ไม่มีรายการในหมวดนี้</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {showBottomTable ? (
                      <div className="rounded-md border border-slate-200 bg-slate-50 shadow-sm">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2">
                          <h3 className="text-sm font-semibold text-slate-950">
                            รายการงบโครงการ (รวม)
                          </h3>
                          <span className="text-xs font-medium text-slate-500">{groupedProjectPlanRows.length.toLocaleString()} กิจกรรมหลัก</span>
                        </div>
                        <div className="max-h-72 overflow-auto">
                          <table className="w-full min-w-[480px] divide-y divide-slate-200 text-xs">
                            <thead className="sticky top-0 bg-slate-100 text-left font-semibold text-slate-600">
                              <tr>
                                <th className="w-[40%] px-2 py-2">หัวข้อโครงการ</th>
                                <th className="w-[15%] px-2 py-2 text-right">ผูกพัน รวม PO</th>
                                <th className="w-[15%] px-2 py-2 text-right">รวม (10)</th>
                                <th className="w-[15%] px-2 py-2 text-right">คงเหลือ (11)</th>
                                <th className="w-[15%] px-2 py-2 text-right">ร้อยละ (12)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {groupedProjectPlanRows.length ? groupedProjectPlanRows.map((item) => (
                                <tr key={`${item.output}-${item.activity}`}>
                                  <td className="w-[40%] max-w-0 px-2 py-2 font-medium text-slate-900">
                                    <span className="block font-semibold text-slate-950">{item.label}</span>
                                  </td>
                                  <td className="w-[15%] px-2 py-2 text-right font-semibold text-indigo-700">{formatBudgetAmount(item.committedTotal)}</td>
                                  <td className="w-[15%] px-2 py-2 text-right font-semibold text-slate-950">{formatBudgetAmount(item.utilizationTotal)}</td>
                                  <td className="w-[15%] px-2 py-2 text-right font-semibold text-slate-950">{formatBudgetAmount(item.remaining)}</td>
                                  <td className="w-[15%] px-2 py-2 text-right font-semibold text-teal-700">{formatBudgetAmount(item.disbursementRate)}%</td>
                                </tr>
                              )) : (
                                <tr>
                                  <td colSpan={5} className="px-3 py-4 text-center text-slate-500">ไม่มีรายการในหมวดนี้</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>


            </div>

            <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm xl:col-span-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">การประเมินตามไตรมาส</h2>
                    <p className="mt-1 text-xs text-slate-500">รูปแบบ Dashboard คงเดิม และใช้ข้อมูลจริงจากไฟล์ Excel ที่เลือก</p>
                  </div>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                    เลือกไตรมาส
                    <select
                      value={selectedQuarter}
                      onChange={(event) => setSelectedQuarter(event.target.value as QuarterKey)}
                      className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    >
                      {quarterOptions.map((quarter) => (
                        <option key={quarter.key} value={quarter.key}>{quarter.label} ({quarter.period})</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-3 grid items-stretch gap-4 xl:grid-cols-[minmax(620px,740px)_minmax(780px,1fr)]">
                  <div className="grid h-full gap-2 sm:grid-cols-3">
                    {rawAssessmentRows.map((row) => {
                      const spendingDiff = row.actualSpending - row.target.spending;
                      const disbursementDiff = row.actualDisbursement - row.target.disbursement;

                      return (
                        <div key={row.group} className="h-full rounded-md border border-slate-200 bg-slate-50 p-3">
                          <p className="text-center text-base font-semibold text-slate-950">{row.label}</p>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div className="rounded-md bg-white p-2">
                              <p className="text-slate-500">ใช้จ่ายจริง</p>
                              <p className="mt-0.5 text-xl font-bold text-slate-950">{formatBudgetAmount(row.actualSpending)}%</p>
                              <p className={spendingDiff >= 0 ? 'text-emerald-700' : 'text-amber-700'}>เป้า {formatBudgetAmount(row.target.spending)}%</p>
                            </div>
                            <div className="rounded-md bg-white p-2">
                              <p className="text-slate-500">เบิกจ่ายจริง</p>
                              <p className="mt-0.5 text-xl font-bold text-slate-950">{formatBudgetAmount(row.actualDisbursement)}%</p>
                              <p className={disbursementDiff >= 0 ? 'text-emerald-700' : 'text-amber-700'}>เป้า {formatBudgetAmount(row.target.disbursement)}%</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="overflow-x-auto rounded-md border border-slate-200">
                    <table className="w-full min-w-[780px] border-collapse text-center text-xs">
                      <thead className="text-slate-950">
                        <tr>
                          <th rowSpan={2} className="border border-slate-200 bg-white px-3 py-2 text-left align-middle">รายการ</th>
                          {quarterOptions.map((quarter) => (
                            <th key={quarter.key} colSpan={2} className={`border border-slate-200 px-3 py-2 ${quarterColors[quarter.key]}`}>{quarter.label}</th>
                          ))}
                          <th colSpan={2} className={`border border-slate-200 px-3 py-2 ${quarterColors.total}`}>รวม</th>
                        </tr>
                        <tr>
                          {[...quarterOptions.map((quarter) => quarter.key), 'total'].flatMap((key) => [
                            <th key={`${key}-spending`} className="border border-slate-200 bg-white px-3 py-2">ใช้จ่าย</th>,
                            <th key={`${key}-disbursement`} className="border border-slate-200 bg-white px-3 py-2">เบิกจ่าย</th>,
                          ])}
                        </tr>
                      </thead>
                      <tbody>
                        {assessmentGroupOrder.map((group) => (
                          <tr key={group} className="odd:bg-white even:bg-slate-50">
                            <td className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-900">{assessmentTargets[group].label}</td>
                            {([...quarterOptions.map((quarter) => quarter.key), 'total'] as Array<QuarterKey | 'total'>).flatMap((key) => [
                              <td key={`${group}-${key}-spending`} className="border border-slate-200 px-3 py-2 text-slate-700">{formatBudgetAmount(assessmentTargets[group][key].spending)}</td>,
                              <td key={`${group}-${key}-disbursement`} className="border border-slate-200 px-3 py-2 text-slate-700">{formatBudgetAmount(assessmentTargets[group][key].disbursement)}</td>,
                            ])}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
          </section>

          <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-950">ตารางตามโครงสร้างไฟล์ Excel</h2>
              <p className="mt-1 text-sm text-slate-500">ข้อมูลแสดงตามชีต {rawWorkbook.sheetName} โดยไม่แปลงลำดับโครงสร้าง</p>
            </div>
            <RawWorkbookTable rawWorkbook={rawWorkbook} />
          </section>
        </div>
      ) : null}

      {summary && totals ? (
        <div className="space-y-6">
          <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">วงเงินตามแผนปฏิบัติราชการ</h2>
                <div className="relative mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'งบบุคลากร (รวม)', value: dbPersonnelPlanned },
                          { name: 'งบลงทุน (รวม)', value: dbInvestmentPlanned },
                          { name: 'งบดำเนินงาน (รวม)', value: dbOperationsPlanned },
                        ].filter((item) => item.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={72}
                        outerRadius={112}
                        paddingAngle={2}
                      >
                        {[
                          { key: 'personnel', color: '#2563eb' },
                          { key: 'investment', color: '#f59e0b' },
                          { key: 'operations_total', color: '#0f766e' },
                        ].filter(item => {
                          const val = item.key === 'personnel' ? dbPersonnelPlanned :
                                      item.key === 'investment' ? dbInvestmentPlanned :
                                      dbOperationsPlanned;
                          return val > 0;
                        }).map((item, index) => (
                          <Cell key={index} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatExactBaht(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
                    <div className="max-w-[130px]">
                      <p className="text-xs font-semibold text-slate-500">วงเงินตามแผนรวม</p>
                      <p className="text-[16px] font-bold leading-none text-slate-950 my-1">{formatBudgetAmount(dbPlannedTotal)}</p>
                      <p className="text-xs font-semibold text-slate-900">บาท</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { name: 'งบบุคลากร (รวม)', value: dbPersonnelPlanned },
                    { name: 'งบลงทุน (รวม)', value: dbInvestmentPlanned },
                    { name: 'งบดำเนินงาน (รวม)', value: dbOperationsPlanned },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-slate-600">{item.name}</span>
                      <span className="shrink-0 font-semibold text-slate-950">{formatBudgetAmount(item.value, 0)} บาท</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">งบประมาณที่ได้รับจัดสรร</h2>
                <div className="relative mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={allocationData.length ? allocationData : [{ name: 'ไม่มีข้อมูลงวด', value: dashboardMetrics?.netAllocationTotal || totals.planned_budget_amount }]} dataKey="value" nameKey="name" innerRadius={72} outerRadius={112} paddingAngle={2}>
                        {(allocationData.length ? allocationData : [{ name: 'ไม่มีข้อมูลงวด', value: dashboardMetrics?.netAllocationTotal || totals.planned_budget_amount }]).map((_, index) => (
                          <Cell key={index} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatExactBaht(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
                    <div className="max-w-[130px]">
                      <p className="text-xs font-semibold text-slate-500">งบประมาณภาพรวม</p>
                      <p className="text-[15px] font-bold leading-none text-slate-950 my-1">{formatBudgetAmount(dashboardMetrics?.netAllocationTotal ?? 0)}</p>
                      <p className="text-xs font-semibold text-slate-500">บาท</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {allocationData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-slate-600">{item.name}</span>
                      <span className="shrink-0 font-semibold text-slate-950">{formatBudgetAmount(item.value, 0)} บาท</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="ยอดรวมสุทธิ" value={formatExactBaht(dashboardMetrics?.netAllocationTotal ?? 0)} subtext="งวดจัดสรร + รับโอน - โอนออก" icon={Coins} tone="bg-blue-50 text-blue-700 ring-blue-100" />
                <StatCard title="เบิกจ่ายรวม" value={formatExactBaht(totals.disbursed_total_amount)} subtext="รวมเบิกทั่วไปและเงินยืม" icon={WalletCards} tone="bg-emerald-50 text-emerald-700 ring-emerald-100" />
                <StatCard title="คงเหลือ" value={formatExactBaht(dashboardMetrics?.remaining ?? 0)} subtext="ยอดรวมสุทธิหลังใช้จ่ายรวม" icon={BarChart3} tone="bg-slate-50 text-slate-700 ring-slate-200" />
                <StatCard title="ร้อยละเบิกจ่าย" value={`${formatBudgetAmount(dashboardMetrics?.disbursementRate ?? 0)}%`} subtext="เบิกจ่ายรวมเทียบยอดรวมสุทธิ" icon={TrendingUp} tone="bg-amber-50 text-amber-700 ring-amber-100" />
              </div>


              <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">การประเมินตามไตรมาส</h2>
                    <p className="mt-1 text-xs text-slate-500">ปีงบประมาณไทย: ไตรมาส 1 เริ่ม ต.ค. และไตรมาส 4 สิ้นสุด ก.ย.</p>
                  </div>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                    เลือกไตรมาส
                    <select
                      value={selectedQuarter}
                      onChange={(event) => setSelectedQuarter(event.target.value as QuarterKey)}
                      className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    >
                      {quarterOptions.map((quarter) => (
                        <option key={quarter.key} value={quarter.key}>{quarter.label} ({quarter.period})</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {assessmentRows.map((row) => {
                    const spendingDiff = row.actualSpending - row.target.spending;
                    const disbursementDiff = row.actualDisbursement - row.target.disbursement;

                    return (
                      <div key={row.group} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm font-semibold text-slate-950">{row.label}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-md bg-white p-2">
                            <p className="text-slate-500">ใช้จ่ายจริง</p>
                            <p className="mt-1 text-lg font-bold text-slate-950">{formatBudgetAmount(row.actualSpending)}%</p>
                            <p className={spendingDiff >= 0 ? 'text-emerald-700' : 'text-amber-700'}>เป้า {formatBudgetAmount(row.target.spending)}%</p>
                          </div>
                          <div className="rounded-md bg-white p-2">
                            <p className="text-slate-500">เบิกจ่ายจริง</p>
                            <p className="mt-1 text-lg font-bold text-slate-950">{formatBudgetAmount(row.actualDisbursement)}%</p>
                            <p className={disbursementDiff >= 0 ? 'text-emerald-700' : 'text-amber-700'}>เป้า {formatBudgetAmount(row.target.disbursement)}%</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
                  <table className="min-w-[860px] border-collapse text-center text-xs">
                    <thead className="text-slate-950">
                      <tr>
                        <th rowSpan={2} className="border border-slate-200 bg-white px-3 py-2 text-left align-middle">รายการ</th>
                        {quarterOptions.map((quarter) => (
                          <th key={quarter.key} colSpan={2} className={`border border-slate-200 px-3 py-2 ${quarterColors[quarter.key]}`}>{quarter.label}</th>
                        ))}
                        <th colSpan={2} className={`border border-slate-200 px-3 py-2 ${quarterColors.total}`}>รวม</th>
                      </tr>
                      <tr>
                        {[...quarterOptions.map((quarter) => quarter.key), 'total'].flatMap((key) => [
                          <th key={`${key}-spending`} className="border border-slate-200 bg-white px-3 py-2">ใช้จ่าย</th>,
                          <th key={`${key}-disbursement`} className="border border-slate-200 bg-white px-3 py-2">เบิกจ่าย</th>,
                        ])}
                      </tr>
                    </thead>
                    <tbody>
                      {assessmentGroupOrder.map((group) => (
                        <tr key={group} className="odd:bg-white even:bg-slate-50">
                          <td className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-900">{assessmentTargets[group].label}</td>
                          {([...quarterOptions.map((quarter) => quarter.key), 'total'] as Array<QuarterKey | 'total'>).flatMap((key) => [
                            <td key={`${group}-${key}-spending`} className="border border-slate-200 px-3 py-2 text-slate-700">{formatBudgetAmount(assessmentTargets[group][key].spending)}</td>,
                            <td key={`${group}-${key}-disbursement`} className="border border-slate-200 px-3 py-2 text-slate-700">{formatBudgetAmount(assessmentTargets[group][key].disbursement)}</td>,
                          ])}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-semibold text-slate-950">สรุปผลตามหมวดงบประมาณ</h2>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} margin={{ bottom: 44, left: 8, right: 8, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={58} />
                      <YAxis tickFormatter={(value) => `${Number(value) / 1_000_000}ล.`} />
                      <Tooltip formatter={(value) => formatExactBaht(Number(value))} />
                      <Bar dataKey="budget" name="งบประมาณ" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="disbursed" name="เบิกจ่าย" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-950">ตารางสรุปงบประมาณ</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">รายการ</th>
                    <th className="px-4 py-3 text-right">ยอดรวมสุทธิ</th>
                    <th className="px-4 py-3 text-right">ส่วนกลาง รับโอน</th>
                    <th className="px-4 py-3 text-right">ส่วนกลาง โอนออก</th>
                    <th className="px-4 py-3 text-right">ภายในกอง รับโอน</th>
                    <th className="px-4 py-3 text-right">ภายในกอง โอนออก</th>
                    <th className="px-4 py-3 text-right">เบิกจ่าย</th>
                    <th className="px-4 py-3 text-right">ร้อยละ</th>
                    <th className="px-4 py-3 text-right">คงเหลือ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryData.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatBudgetAmount(item.budget, 0)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatBudgetAmount(item.amount.central_transfer_in_amount, 0)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatBudgetAmount(item.amount.central_transfer_out_amount, 0)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatBudgetAmount(item.amount.division_transfer_in_amount, 0)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatBudgetAmount(item.amount.division_transfer_out_amount, 0)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatBudgetAmount(item.disbursed, 0)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-teal-700">{formatBudgetAmount(item.rate)}%</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatBudgetAmount(item.remaining, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
