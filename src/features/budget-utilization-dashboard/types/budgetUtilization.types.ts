export type BudgetUtilizationRowType =
  | 'total'
  | 'budget_category'
  | 'output_activity'
  | 'expense_group'
  | 'major_project'
  | 'sub_project'
  | 'activity'
  | 'line_item';

export type BudgetUtilizationReportPeriod = {
  id: string;
  import_batch_id: string | null;
  fiscal_year: number;
  report_as_of: string | null;
  title: string;
  department_name: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type BudgetUtilizationItem = {
  id: string;
  report_period_id: string;
  parent_id: string | null;
  row_number: number | null;
  sort_order: number;
  depth: number;
  row_type: BudgetUtilizationRowType;
  sequence_label: string | null;
  item_name: string;
  output_label: string | null;
  activity_label: string | null;
  raw_label: string | null;
  created_at: string;
  updated_at: string;
};

export type BudgetUtilizationAmount = {
  id: string;
  item_id: string;
  planned_budget_amount: number;
  allocation_tranche_1_amount: number;
  allocation_tranche_1_date: string | null;
  allocation_tranche_2_amount: number;
  allocation_tranche_2_date: string | null;
  allocation_tranche_3_amount: number;
  allocation_tranche_3_date: string | null;
  net_budget_after_transfer_amount: number;
  central_transfer_in_amount: number;
  central_transfer_out_amount: number;
  division_transfer_in_amount: number;
  division_transfer_out_amount: number;
  committed_po_amount: number;
  committed_without_po_amount: number;
  committed_total_amount: number;
  disbursed_general_amount: number;
  disbursed_advance_amount: number;
  disbursed_total_amount: number;
  utilization_total_amount: number;
  remaining_amount: number;
  disbursement_rate: number | null;
  utilization_with_po_rate: number | null;
  created_at: string;
  updated_at: string;
};

export type BudgetUtilizationItemWithAmount = BudgetUtilizationItem & {
  amount: BudgetUtilizationAmount;
};

export type BudgetUtilizationImportBatch = {
  id: string;
  fiscal_year: number;
  report_as_of: string | null;
  source_file_name: string | null;
  source_file_size: number | null;
  status: 'draft' | 'previewed' | 'imported' | 'failed';
  imported_by: string | null;
  total_rows: number;
  imported_rows: number;
  rejected_rows: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type BudgetUtilizationImportError = {
  id: string;
  import_batch_id: string;
  row_number: number | null;
  column_name: string | null;
  error_code: string;
  error_message: string;
  raw_value: string | null;
  created_at: string;
};

export type BudgetUtilizationImportFileRecord = {
  batch: BudgetUtilizationImportBatch;
  reportPeriod: BudgetUtilizationReportPeriod | null;
};

export type BudgetUtilizationRawWorkbook = {
  sheetName: string;
  columnCount: number;
  rows: string[][];
  merges: Array<{
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  }>;
};

export type BudgetUtilizationDatasetOption = {
  reportPeriodId: string;
  importBatchId: string | null;
  sourceType: 'report_period' | 'raw_workbook';
  title: string;
  fiscalYear: number;
  reportAsOf: string | null;
  sourceFileName: string | null;
  uploadedAt: string;
  isActive: boolean;
};

export type BudgetUtilizationImportFileDetail = BudgetUtilizationImportFileRecord & {
  items: BudgetUtilizationItemWithAmount[];
  errors: BudgetUtilizationImportError[];
  rawWorkbook: BudgetUtilizationRawWorkbook | null;
};

export type BudgetUtilizationDashboardSummary = {
  reportPeriod: BudgetUtilizationReportPeriod | null;
  items: BudgetUtilizationItemWithAmount[];
  totalItem: BudgetUtilizationItemWithAmount | null;
  categoryItems: BudgetUtilizationItemWithAmount[];
  projectItems: BudgetUtilizationItemWithAmount[];
  totals: BudgetUtilizationAmount;
};

export type BudgetUtilizationImportPreview = {
  fiscalYear: number;
  reportAsOf: string | null;
  title: string;
  departmentName: string;
  sourceFileName: string;
  sourceFileSize: number;
  rawWorkbook: BudgetUtilizationRawWorkbook | null;
  rows: BudgetUtilizationItemWithAmount[];
  errors: Array<{
    rowNumber: number;
    columnName?: string;
    errorCode: string;
    errorMessage: string;
    rawValue?: string;
  }>;
};

export type BudgetUtilizationReportPeriodInput = {
  fiscalYear: number;
  reportAsOf?: string | null;
  title: string;
  departmentName?: string;
  isActive?: boolean;
};

export type BudgetUtilizationItemInput = {
  reportPeriodId: string;
  itemId?: string;
  parentId?: string | null;
  depth?: number;
  rowType: BudgetUtilizationRowType;
  sequenceLabel?: string | null;
  itemName: string;
  outputLabel?: string | null;
  activityLabel?: string | null;
  plannedBudgetAmount: number;
  allocationTranche1Amount?: number;
  allocationTranche1Date?: string | null;
  allocationTranche2Amount?: number;
  allocationTranche2Date?: string | null;
  allocationTranche3Amount?: number;
  allocationTranche3Date?: string | null;
  centralTransferInAmount?: number;
  centralTransferOutAmount?: number;
  divisionTransferInAmount?: number;
  divisionTransferOutAmount?: number;
  committedPoAmount?: number;
  committedWithoutPoAmount?: number;
  committedTotalAmount?: number;
  disbursedGeneralAmount?: number;
  disbursedAdvanceAmount?: number;
  disbursedTotalAmount?: number;
  utilizationTotalAmount?: number;
  remainingAmount?: number;
};
