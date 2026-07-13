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
  start_work_date: string | null;
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
  actor_user_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  actor_role: string | null;
  module: string | null;
  action: string;
  route: string | null;
  resource_type: string;
  resource_id: string | null;
  target_type: string | null;
  target_id: string | null;
  status: string;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  session_id: string | null;
  exported_at: string | null;
  export_status: string;
  export_batch_id: string | null;
  retry_count: number;
  last_export_error: string | null;
  created_at: string;
};

export type SystemSetting = {
  setting_key: string;
  setting_value: Record<string, unknown>;
  description: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SiteContentStatus = 'published' | 'draft' | 'scheduled';

export type SiteContentDocument = {
  id: string;
  content_key: string;
  title: string;
  content: Record<string, unknown>;
  status: SiteContentStatus;
  published_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SiteContentHistory = {
  id: string;
  document_id: string | null;
  content_key: string;
  content: Record<string, unknown>;
  status: SiteContentStatus;
  action: string;
  actor_id: string | null;
  created_at: string;
};


export type PortalUserManual = {
  id: string;
  title: string;
  description: string | null;
  pdf_url: string;
  pdf_path: string | null;
  is_active: boolean;
  sort_order: number;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
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

export type MeetingRoomReservation = {
  id: string;
  legacy_id: string | null;
  reservation_date: string;
  room: string;
  meeting_type: string;
  online_meeting_url: string | null;
  details: string | null;
  start_time: string;
  end_time: string;
  booker_name: string;
  work_group: string;
  topic: string;
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
  ups_asset_code: string | null;
  ups_received_date: string | null;
  ups_received_date_raw: string | null;
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

export type SpdServiceTicketStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING' | 'COMPLETED' | 'CANCELLED';
export type SpdServiceUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SpdServiceCategory = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SpdServiceRequestSubject = {
  id: string;
  category_id: string;
  subject: string;
  is_active: boolean;
  requires_booking_date: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SpdServiceTicket = {
  id: string;
  ticket_no: string;
  requester_id: string;
  requester_name: string;
  requester_department: string | null;
  requester_phone: string;
  category_id: string | null;
  category_name: string;
  urgency: SpdServiceUrgency;
  status: SpdServiceTicketStatus;
  subject: string;
  description: string;
  requested_service_date: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  problem_cause: string | null;
  resolution_method: string | null;
  resolution_result: string | null;
  resolution_minutes: number | null;
  created_at: string;
  updated_at: string;
};

export type SpdServiceTicketTimeline = {
  id: string;
  ticket_id: string;
  actor_id: string | null;
  action: string;
  from_status: SpdServiceTicketStatus | null;
  to_status: SpdServiceTicketStatus | null;
  note: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type SpdServiceSatisfactionSurvey = {
  id: string;
  ticket_id: string;
  requester_id: string;
  speed_rating: number;
  quality_rating: number;
  courtesy_rating: number;
  overall_rating: number;
  comment: string | null;
  created_at: string;
};

export type SpdServiceNotificationSettings = {
  id: string;
  setting_key: string;
  setting_value: string | null;
  is_secret: boolean;
  is_active: boolean;
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
          start_work_date?: string | null;
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
          actor_user_id?: string | null;
          actor_email?: string | null;
          actor_name?: string | null;
          actor_role?: string | null;
          module?: string | null;
          action: string;
          route?: string | null;
          resource_type: string;
          resource_id?: string | null;
          target_type?: string | null;
          target_id?: string | null;
          status?: string;
          error_message?: string | null;
          metadata?: Record<string, unknown> | null;
          before_data?: Record<string, unknown> | null;
          after_data?: Record<string, unknown> | null;
          ip_address?: string | null;
          user_agent?: string | null;
          request_id?: string | null;
          session_id?: string | null;
          exported_at?: string | null;
          export_status?: string;
          export_batch_id?: string | null;
          retry_count?: number;
          last_export_error?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<AuditLog, 'id'>>;
        Relationships: [];
      };
      system_settings: {
        Row: SystemSetting;
        Insert: {
          setting_key: string;
          setting_value?: Record<string, unknown>;
          description?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SystemSetting, 'setting_key' | 'created_at'>>;
        Relationships: [];
      };
      site_content_documents: {
        Row: SiteContentDocument;
        Insert: {
          id?: string;
          content_key: string;
          title?: string;
          content?: Record<string, unknown>;
          status?: SiteContentStatus;
          published_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SiteContentDocument, 'id' | 'created_at'>>;
        Relationships: [];
      };
      site_content_history: {
        Row: SiteContentHistory;
        Insert: {
          id?: string;
          document_id?: string | null;
          content_key: string;
          content?: Record<string, unknown>;
          status: SiteContentStatus;
          action: string;
          actor_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<SiteContentHistory, 'id' | 'created_at'>>;
        Relationships: [];
      };
      portal_user_manuals: {
        Row: PortalUserManual;
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          pdf_url: string;
          pdf_path?: string | null;
          is_active?: boolean;
          sort_order?: number;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<PortalUserManual, 'id' | 'created_at'>>;
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
      meeting_room_reservations: {
        Row: MeetingRoomReservation;
        Insert: {
          id?: string;
          legacy_id?: string | null;
          reservation_date: string;
          room: string;
          meeting_type?: string;
          online_meeting_url?: string | null;
          details?: string | null;
          start_time: string;
          end_time: string;
          booker_name: string;
          work_group: string;
          topic: string;
          created_by?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<MeetingRoomReservation, 'id' | 'created_at'>>;
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
          ups_asset_code?: string | null;
          ups_received_date?: string | null;
          ups_received_date_raw?: string | null;
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
      spd_service_categories: {
        Row: SpdServiceCategory;
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SpdServiceCategory, 'id' | 'created_at'>>;
        Relationships: [];
      };
      spd_service_request_subjects: {
        Row: SpdServiceRequestSubject;
        Insert: {
          id?: string;
          category_id: string;
          subject: string;
          is_active?: boolean;
          requires_booking_date?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SpdServiceRequestSubject, 'id' | 'created_at'>>;
        Relationships: [];
      };
      spd_service_tickets: {
        Row: SpdServiceTicket;
        Insert: {
          id?: string;
          ticket_no: string;
          requester_id: string;
          requester_name: string;
          requester_department?: string | null;
          requester_phone: string;
          category_id?: string | null;
          category_name: string;
          urgency?: SpdServiceUrgency;
          status?: SpdServiceTicketStatus;
          subject: string;
          description: string;
          requested_service_date?: string | null;
          assigned_to?: string | null;
          assigned_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
          problem_cause?: string | null;
          resolution_method?: string | null;
          resolution_result?: string | null;
          resolution_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SpdServiceTicket, 'id' | 'created_at'>>;
        Relationships: [];
      };
      spd_service_ticket_timeline: {
        Row: SpdServiceTicketTimeline;
        Insert: {
          id?: string;
          ticket_id: string;
          actor_id?: string | null;
          action: string;
          from_status?: SpdServiceTicketStatus | null;
          to_status?: SpdServiceTicketStatus | null;
          note?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Partial<Omit<SpdServiceTicketTimeline, 'id' | 'ticket_id' | 'created_at'>>;
        Relationships: [];
      };
      spd_service_satisfaction_surveys: {
        Row: SpdServiceSatisfactionSurvey;
        Insert: {
          id?: string;
          ticket_id: string;
          requester_id: string;
          speed_rating: number;
          quality_rating: number;
          courtesy_rating: number;
          overall_rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<SpdServiceSatisfactionSurvey, 'id' | 'ticket_id' | 'requester_id' | 'created_at'>>;
        Relationships: [];
      };
      spd_service_notification_settings: {
        Row: SpdServiceNotificationSettings;
        Insert: {
          id?: string;
          setting_key: string;
          setting_value?: string | null;
          is_secret?: boolean;
          is_active?: boolean;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SpdServiceNotificationSettings, 'id' | 'created_at'>>;
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
      generate_spd_service_ticket_no: {
        Args: {
          category_label: string;
          created_on?: string;
        };
        Returns: string;
      };
      get_spd_service_ai_chatgpt_booking_calendar: {
        Args: {
          p_start_date: string;
          p_end_date: string;
        };
        Returns: Array<Pick<SpdServiceTicket, 'id' | 'requester_name' | 'requester_department' | 'subject' | 'requested_service_date' | 'created_at'>>;
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
          p_start_work_date: string | null;
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
      site_content_status: SiteContentStatus;
      spd_service_ticket_status: SpdServiceTicketStatus;
      spd_service_urgency: SpdServiceUrgency;
    };
    CompositeTypes: Record<string, never>;
  };
};
