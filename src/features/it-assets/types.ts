export type ItAsset = {
  id: string;
  source_row_number: number | null;
  asset_code: string;
  computer_name: string | null;
  machine_brand_model: string | null;
  asset_type: string | null;
  operating_system: string | null;
  office_software: string | null;
  cpu: string | null;
  mainboard: string | null;
  memory_gb: number | null;
  graphics: string | null;
  video_memory: string | null;
  disk1_type: string | null;
  disk1_product: string | null;
  disk1_drive_letters: string | null;
  disk1_hours: number | null;
  disk2_type: string | null;
  disk2_product: string | null;
  disk2_drive_letters: string | null;
  disk2_hours: number | null;
  total_disk_hours: number | null;
  monitor1_brand: string | null;
  monitor1_manufacture_date: string | null;
  monitor2_brand: string | null;
  monitor2_serial_number: string | null;
  monitor2_manufacture_date: string | null;
  user_name: string | null;
  user_position: string | null;
  work_group: string | null;
  received_date: string | null;
  received_date_raw: string | null;
  ups_asset_code: string | null;
  ups_received_date: string | null;
  ups_received_date_raw: string | null;
  source_asset_code: string | null;
  created_at: string;
  updated_at: string;
};

export type ItAssetFormValues = Omit<ItAsset, 'id' | 'created_at' | 'updated_at'>;

export type ItAssetHealth = {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  colorClass: string;
  breakdown: {
    ramScore: number;
    diskScore: number;
    osScore: number;
    penalty: number;
  };
};

export type ItAssetEvaluationCriteria = {
  ram: {
    highMinGb: number;
    highScore: number;
    mediumMinGb: number;
    mediumScore: number;
    lowScore: number;
  };
  disk: {
    nvmeScore: number;
    ssdScore: number;
    otherScore: number;
  };
  os: {
    windows11Score: number;
    windows10Score: number;
    otherScore: number;
  };
  penalty: {
    diskHoursOver: number;
    points: number;
  };
  grades: {
    aMin: number;
    bMin: number;
    cMin: number;
  };
};

export type ItAssetViewModel = ItAsset & {
  ageText: string;
  ageYears: number;
  health: ItAssetHealth;
};

export type ItAssetFilters = {
  assetType: string[];
  operatingSystem: string[];
  cpu: string[];
  memory: string[];
  graphics: string[];
  disk1Type: string[];
  disk2Type: string[];
  assetAge: string[];
  workGroup: string[];
};

