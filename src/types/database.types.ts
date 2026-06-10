import type { ProfileStatus, UserRole } from './roles';

export type Profile = {
  user_id: string;
  employee_code: string | null;
  full_name: string;
  position: string | null;
  department: string | null;
  work_group: string | null;
  gender: 'male' | 'female' | null;
  education: 'ต่ำกว่าปริญญาตรี' | 'ปริญญาตรี' | 'ปริญญาโท' | 'ปริญญาเอก' | null;
  birth_date: string | null;
  generation: 'Gen B' | 'Gen X' | 'Gen Y' | 'Gen Z' | null;
  employment_type: 'ข้าราชการ' | 'พนักงานราชการ' | 'พนักงานกระทรวงสาธารณสุข' | 'ลูกจ้างชั่วคราว' | 'จ้างเหมาบริการฯ (พขร.)' | null;
  role: UserRole;
  status: ProfileStatus;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Department = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
};

export type CourseCategory = {
  id: string;
  category: string;
  subcategory: string | null;
  active: boolean;
  created_at: string;
};

export type TrainingRecord = {
  id: string;
  user_id: string;
  course: string;
  category: string;
  subcategory: string | null;
  organizer: string;
  date: string;
  month: number;
  year: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Certificate = {
  id: string;
  training_id: string;
  certificate_name: string | null;
  certificate_link: string | null;
  file_path: string | null;
  created_at: string;
};

export type DevelopmentAnalysis = {
  id: string;
  training_id: string;
  user_id: string;
  development_area: string | null;
  skill_group: string | null;
  target_direction: string | null;
  created_at: string;
};

export type LoginHistory = {
  id: string;
  user_id: string | null;
  login_at: string;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type StrategyEventStatus = 'draft' | 'published' | 'cancelled';

export type StrategyEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  end_date: string | null;
  color: string | null;
  location: string | null;
  owner_work_group: string | null;
  status: StrategyEventStatus;
  created_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
};

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
  source_asset_code: string | null;
  created_at: string;
  updated_at: string;
};

export type ItAssetEvaluationSettings = {
  id: string;
  criteria: Record<string, unknown>;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          user_id: string;
          employee_code?: string | null;
          full_name: string;
          position?: string | null;
          department?: string | null;
          work_group?: string | null;
          gender?: 'male' | 'female' | null;
          education?: 'ต่ำกว่าปริญญาตรี' | 'ปริญญาตรี' | 'ปริญญาโท' | 'ปริญญาเอก' | null;
          birth_date?: string | null;
          generation?: 'Gen B' | 'Gen X' | 'Gen Y' | 'Gen Z' | null;
          employment_type?: 'ข้าราชการ' | 'พนักงานราชการ' | 'พนักงานกระทรวงสาธารณสุข' | 'ลูกจ้างชั่วคราว' | 'จ้างเหมาบริการฯ (พขร.)' | null;
          role?: UserRole;
          status?: ProfileStatus;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, 'user_id' | 'created_at'>>;
        Relationships: [];
      };
      departments: {
        Row: Department;
        Insert: {
          id?: string;
          name: string;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Omit<Department, 'id' | 'created_at'>>;
        Relationships: [];
      };
      course_categories: {
        Row: CourseCategory;
        Insert: {
          id?: string;
          category: string;
          subcategory?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Omit<CourseCategory, 'id' | 'created_at'>>;
        Relationships: [];
      };
      training_records: {
        Row: TrainingRecord;
        Insert: {
          id?: string;
          user_id: string;
          course: string;
          category: string;
          subcategory?: string | null;
          organizer: string;
          date: string;
          month: number;
          year: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<TrainingRecord, 'id' | 'created_at'>>;
        Relationships: [];
      };
      certificates: {
        Row: Certificate;
        Insert: {
          id?: string;
          training_id: string;
          certificate_name?: string | null;
          certificate_link?: string | null;
          file_path?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<Certificate, 'id' | 'training_id' | 'created_at'>>;
        Relationships: [];
      };
      development_analysis: {
        Row: DevelopmentAnalysis;
        Insert: {
          id?: string;
          training_id: string;
          user_id: string;
          development_area?: string | null;
          skill_group?: string | null;
          target_direction?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<DevelopmentAnalysis, 'id' | 'training_id' | 'created_at'>>;
        Relationships: [];
      };
      login_history: {
        Row: LoginHistory;
        Insert: {
          id?: string;
          user_id?: string | null;
          login_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          success?: boolean;
        };
        Update: Partial<Omit<LoginHistory, 'id'>>;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLog;
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          metadata?: Record<string, unknown> | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<AuditLog, 'id'>>;
        Relationships: [];
      };
      strategy_events: {
        Row: StrategyEvent;
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          event_date: string;
          start_time?: string | null;
          end_time?: string | null;
          end_date?: string | null;
          color?: string | null;
          location?: string | null;
          owner_work_group?: string | null;
          status?: StrategyEventStatus;
          created_by?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<StrategyEvent, 'id' | 'created_at'>>;
        Relationships: [];
      };
      it_assets: {
        Row: ItAsset;
        Insert: {
          id?: string;
          source_row_number?: number | null;
          asset_code: string;
          computer_name?: string | null;
          machine_brand_model?: string | null;
          asset_type?: string | null;
          operating_system?: string | null;
          office_software?: string | null;
          cpu?: string | null;
          mainboard?: string | null;
          memory_gb?: number | null;
          graphics?: string | null;
          video_memory?: string | null;
          disk1_type?: string | null;
          disk1_product?: string | null;
          disk1_drive_letters?: string | null;
          disk1_hours?: number | null;
          disk2_type?: string | null;
          disk2_product?: string | null;
          disk2_drive_letters?: string | null;
          disk2_hours?: number | null;
          total_disk_hours?: number | null;
          monitor1_brand?: string | null;
          monitor1_manufacture_date?: string | null;
          monitor2_brand?: string | null;
          monitor2_serial_number?: string | null;
          monitor2_manufacture_date?: string | null;
          user_name?: string | null;
          user_position?: string | null;
          work_group?: string | null;
          received_date?: string | null;
          received_date_raw?: string | null;
          source_asset_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ItAsset, 'id' | 'created_at'>>;
        Relationships: [];
      };
      it_asset_evaluation_settings: {
        Row: ItAssetEvaluationSettings;
        Insert: {
          id?: string;
          criteria: Record<string, unknown>;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ItAssetEvaluationSettings, 'id' | 'created_at'>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_training_record_with_details: {
        Args: {
          p_user_id: string;
          p_course: string;
          p_category: string;
          p_subcategory: string | null;
          p_organizer: string;
          p_date: string;
          p_year: number;
          p_certificate_name: string | null;
          p_certificate_link: string | null;
          p_development_area: string | null;
          p_skill_group: string | null;
          p_target_direction: string | null;
        };
        Returns: string;
      };
      update_own_profile_details: {
        Args: {
          p_employee_code: string;
          p_full_name: string;
          p_position: string;
          p_department: string;
          p_work_group: string;
          p_gender: 'male' | 'female' | null;
          p_education: 'ต่ำกว่าปริญญาตรี' | 'ปริญญาตรี' | 'ปริญญาโท' | 'ปริญญาเอก' | null;
          p_birth_date: string | null;
          p_employment_type:
            | 'ข้าราชการ'
            | 'พนักงานราชการ'
            | 'พนักงานกระทรวงสาธารณสุข'
            | 'ลูกจ้างชั่วคราว'
            | 'จ้างเหมาบริการฯ (พขร.)'
            | null;
        };
        Returns: void;
      };
    };
    Enums: {
      user_role: UserRole;
      profile_status: ProfileStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
