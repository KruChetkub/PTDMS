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
    };
    Enums: {
      user_role: UserRole;
      profile_status: ProfileStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
