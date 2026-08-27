import { supabase } from '../../../lib/supabase';
import { runSupabaseQuery } from '../../../lib/supabase-query';
import { sanitizePlainTextInput } from '../../../utils/inputSecurity';
import { parseRawBudgetWorkbookRows } from './budgetUtilizationImport';
import { normalizeAmount, summarizeBudgetItems } from '../utils/budgetUtilizationCalculations';
import type {
  BudgetUtilizationAmount,
  BudgetUtilizationAllocationTranche,
  BudgetUtilizationDashboardSummary,
  BudgetUtilizationDatasetOption,
  BudgetUtilizationImportBatch,
  BudgetUtilizationImportError,
  BudgetUtilizationImportFileDetail,
  BudgetUtilizationImportFileRecord,
  BudgetUtilizationImportPreview,
  BudgetUtilizationItemInput,
  BudgetUtilizationItemAllocation,
  BudgetUtilizationItemWithAmount,
  BudgetUtilizationRawWorkbook,
  BudgetUtilizationReportPeriod,
  BudgetUtilizationReportPeriodInput,
} from '../types/budgetUtilization.types';

const budgetClient = supabase as any;

function getRawWorkbookFromMetadata(metadata: Record<string, unknown> | null | undefined) {
  const rawWorkbook = metadata?.rawWorkbook as BudgetUtilizationRawWorkbook | undefined;

  if (!rawWorkbook || !Array.isArray(rawWorkbook.rows)) {
    return null;
  }

  return rawWorkbook;
}

function isRawTableImport(metadata: Record<string, unknown> | null | undefined) {
  const rawWorkbook = getRawWorkbookFromMetadata(metadata);
  return metadata?.template === 'raw_excel_table' && Boolean(rawWorkbook && rawWorkbook.columnCount >= 26);
}

function mapJoinedItem(row: any): BudgetUtilizationItemWithAmount {
  const amountRow = Array.isArray(row.budget_utilization_amounts)
    ? row.budget_utilization_amounts[0]
    : row.budget_utilization_amounts;

  const allocationRows = (row.budget_utilization_item_allocations ?? []) as BudgetUtilizationItemAllocation[];
  const normalizedAmount = normalizeAmount(amountRow as Partial<BudgetUtilizationAmount>);
  const allocationTotal = allocationRows.length > 0
    ? allocationRows.reduce((sum, allocation) => sum + Number(allocation.amount ?? 0), 0)
    : normalizedAmount.allocation_tranche_1_amount
      + normalizedAmount.allocation_tranche_2_amount
      + normalizedAmount.allocation_tranche_3_amount;

  return {
    id: row.id,
    report_period_id: row.report_period_id,
    parent_id: row.parent_id,
    row_number: row.row_number,
    sort_order: row.sort_order,
    depth: row.depth,
    row_type: row.row_type,
    sequence_label: row.sequence_label,
    item_name: row.item_name,
    output_label: row.output_label,
    activity_sequence_label: row.activity_sequence_label ?? null,
    activity_label: row.activity_label,
    raw_label: row.raw_label,
    source_import_batch_id: row.source_import_batch_id ?? null,
    source_sheet_name: row.source_sheet_name ?? null,
    source_row_number: row.source_row_number ?? row.row_number ?? null,
    source_row_data: Array.isArray(row.source_row_data) ? row.source_row_data : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    amount: {
      ...normalizedAmount,
      allocation_total_amount: allocationTotal,
      allocation_tranche_1_date: amountRow?.allocation_tranche_1_date ?? null,
      allocation_tranche_2_date: amountRow?.allocation_tranche_2_date ?? null,
      allocation_tranche_3_date: amountRow?.allocation_tranche_3_date ?? null,
    },
    allocations: allocationRows.map((allocation) => ({
      ...allocation,
      amount: Number(allocation.amount ?? 0),
    })),
  };
}

export function canManageBudgetUtilization(role: string | null | undefined) {
  return role === 'super_admin' || role === 'admin';
}

export async function listBudgetReportPeriods() {
  const result = await runSupabaseQuery<any>(
    budgetClient
      .from('budget_utilization_report_periods')
      .select('*')
      .order('is_active', { ascending: false })
      .order('fiscal_year', { ascending: false })
      .order('report_as_of', { ascending: false, nullsFirst: false }),
    'โหลดรายการรอบรายงานงบประมาณ',
  );

  return (result.data ?? []) as BudgetUtilizationReportPeriod[];
}

export async function listBudgetImportFiles(): Promise<BudgetUtilizationImportFileRecord[]> {
  const batchesResult = await runSupabaseQuery<any>(
    budgetClient
      .from('budget_utilization_import_batches')
      .select('*')
      .order('created_at', { ascending: false }),
    'โหลดรายการไฟล์นำเข้างบประมาณ',
  );
  const batches = (batchesResult.data ?? []) as BudgetUtilizationImportBatch[];
  const batchIds = batches.map((batch) => batch.id);

  if (batchIds.length === 0) {
    return [];
  }

  const reportPeriodsResult = await runSupabaseQuery<any>(
    budgetClient
      .from('budget_utilization_report_periods')
      .select('*')
      .in('import_batch_id', batchIds),
    'โหลดรอบรายงานของไฟล์นำเข้า',
  );
  const reportPeriodByBatchId = new Map(
    ((reportPeriodsResult.data ?? []) as BudgetUtilizationReportPeriod[]).map((reportPeriod) => [reportPeriod.import_batch_id, reportPeriod]),
  );

  return batches.map((batch) => ({
    batch,
    reportPeriod: reportPeriodByBatchId.get(batch.id) ?? null,
  }));
}

export async function listBudgetDatasetOptions(): Promise<BudgetUtilizationDatasetOption[]> {
  const [reportPeriods, importFiles] = await Promise.all([
    listBudgetReportPeriods(),
    listBudgetImportFiles(),
  ]);
  const batchById = new Map(importFiles.map((record) => [record.batch.id, record.batch]));
  const rawWorkbookBatchIds = new Set(
    importFiles
      .filter((record) => isRawTableImport(record.batch.metadata))
      .map((record) => record.batch.id),
  );

  const reportPeriodOptions: BudgetUtilizationDatasetOption[] = reportPeriods
    .filter((reportPeriod) => !reportPeriod.import_batch_id || !rawWorkbookBatchIds.has(reportPeriod.import_batch_id))
    .map((reportPeriod) => {
    const batch = reportPeriod.import_batch_id ? batchById.get(reportPeriod.import_batch_id) ?? null : null;

    return {
      reportPeriodId: reportPeriod.id,
      importBatchId: batch?.id ?? null,
      sourceType: 'report_period' as const,
      title: reportPeriod.title,
      fiscalYear: reportPeriod.fiscal_year,
      reportAsOf: reportPeriod.report_as_of,
      sourceFileName: batch?.source_file_name ?? null,
      uploadedAt: batch?.created_at ?? reportPeriod.created_at,
      isActive: reportPeriod.is_active,
    };
    });
  const rawWorkbookOptions: BudgetUtilizationDatasetOption[] = importFiles
      .filter((record) => isRawTableImport(record.batch.metadata))
      .map((record) => ({
        reportPeriodId: `batch:${record.batch.id}`,
        importBatchId: record.batch.id,
        sourceType: 'raw_workbook' as const,
        title: record.batch.source_file_name ?? 'ไฟล์ Excel',
        fiscalYear: record.batch.fiscal_year,
        reportAsOf: record.batch.report_as_of,
        sourceFileName: record.batch.source_file_name,
        uploadedAt: record.batch.created_at,
        isActive: false,
      }));

  return reportPeriodOptions.concat(rawWorkbookOptions);
}

export async function getBudgetImportFileDetail(importBatchId: string): Promise<BudgetUtilizationImportFileDetail> {
  const batchResult = await runSupabaseQuery<any>(
    budgetClient
      .from('budget_utilization_import_batches')
      .select('*')
      .eq('id', importBatchId)
      .maybeSingle(),
    'โหลดข้อมูลไฟล์นำเข้า',
  );
  const batch = batchResult.data as BudgetUtilizationImportBatch | null;

  if (!batch) {
    throw new Error('ไม่พบไฟล์นำเข้าที่ต้องการดู');
  }

  const reportPeriodResult = await runSupabaseQuery<any>(
    budgetClient
      .from('budget_utilization_report_periods')
      .select('*')
      .eq('import_batch_id', importBatchId)
      .maybeSingle(),
    'โหลดรอบรายงานของไฟล์นำเข้า',
  );
  const reportPeriod = (reportPeriodResult.data ?? null) as BudgetUtilizationReportPeriod | null;
  const items = reportPeriod ? await listBudgetHierarchyItems(reportPeriod.id) : [];

  const errorsResult = await runSupabaseQuery<any>(
    budgetClient
      .from('budget_utilization_import_errors')
      .select('*')
      .eq('import_batch_id', importBatchId)
      .order('row_number', { ascending: true, nullsFirst: false }),
    'โหลดข้อผิดพลาดไฟล์นำเข้า',
  );

  return {
    batch,
    reportPeriod,
    items,
    errors: (errorsResult.data ?? []) as BudgetUtilizationImportError[],
    rawWorkbook: getRawWorkbookFromMetadata(batch.metadata),
  };
}

export async function getActiveBudgetReportPeriod() {
  const result = await runSupabaseQuery<any>(
    budgetClient
      .from('budget_utilization_report_periods')
      .select('*')
      .eq('is_active', true)
      .order('fiscal_year', { ascending: false })
      .order('report_as_of', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    'โหลดรอบรายงานงบประมาณล่าสุด',
  );

  return (result.data ?? null) as BudgetUtilizationReportPeriod | null;
}

export async function listBudgetHierarchyItems(reportPeriodId: string) {
  const result = await runSupabaseQuery<any>(
    budgetClient
      .from('budget_utilization_items')
      .select('*, budget_utilization_amounts(*), budget_utilization_item_allocations(*)')
      .eq('report_period_id', reportPeriodId)
      .order('sort_order', { ascending: true }),
    'โหลดรายการงบประมาณ',
  );

  return ((result.data ?? []) as any[]).map(mapJoinedItem);
}

export async function listBudgetAllocationTranches(reportPeriodId: string) {
  const result = await runSupabaseQuery<any>(
    budgetClient
      .from('budget_utilization_allocation_tranches')
      .select('*')
      .eq('report_period_id', reportPeriodId)
      .order('sort_order', { ascending: true }),
    'โหลดงวดจัดสรร',
  );

  return (result.data ?? []) as BudgetUtilizationAllocationTranche[];
}

export async function getBudgetDashboardSummary(reportPeriodId?: string | null): Promise<BudgetUtilizationDashboardSummary> {
  const reportPeriod = reportPeriodId
    ? ((await runSupabaseQuery<any>(
        budgetClient.from('budget_utilization_report_periods').select('*').eq('id', reportPeriodId).maybeSingle(),
        'โหลดรอบรายงานงบประมาณ',
      )).data as BudgetUtilizationReportPeriod | null)
    : await getActiveBudgetReportPeriod();

  if (!reportPeriod) {
    return {
      reportPeriod: null,
      items: [],
      totalItem: null,
      categoryItems: [],
      projectItems: [],
      totals: normalizeAmount({}),
      allocationTranches: [],
    };
  }

  const [items, allocationTranches] = await Promise.all([
    listBudgetHierarchyItems(reportPeriod.id),
    listBudgetAllocationTranches(reportPeriod.id),
  ]);
  const totalItem = items.find((item) => item.row_type === 'total') ?? null;

  return {
    reportPeriod,
    items,
    totalItem,
    categoryItems: items.filter((item: BudgetUtilizationItemWithAmount) => item.row_type === 'budget_category'),
    projectItems: items.filter((item: BudgetUtilizationItemWithAmount) => ['major_project', 'sub_project', 'activity'].includes(item.row_type)),
    totals: summarizeBudgetItems(items),
    allocationTranches,
  };
}

async function createDefaultBudgetAllocationTranches(reportPeriodId: string) {
  await runSupabaseQuery(
    budgetClient.from('budget_utilization_allocation_tranches').upsert(
      [1, 2, 3].map((trancheNumber) => ({
        report_period_id: reportPeriodId,
        tranche_number: trancheNumber,
        label: `จัดสรรงวด ${trancheNumber}`,
        sort_order: trancheNumber,
      })),
      { onConflict: 'report_period_id,tranche_number' },
    ),
    'สร้างงวดจัดสรรเริ่มต้น',
  );
}

export async function createBudgetReportPeriod(input: BudgetUtilizationReportPeriodInput) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);

  const result = await runSupabaseQuery<any>(
    budgetClient
      .from('budget_utilization_report_periods')
      .insert({
        fiscal_year: input.fiscalYear,
        report_as_of: input.reportAsOf || null,
        title: sanitizePlainTextInput(input.title, { fieldName: 'ชื่อรอบรายงาน', maxLength: 300, allowNewlines: false }),
        department_name: sanitizePlainTextInput(input.departmentName || 'กองยุทธศาสตร์และแผนงาน', {
          fieldName: 'ชื่อหน่วยงาน',
          maxLength: 300,
          allowNewlines: false,
        }),
        is_active: input.isActive ?? true,
        created_by: userData.user?.id ?? null,
      })
      .select('*')
      .single(),
    'สร้างรอบรายงานงบประมาณ',
  );

  const reportPeriod = result.data as BudgetUtilizationReportPeriod;
  await createDefaultBudgetAllocationTranches(reportPeriod.id);
  return reportPeriod;
}

export async function saveBudgetAllocationTrancheDefinitions(
  reportPeriodId: string,
  definitions: Array<{ id?: string; trancheNumber: number; label: string; sortOrder: number }>,
) {
  const existing = await listBudgetAllocationTranches(reportPeriodId);
  const retainedIds = new Set(definitions.map((definition) => definition.id).filter(Boolean));
  const removedIds = existing.filter((definition) => !retainedIds.has(definition.id)).map((definition) => definition.id);

  if (removedIds.length > 0) {
    await runSupabaseQuery(
      budgetClient.from('budget_utilization_allocation_tranches').delete().in('id', removedIds),
      'ลบงวดจัดสรร',
    );
  }

  for (const definition of definitions) {
    const payload = {
      report_period_id: reportPeriodId,
      tranche_number: definition.trancheNumber,
      label: sanitizePlainTextInput(definition.label, { fieldName: 'ชื่องวดจัดสรร', maxLength: 200, allowNewlines: false }),
      sort_order: definition.sortOrder,
    };
    if (definition.id) {
      await runSupabaseQuery(
        budgetClient.from('budget_utilization_allocation_tranches').update(payload).eq('id', definition.id),
        'แก้ไขงวดจัดสรร',
      );
    } else {
      await runSupabaseQuery(
        budgetClient.from('budget_utilization_allocation_tranches').insert(payload),
        'เพิ่มงวดจัดสรร',
      );
    }
  }

  return listBudgetAllocationTranches(reportPeriodId);
}

export async function saveBudgetItemAllocation(
  itemId: string,
  tranche: BudgetUtilizationAllocationTranche,
  amount: number,
  allocationDate: string | null,
) {
  await runSupabaseQuery(
    budgetClient.from('budget_utilization_item_allocations').upsert({
      item_id: itemId,
      tranche_id: tranche.id,
      amount,
      allocation_date: allocationDate,
    }, { onConflict: 'item_id,tranche_id' }),
    'บันทึกยอดจัดสรรตามงวด',
  );

  const [allocationsResult, amountResult] = await Promise.all([
    runSupabaseQuery<any>(
      budgetClient.from('budget_utilization_item_allocations').select('amount').eq('item_id', itemId),
      'รวมยอดจัดสรรทุกงวด',
    ),
    runSupabaseQuery<any>(
      budgetClient.from('budget_utilization_amounts').select('*').eq('item_id', itemId).single(),
      'โหลดยอดรายการงบประมาณ',
    ),
  ]);
  const currentAmount = normalizeAmount(amountResult.data as Partial<BudgetUtilizationAmount>);
  const allocationTotal = (allocationsResult.data ?? []).reduce(
    (sum: number, allocation: { amount: number | string }) => sum + Number(allocation.amount ?? 0),
    0,
  );
  const netBudget = allocationTotal
    + currentAmount.central_transfer_in_amount - currentAmount.central_transfer_out_amount
    + currentAmount.department_request_increase_amount - currentAmount.department_transfer_out_amount
    + currentAmount.division_transfer_in_amount - currentAmount.division_transfer_out_amount
    + currentAmount.committed_po_amount + currentAmount.committed_without_po_amount;
  const remaining = Math.max(0, netBudget - currentAmount.utilization_total_amount);
  const updatePayload: Record<string, number | string | null> = {
    net_budget_after_transfer_amount: netBudget,
    remaining_amount: remaining,
    disbursement_rate: netBudget === 0 ? 0 : currentAmount.disbursed_total_amount * 100 / netBudget,
    utilization_with_po_rate: netBudget === 0 ? 0 : currentAmount.utilization_total_amount * 100 / netBudget,
  };
  if (tranche.tranche_number >= 1 && tranche.tranche_number <= 3) {
    updatePayload[`allocation_tranche_${tranche.tranche_number}_amount`] = amount;
    updatePayload[`allocation_tranche_${tranche.tranche_number}_date`] = allocationDate;
  }

  await runSupabaseQuery(
    budgetClient.from('budget_utilization_amounts').update(updatePayload).eq('item_id', itemId),
    'อัปเดตยอดสุทธิจากทุกงวดจัดสรร',
  );
}

export async function setActiveBudgetReportPeriod(reportPeriodId: string) {
  await runSupabaseQuery(
    budgetClient.from('budget_utilization_report_periods').update({ is_active: false }).neq('id', reportPeriodId),
    'ปิดใช้งานรอบรายงานอื่น',
  );

  const result = await runSupabaseQuery<any>(
    budgetClient.from('budget_utilization_report_periods').update({ is_active: true }).eq('id', reportPeriodId).select('*').single(),
    'ตั้งค่ารอบรายงานใช้งาน',
  );

  return result.data as BudgetUtilizationReportPeriod;
}

export async function deleteBudgetReportPeriod(reportPeriodId: string) {
  await runSupabaseQuery(
    budgetClient.from('budget_utilization_report_periods').delete().eq('id', reportPeriodId),
    'ลบรอบรายงาน งบประมาณ',
  );
}

export async function deleteBudgetImportFile(importBatchId: string) {
  const reportPeriodsResult = await runSupabaseQuery<any>(
    budgetClient
      .from('budget_utilization_report_periods')
      .select('id')
      .eq('import_batch_id', importBatchId),
    'โหลดชุดข้อมูลของไฟล์นำเข้าที่ต้องการลบ',
  );
  const reportPeriodIds = ((reportPeriodsResult.data ?? []) as Array<{ id: string }>).map((reportPeriod) => reportPeriod.id);

  if (reportPeriodIds.length > 0) {
    await runSupabaseQuery(
      budgetClient.from('budget_utilization_report_periods').delete().in('id', reportPeriodIds),
      'ลบชุดข้อมูลของไฟล์นำเข้า',
    );
  }

  await runSupabaseQuery(
    budgetClient.from('budget_utilization_import_batches').delete().eq('id', importBatchId),
    'ลบไฟล์นำเข้างบประมาณ',
  );
}

function toBudgetItemPayload(input: BudgetUtilizationItemInput, sortOrder?: number) {
  return {
    report_period_id: input.reportPeriodId,
    parent_id: input.parentId ?? null,
    sort_order: sortOrder,
    depth: input.depth ?? 0,
    row_type: input.rowType,
    sequence_label: input.sequenceLabel
      ? sanitizePlainTextInput(input.sequenceLabel, { fieldName: 'ลำดับรายการ', maxLength: 80, allowNewlines: false })
      : null,
    item_name: sanitizePlainTextInput(input.itemName, { fieldName: 'ชื่อรายการงบประมาณ', maxLength: 500, allowNewlines: false }),
    output_label: input.outputLabel
      ? sanitizePlainTextInput(input.outputLabel, { fieldName: 'ผลผลิต', maxLength: 300, allowNewlines: false })
      : null,
    activity_sequence_label: input.activitySequenceLabel
      ? sanitizePlainTextInput(input.activitySequenceLabel, { fieldName: 'ลำดับกิจกรรม', maxLength: 80, allowNewlines: false })
      : null,
    activity_label: input.activityLabel
      ? sanitizePlainTextInput(input.activityLabel, { fieldName: 'กิจกรรมหลัก', maxLength: 300, allowNewlines: false })
      : null,
    raw_label: [input.sequenceLabel, input.itemName].filter(Boolean).join(' '),
  };
}

function toBudgetAmountPayload(input: BudgetUtilizationItemInput, itemId: string) {
  const committedPoAmount = input.committedPoAmount ?? 0;
  const committedWithoutPoAmount = input.committedWithoutPoAmount ?? 0;
  const committedTotalAmount = committedPoAmount + committedWithoutPoAmount;
  const calculatedNetBudgetAfterTransferAmount =
    (input.allocationTranche1Amount ?? 0) +
    (input.allocationTranche2Amount ?? 0) +
    (input.allocationTranche3Amount ?? 0) +
    (input.centralTransferInAmount ?? 0) -
    (input.centralTransferOutAmount ?? 0) +
    (input.departmentRequestIncreaseAmount ?? 0) -
    (input.departmentTransferOutAmount ?? 0) +
    (input.divisionTransferInAmount ?? 0) -
    (input.divisionTransferOutAmount ?? 0) +
    committedTotalAmount;
  const netBudgetAfterTransferAmount = calculatedNetBudgetAfterTransferAmount
    || (input.netBudgetAfterTransferAmount ?? 0);
  const disbursedGeneralAmount = input.disbursedGeneralAmount ?? 0;
  const disbursedAdvanceAmount = input.disbursedAdvanceAmount ?? 0;
  const disbursedTotalAmount = input.disbursedTotalAmount ?? disbursedGeneralAmount + disbursedAdvanceAmount;
  const utilizationTotalAmount = input.utilizationTotalAmount ?? committedTotalAmount + disbursedTotalAmount;
  const remainingAmount = Math.max(0, netBudgetAfterTransferAmount - utilizationTotalAmount);
  const normalized = normalizeAmount({
    planned_budget_amount: input.plannedBudgetAmount,
    net_budget_after_transfer_amount: netBudgetAfterTransferAmount,
    allocation_tranche_1_amount: input.allocationTranche1Amount,
    allocation_tranche_2_amount: input.allocationTranche2Amount,
    allocation_tranche_3_amount: input.allocationTranche3Amount,
    central_transfer_in_amount: input.centralTransferInAmount,
    central_transfer_out_amount: input.centralTransferOutAmount,
    department_request_increase_amount: input.departmentRequestIncreaseAmount,
    department_transfer_out_amount: input.departmentTransferOutAmount,
    division_transfer_in_amount: input.divisionTransferInAmount,
    division_transfer_out_amount: input.divisionTransferOutAmount,
    committed_po_amount: committedPoAmount,
    committed_without_po_amount: committedWithoutPoAmount,
    committed_total_amount: committedTotalAmount,
    disbursed_general_amount: disbursedGeneralAmount,
    disbursed_advance_amount: disbursedAdvanceAmount,
    disbursed_total_amount: disbursedTotalAmount,
    utilization_total_amount: utilizationTotalAmount,
    remaining_amount: remainingAmount,
  });

  return {
    item_id: itemId,
    planned_budget_amount: normalized.planned_budget_amount,
    allocation_tranche_1_amount: normalized.allocation_tranche_1_amount,
    allocation_tranche_1_date: input.allocationTranche1Date || null,
    allocation_tranche_2_amount: normalized.allocation_tranche_2_amount,
    allocation_tranche_2_date: input.allocationTranche2Date || null,
    allocation_tranche_3_amount: normalized.allocation_tranche_3_amount,
    allocation_tranche_3_date: input.allocationTranche3Date || null,
    net_budget_after_transfer_amount: normalized.net_budget_after_transfer_amount,
    central_transfer_in_amount: normalized.central_transfer_in_amount,
    central_transfer_out_amount: normalized.central_transfer_out_amount,
    department_request_increase_amount: normalized.department_request_increase_amount,
    department_transfer_out_amount: normalized.department_transfer_out_amount,
    division_transfer_in_amount: normalized.division_transfer_in_amount,
    division_transfer_out_amount: normalized.division_transfer_out_amount,
    committed_po_amount: normalized.committed_po_amount,
    committed_without_po_amount: normalized.committed_without_po_amount,
    committed_total_amount: normalized.committed_total_amount,
    disbursed_general_amount: normalized.disbursed_general_amount,
    disbursed_advance_amount: normalized.disbursed_advance_amount,
    disbursed_total_amount: normalized.disbursed_total_amount,
    utilization_total_amount: normalized.utilization_total_amount,
    remaining_amount: normalized.remaining_amount,
    disbursement_rate: normalized.disbursement_rate,
    utilization_with_po_rate: normalized.utilization_with_po_rate,
  };
}

export async function createBudgetItem(input: BudgetUtilizationItemInput) {
  const existingItems = await listBudgetHierarchyItems(input.reportPeriodId);
  const parentItem = input.parentId ? existingItems.find((item) => item.id === input.parentId) : null;
  const itemResult = await runSupabaseQuery<any>(
    budgetClient
      .from('budget_utilization_items')
      .insert(toBudgetItemPayload({ ...input, depth: parentItem ? parentItem.depth + 1 : 0 }, existingItems.length + 1))
      .select('*')
      .single(),
    'เพิ่มรายการงบประมาณ',
  );

  await runSupabaseQuery<any>(
    budgetClient.from('budget_utilization_amounts').insert(toBudgetAmountPayload(input, itemResult.data.id)),
    'เพิ่มตัวเลขงบประมาณ',
  );

  return itemResult.data;
}

export async function updateBudgetItem(input: BudgetUtilizationItemInput) {
  if (!input.itemId) {
    throw new Error('ไม่พบรายการที่ต้องการแก้ไข');
  }

  const existingItems = await listBudgetHierarchyItems(input.reportPeriodId);
  const parentItem = input.parentId ? existingItems.find((item) => item.id === input.parentId) : null;
  const itemResult = await runSupabaseQuery<any>(
    budgetClient
      .from('budget_utilization_items')
      .update(toBudgetItemPayload({ ...input, depth: parentItem ? parentItem.depth + 1 : 0 }))
      .eq('id', input.itemId)
      .select('*')
      .single(),
    'แก้ไขรายการงบประมาณ',
  );

  await runSupabaseQuery<any>(
    budgetClient
      .from('budget_utilization_amounts')
      .upsert(toBudgetAmountPayload(input, input.itemId), { onConflict: 'item_id' }),
    'แก้ไขตัวเลขงบประมาณ',
  );

  return itemResult.data;
}

export async function updateBudgetItemAmounts(input: BudgetUtilizationItemInput) {
  if (!input.itemId) throw new Error('ไม่พบรายการที่ต้องการแก้ไขตัวเลข');
  const allocationsResult = await runSupabaseQuery<any>(
    budgetClient
      .from('budget_utilization_item_allocations')
      .select('amount')
      .eq('item_id', input.itemId),
    'รวมยอดจัดสรรทุกงวดก่อนแก้ไขตัวเลข',
  );
  const dynamicAllocations = (allocationsResult.data ?? []) as Array<{ amount: number | string }>;
  const allocationTotal = dynamicAllocations.length > 0
    ? dynamicAllocations.reduce((sum, allocation) => sum + Number(allocation.amount ?? 0), 0)
    : (input.allocationTranche1Amount ?? 0)
      + (input.allocationTranche2Amount ?? 0)
      + (input.allocationTranche3Amount ?? 0);
  const committedTotal = (input.committedPoAmount ?? 0) + (input.committedWithoutPoAmount ?? 0);
  const disbursedTotal = (input.disbursedGeneralAmount ?? 0) + (input.disbursedAdvanceAmount ?? 0);
  const utilizationTotal = committedTotal + disbursedTotal;
  const netBudget = allocationTotal
    + (input.centralTransferInAmount ?? 0)
    - (input.centralTransferOutAmount ?? 0)
    + (input.departmentRequestIncreaseAmount ?? 0)
    - (input.departmentTransferOutAmount ?? 0)
    + (input.divisionTransferInAmount ?? 0)
    - (input.divisionTransferOutAmount ?? 0)
    + committedTotal;
  const amountPayload = toBudgetAmountPayload(input, input.itemId);

  await runSupabaseQuery(
    budgetClient
      .from('budget_utilization_amounts')
      .update({
        ...amountPayload,
        net_budget_after_transfer_amount: netBudget,
        committed_total_amount: committedTotal,
        disbursed_total_amount: disbursedTotal,
        utilization_total_amount: utilizationTotal,
        remaining_amount: Math.max(0, netBudget - utilizationTotal),
        disbursement_rate: netBudget === 0 ? 0 : disbursedTotal * 100 / netBudget,
        utilization_with_po_rate: netBudget === 0 ? 0 : utilizationTotal * 100 / netBudget,
      })
      .eq('item_id', input.itemId),
    'แก้ไขตัวเลขรายการงบประมาณ',
  );
}

export async function updateBudgetItemDetails(input: BudgetUtilizationItemInput) {
  if (!input.itemId) throw new Error('ไม่พบรายการที่ต้องการแก้ไข');
  const itemPayload = toBudgetItemPayload(input);

  await runSupabaseQuery(
    budgetClient
      .from('budget_utilization_items')
      .update({
        sequence_label: itemPayload.sequence_label,
        item_name: itemPayload.item_name,
        output_label: itemPayload.output_label,
        activity_sequence_label: itemPayload.activity_sequence_label,
        activity_label: itemPayload.activity_label,
        raw_label: itemPayload.raw_label,
      })
      .eq('id', input.itemId),
    'แก้ไขรายละเอียดรายการงบประมาณ',
  );

  await runSupabaseQuery(
    budgetClient
      .from('budget_utilization_amounts')
      .update({ planned_budget_amount: input.plannedBudgetAmount })
      .eq('item_id', input.itemId),
    'แก้ไขวงเงินตามแผนของรายการงบประมาณ',
  );
}

export async function deleteBudgetItem(itemId: string) {
  await runSupabaseQuery<any>(
    budgetClient.from('budget_utilization_items').delete().eq('id', itemId),
    'ลบรายการงบประมาณ',
  );
}

async function persistBudgetPreviewRows(
  batch: BudgetUtilizationImportBatch,
  preview: BudgetUtilizationImportPreview,
  userId: string | null,
) {
  const reportPeriodResult = await runSupabaseQuery<any>(
    budgetClient
      .from('budget_utilization_report_periods')
      .insert({
        import_batch_id: batch.id,
        fiscal_year: preview.fiscalYear,
        report_as_of: preview.reportAsOf,
        title: sanitizePlainTextInput(preview.title, { fieldName: 'ชื่อรายงาน', maxLength: 300, allowNewlines: false }),
        department_name: sanitizePlainTextInput(preview.departmentName, { fieldName: 'ชื่อหน่วยงาน', maxLength: 300, allowNewlines: false }),
        is_active: true,
        created_by: userId,
      })
      .select('*')
      .single(),
    'สร้างรอบรายงานจากไฟล์นำเข้า',
  );
  const reportPeriod = reportPeriodResult.data;

  await setActiveBudgetReportPeriod(reportPeriod.id);
  await createDefaultBudgetAllocationTranches(reportPeriod.id);
  const allocationTranches = await listBudgetAllocationTranches(reportPeriod.id);

  const idMap = new Map<string, string>();
  for (const row of preview.rows) {
    const itemResult = await runSupabaseQuery<any>(
      budgetClient
        .from('budget_utilization_items')
        .insert({
          report_period_id: reportPeriod.id,
          parent_id: row.parent_id ? idMap.get(row.parent_id) ?? null : null,
          row_number: row.row_number,
          sort_order: row.sort_order,
          depth: row.depth,
          row_type: row.row_type,
          sequence_label: row.sequence_label,
          item_name: row.item_name,
          output_label: row.output_label,
          activity_sequence_label: row.activity_sequence_label ?? null,
          activity_label: row.activity_label,
          raw_label: row.raw_label,
          source_import_batch_id: batch.id,
          source_sheet_name: row.source_sheet_name,
          source_row_number: row.source_row_number ?? row.row_number,
          source_row_data: row.source_row_data,
        })
        .select('*')
        .single(),
      'บันทึกรายการงบประมาณ',
    );
    const item = itemResult.data;

    idMap.set(row.id, item.id);
    await runSupabaseQuery(
      budgetClient.from('budget_utilization_amounts').insert({
        ...row.amount,
        id: undefined,
        item_id: item.id,
        created_at: undefined,
        updated_at: undefined,
      }),
      'บันทึกตัวเลขงบประมาณ',
    );
    const legacyAllocations = allocationTranches.flatMap((tranche) => {
      const amount = tranche.tranche_number === 1
        ? row.amount.allocation_tranche_1_amount
        : tranche.tranche_number === 2
          ? row.amount.allocation_tranche_2_amount
          : row.amount.allocation_tranche_3_amount;
      const allocationDate = tranche.tranche_number === 1
        ? row.amount.allocation_tranche_1_date
        : tranche.tranche_number === 2
          ? row.amount.allocation_tranche_2_date
          : row.amount.allocation_tranche_3_date;
      return amount !== 0 || allocationDate
        ? [{ item_id: item.id, tranche_id: tranche.id, amount, allocation_date: allocationDate }]
        : [];
    });
    if (legacyAllocations.length > 0) {
      await runSupabaseQuery(
        budgetClient.from('budget_utilization_item_allocations').insert(legacyAllocations),
        'บันทึกยอดจัดสรรจากไฟล์นำเข้า',
      );
    }
  }

  return reportPeriod as BudgetUtilizationReportPeriod;
}

async function persistBudgetImportErrors(batchId: string, errors: BudgetUtilizationImportPreview['errors']) {
  if (errors.length > 0) {
    await runSupabaseQuery(
      budgetClient.from('budget_utilization_import_errors').insert(
        errors.map((error) => ({
          import_batch_id: batchId,
          row_number: error.rowNumber,
          column_name: error.columnName ?? null,
          error_code: error.errorCode,
          error_message: error.errorMessage,
          raw_value: error.rawValue ?? null,
        })),
      ),
      'บันทึกข้อผิดพลาดการนำเข้า',
    );
  }
}

const reconciliationFields: Array<keyof BudgetUtilizationAmount> = [
  'planned_budget_amount',
  'allocation_tranche_1_amount',
  'allocation_tranche_2_amount',
  'allocation_tranche_3_amount',
  'net_budget_after_transfer_amount',
  'central_transfer_in_amount',
  'central_transfer_out_amount',
  'department_request_increase_amount',
  'department_transfer_out_amount',
  'division_transfer_in_amount',
  'division_transfer_out_amount',
  'committed_total_amount',
  'disbursed_total_amount',
  'utilization_total_amount',
  'remaining_amount',
  'disbursement_rate',
  'utilization_with_po_rate',
];

async function reconcilePersistedBudgetImport(
  batch: BudgetUtilizationImportBatch,
  reportPeriod: BudgetUtilizationReportPeriod,
  preview: BudgetUtilizationImportPreview,
) {
  const persistedItems = await listBudgetHierarchyItems(reportPeriod.id);
  const sourceTotal = preview.rows.find((item) => item.row_type === 'total')?.amount ?? null;
  const persistedTotal = persistedItems.find((item) => item.row_type === 'total')?.amount ?? null;
  const differences = sourceTotal && persistedTotal
    ? reconciliationFields.flatMap((field) => {
        const sourceValue = Number(sourceTotal[field] ?? 0);
        const persistedValue = Number(persistedTotal[field] ?? 0);
        return Math.abs(sourceValue - persistedValue) > 0.01
          ? [{ field, sourceValue, persistedValue }]
          : [];
      })
    : [];
  const rowCountMatches = persistedItems.length === preview.rows.length;
  const validationStatus = preview.errors.length === 0 && rowCountMatches && differences.length === 0 ? 'matched' : 'mismatch';
  const reconciliation = {
    source_row_count: preview.rawWorkbook?.rows.length ?? preview.rows.length,
    normalized_item_count: preview.rows.length,
    persisted_item_count: persistedItems.length,
    rejected_row_count: preview.errors.length,
    row_count_matches: rowCountMatches,
    total_row_compared: Boolean(sourceTotal && persistedTotal),
    differences,
  };

  const result = await runSupabaseQuery<any>(
    budgetClient
      .from('budget_utilization_import_batches')
      .update({ validation_status: validationStatus, reconciliation })
      .eq('id', batch.id)
      .select('*')
      .single(),
    'ตรวจสอบยอดไฟล์นำเข้ากับฐานข้อมูล',
  );

  return result.data as BudgetUtilizationImportBatch;
}

export async function importBudgetPreview(preview: BudgetUtilizationImportPreview) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);

  const sourceRowCount = preview.rawWorkbook?.rows.length ?? preview.rows.length;
  const validationStatus = preview.errors.length === 0 && preview.rows.length > 0 ? 'matched' : 'mismatch';
  const batchResult = await runSupabaseQuery<any>(
    budgetClient
      .from('budget_utilization_import_batches')
      .insert({
        fiscal_year: preview.fiscalYear,
        report_as_of: preview.reportAsOf,
        source_file_name: preview.sourceFileName,
        source_file_size: preview.sourceFileSize,
        source_checksum: preview.sourceChecksum || null,
        status: preview.errors.length > 0 ? 'previewed' : 'imported',
        validation_status: validationStatus,
        reconciliation: {
          source_row_count: sourceRowCount,
          normalized_item_count: preview.rows.length,
          rejected_row_count: preview.errors.length,
        },
        imported_by: userData.user?.id ?? null,
        total_rows: sourceRowCount,
        imported_rows: preview.rows.length,
        rejected_rows: preview.errors.length,
        metadata: {
          template: preview.sourceFormat === 'raw_table' ? 'raw_excel_table' : 'budget_utilization_template',
          rawWorkbook: preview.rawWorkbook,
        },
      })
      .select('*')
      .single(),
    'สร้าง batch การนำเข้า',
  );
  let batch = batchResult.data as BudgetUtilizationImportBatch;

  await persistBudgetImportErrors(batch.id, preview.errors);

  if (preview.rows.length === 0) {
    return { batch, reportPeriod: null };
  }

  const reportPeriod = await persistBudgetPreviewRows(batch, preview, userData.user?.id ?? null);
  batch = await reconcilePersistedBudgetImport(batch, reportPeriod, preview);

  return { batch, reportPeriod };
}

export async function normalizeExistingBudgetImportFile(importBatchId: string) {
  const detail = await getBudgetImportFileDetail(importBatchId);
  if (detail.reportPeriod) return detail.reportPeriod;
  if (!detail.rawWorkbook) {
    throw new Error('ไฟล์นี้ไม่มีตาราง Excel ต้นฉบับสำหรับนำเข้าสู่ฐานข้อมูล');
  }

  const normalized = parseRawBudgetWorkbookRows(detail.rawWorkbook);
  if (normalized.rows.length === 0) {
    throw new Error('ไม่พบรายการงบประมาณที่สามารถแปลงเข้าสู่ฐานข้อมูลได้');
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);

  await persistBudgetImportErrors(detail.batch.id, normalized.errors);
  const preview: BudgetUtilizationImportPreview = {
    sourceFormat: 'raw_table',
    fiscalYear: detail.batch.fiscal_year,
    reportAsOf: detail.batch.report_as_of,
    title: `รายงานการใช้จ่ายงบประมาณ ปีงบประมาณ ${detail.batch.fiscal_year}`,
    departmentName: 'กองยุทธศาสตร์และแผนงาน',
    sourceFileName: detail.batch.source_file_name ?? 'ไฟล์ Excel',
    sourceFileSize: detail.batch.source_file_size ?? 0,
    sourceChecksum: detail.batch.source_checksum ?? '',
    rawWorkbook: detail.rawWorkbook,
    rows: normalized.rows,
    errors: normalized.errors,
  };
  const reportPeriod = await persistBudgetPreviewRows(detail.batch, preview, userData.user?.id ?? null);

  await runSupabaseQuery(
    budgetClient
      .from('budget_utilization_import_batches')
      .update({
        status: normalized.errors.length > 0 ? 'previewed' : 'imported',
        validation_status: normalized.errors.length > 0 ? 'mismatch' : 'matched',
        imported_rows: normalized.rows.length,
        rejected_rows: normalized.errors.length,
        reconciliation: {
          source_row_count: detail.rawWorkbook.rows.length,
          normalized_item_count: normalized.rows.length,
          rejected_row_count: normalized.errors.length,
        },
      })
      .eq('id', detail.batch.id),
    'อัปเดตผลการนำไฟล์เดิมเข้าสู่ฐานข้อมูล',
  );

  await reconcilePersistedBudgetImport(detail.batch, reportPeriod, preview);

  return reportPeriod;
}
