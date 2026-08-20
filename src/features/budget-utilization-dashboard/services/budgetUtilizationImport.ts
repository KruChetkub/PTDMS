import { sanitizePlainTextInput } from '../../../utils/inputSecurity';
import { normalizeAmount, percent, toNumber } from '../utils/budgetUtilizationCalculations';
import type { BudgetUtilizationImportPreview, BudgetUtilizationItemWithAmount, BudgetUtilizationRawWorkbook, BudgetUtilizationRowType } from '../types/budgetUtilization.types';

function readCell(row: unknown[], index: number) {
  return String(row[index] ?? '').trim();
}

function normalizeLabel(label: string) {
  return label.replace(/\s+/g, '');
}

function isTotalRow(label: string) {
  return /รวมทั้งสิ้น|รวมทั้งหมด|รายจ่ายภาพรวม/.test(normalizeLabel(label));
}

function isMainBudgetCategory(label: string) {
  return /^\s*\d*\.?\s*งบ(บุคลากร|ลงทุน|ดำเนินงาน|โครงการ|รายจ่าย)\s*$/.test(label);
}

function isOutputActivityRow(label: string) {
  return /ผลผลิต|กิจกรรมหลัก/.test(normalizeLabel(label));
}

function isStructuralRow(label: string) {
  return isTotalRow(label) || isMainBudgetCategory(label) || isOutputActivityRow(label);
}

function isTemplateHeaderRow(row: unknown[], itemName: string) {
  const normalizedItemName = normalizeLabel(itemName);
  const normalizedRowText = normalizeLabel(row.map((cell) => String(cell ?? '')).join(' '));

  if (/^(ลำดับ|รายการ|ชื่อโครงการ)$/.test(normalizedItemName)) {
    return true;
  }

  return (
    normalizedRowText.includes('วงเงินตามแผน') ||
    normalizedRowText.includes('รับจัดสรรงวด') ||
    normalizedRowText.includes('ยอดสุทธิปีงบประมาณ') ||
    normalizedRowText.includes('ส่วนกลางกรมฯ') ||
    normalizedRowText.includes('ภายในกอง') ||
    normalizedRowText.includes('เบิกจ่ายตามจัดสรรร้อยละ')
  );
}

function isRawTableWorkbook(rows: unknown[][]) {
  const firstRowsText = rows
    .slice(0, 3)
    .flat()
    .map((cell) => normalizeLabel(String(cell ?? '')))
    .join(' ');

  return (
    firstRowsText.includes('ลำดับที่') &&
    firstRowsText.includes('ชื่อโครงการ') &&
    firstRowsText.includes('ผลผลิตที่') &&
    firstRowsText.includes('กิจกรรมหลักที่')
  );
}

function readRawWorkbook(sheetName: string, rows: unknown[][], sheet: Record<string, unknown>): BudgetUtilizationRawWorkbook {
  const columnCount = Math.max(1, ...rows.map((row) => row.length));

  return {
    sheetName,
    columnCount,
    rows: rows.map((row) => Array.from({ length: columnCount }, (_, index) => readCell(row, index))),
    merges: ((sheet['!merges'] as Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> | undefined) ?? []).map((merge) => ({
      startRow: merge.s.r,
      startCol: merge.s.c,
      endRow: merge.e.r,
      endCol: merge.e.c,
    })),
  };
}

function classifyRowType(label: string, sequenceLabel: string | null, depth: number): BudgetUtilizationRowType {
  const normalized = label.replace(/\s+/g, '');

  if (isTotalRow(label)) return 'total';
  if (isMainBudgetCategory(label)) return 'budget_category';
  if (/ผลผลิต|กิจกรรมหลัก|โครงการหลัก/.test(normalized)) return 'output_activity';
  if (/กิจกรรมย่อย|โครงการย่อย/.test(normalized)) return 'sub_project';
  if (/กิจกรรม/.test(normalized)) return 'activity';
  if (sequenceLabel && depth <= 1) return 'major_project';
  if (depth >= 2) return 'line_item';
  return 'expense_group';
}

function inferDepth(label: string, sequenceLabel: string | null, previousCategoryId: string | null) {
  if (isTotalRow(label) || isMainBudgetCategory(label)) return 0;
  if (isOutputActivityRow(label)) return previousCategoryId ? 1 : 0;
  if (/^\s*งบ[^:：]+[:：]/.test(label)) return previousCategoryId ? 1 : 0;
  if (/^\s*กิจกรรมที่\s*\d+/.test(label)) return previousCategoryId ? 2 : 1;
  if (/^\s*[-–]/.test(label)) return 1;
  if (/^\s*\d+\.\d+/.test(label) || /^\s*[ก-ฮ]\./.test(label)) return 2;
  if (sequenceLabel && /^\d+\)/.test(sequenceLabel)) return 1;
  return 0;
}

function inferFiscalYear(rows: unknown[][]) {
  const text = rows.flat().map((cell) => String(cell ?? '')).join(' ');
  const match = text.match(/25\d{2}/);
  if (match) {
    return Number(match[0]);
  }

  return new Date().getFullYear() + 543;
}

function findReportDate(rows: unknown[][]) {
  const text = rows.flat().map((cell) => String(cell ?? '')).join(' ');
  const match = text.match(/(\d{1,2})\s*(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s*(25\d{2})/);
  if (!match) return null;

  const monthMap: Record<string, number> = {
    'ม.ค.': 0,
    'ก.พ.': 1,
    'มี.ค.': 2,
    'เม.ย.': 3,
    'พ.ค.': 4,
    'มิ.ย.': 5,
    'ก.ค.': 6,
    'ส.ค.': 7,
    'ก.ย.': 8,
    'ต.ค.': 9,
    'พ.ย.': 10,
    'ธ.ค.': 11,
    มกราคม: 0,
    กุมภาพันธ์: 1,
    มีนาคม: 2,
    เมษายน: 3,
    พฤษภาคม: 4,
    มิถุนายน: 5,
    กรกฎาคม: 6,
    สิงหาคม: 7,
    กันยายน: 8,
    ตุลาคม: 9,
    พฤศจิกายน: 10,
    ธันวาคม: 11,
  };
  const year = Number(match[3]) - 543;
  const date = new Date(year, monthMap[match[2]], Number(match[1]), 9, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function hasBudgetNumbers(row: unknown[]) {
  return row.slice(2, 21).some((value) => toNumber(value) !== 0);
}

function getRowLabel(row: unknown[]) {
  return readCell(row, 1) || readCell(row, 0);
}

function getSequenceLabel(row: unknown[]) {
  const firstCell = readCell(row, 0);
  const secondCell = readCell(row, 1);

  if (!firstCell || firstCell === getRowLabel(row)) {
    return null;
  }

  if (/^\d+(\.\d+)*$/.test(firstCell) || /^\d+\)$/.test(firstCell) || /^[ก-ฮ]\.$/.test(firstCell)) {
    return firstCell;
  }

  return secondCell ? firstCell : null;
}

export async function parseBudgetWorkbook(file: File): Promise<BudgetUtilizationImportPreview> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, raw: false });
  const rawWorkbook = readRawWorkbook(sheetName, rows, sheet);
  const fiscalYear = inferFiscalYear(rows);
  const reportAsOf = findReportDate(rows);
  const hierarchyStack: Array<{ depth: number; id: string }> = [];
  const parsedRows: BudgetUtilizationItemWithAmount[] = [];
  const errors: BudgetUtilizationImportPreview['errors'] = [];
  let latestCategoryId: string | null = null;

  if (isRawTableWorkbook(rows)) {
    return {
      fiscalYear,
      reportAsOf,
      title: `รายงานการใช้จ่ายงบประมาณ ปีงบประมาณ ${fiscalYear}`,
      departmentName: 'กองยุทธศาสตร์และแผนงาน',
      sourceFileName: file.name,
      sourceFileSize: file.size,
      rawWorkbook,
      rows: [],
      errors,
    };
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const itemName = getRowLabel(row);
    const sequenceLabel = getSequenceLabel(row);

    if (!itemName || isTemplateHeaderRow(row, itemName)) {
      return;
    }

    if (!hasBudgetNumbers(row) && !isStructuralRow(itemName)) {
      return;
    }

    try {
      const safeItemName = sanitizePlainTextInput(itemName, { fieldName: `ชื่อรายการ แถว ${rowNumber}`, maxLength: 500, allowNewlines: false });
      const depth = inferDepth(safeItemName, sequenceLabel, latestCategoryId);
      const temporaryId = `preview-${rowNumber}`;
      const parent = [...hierarchyStack].reverse().find((item) => item.depth < depth) ?? null;

      while (hierarchyStack.length > 0 && hierarchyStack[hierarchyStack.length - 1].depth >= depth) {
        hierarchyStack.pop();
      }

      hierarchyStack.push({ depth, id: temporaryId });
      if (isMainBudgetCategory(safeItemName)) {
        latestCategoryId = temporaryId;
      }

      const committedTotal = toNumber(row[13]) || toNumber(row[11]) + toNumber(row[12]);
      const disbursedTotal = toNumber(row[16]) || toNumber(row[14]) + toNumber(row[15]);
      const utilizationTotal = toNumber(row[17]) || committedTotal + disbursedTotal;
      const plannedBudget = toNumber(row[2]);
      const allocationTotal =
        toNumber(row[3]) +
        toNumber(row[4]) +
        toNumber(row[5]) +
        toNumber(row[7]) -
        toNumber(row[8]);

      parsedRows.push({
        id: temporaryId,
        report_period_id: '',
        parent_id: parent?.id ?? null,
        row_number: rowNumber,
        sort_order: parsedRows.length + 1,
        depth,
        row_type: classifyRowType(safeItemName, sequenceLabel, depth),
        sequence_label: sequenceLabel,
        item_name: safeItemName,
        output_label: null,
        activity_label: null,
        raw_label: [sequenceLabel, itemName].filter(Boolean).join(' '),
        created_at: '',
        updated_at: '',
        amount: normalizeAmount({
          planned_budget_amount: plannedBudget,
          allocation_tranche_1_amount: toNumber(row[3]),
          allocation_tranche_2_amount: toNumber(row[4]),
          allocation_tranche_3_amount: toNumber(row[5]),
          net_budget_after_transfer_amount: toNumber(row[6]),
          central_transfer_in_amount: toNumber(row[7]),
          central_transfer_out_amount: toNumber(row[8]),
          division_transfer_in_amount: toNumber(row[9]),
          division_transfer_out_amount: toNumber(row[10]),
          committed_po_amount: toNumber(row[11]),
          committed_without_po_amount: toNumber(row[12]),
          committed_total_amount: committedTotal,
          disbursed_general_amount: toNumber(row[14]),
          disbursed_advance_amount: toNumber(row[15]),
          disbursed_total_amount: disbursedTotal,
          utilization_total_amount: utilizationTotal,
          remaining_amount: toNumber(row[18]),
          disbursement_rate: toNumber(row[19]) || percent(disbursedTotal, allocationTotal || plannedBudget),
          utilization_with_po_rate: toNumber(row[20]) || percent(utilizationTotal, allocationTotal || plannedBudget),
        }),
      });
    } catch (error) {
      errors.push({
        rowNumber,
        errorCode: 'invalid_row',
        errorMessage: error instanceof Error ? error.message : 'ไม่สามารถอ่านข้อมูลแถวนี้ได้',
        rawValue: JSON.stringify(row),
      });
    }
  });

  return {
    fiscalYear,
    reportAsOf,
    title: `รายงานการใช้จ่ายงบประมาณ ปีงบประมาณ ${fiscalYear}`,
    departmentName: 'กองยุทธศาสตร์และแผนงาน',
    sourceFileName: file.name,
    sourceFileSize: file.size,
    rawWorkbook,
    rows: parsedRows,
    errors,
  };
}
