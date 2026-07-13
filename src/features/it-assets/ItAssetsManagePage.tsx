import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Edit, Plus, RefreshCw, Save, Search, Settings, Trash2, Upload, X } from 'lucide-react';
import { getItAssetEvaluationCriteria, updateItAssetEvaluationCriteria } from '../../services/it-asset-evaluation.service';
import { createItAsset, deleteItAsset, getItAssets, updateItAsset } from '../../services/it-asset.service';
import type { ItAsset, ItAssetEvaluationCriteria, ItAssetFormValues } from './types';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { defaultItAssetEvaluationCriteria } from './utils/assetMetrics';

const emptyFormValues: ItAssetFormValues = {
  source_row_number: null,
  asset_code: '',
  computer_name: '',
  machine_brand_model: '',
  asset_type: '',
  operating_system: '',
  office_software: '',
  cpu: '',
  mainboard: '',
  memory_gb: null,
  graphics: '',
  video_memory: '',
  disk1_type: '',
  disk1_product: '',
  disk1_drive_letters: '',
  disk1_hours: null,
  disk2_type: '',
  disk2_product: '',
  disk2_drive_letters: '',
  disk2_hours: null,
  total_disk_hours: null,
  monitor1_brand: '',
  monitor1_manufacture_date: '',
  monitor2_brand: '',
  monitor2_serial_number: '',
  monitor2_manufacture_date: '',
  user_name: '',
  user_position: '',
  work_group: '',
  received_date: null,
  received_date_raw: '',
  ups_asset_code: '',
  ups_received_date: null,
  ups_received_date_raw: '',
  source_asset_code: '',
};

type FieldConfig = {
  key: keyof ItAssetFormValues;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select';
  options?: Array<{ value: string; label: string }>;
  allowCustom?: boolean;
  customLabel?: string;
  customPlaceholder?: string;
  required?: boolean;
};

const customSelectValue = '__custom__';

const assetTypeOptions = [
  { value: 'Desktop Computer', label: 'Desktop Computer' },
  { value: 'Notebook', label: 'Notebook' },
  { value: 'All-in-One', label: 'All-in-One' },
  { value: 'Mini PC', label: 'Mini PC' },
  { value: 'Server', label: 'Server' },
  { value: 'Tablet', label: 'Tablet' },
];

const operatingSystemOptions = [
  { value: 'Microsoft Windows 11', label: 'Microsoft Windows 11' },
  { value: 'Microsoft Windows 10', label: 'Microsoft Windows 10' },
  { value: 'Microsoft Windows 7', label: 'Microsoft Windows 7' },
];

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let isQuoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && isQuoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      isQuoted = !isQuoted;
    } else if (char === ',' && !isQuoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function getReportValue(entries: Array<[string, string]>, key: string) {
  const target = key.toLowerCase().replace(/:$/, '');
  return entries.find(([entryKey, value]) => entryKey.toLowerCase().replace(/:$/, '') === target && value.trim())?.[1].trim() || '';
}

function getFirstReportValue(entries: Array<[string, string]>, keys: string[]) {
  for (const key of keys) {
    const value = getReportValue(entries, key);
    if (value) {
      return value;
    }
  }

  return '';
}

function getFirstMatchingValue(entries: Array<[string, string]>, key: string, pattern: RegExp) {
  return entries.find(([entryKey, value]) => entryKey.toLowerCase().replace(/:$/, '') === key.toLowerCase() && pattern.test(value))?.[1].trim() || '';
}

function parseNumberFromText(value: string) {
  const match = value.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function normalizeOperatingSystem(value: string) {
  if (value.includes('Windows 11')) {
    return 'Microsoft Windows 11';
  }

  if (value.includes('Windows 10')) {
    return 'Microsoft Windows 10';
  }

  if (value.includes('Windows 7')) {
    return 'Microsoft Windows 7';
  }

  return value;
}

function inferAssetType(brandModel: string) {
  const text = brandModel.toLowerCase();
  if (text.includes('notebook') || text.includes('laptop')) {
    return 'Notebook';
  }

  if (text.includes('all-in-one') || text.includes('aio')) {
    return 'All-in-One';
  }

  if (text.includes('mini')) {
    return 'Mini PC';
  }

  if (text.includes('server')) {
    return 'Server';
  }

  if (text.includes('tablet')) {
    return 'Tablet';
  }

  if (text.includes('desktop') || text.includes('tower') || text.includes('pc')) {
    return 'Desktop Computer';
  }

  return '';
}

function parseItAssetReportCsv(text: string): Partial<ItAssetFormValues> {
  const entries = text
    .split(/\r?\n/)
    .map(parseCsvLine)
    .filter((cells) => cells.length >= 2 && cells[0])
    .map((cells) => [cells[0], cells[1]] as [string, string]);
  const brandModel = getReportValue(entries, 'Computer Brand Name');
  const operatingSystem = getReportValue(entries, 'Operating System');
  const memoryMb = parseNumberFromText(getReportValue(entries, 'Total Memory Size [MB]'));
  const memoryText = parseNumberFromText(getReportValue(entries, 'Total Memory Size'));
  const driveController = getReportValue(entries, 'Drive Controller');
  const driveModel = getReportValue(entries, 'Drive Model');
  const diskHours = parseNumberFromText(getReportValue(entries, 'Power On Hours'));
  const graphics =
    getFirstMatchingValue(entries, 'Driver Description', /(graphics|uhd|radeon|geforce|nvidia|intel\(r\))/i) ||
    getFirstMatchingValue(entries, 'Device Name', /(graphics|uhd|radeon|geforce|nvidia)/i);

  return {
    computer_name: getReportValue(entries, 'Computer Name') || null,
    machine_brand_model: brandModel || null,
    asset_type: inferAssetType(brandModel) || null,
    operating_system: operatingSystem ? normalizeOperatingSystem(operatingSystem) : null,
    cpu: getFirstReportValue(entries, ['Processor Name', 'CPU Brand Name']) || null,
    memory_gb: memoryMb ? Math.round((memoryMb / 1024) * 100) / 100 : memoryText,
    graphics: graphics || null,
    disk1_type: driveController ? (driveController.toLowerCase().includes('nvme') ? 'NVMe' : driveController) : null,
    disk1_product: driveModel || null,
    disk1_hours: diskHours,
    total_disk_hours: diskHours,
    user_name: getReportValue(entries, 'Current User Name') || null,
  };
}

const fieldGroups: Array<{ title: string; fields: FieldConfig[] }> = [
  {
    title: 'ข้อมูลครุภัณฑ์',
    fields: [
      { key: 'asset_code', label: 'รหัสครุภัณฑ์', required: true },
      { key: 'computer_name', label: 'ชื่อเครื่อง' },
      { key: 'machine_brand_model', label: 'ยี่ห้อ/รุ่นเครื่อง' },
      { key: 'asset_type', label: 'ลักษณะเครื่อง', type: 'select', options: assetTypeOptions },
    ],
  },
  {
    title: 'เครื่องสำรองไฟฟ้า (UPS)',
    fields: [
      { key: 'ups_asset_code', label: 'รหัสครุภัณฑ์ เครื่องสำรองไฟฟ้า (UPS)' },
      { key: 'ups_received_date_raw', label: 'วันที่รับเครื่อง (วัน/เดือน/ปี พ.ศ.)' },
    ],
  },
  {
    title: 'ซอฟต์แวร์และสเปก',
    fields: [
      {
        key: 'operating_system',
        label: 'ระบบปฏิบัติการ',
        type: 'select',
        options: operatingSystemOptions,
        allowCustom: true,
        customLabel: 'OS อื่นๆ',
        customPlaceholder: 'ระบุระบบปฏิบัติการ',
      },
      { key: 'office_software', label: 'โปรแกรมสำนักงาน' },
      { key: 'cpu', label: 'CPU' },
      { key: 'mainboard', label: 'Mainboard' },
      { key: 'memory_gb', label: 'Memory (GB)', type: 'number' },
      { key: 'graphics', label: 'Graphics' },
      { key: 'video_memory', label: 'Video Memory' },
    ],
  },
  {
    title: 'Disk',
    fields: [
      { key: 'disk1_type', label: 'ประเภท Disk 1' },
      { key: 'disk1_product', label: 'ผลิตภัณฑ์ Disk 1' },
      { key: 'disk1_drive_letters', label: 'อักษรไดรฟ์ Disk 1' },
      { key: 'disk1_hours', label: 'ชั่วโมง Disk 1', type: 'number' },
      { key: 'disk2_type', label: 'ประเภท Disk 2' },
      { key: 'disk2_product', label: 'ผลิตภัณฑ์ Disk 2' },
      { key: 'disk2_drive_letters', label: 'อักษรไดรฟ์ Disk 2' },
      { key: 'disk2_hours', label: 'ชั่วโมง Disk 2', type: 'number' },
      { key: 'total_disk_hours', label: 'รวมชั่วโมง', type: 'number' },
    ],
  },
  {
    title: 'จอคอมพิวเตอร์',
    fields: [
      { key: 'monitor1_brand', label: 'ยี่ห้อจอ 1' },
      { key: 'monitor1_manufacture_date', label: 'Date Of Manufacture จอ 1' },
      { key: 'monitor2_brand', label: 'ยี่ห้อจอ 2' },
      { key: 'monitor2_serial_number', label: 'Serial Number จอ 2' },
      { key: 'monitor2_manufacture_date', label: 'Date Of Manufacture จอ 2' },
    ],
  },
  {
    title: 'ผู้ใช้งาน',
    fields: [
      { key: 'user_name', label: 'ผู้ใช้งาน' },
      { key: 'user_position', label: 'ตำแหน่ง' },
      { key: 'work_group', label: 'กลุ่มงาน' },
      { key: 'received_date_raw', label: 'วันที่รับเครื่อง (วัน/เดือน/ปี พ.ศ.)' },
    ],
  },
];

function parseThaiDateInput(value: string | null | undefined) {
  const text = String(value || '').trim();
  if (!text) {
    return null;
  }

  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const yearValue = Number(match[3]);
  const year = yearValue > 2400 ? yearValue - 543 : yearValue;
  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function formatThaiDateInput(value: string | null | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) {
    return '';
  }

  return `${match[3]}/${match[2]}/${Number(match[1]) + 543}`;
}

function toFormValues(asset: ItAsset): ItAssetFormValues {
  return {
    source_row_number: asset.source_row_number,
    asset_code: asset.asset_code,
    computer_name: asset.computer_name,
    machine_brand_model: asset.machine_brand_model,
    asset_type: asset.asset_type,
    operating_system: asset.operating_system,
    office_software: asset.office_software,
    cpu: asset.cpu,
    mainboard: asset.mainboard,
    memory_gb: asset.memory_gb,
    graphics: asset.graphics,
    video_memory: asset.video_memory,
    disk1_type: asset.disk1_type,
    disk1_product: asset.disk1_product,
    disk1_drive_letters: asset.disk1_drive_letters,
    disk1_hours: asset.disk1_hours,
    disk2_type: asset.disk2_type,
    disk2_product: asset.disk2_product,
    disk2_drive_letters: asset.disk2_drive_letters,
    disk2_hours: asset.disk2_hours,
    total_disk_hours: asset.total_disk_hours,
    monitor1_brand: asset.monitor1_brand,
    monitor1_manufacture_date: asset.monitor1_manufacture_date,
    monitor2_brand: asset.monitor2_brand,
    monitor2_serial_number: asset.monitor2_serial_number,
    monitor2_manufacture_date: asset.monitor2_manufacture_date,
    user_name: asset.user_name,
    user_position: asset.user_position,
    work_group: asset.work_group,
    received_date: asset.received_date,
    received_date_raw: asset.received_date_raw || formatThaiDateInput(asset.received_date),
    ups_asset_code: asset.ups_asset_code,
    ups_received_date: asset.ups_received_date,
    ups_received_date_raw: asset.ups_received_date_raw || formatThaiDateInput(asset.ups_received_date),
    source_asset_code: asset.source_asset_code,
  };
}

function normalizeFormValues(values: ItAssetFormValues): ItAssetFormValues {
  const next = { ...values };
  const textKeys = Object.keys(next).filter((key) => !['source_row_number', 'memory_gb', 'disk1_hours', 'disk2_hours', 'total_disk_hours'].includes(key)) as Array<
    keyof ItAssetFormValues
  >;

  textKeys.forEach((key) => {
    const value = next[key];
    next[key] = (typeof value === 'string' && value.trim() === '' ? null : value) as never;
  });

  next.received_date = parseThaiDateInput(next.received_date_raw);
  next.ups_received_date = parseThaiDateInput(next.ups_received_date_raw);

  return next;
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: ItAssetFormValues[keyof ItAssetFormValues];
  onChange: (key: keyof ItAssetFormValues, value: ItAssetFormValues[keyof ItAssetFormValues]) => void;
}) {
  const inputValue = value ?? '';
  const selectOptions =
    field.type === 'select' &&
    !field.allowCustom &&
    typeof inputValue === 'string' &&
    inputValue &&
    !field.options?.some((option) => option.value === inputValue)
      ? [{ value: inputValue, label: inputValue }, ...(field.options || [])]
      : field.options || [];

  if (field.type === 'select') {
    const hasSelectedOption = selectOptions.some((option) => option.value === inputValue);
    const selectValue = field.allowCustom && inputValue && !hasSelectedOption ? customSelectValue : inputValue;
    const customInputValue = selectValue === customSelectValue ? (inputValue === field.customLabel ? '' : String(inputValue)) : '';

    return (
      <label className="block">
        <span className="text-xs font-medium text-slate-500">{field.label}</span>
        <select
          value={selectValue}
          required={field.required}
          onChange={(event) => {
            onChange(field.key, event.target.value === customSelectValue ? field.customLabel || '' : event.target.value);
          }}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">เลือก{field.label}</option>
          {selectOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {field.allowCustom ? <option value={customSelectValue}>{field.customLabel || 'อื่นๆ'}</option> : null}
        </select>
        {field.allowCustom && selectValue === customSelectValue ? (
          <input
            type="text"
            value={customInputValue}
            placeholder={field.customPlaceholder}
            onChange={(event) => onChange(field.key, event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        ) : null}
      </label>
    );
  }

  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500">{field.label}</span>
      <input
        type={field.type || 'text'}
        value={inputValue}
        required={field.required}
        step={field.type === 'number' ? 'any' : undefined}
        placeholder={field.key === 'received_date_raw' || field.key === 'ups_received_date_raw' ? '04/01/2566' : undefined}
        onChange={(event) => {
          if (field.type === 'number') {
            onChange(field.key, event.target.value === '' ? null : Number(event.target.value));
            return;
          }

          onChange(field.key, event.target.value);
        }}
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function CriteriaNumberInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div className="mt-1 flex rounded-md border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <input
          type="number"
          value={value}
          step="1"
          onChange={(event) => onChange(Number(event.target.value))}
          className="min-w-0 flex-1 rounded-md bg-transparent px-3 py-2 text-sm text-slate-900 outline-none"
        />
        {suffix ? <span className="flex items-center border-l border-slate-200 px-3 text-xs font-medium text-slate-500">{suffix}</span> : null}
      </div>
    </label>
  );
}

export function ItAssetsManagePage() {
  const [activeTab, setActiveTab] = useState<'assets' | 'criteria'>('assets');
  const [assets, setAssets] = useState<ItAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<ItAsset | null>(null);
  const [assetPendingDelete, setAssetPendingDelete] = useState<ItAsset | null>(null);
  const [formValues, setFormValues] = useState<ItAssetFormValues>(emptyFormValues);
  const [criteria, setCriteria] = useState<ItAssetEvaluationCriteria>(defaultItAssetEvaluationCriteria);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCriteriaLoading, setIsCriteriaLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCriteriaSaving, setIsCriteriaSaving] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAssets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getItAssets();
      setAssets(data);
    } catch (loadError) {
      console.error('Failed to load IT assets:', loadError);
      setError('ไม่สามารถโหลดข้อมูลสำหรับจัดการได้');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCriteria = async () => {
    try {
      setIsCriteriaLoading(true);
      const data = await getItAssetEvaluationCriteria();
      setCriteria(data);
    } catch (loadError) {
      console.error('Failed to load IT asset evaluation criteria:', loadError);
      setError('ไม่สามารถโหลดเกณฑ์การประเมินได้');
    } finally {
      setIsCriteriaLoading(false);
    }
  };

  useEffect(() => {
    void loadAssets();
    void loadCriteria();
  }, []);

  const filteredAssets = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) {
      return assets;
    }

    return assets.filter((asset) =>
      [asset.asset_code, asset.computer_name, asset.user_name, asset.work_group, asset.operating_system]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }, [assets, searchTerm]);

  const startCreate = () => {
    setSelectedAsset(null);
    setAssetPendingDelete(null);
    setFormValues(emptyFormValues);
    setStatusMessage(null);
    setError(null);
  };

  const startEdit = (asset: ItAsset) => {
    setSelectedAsset(asset);
    setAssetPendingDelete(null);
    setFormValues(toFormValues(asset));
    setStatusMessage(null);
    setError(null);
  };

  const updateField = (key: keyof ItAssetFormValues, value: ItAssetFormValues[keyof ItAssetFormValues]) => {
    setFormValues((current) => ({ ...current, [key]: value }));
  };

  const handleCsvUpload = async (file: File | null) => {
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('กรุณาอัปโหลดไฟล์ .CSV เท่านั้น');
      setStatusMessage(null);
      return;
    }

    try {
      const text = await file.text();
      const parsedValues = parseItAssetReportCsv(text);
      const importedEntries = Object.entries(parsedValues).filter(([, value]) => value !== null && value !== undefined && value !== '');

      if (importedEntries.length === 0) {
        setError('ไม่พบข้อมูลที่นำเข้าได้จากไฟล์ CSV');
        setStatusMessage(null);
        return;
      }

      setFormValues((current) => {
        const next = { ...current };
        importedEntries.forEach(([key, value]) => {
          next[key as keyof ItAssetFormValues] = value as never;
        });
        return next;
      });
      setError(null);
      setStatusMessage(`นำเข้าข้อมูลจาก ${file.name} แล้ว กรุณาตรวจสอบและกรอกข้อมูลที่ยังขาด`);
    } catch (uploadError) {
      console.error('Failed to import IT asset CSV:', uploadError);
      setError('อ่านไฟล์ CSV ไม่สำเร็จ');
      setStatusMessage(null);
    }
  };

  const updateCriteriaGroup = <Group extends keyof ItAssetEvaluationCriteria>(
    group: Group,
    key: keyof ItAssetEvaluationCriteria[Group],
    value: number,
  ) => {
    setCriteria((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [key]: Number.isFinite(value) ? value : 0,
      },
    }));
  };

  const handleCriteriaSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!(criteria.grades.aMin > criteria.grades.bMin && criteria.grades.bMin > criteria.grades.cMin)) {
      setError('กรุณาตั้งเกณฑ์เกรดให้เรียงจาก A > B > C');
      setStatusMessage(null);
      return;
    }

    try {
      setIsCriteriaSaving(true);
      setError(null);
      const updated = await updateItAssetEvaluationCriteria(criteria);
      setCriteria(updated);
      setStatusMessage('บันทึกเกณฑ์การประเมินเรียบร้อย');
    } catch (saveError) {
      console.error('Failed to save IT asset evaluation criteria:', saveError);
      setError('บันทึกเกณฑ์การประเมินไม่สำเร็จ กรุณาตรวจสอบสิทธิ์ผู้ใช้งานหรือ migration');
      setStatusMessage(null);
    } finally {
      setIsCriteriaSaving(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = normalizeFormValues(formValues);
    if (formValues.received_date_raw && !payload.received_date) {
      setError('กรุณากรอกวันที่รับเครื่องเป็นรูปแบบ วัน/เดือน/ปี พ.ศ. เช่น 04/01/2566');
      return;
    }

    if (formValues.ups_received_date_raw && !payload.ups_received_date) {
      setError('กรุณากรอกวันที่รับเครื่อง UPS เป็นรูปแบบ วัน/เดือน/ปี พ.ศ. เช่น 04/01/2566');
      return;
    }

    setError(null);
    setStatusMessage(null);
    setIsSaveModalOpen(true);
  };

  const handleConfirmSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setStatusMessage(null);
      const payload = normalizeFormValues(formValues);

      if (selectedAsset) {
        const updated = await updateItAsset(selectedAsset.id, payload);
        setAssets((current) => current.map((asset) => (asset.id === updated.id ? updated : asset)));
        setSelectedAsset(updated);
        setFormValues(toFormValues(updated));
        setStatusMessage('บันทึกการแก้ไขเรียบร้อย');
      } else {
        const created = await createItAsset(payload);
        setAssets((current) => [...current, created].sort((a, b) => (a.source_row_number || 99999) - (b.source_row_number || 99999)));
        setSelectedAsset(created);
        setFormValues(toFormValues(created));
        setStatusMessage('เพิ่มรายการใหม่เรียบร้อย');
      }
      setIsSaveModalOpen(false);
    } catch (saveError) {
      console.error('Failed to save IT asset:', saveError);
      setError('บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสอบรหัสครุภัณฑ์หรือสิทธิ์ผู้ใช้งาน');
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteModal = (asset: ItAsset) => {
    setAssetPendingDelete(asset);
    setError(null);
    setStatusMessage(null);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (isSaving) {
      return;
    }

    setIsDeleteModalOpen(false);
    setAssetPendingDelete(null);
  };

  const handleConfirmDelete = async () => {
    const targetAsset = assetPendingDelete || selectedAsset;
    if (!targetAsset) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await deleteItAsset(targetAsset.id);
      setAssets((current) => current.filter((asset) => asset.id !== targetAsset.id));
      if (selectedAsset?.id === targetAsset.id) {
        setSelectedAsset(null);
        setFormValues(emptyFormValues);
      }
      setAssetPendingDelete(null);
      setStatusMessage(`ลบรายการ ${targetAsset.asset_code || 'IT Asset'} เรียบร้อย`);
      setIsDeleteModalOpen(false);
    } catch (deleteError) {
      console.error('Failed to delete IT asset:', deleteError);
      setError('ลบข้อมูลไม่สำเร็จ กรุณาตรวจสอบสิทธิ์ผู้ใช้งาน');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="min-w-0">
            <Link to="/it-assets" className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-900">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              กลับ IT Asset Dashboard
            </Link>
            <h1 className="truncate text-2xl font-semibold tracking-normal text-slate-950">Manage IT Assets</h1>
            <p className="mt-1 text-sm text-slate-500">เพิ่มและแก้ไขข้อมูลทุกหัวตารางของรายการ IT Asset</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              เพิ่มรายการ
            </button>
            <button
              type="button"
              onClick={() => void loadAssets()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              รีเฟรช
            </button>
          </div>
        </div>
      </header>

      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] gap-2 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setActiveTab('assets')}
            className={`border-b-2 px-3 py-3 text-sm font-semibold transition ${
              activeTab === 'assets' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            รายการครุภัณฑ์
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('criteria')}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${
              activeTab === 'criteria' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            เกณฑ์การประเมิน
          </button>
        </div>
      </nav>

      {activeTab === 'assets' ? (
      <main className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_28rem] lg:px-8">
        <section className="min-w-0 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">รายการทั้งหมด</h2>
              <p className="mt-1 text-sm text-slate-500">พบ {filteredAssets.length} รายการ</p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ค้นหารายการ"
                className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-56 items-center justify-center text-sm text-slate-500">
              <RefreshCw className="mr-2 h-5 w-5 animate-spin text-blue-700" aria-hidden="true" />
              กำลังโหลดข้อมูล
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                    <th className="px-2 pb-3">ลำดับ</th>
                    <th className="px-2 pb-3">รหัสครุภัณฑ์</th>
                    <th className="px-2 pb-3">ชื่อเครื่อง</th>
                    <th className="px-2 pb-3">ผู้ใช้งาน</th>
                    <th className="px-2 pb-3">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssets.map((asset, index) => (
                    <tr key={asset.id} className={selectedAsset?.id === asset.id ? 'bg-blue-50/70' : 'hover:bg-slate-50'}>
                      <td className="px-2 py-3 text-slate-600">{index + 1}</td>
                      <td className="px-2 py-3 font-mono text-xs font-semibold text-blue-700">{asset.asset_code}</td>
                      <td className="px-2 py-3">{asset.computer_name || '-'}</td>
                      <td className="px-2 py-3">{asset.user_name || '-'}</td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEdit(asset)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-white"
                          >
                            <Edit className="h-3.5 w-3.5" aria-hidden="true" />
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(asset)}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-10 text-center text-slate-400">ไม่พบข้อมูล</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="rounded-md border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-950">{selectedAsset ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}</h2>
              <p className="mt-1 text-sm text-slate-500">{selectedAsset?.asset_code || 'กรอกข้อมูลครุภัณฑ์'}</p>
            </div>
            {selectedAsset ? (
              <button type="button" onClick={startCreate} className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {statusMessage ? (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {statusMessage}
            </div>
          ) : null}
          {error ? (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              {error}
            </div>
          ) : null}

          <section className="mb-5 rounded-md border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-slate-900">นำเข้าจากไฟล์ CSV</p>
            <p className="mt-1 text-xs text-slate-500">ระบบจะเติมเฉพาะข้อมูลที่อ่านได้จากรายงานเครื่อง ส่วนข้อมูลที่ไม่มีในไฟล์ให้กรอกเอง</p>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">
              <Upload className="h-4 w-4" aria-hidden="true" />
              อัปโหลด .CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => {
                  void handleCsvUpload(event.target.files?.[0] || null);
                  event.target.value = '';
                }}
              />
            </label>
          </section>

          <form onSubmit={handleSubmit} className="space-y-5">
            {fieldGroups.map((group) => (
              <section key={group.title} className="rounded-md border border-slate-200 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">{group.title}</h3>
                <div className="grid gap-3">
                  {group.fields.map((field) => (
                    <FieldInput key={field.key} field={field} value={formValues[field.key]} onChange={updateField} />
                  ))}
                </div>
              </section>
            ))}

            <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {isSaving ? 'กำลังบันทึก' : 'บันทึก'}
              </button>
              {selectedAsset ? (
                <button
                  type="button"
                  onClick={() => selectedAsset && openDeleteModal(selectedAsset)}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  ลบ
                </button>
              ) : null}
            </div>
          </form>
        </aside>
      </main>
      ) : (
        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">เกณฑ์การประเมิน</h2>
                <p className="mt-1 text-sm text-slate-500">กำหนดคะแนนที่ใช้คัดเกรดคุณภาพครุภัณฑ์ใน Dashboard และรายละเอียดคะแนน</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCriteria(defaultItAssetEvaluationCriteria);
                  setStatusMessage(null);
                  setError(null);
                }}
                className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                ใช้ค่าเริ่มต้น
              </button>
            </div>

            {statusMessage ? (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {statusMessage}
              </div>
            ) : null}
            {error ? (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                {error}
              </div>
            ) : null}

            {isCriteriaLoading ? (
              <div className="flex h-56 items-center justify-center text-sm text-slate-500">
                <RefreshCw className="mr-2 h-5 w-5 animate-spin text-blue-700" aria-hidden="true" />
                กำลังโหลดเกณฑ์การประเมิน
              </div>
            ) : (
              <form onSubmit={handleCriteriaSubmit} className="space-y-5">
                <div className="grid gap-5 lg:grid-cols-2">
                  <section className="rounded-md border border-slate-200 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">RAM</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CriteriaNumberInput label="RAM สูงตั้งแต่" value={criteria.ram.highMinGb} suffix="GB" onChange={(value) => updateCriteriaGroup('ram', 'highMinGb', value)} />
                      <CriteriaNumberInput label="คะแนน RAM สูง" value={criteria.ram.highScore} suffix="คะแนน" onChange={(value) => updateCriteriaGroup('ram', 'highScore', value)} />
                      <CriteriaNumberInput label="RAM กลางตั้งแต่" value={criteria.ram.mediumMinGb} suffix="GB" onChange={(value) => updateCriteriaGroup('ram', 'mediumMinGb', value)} />
                      <CriteriaNumberInput label="คะแนน RAM กลาง" value={criteria.ram.mediumScore} suffix="คะแนน" onChange={(value) => updateCriteriaGroup('ram', 'mediumScore', value)} />
                      <CriteriaNumberInput label="คะแนน RAM ต่ำ" value={criteria.ram.lowScore} suffix="คะแนน" onChange={(value) => updateCriteriaGroup('ram', 'lowScore', value)} />
                    </div>
                  </section>

                  <section className="rounded-md border border-slate-200 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">Disk</h3>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <CriteriaNumberInput label="NVMe / M.2" value={criteria.disk.nvmeScore} suffix="คะแนน" onChange={(value) => updateCriteriaGroup('disk', 'nvmeScore', value)} />
                      <CriteriaNumberInput label="SSD" value={criteria.disk.ssdScore} suffix="คะแนน" onChange={(value) => updateCriteriaGroup('disk', 'ssdScore', value)} />
                      <CriteriaNumberInput label="อื่นๆ" value={criteria.disk.otherScore} suffix="คะแนน" onChange={(value) => updateCriteriaGroup('disk', 'otherScore', value)} />
                    </div>
                  </section>

                  <section className="rounded-md border border-slate-200 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">ระบบปฏิบัติการ</h3>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <CriteriaNumberInput label="Windows 11" value={criteria.os.windows11Score} suffix="คะแนน" onChange={(value) => updateCriteriaGroup('os', 'windows11Score', value)} />
                      <CriteriaNumberInput label="Windows 10" value={criteria.os.windows10Score} suffix="คะแนน" onChange={(value) => updateCriteriaGroup('os', 'windows10Score', value)} />
                      <CriteriaNumberInput label="OS อื่นๆ" value={criteria.os.otherScore} suffix="คะแนน" onChange={(value) => updateCriteriaGroup('os', 'otherScore', value)} />
                    </div>
                  </section>

                  <section className="rounded-md border border-slate-200 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">Penalty</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CriteriaNumberInput label="ชั่วโมง Disk มากกว่า" value={criteria.penalty.diskHoursOver} suffix="ชม." onChange={(value) => updateCriteriaGroup('penalty', 'diskHoursOver', value)} />
                      <CriteriaNumberInput label="หักคะแนน" value={criteria.penalty.points} suffix="คะแนน" onChange={(value) => updateCriteriaGroup('penalty', 'points', value)} />
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      ชั่วโมง Disk คือชั่วโมงที่เปิดใช้งาน Disk โดย {criteria.penalty.diskHoursOver.toLocaleString()} ชม. เท่ากับประมาณ{' '}
                      {Math.round(criteria.penalty.diskHoursOver / 24).toLocaleString()} วัน
                    </p>
                  </section>

                  <section className="rounded-md border border-slate-200 p-4 lg:col-span-2">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">ช่วงเกรด</h3>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <CriteriaNumberInput label="เกรด A ตั้งแต่" value={criteria.grades.aMin} suffix="คะแนน" onChange={(value) => updateCriteriaGroup('grades', 'aMin', value)} />
                      <CriteriaNumberInput label="เกรด B ตั้งแต่" value={criteria.grades.bMin} suffix="คะแนน" onChange={(value) => updateCriteriaGroup('grades', 'bMin', value)} />
                      <CriteriaNumberInput label="เกรด C ตั้งแต่" value={criteria.grades.cMin} suffix="คะแนน" onChange={(value) => updateCriteriaGroup('grades', 'cMin', value)} />
                    </div>
                  </section>
                </div>

                <div className="flex justify-end border-t border-slate-200 pt-4">
                  <button
                    type="submit"
                    disabled={isCriteriaSaving}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {isCriteriaSaving ? 'กำลังบันทึก' : 'บันทึกเกณฑ์'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </main>
      )}

      <ConfirmModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onConfirm={() => void handleConfirmSave()}
        title={selectedAsset ? 'ยืนยันการบันทึกข้อมูล' : 'ยืนยันการเพิ่มรายการ'}
        message={selectedAsset ? `ต้องการบันทึกการแก้ไขรายการ ${formValues.asset_code || selectedAsset.asset_code} ใช่หรือไม่?` : 'ต้องการเพิ่มรายการ IT Asset ใหม่ใช่หรือไม่?'}
        confirmLabel="บันทึก"
        cancelLabel="ยกเลิก"
        isLoading={isSaving}
        variant="info"
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={() => void handleConfirmDelete()}
        title="ยืนยันการลบข้อมูล"
        message={`ต้องการลบรายการ ${(assetPendingDelete || selectedAsset)?.asset_code || '-'} ใช่หรือไม่? ข้อมูลจะถูกลบออกจากฐานข้อมูล`}
        confirmLabel="ลบ"
        cancelLabel="ยกเลิก"
        isLoading={isSaving}
        variant="danger"
      />
    </div>
  );
}
