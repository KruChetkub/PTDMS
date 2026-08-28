import type { BudgetUtilizationAmount, BudgetUtilizationItemWithAmount } from '../types/budgetUtilization.types';

export const emptyBudgetAmount: BudgetUtilizationAmount = {
  id: '',
  item_id: '',
  planned_budget_amount: 0,
  allocation_tranche_1_amount: 0,
  allocation_tranche_1_date: null,
  allocation_tranche_2_amount: 0,
  allocation_tranche_2_date: null,
  allocation_tranche_3_amount: 0,
  allocation_tranche_3_date: null,
  net_budget_after_transfer_amount: 0,
  central_transfer_in_amount: 0,
  central_transfer_out_amount: 0,
  department_request_increase_amount: 0,
  department_transfer_out_amount: 0,
  division_transfer_in_amount: 0,
  division_transfer_out_amount: 0,
  committed_po_amount: 0,
  committed_without_po_amount: 0,
  committed_total_amount: 0,
  disbursed_general_amount: 0,
  disbursed_advance_amount: 0,
  disbursed_total_amount: 0,
  utilization_total_amount: 0,
  remaining_amount: 0,
  disbursement_rate: 0,
  utilization_with_po_rate: 0,
  created_at: '',
  updated_at: '',
};

export function toNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const text = String(value ?? '')
    .replace(/,/g, '')
    .replace(/[^\d.-]/g, '')
    .trim();

  if (!text || text === '-' || text === '.') {
    return 0;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function percent(numerator: number, denominator: number) {
  if (!denominator) {
    return 0;
  }

  return Math.round((numerator / denominator) * 10000) / 100;
}

export function formatBudgetAmount(value: number, digits = 2) {
  return value.toLocaleString('th-TH', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatMillionBaht(value: number) {
  return `${formatBudgetAmount(value / 1_000_000)} ล้านบาท`;
}

export function getNetAllocationTotal(amount: Partial<BudgetUtilizationAmount>) {
  const storedNetBudget = toNumber(amount.net_budget_after_transfer_amount);
  if (storedNetBudget !== 0) {
    return storedNetBudget;
  }

  const allocationTotal = amount.allocation_total_amount ?? (
    toNumber(amount.allocation_tranche_1_amount) +
    toNumber(amount.allocation_tranche_2_amount) +
    toNumber(amount.allocation_tranche_3_amount)
  );
  const netAllocationAfterTransfer = (
    allocationTotal +
    toNumber(amount.central_transfer_in_amount) -
    toNumber(amount.central_transfer_out_amount) +
    toNumber(amount.department_request_increase_amount) -
    toNumber(amount.department_transfer_out_amount) +
    toNumber(amount.division_transfer_in_amount) -
    toNumber(amount.division_transfer_out_amount)
  );
  const hasNetBudgetComponents = [
    allocationTotal,
    amount.central_transfer_in_amount,
    amount.central_transfer_out_amount,
    amount.department_request_increase_amount,
    amount.department_transfer_out_amount,
    amount.division_transfer_in_amount,
    amount.division_transfer_out_amount,
  ].some((value) => toNumber(value) !== 0);

  return hasNetBudgetComponents ? netAllocationAfterTransfer : 0;
}

export function normalizeAmount(raw?: Partial<BudgetUtilizationAmount> | null): BudgetUtilizationAmount {
  const source = raw ?? {};
  const planned = toNumber(source.planned_budget_amount);
  const allocationTranche1 = toNumber(source.allocation_tranche_1_amount);
  const allocationTranche2 = toNumber(source.allocation_tranche_2_amount);
  const allocationTranche3 = toNumber(source.allocation_tranche_3_amount);
  const centralTransferIn = toNumber(source.central_transfer_in_amount);
  const centralTransferOut = toNumber(source.central_transfer_out_amount);
  const departmentRequestIncrease = toNumber(source.department_request_increase_amount);
  const departmentTransferOut = toNumber(source.department_transfer_out_amount);
  const divisionTransferIn = toNumber(source.division_transfer_in_amount);
  const divisionTransferOut = toNumber(source.division_transfer_out_amount);
  const committedTotal = toNumber(source.committed_po_amount) + toNumber(source.committed_without_po_amount);
  const calculatedNetBudgetAfterTransfer = getNetAllocationTotal({
    net_budget_after_transfer_amount: source.net_budget_after_transfer_amount,
    allocation_total_amount: source.allocation_total_amount,
    allocation_tranche_1_amount: allocationTranche1,
    allocation_tranche_2_amount: allocationTranche2,
    allocation_tranche_3_amount: allocationTranche3,
    central_transfer_in_amount: centralTransferIn,
    central_transfer_out_amount: centralTransferOut,
    department_request_increase_amount: departmentRequestIncrease,
    department_transfer_out_amount: departmentTransferOut,
    division_transfer_in_amount: divisionTransferIn,
    division_transfer_out_amount: divisionTransferOut,
  });
  const netBudgetAfterTransfer = calculatedNetBudgetAfterTransfer;
  const disbursedFromParts = toNumber(source.disbursed_general_amount) + toNumber(source.disbursed_advance_amount);
  const disbursedTotal = disbursedFromParts;
  const calculatedUtilizationTotal = committedTotal + disbursedTotal;
  const utilizationTotal = calculatedUtilizationTotal;
  const remaining = netBudgetAfterTransfer - utilizationTotal;
  const disbursementRate = percent(disbursedTotal, netBudgetAfterTransfer);
  const utilizationWithPoRate = percent(utilizationTotal, netBudgetAfterTransfer);

  return {
    ...emptyBudgetAmount,
    ...source,
    planned_budget_amount: planned,
    allocation_tranche_1_amount: allocationTranche1,
    allocation_tranche_2_amount: allocationTranche2,
    allocation_tranche_3_amount: allocationTranche3,
    net_budget_after_transfer_amount: netBudgetAfterTransfer,
    central_transfer_in_amount: centralTransferIn,
    central_transfer_out_amount: centralTransferOut,
    department_request_increase_amount: departmentRequestIncrease,
    department_transfer_out_amount: departmentTransferOut,
    division_transfer_in_amount: divisionTransferIn,
    division_transfer_out_amount: divisionTransferOut,
    committed_po_amount: toNumber(source.committed_po_amount),
    committed_without_po_amount: toNumber(source.committed_without_po_amount),
    committed_total_amount: committedTotal,
    disbursed_general_amount: toNumber(source.disbursed_general_amount),
    disbursed_advance_amount: toNumber(source.disbursed_advance_amount),
    disbursed_total_amount: disbursedTotal,
    utilization_total_amount: utilizationTotal,
    remaining_amount: remaining,
    disbursement_rate: disbursementRate,
    utilization_with_po_rate: utilizationWithPoRate,
  };
}

export function sumBudgetAmounts(amounts: BudgetUtilizationAmount[]) {
  return normalizeAmount(amounts.reduce<BudgetUtilizationAmount>(
    (sum, amount) => ({
      ...sum,
      planned_budget_amount: sum.planned_budget_amount + amount.planned_budget_amount,
      allocation_tranche_1_amount: sum.allocation_tranche_1_amount + amount.allocation_tranche_1_amount,
      allocation_tranche_2_amount: sum.allocation_tranche_2_amount + amount.allocation_tranche_2_amount,
      allocation_tranche_3_amount: sum.allocation_tranche_3_amount + amount.allocation_tranche_3_amount,
      allocation_total_amount: toNumber(sum.allocation_total_amount) + (amount.allocation_total_amount ?? (
        amount.allocation_tranche_1_amount +
        amount.allocation_tranche_2_amount +
        amount.allocation_tranche_3_amount
      )),
      net_budget_after_transfer_amount: sum.net_budget_after_transfer_amount + amount.net_budget_after_transfer_amount,
      central_transfer_in_amount: sum.central_transfer_in_amount + amount.central_transfer_in_amount,
      central_transfer_out_amount: sum.central_transfer_out_amount + amount.central_transfer_out_amount,
      department_request_increase_amount: sum.department_request_increase_amount + amount.department_request_increase_amount,
      department_transfer_out_amount: sum.department_transfer_out_amount + amount.department_transfer_out_amount,
      division_transfer_in_amount: sum.division_transfer_in_amount + amount.division_transfer_in_amount,
      division_transfer_out_amount: sum.division_transfer_out_amount + amount.division_transfer_out_amount,
      committed_po_amount: sum.committed_po_amount + amount.committed_po_amount,
      committed_without_po_amount: sum.committed_without_po_amount + amount.committed_without_po_amount,
      committed_total_amount: sum.committed_total_amount + amount.committed_total_amount,
      disbursed_general_amount: sum.disbursed_general_amount + amount.disbursed_general_amount,
      disbursed_advance_amount: sum.disbursed_advance_amount + amount.disbursed_advance_amount,
      disbursed_total_amount: sum.disbursed_total_amount + amount.disbursed_total_amount,
      utilization_total_amount: sum.utilization_total_amount + amount.utilization_total_amount,
      remaining_amount: sum.remaining_amount + amount.remaining_amount,
    }),
    { ...emptyBudgetAmount },
  ));
}

export const hierarchyAmountFields: Array<keyof BudgetUtilizationAmount> = [
  'planned_budget_amount',
  'allocation_tranche_1_amount',
  'allocation_tranche_2_amount',
  'allocation_tranche_3_amount',
  'allocation_total_amount',
  'net_budget_after_transfer_amount',
  'central_transfer_in_amount',
  'central_transfer_out_amount',
  'department_request_increase_amount',
  'department_transfer_out_amount',
  'division_transfer_in_amount',
  'division_transfer_out_amount',
  'committed_po_amount',
  'committed_without_po_amount',
  'committed_total_amount',
  'disbursed_general_amount',
  'disbursed_advance_amount',
  'disbursed_total_amount',
  'utilization_total_amount',
];

export function buildHierarchyRollupMap(items: BudgetUtilizationItemWithAmount[]): Map<string, BudgetUtilizationAmount> {
  const nonTotalItems = items.filter((item) => item.row_type !== 'total');
  const itemById = new Map(nonTotalItems.map((item) => [item.id, item]));

  const childrenMap = new Map<string, BudgetUtilizationItemWithAmount[]>();
  nonTotalItems.forEach((item) => {
    if (item.parent_id) {
      const list = childrenMap.get(item.parent_id) ?? [];
      list.push(item);
      childrenMap.set(item.parent_id, list);
    }
  });

  const operationsCategory = nonTotalItems.find((item) =>
    item.row_type === 'budget_category' && item.item_name.replace(/\s+/g, '').includes('งบดำเนินงาน')
  );
  if (operationsCategory) {
    const orphanMajorProjects = nonTotalItems.filter((item) =>
      item.row_type === 'major_project' && !item.parent_id
    );
    if (orphanMajorProjects.length > 0) {
      const list = childrenMap.get(operationsCategory.id) ?? [];
      orphanMajorProjects.forEach((proj) => {
        if (!list.some((existing) => existing.id === proj.id)) {
          list.push(proj);
        }
      });
      childrenMap.set(operationsCategory.id, list);
    }
  }

  const getLeafDescendants = (nodeId: string): BudgetUtilizationItemWithAmount[] => {
    const children = childrenMap.get(nodeId) ?? [];
    if (children.length === 0) {
      const node = itemById.get(nodeId);
      return node ? [node] : [];
    }
    const leaves: BudgetUtilizationItemWithAmount[] = [];
    children.forEach((child) => {
      leaves.push(...getLeafDescendants(child.id));
    });
    return leaves;
  };

  const rollupMap = new Map<string, BudgetUtilizationAmount>();

  nonTotalItems.forEach((item) => {
    const children = childrenMap.get(item.id) ?? [];
    if (children.length === 0) {
      rollupMap.set(item.id, normalizeAmount(item.amount));
    } else {
      const leafDescendants = getLeafDescendants(item.id);
      const uniqueLeaves = Array.from(new Map(leafDescendants.map((leaf) => [leaf.id, leaf])).values());
      const summed = sumBudgetAmounts(uniqueLeaves.map((leaf) => leaf.amount));

      const merged: Record<string, any> = {};
      hierarchyAmountFields.forEach((field) => {
        merged[field] = toNumber(summed[field]);
      });

      rollupMap.set(item.id, normalizeAmount(merged as Partial<BudgetUtilizationAmount>));
    }
  });

  return rollupMap;
}

export function summarizeBudgetItems(items: BudgetUtilizationItemWithAmount[]) {
  const nonTotalItems = items.filter((item) => item.row_type !== 'total');
  if (nonTotalItems.length === 0) {
    const totalItem = items.find((item) => item.row_type === 'total');
    return normalizeAmount(totalItem?.amount);
  }

  const rollupMap = buildHierarchyRollupMap(items);
  const categories = nonTotalItems.filter((item) => item.row_type === 'budget_category' && !item.parent_id);

  if (categories.length > 0) {
    const categoryAmounts = categories.map((cat) => rollupMap.get(cat.id) ?? normalizeAmount(cat.amount));
    const orphanRoots = nonTotalItems.filter((item) =>
      !item.parent_id
      && item.row_type !== 'budget_category'
      && item.row_type !== 'major_project'
    );
    const orphanAmounts = orphanRoots.map((item) => rollupMap.get(item.id) ?? normalizeAmount(item.amount));
    return sumBudgetAmounts([...categoryAmounts, ...orphanAmounts]);
  }

  const parentIds = new Set(
    nonTotalItems.map((item) => item.parent_id).filter(Boolean) as string[],
  );
  const leafItems = nonTotalItems.filter((item) => !parentIds.has(item.id));

  if (leafItems.length > 0) {
    return sumBudgetAmounts(leafItems.map((item) => rollupMap.get(item.id) ?? normalizeAmount(item.amount)));
  }

  return sumBudgetAmounts(nonTotalItems.map((item) => rollupMap.get(item.id) ?? normalizeAmount(item.amount)));
}
