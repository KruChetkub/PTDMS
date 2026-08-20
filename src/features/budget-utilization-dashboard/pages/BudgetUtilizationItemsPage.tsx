import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Edit3, Plus, RefreshCw, Save, Search, Settings2, Trash2, X } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { useAuditPageAccess } from '../../../hooks/useAuditPageAccess';
import { useAuthStore } from '../../../stores/auth.store';
import { canManageBudgetUtilization, createBudgetItem, createBudgetReportPeriod, deleteBudgetItem, getBudgetDashboardSummary, updateBudgetItem } from '../services/budgetUtilization.service';
import { formatBudgetAmount, toNumber } from '../utils/budgetUtilizationCalculations';
import type { BudgetUtilizationDashboardSummary, BudgetUtilizationItemInput, BudgetUtilizationItemWithAmount } from '../types/budgetUtilization.types';
import { getSafeUserErrorMessage } from '../../../utils/errorHandling';

type ItemForm = {
  itemId: string | null;
  parentId: string;
  sequenceLabel: string;
  itemName: string;
  outputLabel: string;
  activityLabel: string;
  plannedBudgetAmount: string;
  allocationTranche1Amount: string;
  allocationTranche1Date: string;
  allocationTranche2Amount: string;
  allocationTranche2Date: string;
  allocationTranche3Amount: string;
  allocationTranche3Date: string;
  centralTransferInAmount: string;
  centralTransferOutAmount: string;
  divisionTransferInAmount: string;
  divisionTransferOutAmount: string;
  committedPoAmount: string;
  committedWithoutPoAmount: string;
  committedTotalAmount: string;
  disbursedGeneralAmount: string;
  disbursedAdvanceAmount: string;
  disbursedTotalAmount: string;
  utilizationTotalAmount: string;
  remainingAmount: string;
};

type AllocationTrancheKey = '1' | '2' | '3';

type AllocationForm = {
  itemId: string;
  trancheKey: AllocationTrancheKey;
  amount: string;
  allocationDate: string;
};

type DisbursementForm = {
  itemId: string;
  disbursedGeneralAmount: string;
  disbursedAdvanceAmount: string;
};

type CentralTransferForm = {
  itemId: string;
  centralTransferInAmount: string;
  centralTransferOutAmount: string;
};

type DivisionTransferForm = {
  itemId: string;
  divisionTransferInAmount: string;
  divisionTransferOutAmount: string;
};

type CommitmentForm = {
  itemId: string;
  committedPoAmount: string;
  committedWithoutPoAmount: string;
};

type TrancheDefinition = {
  key: AllocationTrancheKey;
  label: string;
};

type TrancheForm = {
  key: AllocationTrancheKey | null;
  label: string;
};

const emptyMainForm: ItemForm = {
  itemId: null,
  parentId: '',
  sequenceLabel: '',
  itemName: '',
  outputLabel: '',
  activityLabel: '',
  plannedBudgetAmount: '',
  allocationTranche1Amount: '',
  allocationTranche1Date: '',
  allocationTranche2Amount: '',
  allocationTranche2Date: '',
  allocationTranche3Amount: '',
  allocationTranche3Date: '',
  centralTransferInAmount: '',
  centralTransferOutAmount: '',
  divisionTransferInAmount: '',
  divisionTransferOutAmount: '',
  committedPoAmount: '',
  committedWithoutPoAmount: '',
  committedTotalAmount: '',
  disbursedGeneralAmount: '',
  disbursedAdvanceAmount: '',
  disbursedTotalAmount: '',
  utilizationTotalAmount: '',
  remainingAmount: '',
};

const emptyChildForm: ItemForm = {
  ...emptyMainForm,
};

const initialAllocationForm: AllocationForm = {
  itemId: '',
  trancheKey: '1',
  amount: '',
  allocationDate: '',
};

const initialDisbursementForm: DisbursementForm = {
  itemId: '',
  disbursedGeneralAmount: '',
  disbursedAdvanceAmount: '',
};

const initialCentralTransferForm: CentralTransferForm = {
  itemId: '',
  centralTransferInAmount: '',
  centralTransferOutAmount: '',
};

const initialDivisionTransferForm: DivisionTransferForm = {
  itemId: '',
  divisionTransferInAmount: '',
  divisionTransferOutAmount: '',
};

const initialCommitmentForm: CommitmentForm = {
  itemId: '',
  committedPoAmount: '',
  committedWithoutPoAmount: '',
};

const initialTrancheDefinitions: TrancheDefinition[] = [
  { key: '1', label: 'จัดสรรงวด 1' },
  { key: '2', label: 'จัดสรรงวด 2' },
  { key: '3', label: 'จัดสรรงวด 3' },
];

const emptyTrancheForm: TrancheForm = {
  key: null,
  label: '',
};

const allocationTrancheKeys: AllocationTrancheKey[] = ['1', '2', '3'];

function formFromItem(item: BudgetUtilizationItemWithAmount): ItemForm {
  return {
    itemId: item.id,
    parentId: item.parent_id ?? '',
    sequenceLabel: item.sequence_label ?? '',
    itemName: item.item_name,
    outputLabel: item.output_label ?? '',
    activityLabel: item.activity_label ?? '',
    plannedBudgetAmount: String(item.amount.planned_budget_amount || ''),
    allocationTranche1Amount: String(item.amount.allocation_tranche_1_amount || ''),
    allocationTranche1Date: item.amount.allocation_tranche_1_date ?? '',
    allocationTranche2Amount: String(item.amount.allocation_tranche_2_amount || ''),
    allocationTranche2Date: item.amount.allocation_tranche_2_date ?? '',
    allocationTranche3Amount: String(item.amount.allocation_tranche_3_amount || ''),
    allocationTranche3Date: item.amount.allocation_tranche_3_date ?? '',
    centralTransferInAmount: String(item.amount.central_transfer_in_amount || ''),
    centralTransferOutAmount: String(item.amount.central_transfer_out_amount || ''),
    divisionTransferInAmount: String(item.amount.division_transfer_in_amount || ''),
    divisionTransferOutAmount: String(item.amount.division_transfer_out_amount || ''),
    committedPoAmount: String(item.amount.committed_po_amount || ''),
    committedWithoutPoAmount: String(item.amount.committed_without_po_amount || ''),
    committedTotalAmount: String(item.amount.committed_total_amount || ''),
    disbursedGeneralAmount: String(item.amount.disbursed_general_amount || ''),
    disbursedAdvanceAmount: String(item.amount.disbursed_advance_amount || ''),
    disbursedTotalAmount: String(item.amount.disbursed_total_amount || ''),
    utilizationTotalAmount: String(item.amount.utilization_total_amount || ''),
    remainingAmount: String(item.amount.remaining_amount || ''),
  };
}

function toItemPayload(reportPeriodId: string, form: ItemForm, parentId: string | null, sequenceLabel: string): BudgetUtilizationItemInput {
  return {
    reportPeriodId,
    itemId: form.itemId ?? undefined,
    parentId,
    rowType: parentId ? 'line_item' : 'budget_category',
    sequenceLabel,
    itemName: form.itemName,
    outputLabel: form.outputLabel,
    activityLabel: form.activityLabel,
    plannedBudgetAmount: toNumber(form.plannedBudgetAmount),
    allocationTranche1Amount: toNumber(form.allocationTranche1Amount),
    allocationTranche1Date: form.allocationTranche1Date || null,
    allocationTranche2Amount: toNumber(form.allocationTranche2Amount),
    allocationTranche2Date: form.allocationTranche2Date || null,
    allocationTranche3Amount: toNumber(form.allocationTranche3Amount),
    allocationTranche3Date: form.allocationTranche3Date || null,
    centralTransferInAmount: toNumber(form.centralTransferInAmount),
    centralTransferOutAmount: toNumber(form.centralTransferOutAmount),
    divisionTransferInAmount: toNumber(form.divisionTransferInAmount),
    divisionTransferOutAmount: toNumber(form.divisionTransferOutAmount),
    committedPoAmount: toNumber(form.committedPoAmount),
    committedWithoutPoAmount: toNumber(form.committedWithoutPoAmount),
    committedTotalAmount: toNumber(form.committedTotalAmount),
    disbursedGeneralAmount: toNumber(form.disbursedGeneralAmount),
    disbursedAdvanceAmount: toNumber(form.disbursedAdvanceAmount),
    disbursedTotalAmount: toNumber(form.disbursedTotalAmount),
    utilizationTotalAmount: toNumber(form.utilizationTotalAmount),
    remainingAmount: toNumber(form.remainingAmount),
  };
}

function getCurrentThaiFiscalYear() {
  return new Date().getFullYear() + 543;
}

export function BudgetUtilizationItemsPage() {
  useAuditPageAccess({ module: 'budget_utilization', action: 'budget_items_access', route: '/budget-utilization/items' });
  const role = useAuthStore((state) => state.profile?.role);
  const canManage = canManageBudgetUtilization(role);
  const [reportPeriodId, setReportPeriodId] = useState('');
  const [summary, setSummary] = useState<BudgetUtilizationDashboardSummary | null>(null);
  const [keyword, setKeyword] = useState('');
  const [mainForm, setMainForm] = useState<ItemForm>(emptyMainForm);
  const [childForm, setChildForm] = useState<ItemForm>(emptyChildForm);
  const [allocationForm, setAllocationForm] = useState<AllocationForm>(initialAllocationForm);
  const [disbursementForm, setDisbursementForm] = useState<DisbursementForm>(initialDisbursementForm);
  const [centralTransferForm, setCentralTransferForm] = useState<CentralTransferForm>(initialCentralTransferForm);
  const [divisionTransferForm, setDivisionTransferForm] = useState<DivisionTransferForm>(initialDivisionTransferForm);
  const [commitmentForm, setCommitmentForm] = useState<CommitmentForm>(initialCommitmentForm);
  const [trancheDefinitions, setTrancheDefinitions] = useState<TrancheDefinition[]>(initialTrancheDefinitions);
  const [trancheDrafts, setTrancheDrafts] = useState<TrancheDefinition[]>(initialTrancheDefinitions);
  const [trancheForm, setTrancheForm] = useState<TrancheForm>(emptyTrancheForm);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isTrancheManagerOpen, setIsTrancheManagerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BudgetUtilizationItemWithAmount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (nextReportPeriodId = reportPeriodId) => {
    try {
      setLoading(true);
      setError(null);
      const dashboardSummary = await getBudgetDashboardSummary(nextReportPeriodId || null);
      setSummary(dashboardSummary);
      setReportPeriodId(dashboardSummary.reportPeriod?.id ?? '');
    } catch (loadError) {
      setError(getSafeUserErrorMessage(loadError, 'ไม่สามารถโหลดรายการงบประมาณได้'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData('');
  }, []);

  const ensureReportPeriodId = async () => {
    if (reportPeriodId) return reportPeriodId;

    const createdPeriod = await createBudgetReportPeriod({
      fiscalYear: getCurrentThaiFiscalYear(),
      reportAsOf: new Date().toISOString(),
      title: 'ชุดข้อมูลงบประมาณปัจจุบัน',
      departmentName: 'กองยุทธศาสตร์และแผนงาน',
      isActive: true,
    });

    setReportPeriodId(createdPeriod.id);
    return createdPeriod.id;
  };

  const allBudgetItems = useMemo(() => summary?.items ?? [], [summary]);

  const hierarchyItems = useMemo(() => {
    const compareItems = (a: BudgetUtilizationItemWithAmount, b: BudgetUtilizationItemWithAmount) => {
      const sequenceCompare = (a.sequence_label ?? '').localeCompare(b.sequence_label ?? '', 'th', { numeric: true });
      if (sequenceCompare !== 0) return sequenceCompare;
      return a.sort_order - b.sort_order;
    };

    const childrenByParent = new Map<string, BudgetUtilizationItemWithAmount[]>();
    allBudgetItems.forEach((item) => {
      if (!item.parent_id) return;
      const children = childrenByParent.get(item.parent_id) ?? [];
      children.push(item);
      childrenByParent.set(item.parent_id, children);
    });

    const orderedItems: BudgetUtilizationItemWithAmount[] = [];
    const orderedIds = new Set<string>();
    const categories = allBudgetItems
      .filter((item) => item.parent_id === null && item.row_type === 'budget_category')
      .sort(compareItems);

    categories.forEach((category) => {
      orderedItems.push(category);
      orderedIds.add(category.id);

      (childrenByParent.get(category.id) ?? []).sort(compareItems).forEach((child) => {
        orderedItems.push(child);
        orderedIds.add(child.id);
      });
    });

    const orphanItems = allBudgetItems
      .filter((item) => item.row_type !== 'total' && !orderedIds.has(item.id))
      .sort(compareItems);

    return [...orderedItems, ...orphanItems];
  }, [allBudgetItems]);

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return hierarchyItems;

    const matchesKeyword = (item: BudgetUtilizationItemWithAmount) => `${item.sequence_label ?? ''} ${item.item_name} ${item.output_label ?? ''} ${item.activity_label ?? ''}`.toLowerCase().includes(normalizedKeyword);
    const itemById = new Map(allBudgetItems.map((item) => [item.id, item]));
    const matchingParentIds = new Set(
      allBudgetItems
        .filter((item) => item.parent_id && matchesKeyword(item))
        .map((item) => item.parent_id as string),
    );

    return hierarchyItems.filter((item) => {
      if (item.parent_id === null) {
        return matchesKeyword(item) || matchingParentIds.has(item.id);
      }

      const parent = itemById.get(item.parent_id);
      return matchesKeyword(item) || (parent ? matchesKeyword(parent) : false);
    });
  }, [allBudgetItems, hierarchyItems, keyword]);

  const mainBudgetItems = useMemo(() => {
    return allBudgetItems.filter((item) => item.parent_id === null && item.row_type === 'budget_category');
  }, [allBudgetItems]);

  const selectedParent = useMemo(() => {
    return mainBudgetItems.find((item) => item.id === childForm.parentId) ?? null;
  }, [childForm.parentId, mainBudgetItems]);

  const selectedParentChildTotal = useMemo(() => {
    if (!selectedParent || !summary) return 0;

    return summary.items
      .filter((item) => item.parent_id === selectedParent.id && item.id !== childForm.itemId)
      .reduce((sum, item) => sum + item.amount.planned_budget_amount, 0);
  }, [childForm.itemId, selectedParent, summary]);

  const budgetLineItems = useMemo(() => {
    return hierarchyItems.filter((item) => item.parent_id !== null);
  }, [hierarchyItems]);

  const selectedAllocationItem = useMemo(() => {
    return budgetLineItems.find((item) => item.id === allocationForm.itemId) ?? null;
  }, [allocationForm.itemId, budgetLineItems]);

  const selectedDisbursementItem = useMemo(() => {
    return budgetLineItems.find((item) => item.id === disbursementForm.itemId) ?? null;
  }, [budgetLineItems, disbursementForm.itemId]);

  const selectedCentralTransferItem = useMemo(() => {
    return budgetLineItems.find((item) => item.id === centralTransferForm.itemId) ?? null;
  }, [budgetLineItems, centralTransferForm.itemId]);

  const selectedDivisionTransferItem = useMemo(() => {
    return budgetLineItems.find((item) => item.id === divisionTransferForm.itemId) ?? null;
  }, [budgetLineItems, divisionTransferForm.itemId]);

  const selectedCommitmentItem = useMemo(() => {
    return budgetLineItems.find((item) => item.id === commitmentForm.itemId) ?? null;
  }, [budgetLineItems, commitmentForm.itemId]);

  const getMainSequenceLabel = (itemId: string | null) => {
    const existingIndex = itemId ? mainBudgetItems.findIndex((item) => item.id === itemId) : -1;
    return String(existingIndex >= 0 ? existingIndex + 1 : mainBudgetItems.length + 1);
  };

  const getChildSequenceLabel = (parent: BudgetUtilizationItemWithAmount, itemId: string | null) => {
    const siblings = (summary?.items ?? []).filter((item) => item.parent_id === parent.id);
    const existingIndex = itemId ? siblings.findIndex((item) => item.id === itemId) : -1;
    const childIndex = existingIndex >= 0 ? existingIndex + 1 : siblings.length + 1;
    const parentSequence = parent.sequence_label || getMainSequenceLabel(parent.id);
    return `${parentSequence}.${childIndex}`;
  };

  const getCategoryChildCount = (categoryId: string) => {
    return (summary?.items ?? []).filter((item) => item.parent_id === categoryId).length;
  };

  const getTrancheUsageCount = (trancheKey: AllocationTrancheKey) => {
    return budgetLineItems.filter((item) => {
      if (trancheKey === '1') {
        return item.amount.allocation_tranche_1_amount > 0 || Boolean(item.amount.allocation_tranche_1_date);
      }
      if (trancheKey === '2') {
        return item.amount.allocation_tranche_2_amount > 0 || Boolean(item.amount.allocation_tranche_2_date);
      }
      return item.amount.allocation_tranche_3_amount > 0 || Boolean(item.amount.allocation_tranche_3_date);
    }).length;
  };

  const getNextAvailableTrancheKey = () => {
    return allocationTrancheKeys.find((key) => !trancheDrafts.some((tranche) => tranche.key === key)) ?? null;
  };

  const saveTrancheDraft = () => {
    const label = trancheForm.label.trim();
    if (!label) {
      setError('กรุณากรอกชื่องวดจัดสรร');
      return;
    }

    setError(null);
    if (trancheForm.key) {
      setTrancheDrafts((current) => current.map((tranche) => (
        tranche.key === trancheForm.key ? { ...tranche, label } : tranche
      )));
      setTrancheForm(emptyTrancheForm);
      return;
    }

    const nextKey = getNextAvailableTrancheKey();
    if (!nextKey) {
      setError('เพิ่มงวดจัดสรรได้สูงสุด 3 งวดตามโครงสร้างข้อมูลปัจจุบัน');
      return;
    }

    setTrancheDrafts((current) => [...current, { key: nextKey, label }].sort((a, b) => Number(a.key) - Number(b.key)));
    setTrancheForm(emptyTrancheForm);
  };

  const deleteTrancheDraft = (trancheKey: AllocationTrancheKey) => {
    if (trancheDrafts.length <= 1) {
      setError('ต้องมีงวดจัดสรรอย่างน้อย 1 งวด');
      return;
    }

    if (getTrancheUsageCount(trancheKey) > 0) {
      setError('ลบงวดจัดสรรไม่ได้ เนื่องจากมีรายการงบประมาณใช้งานงวดนี้อยู่');
      return;
    }

    setError(null);
    setTrancheDrafts((current) => current.filter((tranche) => tranche.key !== trancheKey));
    if (trancheForm.key === trancheKey) {
      setTrancheForm(emptyTrancheForm);
    }
  };

  const saveTrancheDefinitions = () => {
    const nextDefinitions = trancheDrafts.map((tranche) => ({
      ...tranche,
      label: tranche.label.trim() || `จัดสรรงวด ${tranche.key}`,
    }));

    setTrancheDefinitions(nextDefinitions);
    if (!nextDefinitions.some((tranche) => tranche.key === allocationForm.trancheKey)) {
      const nextKey = nextDefinitions[0]?.key ?? '1';
      setAllocationForm((current) => ({ ...current, trancheKey: nextKey }));
      applySelectedAllocationItemValue(selectedAllocationItem, nextKey);
    }
    setTrancheForm(emptyTrancheForm);
    setIsTrancheManagerOpen(false);
  };

  const startEdit = (item: BudgetUtilizationItemWithAmount) => {
    if (item.parent_id) {
      setChildForm(formFromItem(item));
      setAllocationForm((current) => ({ ...current, itemId: item.id }));
      setDisbursementForm({
        itemId: item.id,
        disbursedGeneralAmount: String(item.amount.disbursed_general_amount || ''),
        disbursedAdvanceAmount: String(item.amount.disbursed_advance_amount || ''),
      });
      setCentralTransferForm({
        itemId: item.id,
        centralTransferInAmount: String(item.amount.central_transfer_in_amount || ''),
        centralTransferOutAmount: String(item.amount.central_transfer_out_amount || ''),
      });
      setDivisionTransferForm({
        itemId: item.id,
        divisionTransferInAmount: String(item.amount.division_transfer_in_amount || ''),
        divisionTransferOutAmount: String(item.amount.division_transfer_out_amount || ''),
      });
      setCommitmentForm({
        itemId: item.id,
        committedPoAmount: String(item.amount.committed_po_amount || ''),
        committedWithoutPoAmount: String(item.amount.committed_without_po_amount || ''),
      });
      setMainForm(emptyMainForm);
      return;
    }

    setMainForm(formFromItem(item));
    setChildForm(emptyChildForm);
    setIsCategoryManagerOpen(true);
  };

  const applySelectedAllocationItemValue = (item: BudgetUtilizationItemWithAmount | null, trancheKey: AllocationTrancheKey) => {
    if (!item) {
      setAllocationForm((current) => ({ ...current, amount: '', allocationDate: '' }));
      return;
    }

    const amountByTranche = {
      '1': item.amount.allocation_tranche_1_amount,
      '2': item.amount.allocation_tranche_2_amount,
      '3': item.amount.allocation_tranche_3_amount,
    };
    const dateByTranche = {
      '1': item.amount.allocation_tranche_1_date ?? '',
      '2': item.amount.allocation_tranche_2_date ?? '',
      '3': item.amount.allocation_tranche_3_date ?? '',
    };

    setAllocationForm((current) => ({
      ...current,
      amount: String(amountByTranche[trancheKey] || ''),
      allocationDate: dateByTranche[trancheKey],
    }));
  };

  const applySelectedDisbursementItemValue = (item: BudgetUtilizationItemWithAmount | null) => {
    setDisbursementForm((current) => ({
      ...current,
      disbursedGeneralAmount: item ? String(item.amount.disbursed_general_amount || '') : '',
      disbursedAdvanceAmount: item ? String(item.amount.disbursed_advance_amount || '') : '',
    }));
  };

  const applySelectedCentralTransferItemValue = (item: BudgetUtilizationItemWithAmount | null) => {
    setCentralTransferForm((current) => ({
      ...current,
      centralTransferInAmount: item ? String(item.amount.central_transfer_in_amount || '') : '',
      centralTransferOutAmount: item ? String(item.amount.central_transfer_out_amount || '') : '',
    }));
  };

  const applySelectedDivisionTransferItemValue = (item: BudgetUtilizationItemWithAmount | null) => {
    setDivisionTransferForm((current) => ({
      ...current,
      divisionTransferInAmount: item ? String(item.amount.division_transfer_in_amount || '') : '',
      divisionTransferOutAmount: item ? String(item.amount.division_transfer_out_amount || '') : '',
    }));
  };

  const applySelectedCommitmentItemValue = (item: BudgetUtilizationItemWithAmount | null) => {
    setCommitmentForm((current) => ({
      ...current,
      committedPoAmount: item ? String(item.amount.committed_po_amount || '') : '',
      committedWithoutPoAmount: item ? String(item.amount.committed_without_po_amount || '') : '',
    }));
  };

  const saveAllocationForm = async () => {
    if (!selectedAllocationItem) {
      setError('กรุณาเลือกรายการงบประมาณก่อนบันทึกจัดสรรงวด');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const nextForm = formFromItem(selectedAllocationItem);

      if (allocationForm.trancheKey === '1') {
        nextForm.allocationTranche1Amount = allocationForm.amount;
        nextForm.allocationTranche1Date = allocationForm.allocationDate;
      } else if (allocationForm.trancheKey === '2') {
        nextForm.allocationTranche2Amount = allocationForm.amount;
        nextForm.allocationTranche2Date = allocationForm.allocationDate;
      } else {
        nextForm.allocationTranche3Amount = allocationForm.amount;
        nextForm.allocationTranche3Date = allocationForm.allocationDate;
      }

      await updateBudgetItem(toItemPayload(activeReportPeriodId, nextForm, selectedAllocationItem.parent_id, selectedAllocationItem.sequence_label ?? ''));
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกจัดสรรงวดได้'));
    } finally {
      setSaving(false);
    }
  };

  const saveDisbursementForm = async () => {
    if (!selectedDisbursementItem) {
      setError('กรุณาเลือกรายการงบประมาณก่อนบันทึกเบิก-จ่าย');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const nextForm = formFromItem(selectedDisbursementItem);
      const disbursedGeneral = toNumber(disbursementForm.disbursedGeneralAmount);
      const disbursedAdvance = toNumber(disbursementForm.disbursedAdvanceAmount);
      const disbursedTotal = disbursedGeneral + disbursedAdvance;
      const committedTotal = toNumber(nextForm.committedTotalAmount);
      const utilizationTotal = committedTotal + disbursedTotal;
      const effectiveBudget = toNumber(nextForm.plannedBudgetAmount) + toNumber(nextForm.centralTransferInAmount) - toNumber(nextForm.centralTransferOutAmount);
      const remainingAmount = Math.max(0, effectiveBudget - utilizationTotal);

      nextForm.disbursedGeneralAmount = disbursementForm.disbursedGeneralAmount;
      nextForm.disbursedAdvanceAmount = disbursementForm.disbursedAdvanceAmount;
      nextForm.disbursedTotalAmount = String(disbursedTotal || '');
      nextForm.utilizationTotalAmount = String(utilizationTotal || '');
      nextForm.remainingAmount = String(remainingAmount || '');

      await updateBudgetItem(toItemPayload(activeReportPeriodId, nextForm, selectedDisbursementItem.parent_id, selectedDisbursementItem.sequence_label ?? ''));
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกเบิก-จ่ายได้'));
    } finally {
      setSaving(false);
    }
  };

  const saveCentralTransferForm = async () => {
    if (!selectedCentralTransferItem) {
      setError('กรุณาเลือกรายการงบประมาณก่อนบันทึกส่วนกลางกรมฯ');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const nextForm = formFromItem(selectedCentralTransferItem);
      const centralTransferIn = toNumber(centralTransferForm.centralTransferInAmount);
      const centralTransferOut = toNumber(centralTransferForm.centralTransferOutAmount);
      const effectiveBudget = toNumber(nextForm.plannedBudgetAmount) + centralTransferIn - centralTransferOut;
      const utilizationTotal = toNumber(nextForm.committedTotalAmount) + toNumber(nextForm.disbursedTotalAmount);
      const remainingAmount = Math.max(0, effectiveBudget - utilizationTotal);

      nextForm.centralTransferInAmount = centralTransferForm.centralTransferInAmount;
      nextForm.centralTransferOutAmount = centralTransferForm.centralTransferOutAmount;
      nextForm.utilizationTotalAmount = String(utilizationTotal || '');
      nextForm.remainingAmount = String(remainingAmount || '');

      await updateBudgetItem(toItemPayload(activeReportPeriodId, nextForm, selectedCentralTransferItem.parent_id, selectedCentralTransferItem.sequence_label ?? ''));
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกส่วนกลางกรมฯ ได้'));
    } finally {
      setSaving(false);
    }
  };

  const saveDivisionTransferForm = async () => {
    if (!selectedDivisionTransferItem) {
      setError('กรุณาเลือกรายการงบประมาณก่อนบันทึกภายในกอง');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const nextForm = formFromItem(selectedDivisionTransferItem);

      nextForm.divisionTransferInAmount = divisionTransferForm.divisionTransferInAmount;
      nextForm.divisionTransferOutAmount = divisionTransferForm.divisionTransferOutAmount;

      await updateBudgetItem(toItemPayload(activeReportPeriodId, nextForm, selectedDivisionTransferItem.parent_id, selectedDivisionTransferItem.sequence_label ?? ''));
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกภายในกองได้'));
    } finally {
      setSaving(false);
    }
  };

  const saveCommitmentForm = async () => {
    if (!selectedCommitmentItem) {
      setError('กรุณาเลือกรายการงบประมาณก่อนบันทึกผูกพัน');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const nextForm = formFromItem(selectedCommitmentItem);
      const committedPo = toNumber(commitmentForm.committedPoAmount);
      const committedWithoutPo = toNumber(commitmentForm.committedWithoutPoAmount);
      const committedTotal = committedPo + committedWithoutPo;
      const disbursedTotal = toNumber(nextForm.disbursedTotalAmount);
      const utilizationTotal = committedTotal + disbursedTotal;
      const effectiveBudget = toNumber(nextForm.plannedBudgetAmount) + toNumber(nextForm.centralTransferInAmount) - toNumber(nextForm.centralTransferOutAmount);
      const remainingAmount = Math.max(0, effectiveBudget - utilizationTotal);

      nextForm.committedPoAmount = commitmentForm.committedPoAmount;
      nextForm.committedWithoutPoAmount = commitmentForm.committedWithoutPoAmount;
      nextForm.committedTotalAmount = String(committedTotal || '');
      nextForm.utilizationTotalAmount = String(utilizationTotal || '');
      nextForm.remainingAmount = String(remainingAmount || '');

      await updateBudgetItem(toItemPayload(activeReportPeriodId, nextForm, selectedCommitmentItem.parent_id, selectedCommitmentItem.sequence_label ?? ''));
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกผูกพันได้'));
    } finally {
      setSaving(false);
    }
  };

  const saveMainForm = async () => {
    try {
      setSaving(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const payload = toItemPayload(
        activeReportPeriodId,
        { ...mainForm, plannedBudgetAmount: '', outputLabel: '', activityLabel: '' },
        null,
        getMainSequenceLabel(mainForm.itemId),
      );

      if (mainForm.itemId) {
        await updateBudgetItem(payload);
      } else {
        await createBudgetItem(payload);
      }

      setMainForm(emptyMainForm);
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกประเภทหลักได้'));
    } finally {
      setSaving(false);
    }
  };

  const saveChildForm = async () => {
    if (!childForm.parentId) {
      setError('กรุณาเลือกประเภทหลักก่อนสร้างรายการงบประมาณ');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const activeReportPeriodId = await ensureReportPeriodId();
      const parentItem = mainBudgetItems.find((item) => item.id === childForm.parentId);
      if (!parentItem) {
        setError('ไม่พบประเภทหลักที่เลือก');
        return;
      }

      const payload = toItemPayload(activeReportPeriodId, childForm, childForm.parentId, getChildSequenceLabel(parentItem, childForm.itemId));

      if (childForm.itemId) {
        await updateBudgetItem(payload);
      } else {
        await createBudgetItem(payload);
      }

      setChildForm(emptyChildForm);
      await loadData(activeReportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกรายการงบประมาณได้'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.parent_id === null && getCategoryChildCount(deleteTarget.id) > 0) {
      setError('ลบประเภทหลักไม่ได้ เนื่องจากยังมีรายการงบประมาณอยู่ภายใต้ประเภทนี้');
      setDeleteTarget(null);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await deleteBudgetItem(deleteTarget.id);
      setDeleteTarget(null);
      await loadData(reportPeriodId);
    } catch (deleteError) {
      setError(getSafeUserErrorMessage(deleteError, 'ไม่สามารถลบรายการงบประมาณได้'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="รายการงบประมาณ" />
        <button
          type="button"
          onClick={() => void loadData(reportPeriodId)}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          โหลดใหม่
        </button>
      </div>

      {error ? (
        <div className="mb-5 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      ) : null}

      {canManage ? (
        <div className="mb-5">
          <section className="rounded-md border border-sky-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">{childForm.itemId ? 'แก้ไขรายการงบประมาณ' : 'เพิ่มรายการงบประมาณ'}</h2>
                <p className="mt-1 text-xs text-slate-500">เลือกว่าอยู่ใต้ประเภทหลักใด แล้วกรอกข้อมูลวงเงินและผลการใช้จ่าย</p>
              </div>
              {childForm.itemId ? (
                <button
                  type="button"
                  onClick={() => setChildForm(emptyChildForm)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  ยกเลิก
                </button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <span className="text-xs font-semibold text-slate-600">ประเภทหลัก</span>
                <div className="mt-1 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <select
                    value={childForm.parentId}
                    onChange={(event) => setChildForm((current) => ({ ...current, parentId: event.target.value }))}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="">เลือกประเภทหลักก่อน</option>
                    {mainBudgetItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sequence_label ? `${item.sequence_label} ` : ''}
                        {item.item_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setMainForm(emptyMainForm);
                      setIsCategoryManagerOpen(true);
                    }}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Settings2 className="h-4 w-4" aria-hidden="true" />
                    จัดการประเภทหลัก
                  </button>
                </div>
              </div>
              {selectedParent ? (
                <div className="rounded-md border border-sky-100 bg-sky-50/70 px-3 py-2 text-xs text-sky-900 sm:col-span-2">
                  <div className="font-semibold">ประเภทหลัก: {selectedParent.item_name}</div>
                  <div className="mt-1 grid gap-1 sm:grid-cols-2">
                    <span>รวมวงเงินรายการในประเภทนี้: {formatBudgetAmount(selectedParentChildTotal)} บาท</span>
                    <span>จำนวนรายการ: {(summary?.items ?? []).filter((item) => item.parent_id === selectedParent.id).length}</span>
                  </div>
                </div>
              ) : null}
              <input value={childForm.outputLabel} onChange={(event) => setChildForm((current) => ({ ...current, outputLabel: event.target.value }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" placeholder="ผลผลิตที่" />
              <input value={childForm.activityLabel} onChange={(event) => setChildForm((current) => ({ ...current, activityLabel: event.target.value }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" placeholder="กิจกรรมหลักที่" />
              <input value={childForm.itemName} onChange={(event) => setChildForm((current) => ({ ...current, itemName: event.target.value }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:col-span-2" placeholder="ชื่อรายการ เช่น ค่าตอบแทนพนักงานราชการ" />
              <input value={childForm.plannedBudgetAmount} onChange={(event) => setChildForm((current) => ({ ...current, plannedBudgetAmount: event.target.value }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" placeholder="วงเงินงบประมาณ" />
            </div>
            <button
              type="button"
              onClick={() => void saveChildForm()}
              disabled={saving || !childForm.parentId || !childForm.itemName.trim()}
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {childForm.itemId ? <Save className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              {saving ? 'กำลังบันทึก...' : childForm.itemId ? 'บันทึกรายการงบประมาณ' : 'เพิ่มรายการงบประมาณ'}
            </button>
          </section>

          <section className="mt-4 rounded-md border border-amber-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">จัดสรรงวด</h2>
                <p className="mt-1 text-xs text-slate-500">บันทึกยอดจัดสรรแยกเป็นงวด พร้อมวันที่กำกับของแต่ละรายการงบประมาณ</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTrancheDrafts(trancheDefinitions);
                  setTrancheForm(emptyTrancheForm);
                  setIsTrancheManagerOpen(true);
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Settings2 className="h-4 w-4" aria-hidden="true" />
                จัดการงวด
              </button>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] lg:items-end">
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">รายการงบประมาณ</span>
                <select
                  value={allocationForm.itemId}
                  onChange={(event) => {
                    const nextItem = budgetLineItems.find((item) => item.id === event.target.value) ?? null;
                    setAllocationForm((current) => ({ ...current, itemId: event.target.value }));
                    applySelectedAllocationItemValue(nextItem, allocationForm.trancheKey);
                  }}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                >
                  <option value="">เลือกรายการงบประมาณ</option>
                  {budgetLineItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sequence_label ? `${item.sequence_label} ` : ''}
                      {item.item_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">งวด</span>
                <select
                  value={allocationForm.trancheKey}
                  onChange={(event) => {
                    const nextKey = event.target.value as AllocationTrancheKey;
                    setAllocationForm((current) => ({ ...current, trancheKey: nextKey }));
                    applySelectedAllocationItemValue(selectedAllocationItem, nextKey);
                  }}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                >
                  {trancheDefinitions.map((tranche) => (
                    <option key={tranche.key} value={tranche.key}>{tranche.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">วันที่จัดสรร</span>
                <input
                  type="date"
                  value={allocationForm.allocationDate}
                  onChange={(event) => setAllocationForm((current) => ({ ...current, allocationDate: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">จำนวนเงิน</span>
                <input
                  value={allocationForm.amount}
                  onChange={(event) => setAllocationForm((current) => ({ ...current, amount: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  placeholder="ยอดจัดสรร"
                />
              </label>
              <button
                type="button"
                onClick={() => void saveAllocationForm()}
                disabled={saving || !allocationForm.itemId}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                บันทึกงวด
              </button>
            </div>
          </section>

          <section className="mt-4 rounded-md border border-cyan-100 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-base font-semibold text-slate-950">ส่วนกลางกรมฯ</h2>
              <p className="mt-1 text-xs text-slate-500">บันทึกยอดรับโอนและโอนออกจากส่วนกลางกรมฯ สำหรับคำนวณงบสุทธิและคงเหลือ</p>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] lg:items-end">
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">รายการงบประมาณ</span>
                <select
                  value={centralTransferForm.itemId}
                  onChange={(event) => {
                    const nextItem = budgetLineItems.find((item) => item.id === event.target.value) ?? null;
                    setCentralTransferForm((current) => ({ ...current, itemId: event.target.value }));
                    applySelectedCentralTransferItemValue(nextItem);
                  }}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                >
                  <option value="">เลือกรายการงบประมาณ</option>
                  {budgetLineItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sequence_label ? `${item.sequence_label} ` : ''}
                      {item.item_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">รับโอน</span>
                <input
                  value={centralTransferForm.centralTransferInAmount}
                  onChange={(event) => setCentralTransferForm((current) => ({ ...current, centralTransferInAmount: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  placeholder="ยอดรับโอน"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">โอนออก</span>
                <input
                  value={centralTransferForm.centralTransferOutAmount}
                  onChange={(event) => setCentralTransferForm((current) => ({ ...current, centralTransferOutAmount: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  placeholder="ยอดโอนออก"
                />
              </label>
              <button
                type="button"
                onClick={() => void saveCentralTransferForm()}
                disabled={saving || !centralTransferForm.itemId}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                บันทึกส่วนกลาง
              </button>
            </div>
          </section>

          <section className="mt-4 rounded-md border border-orange-100 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-base font-semibold text-slate-950">ภายในกอง</h2>
              <p className="mt-1 text-xs text-slate-500">บันทึกยอดรับโอนและโอนออกภายในกอง สำหรับแสดงในรายการงบประมาณทั้งหมด</p>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] lg:items-end">
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">รายการงบประมาณ</span>
                <select
                  value={divisionTransferForm.itemId}
                  onChange={(event) => {
                    const nextItem = budgetLineItems.find((item) => item.id === event.target.value) ?? null;
                    setDivisionTransferForm((current) => ({ ...current, itemId: event.target.value }));
                    applySelectedDivisionTransferItemValue(nextItem);
                  }}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="">เลือกรายการงบประมาณ</option>
                  {budgetLineItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sequence_label ? `${item.sequence_label} ` : ''}
                      {item.item_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">รับโอน</span>
                <input
                  value={divisionTransferForm.divisionTransferInAmount}
                  onChange={(event) => setDivisionTransferForm((current) => ({ ...current, divisionTransferInAmount: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  placeholder="ยอดรับโอน"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">โอนออก</span>
                <input
                  value={divisionTransferForm.divisionTransferOutAmount}
                  onChange={(event) => setDivisionTransferForm((current) => ({ ...current, divisionTransferOutAmount: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  placeholder="ยอดโอนออก"
                />
              </label>
              <button
                type="button"
                onClick={() => void saveDivisionTransferForm()}
                disabled={saving || !divisionTransferForm.itemId}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-orange-600 px-4 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                บันทึกภายในกอง
              </button>
            </div>
          </section>

          <section className="mt-4 rounded-md border border-purple-100 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-base font-semibold text-slate-950">ผูกพัน</h2>
              <p className="mt-1 text-xs text-slate-500">บันทึกยอดผูกพันแบบมี PO และไม่มี PO ระบบจะรวมยอดไปแสดงในช่องผูกพันรวม</p>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] lg:items-end">
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">รายการงบประมาณ</span>
                <select
                  value={commitmentForm.itemId}
                  onChange={(event) => {
                    const nextItem = budgetLineItems.find((item) => item.id === event.target.value) ?? null;
                    setCommitmentForm((current) => ({ ...current, itemId: event.target.value }));
                    applySelectedCommitmentItemValue(nextItem);
                  }}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                >
                  <option value="">เลือกรายการงบประมาณ</option>
                  {budgetLineItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sequence_label ? `${item.sequence_label} ` : ''}
                      {item.item_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">มี PO</span>
                <input
                  value={commitmentForm.committedPoAmount}
                  onChange={(event) => setCommitmentForm((current) => ({ ...current, committedPoAmount: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  placeholder="ยอดมี PO"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">ไม่มี PO</span>
                <input
                  value={commitmentForm.committedWithoutPoAmount}
                  onChange={(event) => setCommitmentForm((current) => ({ ...current, committedWithoutPoAmount: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  placeholder="ยอดไม่มี PO"
                />
              </label>
              <button
                type="button"
                onClick={() => void saveCommitmentForm()}
                disabled={saving || !commitmentForm.itemId}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-purple-700 px-4 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                บันทึกผูกพัน
              </button>
            </div>
          </section>

          <section className="mt-4 rounded-md border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-base font-semibold text-slate-950">เบิก-จ่าย</h2>
              <p className="mt-1 text-xs text-slate-500">บันทึกยอดเบิกจ่ายทั่วไปและเงินยืมราชการ ระบบจะรวมยอดไปแสดงในช่องเบิกจ่ายรวม</p>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] lg:items-end">
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">รายการงบประมาณ</span>
                <select
                  value={disbursementForm.itemId}
                  onChange={(event) => {
                    const nextItem = budgetLineItems.find((item) => item.id === event.target.value) ?? null;
                    setDisbursementForm((current) => ({ ...current, itemId: event.target.value }));
                    applySelectedDisbursementItemValue(nextItem);
                  }}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">เลือกรายการงบประมาณ</option>
                  {budgetLineItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sequence_label ? `${item.sequence_label} ` : ''}
                      {item.item_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">เบิกจ่ายทั่วไป</span>
                <input
                  value={disbursementForm.disbursedGeneralAmount}
                  onChange={(event) => setDisbursementForm((current) => ({ ...current, disbursedGeneralAmount: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder="ยอดเบิกจ่ายทั่วไป"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">เงินยืมราชการ</span>
                <input
                  value={disbursementForm.disbursedAdvanceAmount}
                  onChange={(event) => setDisbursementForm((current) => ({ ...current, disbursedAdvanceAmount: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder="ยอดเงินยืมราชการ"
                />
              </label>
              <button
                type="button"
                onClick={() => void saveDisbursementForm()}
                disabled={saving || !disbursementForm.itemId}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                บันทึกเบิก-จ่าย
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-slate-950">รายการงบประมาณทั้งหมด</h2>
          <label className="relative block w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              placeholder="ค้นหารายการงบประมาณ"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[2320px] divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-700">
              <tr>
                <th rowSpan={2} className="border border-slate-200 bg-white px-4 py-3 text-center align-middle">ชื่อโครงการ</th>
                <th rowSpan={2} className="border border-slate-200 bg-white px-4 py-3 text-center align-middle">วงเงินตามแผน<br />ปี 2568</th>
                <th rowSpan={2} className="border border-slate-200 bg-white px-4 py-3 text-center align-middle">รับจัดสรรงวด 1<br />(ตามแผนฯ พลางก่อน)<br />(1)</th>
                <th rowSpan={2} className="border border-slate-200 bg-white px-4 py-3 text-center align-middle">รับจัดสรรงวด 2<br />(ตามแผนฯ)<br />(2)</th>
                <th rowSpan={2} className="border border-slate-200 bg-white px-4 py-3 text-center align-middle">รับจัดสรรงวด 3<br />(ตามแผนฯ)<br />(3)</th>
                <th rowSpan={2} className="border border-slate-200 bg-lime-50 px-4 py-3 text-center align-middle">ยอดสุทธิงบประมาณ<br />2567 หลังโอนเปลี่ยนแปลง<br />(1)</th>
                <th colSpan={2} className="border border-slate-200 bg-green-700 px-4 py-2 text-center font-bold text-white">ส่วนกลางกรมฯ</th>
                <th colSpan={2} className="border border-slate-200 bg-green-400 px-4 py-2 text-center font-bold text-slate-950">ภายในกอง</th>
                <th colSpan={3} className="border border-slate-200 bg-sky-400 px-4 py-2 text-center font-bold text-slate-950">ผูกพัน</th>
                <th colSpan={3} className="border border-slate-200 bg-lime-500 px-4 py-2 text-center font-bold text-slate-950">เบิก-จ่าย</th>
                <th rowSpan={2} className="border border-slate-200 bg-white px-4 py-3 text-center align-middle">รวม<br />(10)<br />=(6)+(9)</th>
                <th rowSpan={2} className="border border-slate-200 bg-white px-4 py-3 text-center align-middle">คงเหลือ<br />(11)<br />(1)-(10)</th>
                <th rowSpan={2} className="border border-slate-200 bg-white px-4 py-3 text-center align-middle">เบิกจ่ายตามจัดสรร<br />ร้อยละ<br />(12)<br />(9)*100/(1)</th>
                <th rowSpan={2} className="border border-slate-200 bg-sky-100 px-4 py-3 text-center align-middle">เบิกจ่ายตามจัดสรร<br />ร้อยละ<br />(รวม PO)</th>
                {canManage ? <th rowSpan={2} className="border border-slate-200 bg-white px-4 py-3 text-center align-middle">จัดการ</th> : null}
              </tr>
              <tr>
                <th className="border border-slate-200 bg-white px-4 py-2 text-center text-slate-700">รับโอน<br />(2)</th>
                <th className="border border-slate-200 bg-white px-4 py-2 text-center text-slate-700">โอนออก<br />(3)</th>
                <th className="border border-slate-200 bg-white px-4 py-2 text-center text-slate-700">รับโอน<br />(2)</th>
                <th className="border border-slate-200 bg-white px-4 py-2 text-center text-slate-700">โอนออก<br />(3)</th>
                <th className="border border-slate-200 bg-white px-4 py-2 text-center text-slate-700">มี PO<br />(4)</th>
                <th className="border border-slate-200 bg-white px-4 py-2 text-center text-slate-700">ไม่มี PO<br />(5)</th>
                <th className="border border-slate-200 bg-white px-4 py-2 text-center text-slate-700">รวม<br />(6)<br />=(4)+(5)</th>
                <th className="border border-slate-200 bg-white px-4 py-2 text-center text-slate-700">เบิกจ่ายทั่วไป<br />(7)</th>
                <th className="border border-slate-200 bg-white px-4 py-2 text-center text-slate-700">เงินยืมราชการ<br />(8)</th>
                <th className="border border-slate-200 bg-white px-4 py-2 text-center text-slate-700">รวม<br />(9)<br />=(7)+(8)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={canManage ? 21 : 20} className="px-4 py-8 text-center text-slate-500">กำลังโหลดข้อมูล...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={canManage ? 21 : 20} className="px-4 py-8 text-center text-slate-500">ยังไม่มีรายการงบประมาณ</td></tr>
              ) : filteredItems.map((item) => {
                const isCategory = item.parent_id === null;
                const amountTextClass = isCategory ? 'text-slate-400' : undefined;
                const allocationTotal =
                  item.amount.allocation_tranche_1_amount +
                  item.amount.allocation_tranche_2_amount +
                  item.amount.allocation_tranche_3_amount +
                  item.amount.central_transfer_in_amount -
                  item.amount.central_transfer_out_amount;
                const disbursementRate = allocationTotal > 0 ? (item.amount.disbursed_total_amount * 100) / allocationTotal : 0;
                const utilizationTotal = item.amount.committed_total_amount + item.amount.disbursed_total_amount;
                const utilizationRate = allocationTotal > 0 ? (utilizationTotal * 100) / allocationTotal : 0;
                const remainingAmount = Math.max(0, allocationTotal - utilizationTotal);

                return (
                  <tr key={item.id} className={isCategory ? 'bg-teal-50/50 font-semibold' : undefined}>
                    <td className="px-4 py-3 text-slate-900">
                      <div style={{ paddingLeft: `${item.depth * 18}px` }}>
                        <span className="text-xs text-slate-400">{item.sequence_label}</span>
                        <span className="ml-2">{item.item_name}</span>
                        {!isCategory && (item.output_label || item.activity_label) ? (
                          <p className="mt-1 text-xs font-normal text-slate-500">
                            {item.output_label ? `ผลผลิตที่: ${item.output_label}` : null}
                            {item.output_label && item.activity_label ? ' · ' : null}
                            {item.activity_label ? `กิจกรรมหลักที่: ${item.activity_label}` : null}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-right ${amountTextClass ?? ''}`}>{isCategory ? '-' : formatBudgetAmount(item.amount.planned_budget_amount)}</td>
                    <td className={`px-4 py-3 text-right ${amountTextClass ?? ''}`}>{isCategory ? '-' : formatBudgetAmount(item.amount.allocation_tranche_1_amount)}</td>
                    <td className={`px-4 py-3 text-right ${amountTextClass ?? ''}`}>{isCategory ? '-' : formatBudgetAmount(item.amount.allocation_tranche_2_amount)}</td>
                    <td className={`px-4 py-3 text-right ${amountTextClass ?? ''}`}>{isCategory ? '-' : formatBudgetAmount(item.amount.allocation_tranche_3_amount)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${isCategory ? amountTextClass ?? '' : 'text-slate-900'}`}>{isCategory ? '-' : formatBudgetAmount(allocationTotal)}</td>
                    <td className={`px-4 py-3 text-right ${amountTextClass ?? ''}`}>{isCategory ? '-' : formatBudgetAmount(item.amount.central_transfer_in_amount || 0)}</td>
                    <td className={`px-4 py-3 text-right ${amountTextClass ?? ''}`}>{isCategory ? '-' : formatBudgetAmount(item.amount.central_transfer_out_amount || 0)}</td>
                    <td className={`px-4 py-3 text-right ${amountTextClass ?? ''}`}>{isCategory ? '-' : formatBudgetAmount(item.amount.division_transfer_in_amount || 0)}</td>
                    <td className={`px-4 py-3 text-right ${amountTextClass ?? ''}`}>{isCategory ? '-' : formatBudgetAmount(item.amount.division_transfer_out_amount || 0)}</td>
                    <td className={`px-4 py-3 text-right ${amountTextClass ?? ''}`}>{isCategory ? '-' : formatBudgetAmount(item.amount.committed_po_amount || 0)}</td>
                    <td className={`px-4 py-3 text-right ${amountTextClass ?? ''}`}>{isCategory ? '-' : formatBudgetAmount(item.amount.committed_without_po_amount || 0)}</td>
                    <td className={`px-4 py-3 text-right ${amountTextClass ?? ''}`}>{isCategory ? '-' : formatBudgetAmount(item.amount.committed_total_amount || 0)}</td>
                    <td className={`px-4 py-3 text-right ${amountTextClass ?? ''}`}>{isCategory ? '-' : formatBudgetAmount(item.amount.disbursed_general_amount || 0)}</td>
                    <td className={`px-4 py-3 text-right ${amountTextClass ?? ''}`}>{isCategory ? '-' : formatBudgetAmount(item.amount.disbursed_advance_amount || 0)}</td>
                    <td className={`px-4 py-3 text-right ${amountTextClass ?? ''}`}>{isCategory ? '-' : formatBudgetAmount(item.amount.disbursed_total_amount || 0)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${isCategory ? amountTextClass ?? '' : 'text-slate-900'}`}>{isCategory ? '-' : formatBudgetAmount(utilizationTotal)}</td>
                    <td className={`px-4 py-3 text-right ${amountTextClass ?? ''}`}>{isCategory ? '-' : formatBudgetAmount(remainingAmount)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${isCategory ? 'text-slate-400' : 'text-teal-700'}`}>{isCategory ? '-' : `${formatBudgetAmount(disbursementRate)}%`}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${isCategory ? 'text-slate-400' : 'text-sky-700'}`}>{isCategory ? '-' : `${formatBudgetAmount(utilizationRate)}%`}</td>
                    {canManage ? (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => startEdit(item)} className="rounded-md border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50" aria-label="แก้ไขรายการ">
                            <Edit3 className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (isCategory && getCategoryChildCount(item.id) > 0) {
                                setError('ลบประเภทหลักไม่ได้ เนื่องจากยังมีรายการงบประมาณอยู่ภายใต้ประเภทนี้');
                                return;
                              }
                              setDeleteTarget(item);
                            }}
                            className="rounded-md border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                            aria-label="ลบรายการ"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {isCategoryManagerOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="budget-category-manager-title">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            onClick={() => {
              if (saving) return;
              setIsCategoryManagerOpen(false);
              setMainForm(emptyMainForm);
            }}
            aria-label="ปิดหน้าต่าง"
          />
          <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-md bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
              <div>
                <h2 id="budget-category-manager-title" className="text-lg font-bold text-slate-950">จัดการประเภทหลัก</h2>
                <p className="mt-1 text-xs text-slate-500">เพิ่ม แก้ไข หรือลบหัวข้อสำหรับจัดกลุ่มรายการงบประมาณ</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (saving) return;
                  setIsCategoryManagerOpen(false);
                  setMainForm(emptyMainForm);
                }}
                disabled={saving}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                title="ปิด"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">ชื่อประเภทหลัก</span>
                    <input
                      value={mainForm.itemName}
                      onChange={(event) => setMainForm((current) => ({ ...current, itemName: event.target.value }))}
                      className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      placeholder="เช่น งบบุคลากร"
                    />
                  </label>
                  <div className="flex gap-2">
                    {mainForm.itemId ? (
                      <button
                        type="button"
                        onClick={() => setMainForm(emptyMainForm)}
                        disabled={saving}
                        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
                      >
                        ยกเลิก
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void saveMainForm()}
                      disabled={saving || !mainForm.itemName.trim()}
                      className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {mainForm.itemId ? <Save className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                      {mainForm.itemId ? 'บันทึก' : 'เพิ่ม'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-white">
                {mainBudgetItems.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">ยังไม่มีประเภทหลัก</div>
                ) : mainBudgetItems.map((category, index) => {
                  const childCount = getCategoryChildCount(category.id);

                  return (
                    <div key={category.id} className="grid gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center">
                      <span className="text-center text-sm font-semibold text-slate-500">{index + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{category.item_name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{childCount} รายการงบประมาณ</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setMainForm(formFromItem(category))}
                          disabled={saving}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <Edit3 className="h-4 w-4" aria-hidden="true" />
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (childCount > 0) {
                              setError('ลบประเภทหลักไม่ได้ เนื่องจากยังมีรายการงบประมาณอยู่ภายใต้ประเภทนี้');
                              return;
                            }
                            setDeleteTarget(category);
                          }}
                          disabled={saving || childCount > 0}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          ลบ
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isTrancheManagerOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="budget-tranche-manager-title">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            onClick={() => {
              if (saving) return;
              setIsTrancheManagerOpen(false);
              setTrancheDrafts(trancheDefinitions);
              setTrancheForm(emptyTrancheForm);
            }}
            aria-label="ปิดหน้าต่าง"
          />
          <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-md bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
              <div>
                <h2 id="budget-tranche-manager-title" className="text-lg font-bold text-slate-950">จัดการงวดจัดสรร</h2>
                <p className="mt-1 text-xs text-slate-500">เพิ่ม แก้ไข หรือลบงวดสำหรับบันทึกยอดจัดสรรตามวันที่</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (saving) return;
                  setIsTrancheManagerOpen(false);
                  setTrancheDrafts(trancheDefinitions);
                  setTrancheForm(emptyTrancheForm);
                }}
                disabled={saving}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                title="ปิด"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">ชื่องวดจัดสรร</span>
                    <input
                      value={trancheForm.label}
                      onChange={(event) => setTrancheForm((current) => ({ ...current, label: event.target.value }))}
                      className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                      placeholder="เช่น จัดสรรงวด 1"
                    />
                  </label>
                  <div className="flex gap-2">
                    {trancheForm.key ? (
                      <button
                        type="button"
                        onClick={() => setTrancheForm(emptyTrancheForm)}
                        disabled={saving}
                        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
                      >
                        ยกเลิก
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={saveTrancheDraft}
                      disabled={saving || !trancheForm.label.trim() || (!trancheForm.key && trancheDrafts.length >= allocationTrancheKeys.length)}
                      className="inline-flex h-10 items-center gap-2 rounded-md bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {trancheForm.key ? <Save className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                      {trancheForm.key ? 'บันทึก' : 'เพิ่ม'}
                    </button>
                  </div>
                </div>
                {!trancheForm.key && trancheDrafts.length >= allocationTrancheKeys.length ? (
                  <p className="mt-2 text-xs text-slate-500">ตอนนี้โครงสร้างข้อมูลรองรับงวดจัดสรรได้สูงสุด 3 งวด</p>
                ) : null}
              </div>

              <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-white">
                {trancheDrafts.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">ยังไม่มีงวดจัดสรร</div>
                ) : trancheDrafts.map((tranche, index) => {
                  const usageCount = getTrancheUsageCount(tranche.key);

                  return (
                    <div key={tranche.key} className="grid gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center">
                      <span className="text-center text-sm font-semibold text-slate-500">{index + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{tranche.label}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{usageCount} รายการงบประมาณที่ใช้งานงวดนี้</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setTrancheForm({ key: tranche.key, label: tranche.label })}
                          disabled={saving}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <Edit3 className="h-4 w-4" aria-hidden="true" />
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTrancheDraft(tranche.key)}
                          disabled={saving || usageCount > 0 || trancheDrafts.length <= 1}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          ลบ
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTrancheDrafts(trancheDefinitions);
                    setTrancheForm(emptyTrancheForm);
                    setIsTrancheManagerOpen(false);
                  }}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={saveTrancheDefinitions}
                  disabled={trancheDrafts.length === 0}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  บันทึกการจัดการงวด
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="ยืนยันการลบรายการ"
        message={`ต้องการลบ ${deleteTarget?.item_name ?? ''} ใช่หรือไม่?`}
        confirmLabel="ลบรายการ"
        cancelLabel="ยกเลิก"
        isLoading={saving}
        variant="danger"
        zIndexClassName="z-[70]"
      />
    </div>
  );
}
