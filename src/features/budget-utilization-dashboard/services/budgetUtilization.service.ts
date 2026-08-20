import { supabase } from '../../../lib/supabase';
import { runSupabaseQuery } from '../../../lib/supabase-query';
import { sanitizePlainTextInput } from '../../../utils/inputSecurity';
import { normalizeAmount, summarizeBudgetItems } from '../utils/budgetUtilizationCalculations';
import type {
  BudgetUtilizationAmount,
  BudgetUtilizationDashboardSummary,
  BudgetUtilizationDatasetOption,
  BudgetUtilizationImportBatch,
  BudgetUtilizationImportError,
  BudgetUtilizationImportFileDetail,
  BudgetUtilizationImportFileRecord,
  BudgetUtilizationImportPreview,
  BudgetUtilizationItemInput,
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

function mapJoinedItem(row: any): BudgetUtilizationItemWithAmount {
  const amountRow = Array.isArray(row.budget_utilization_amounts)
    ? row.budget_utilization_amounts[0]
    : row.budget_utilization_amounts;

  const normalizedAmount = normalizeAmount(amountRow as Partial<BudgetUtilizationAmount>);

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
    activity_label: row.activity_label,
    raw_label: row.raw_label,
    created_at: row.created_at,
    updated_at: row.updated_at,
    amount: {
      ...normalizedAmount,
      allocation_tranche_1_date: amountRow?.allocation_tranche_1_date ?? null,
      allocation_tranche_2_date: amountRow?.allocation_tranche_2_date ?? null,
      allocation_tranche_3_date: amountRow?.allocation_tranche_3_date ?? null,
    },
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

  const reportPeriodOptions: BudgetUtilizationDatasetOption[] = reportPeriods.map((reportPeriod) => {
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
      .filter((record) => !record.reportPeriod && getRawWorkbookFromMetadata(record.batch.metadata))
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
      .select('*, budget_utilization_amounts(*)')
      .eq('report_period_id', reportPeriodId)
      .order('sort_order', { ascending: true }),
    'โหลดรายการงบประมาณ',
  );

  return ((result.data ?? []) as any[]).map(mapJoinedItem);
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
    };
  }

  const items = await listBudgetHierarchyItems(reportPeriod.id);
  const totalItem = items.find((item) => item.row_type === 'total') ?? null;

  return {
    reportPeriod,
    items,
    totalItem,
    categoryItems: items.filter((item: BudgetUtilizationItemWithAmount) => item.row_type === 'budget_category'),
    projectItems: items.filter((item: BudgetUtilizationItemWithAmount) => ['major_project', 'sub_project', 'activity'].includes(item.row_type)),
    totals: summarizeBudgetItems(items),
  };
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

  return result.data as BudgetUtilizationReportPeriod;
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
    activity_label: input.activityLabel
      ? sanitizePlainTextInput(input.activityLabel, { fieldName: 'กิจกรรมหลัก', maxLength: 300, allowNewlines: false })
      : null,
    raw_label: [input.sequenceLabel, input.itemName].filter(Boolean).join(' '),
  };
}

function toBudgetAmountPayload(input: BudgetUtilizationItemInput, itemId: string) {
  const disbursedGeneralAmount = input.disbursedGeneralAmount ?? 0;
  const disbursedAdvanceAmount = input.disbursedAdvanceAmount ?? 0;
  const disbursedTotalAmount = input.disbursedTotalAmount ?? disbursedGeneralAmount + disbursedAdvanceAmount;
  const committedPoAmount = input.committedPoAmount ?? 0;
  const committedWithoutPoAmount = input.committedWithoutPoAmount ?? 0;
  const committedTotalAmount = input.committedTotalAmount ?? committedPoAmount + committedWithoutPoAmount;
  const utilizationTotalAmount = input.utilizationTotalAmount ?? committedTotalAmount + disbursedTotalAmount;
  const remainingAmount = input.remainingAmount ?? Math.max(0, input.plannedBudgetAmount - utilizationTotalAmount);
  const normalized = normalizeAmount({
    planned_budget_amount: input.plannedBudgetAmount,
    allocation_tranche_1_amount: input.allocationTranche1Amount,
    allocation_tranche_2_amount: input.allocationTranche2Amount,
    allocation_tranche_3_amount: input.allocationTranche3Amount,
    central_transfer_in_amount: input.centralTransferInAmount,
    central_transfer_out_amount: input.centralTransferOutAmount,
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
    central_transfer_in_amount: normalized.central_transfer_in_amount,
    central_transfer_out_amount: normalized.central_transfer_out_amount,
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

export async function deleteBudgetItem(itemId: string) {
  await runSupabaseQuery<any>(
    budgetClient.from('budget_utilization_items').delete().eq('id', itemId),
    'ลบรายการงบประมาณ',
  );
}

export async function importBudgetPreview(preview: BudgetUtilizationImportPreview) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);

  const batchResult = await runSupabaseQuery<any>(
    budgetClient
      .from('budget_utilization_import_batches')
      .insert({
        fiscal_year: preview.fiscalYear,
        report_as_of: preview.reportAsOf,
        source_file_name: preview.sourceFileName,
        source_file_size: preview.sourceFileSize,
        status: preview.errors.length > 0 ? 'previewed' : 'imported',
        imported_by: userData.user?.id ?? null,
        total_rows: (preview.rawWorkbook?.rows.length ?? preview.rows.length) + preview.errors.length,
        imported_rows: preview.rawWorkbook?.rows.length ?? preview.rows.length,
        rejected_rows: preview.errors.length,
        metadata: {
          template: preview.rawWorkbook ? 'raw_excel_table' : 'Mmd/เวิร์กบุ๊ก1.xlsx',
          rawWorkbook: preview.rawWorkbook,
        },
      })
      .select('*')
      .single(),
    'สร้าง batch การนำเข้า',
  );
  const batch = batchResult.data;

  if (preview.rows.length === 0) {
    return { batch: batch as BudgetUtilizationImportBatch, reportPeriod: null };
  }

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
        created_by: userData.user?.id ?? null,
      })
      .select('*')
      .single(),
    'สร้างรอบรายงานจากไฟล์นำเข้า',
  );
  const reportPeriod = reportPeriodResult.data;

  await setActiveBudgetReportPeriod(reportPeriod.id);

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
          activity_label: row.activity_label,
          raw_label: row.raw_label,
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
  }

  if (preview.errors.length > 0) {
    await runSupabaseQuery(
      budgetClient.from('budget_utilization_import_errors').insert(
        preview.errors.map((error) => ({
          import_batch_id: batch.id,
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

  return { batch: batch as BudgetUtilizationImportBatch, reportPeriod: reportPeriod as BudgetUtilizationReportPeriod };
}
