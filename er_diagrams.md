# PTDMS ER Diagrams

เอกสารนี้สรุป Entity Relationship ของระบบ PTDMS จาก `graphify-out/GRAPH_REPORT.md`, migration ใน `supabase/migrations`, และ type definition ใน `src/types/database.types.ts` เพื่อใช้เป็นต้นทางสำหรับสร้าง `er_diagrams.html` ต่อไป

## ภาพรวมระบบ

ระบบใช้ Supabase เป็น backend หลัก โดยมี `auth.users` เป็นบัญชีผู้ใช้ของ Supabase Auth และมี `public.profiles` เป็นโปรไฟล์/บทบาท/สถานะของผู้ใช้ในระบบ PTDMS

โดเมนข้อมูลหลักแบ่งเป็น 8 กลุ่ม

| กลุ่ม | ตารางหลัก | หน้าที่ |
|---|---|---|
| Identity & RBAC | `profiles`, `login_history`, `audit_logs` | ผู้ใช้ บทบาท สถานะ และ audit |
| Training & Development | `training_records`, `certificates`, `development_analysis`, `departments`, `course_categories` | ประวัติอบรม ใบประกาศ และการวิเคราะห์พัฒนา |
| Strategy Calendar | `strategy_events`, `meeting_room_reservations` | ปฏิทินกิจกรรมและการจองห้องประชุม |
| IT Assets | `it_assets`, `it_asset_evaluation_settings` | ทะเบียนครุภัณฑ์ IT และเกณฑ์ประเมิน |
| SPD Service | `spd_service_categories`, `spd_service_tickets`, `spd_service_ticket_timeline`, `spd_service_satisfaction_surveys`, `spd_service_notification_settings` | Helpdesk / service request |
| SPD Assistant | `spd_assistant_sources`, `spd_assistant_knowledge`, `spd_assistant_page_contexts`, `spd_assistant_conversations`, `spd_assistant_messages`, `spd_assistant_feedback` | Knowledge base, conversation log, feedback |
| Site Content | `site_content_documents`, `site_content_history` | เนื้อหา public home และประวัติการแก้ไข |
| Supabase Storage | `storage.buckets`, `storage.objects` | bucket สำหรับ assistant import และ site assets |

## Global ER Diagram

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : owns

  PROFILES ||--o{ LOGIN_HISTORY : logs_in
  PROFILES ||--o{ AUDIT_LOGS : acts

  PROFILES ||--o{ TRAINING_RECORDS : owns
  PROFILES ||--o{ TRAINING_RECORDS : creates
  TRAINING_RECORDS ||--o| CERTIFICATES : has
  TRAINING_RECORDS ||--o| DEVELOPMENT_ANALYSIS : analyzed_by
  PROFILES ||--o{ DEVELOPMENT_ANALYSIS : receives

  PROFILES ||--o{ STRATEGY_EVENTS : creates
  PROFILES ||--o{ STRATEGY_EVENTS : cancels
  PROFILES ||--o{ MEETING_ROOM_RESERVATIONS : creates
  PROFILES ||--o{ MEETING_ROOM_RESERVATIONS : cancels

  PROFILES ||--o{ SPD_SERVICE_TICKETS : requests
  PROFILES ||--o{ SPD_SERVICE_TICKETS : assigned_to
  SPD_SERVICE_CATEGORIES ||--o{ SPD_SERVICE_TICKETS : categorizes
  SPD_SERVICE_TICKETS ||--o{ SPD_SERVICE_TICKET_TIMELINE : records
  SPD_SERVICE_TICKETS ||--o| SPD_SERVICE_SATISFACTION_SURVEYS : receives
  PROFILES ||--o{ SPD_SERVICE_TICKET_TIMELINE : acts
  PROFILES ||--o{ SPD_SERVICE_SATISFACTION_SURVEYS : submits
  PROFILES ||--o{ SPD_SERVICE_NOTIFICATION_SETTINGS : updates

  PROFILES ||--o{ SPD_ASSISTANT_SOURCES : creates
  SPD_ASSISTANT_SOURCES ||--o{ SPD_ASSISTANT_KNOWLEDGE : provides
  PROFILES ||--o{ SPD_ASSISTANT_KNOWLEDGE : creates
  PROFILES ||--o{ SPD_ASSISTANT_KNOWLEDGE : updates
  PROFILES ||--o{ SPD_ASSISTANT_CONVERSATIONS : starts
  SPD_ASSISTANT_CONVERSATIONS ||--o{ SPD_ASSISTANT_MESSAGES : contains
  SPD_ASSISTANT_KNOWLEDGE ||--o{ SPD_ASSISTANT_MESSAGES : matches
  SPD_ASSISTANT_MESSAGES ||--o{ SPD_ASSISTANT_FEEDBACK : receives
  PROFILES ||--o{ SPD_ASSISTANT_MESSAGES : sends
  PROFILES ||--o{ SPD_ASSISTANT_FEEDBACK : gives

  PROFILES ||--o{ SITE_CONTENT_DOCUMENTS : creates
  PROFILES ||--o{ SITE_CONTENT_DOCUMENTS : updates
  SITE_CONTENT_DOCUMENTS ||--o{ SITE_CONTENT_HISTORY : versions
  PROFILES ||--o{ SITE_CONTENT_HISTORY : acts
```

## Identity & RBAC

```mermaid
erDiagram
  AUTH_USERS {
    uuid id PK
    text email
    timestamptz created_at
  }

  PROFILES {
    uuid user_id PK,FK
    text employee_code UK
    text full_name
    text position
    text department
    text work_group
    text gender
    text education
    date birth_date
    text generation
    text employment_type
    user_role role
    profile_status status
    text avatar_url
    timestamptz created_at
    timestamptz updated_at
  }

  LOGIN_HISTORY {
    uuid id PK
    uuid user_id FK
    timestamptz login_at
    text ip_address
    text user_agent
    boolean success
  }

  AUDIT_LOGS {
    uuid id PK
    uuid actor_id FK
    text action
    text resource_type
    text resource_id
    jsonb metadata
    text ip_address
    text user_agent
    timestamptz created_at
  }

  AUTH_USERS ||--|| PROFILES : auth_profile
  PROFILES ||--o{ LOGIN_HISTORY : login_events
  PROFILES ||--o{ AUDIT_LOGS : audit_actor
```

### Enums

| Enum | Values |
|---|---|
| `user_role` | `super_admin`, `admin`, `executive`, `hr`, `personnel` |
| `profile_status` | `active`, `inactive`, `suspended` |

## Training & Development

```mermaid
erDiagram
  PROFILES {
    uuid user_id PK
    text full_name
    user_role role
    profile_status status
  }

  DEPARTMENTS {
    uuid id PK
    text name UK
    boolean active
    timestamptz created_at
  }

  COURSE_CATEGORIES {
    uuid id PK
    text category
    text subcategory
    boolean active
    timestamptz created_at
  }

  TRAINING_RECORDS {
    uuid id PK
    uuid user_id FK
    text course
    text category
    text subcategory
    text organizer
    date date
    int month
    int year
    uuid created_by FK
    timestamptz created_at
    timestamptz updated_at
  }

  CERTIFICATES {
    uuid id PK
    uuid training_id FK
    text certificate_name
    text certificate_link
    text file_path
    timestamptz created_at
  }

  DEVELOPMENT_ANALYSIS {
    uuid id PK
    uuid training_id FK
    uuid user_id FK
    text development_area
    text skill_group
    text target_direction
    timestamptz created_at
  }

  PROFILES ||--o{ TRAINING_RECORDS : owns
  PROFILES ||--o{ TRAINING_RECORDS : creates
  TRAINING_RECORDS ||--o| CERTIFICATES : certificate
  TRAINING_RECORDS ||--o| DEVELOPMENT_ANALYSIS : analysis
  PROFILES ||--o{ DEVELOPMENT_ANALYSIS : analyzed_user
```

### Training Notes

| ประเด็น | รายละเอียด |
|---|---|
| Deduplicate | `training_records` มี unique index จาก `user_id`, `lower(course)`, `date`, `lower(organizer)` |
| Certificate | migration เพิ่ม unique constraint ที่ `certificates.training_id` ทำให้ความสัมพันธ์ตั้งใจเป็น 1 training ต่อ 0..1 certificate |
| Development analysis | migration เพิ่ม unique constraint ที่ `development_analysis.training_id` ทำให้ 1 training ต่อ 0..1 analysis |
| Department/category | ปัจจุบัน `profiles.department`, `training_records.category`, `training_records.subcategory` เก็บเป็น text ไม่ได้ FK ไป `departments` หรือ `course_categories` |

## Strategy Calendar & Meeting Rooms

```mermaid
erDiagram
  PROFILES {
    uuid user_id PK
    text full_name
  }

  STRATEGY_EVENTS {
    uuid id PK
    text title
    text description
    date event_date
    time start_time
    time end_time
    date end_date
    text color
    text location
    text owner_work_group
    strategy_event_status status
    uuid created_by FK
    timestamptz cancelled_at
    uuid cancelled_by FK
    timestamptz created_at
    timestamptz updated_at
  }

  MEETING_ROOM_RESERVATIONS {
    uuid id PK
    text legacy_id UK
    date reservation_date
    text room
    time start_time
    time end_time
    text booker_name
    text work_group
    text topic
    uuid created_by FK
    timestamptz cancelled_at
    uuid cancelled_by FK
    timestamptz created_at
    timestamptz updated_at
  }

  PROFILES ||--o{ STRATEGY_EVENTS : created_by
  PROFILES ||--o{ STRATEGY_EVENTS : cancelled_by
  PROFILES ||--o{ MEETING_ROOM_RESERVATIONS : created_by
  PROFILES ||--o{ MEETING_ROOM_RESERVATIONS : cancelled_by
```

### Enums และ Constraints

| Entity | Rule |
|---|---|
| `strategy_event_status` | `draft`, `published`, `cancelled` |
| `strategy_events` | `end_time >= start_time` เมื่อมีเวลาเริ่มและสิ้นสุด |
| `meeting_room_reservations.room` | `ห้องประชุม 1`, `ห้องประชุม 2`, `ห้องสมุด` |
| `meeting_room_reservations` | `end_time > start_time` |

## IT Asset Management

```mermaid
erDiagram
  AUTH_USERS {
    uuid id PK
  }

  IT_ASSETS {
    uuid id PK
    int source_row_number
    text asset_code UK
    text computer_name
    text machine_brand_model
    text asset_type
    text operating_system
    text office_software
    text cpu
    text mainboard
    numeric memory_gb
    text graphics
    text disk1_type
    text disk1_product
    int disk1_hours
    text disk2_type
    text disk2_product
    int disk2_hours
    int total_disk_hours
    text user_name
    text user_position
    text work_group
    date received_date
    text source_asset_code
    timestamptz created_at
    timestamptz updated_at
  }

  IT_ASSET_EVALUATION_SETTINGS {
    text id PK
    jsonb criteria
    uuid updated_by FK
    timestamptz created_at
    timestamptz updated_at
  }

  AUTH_USERS ||--o{ IT_ASSET_EVALUATION_SETTINGS : updates
```

### IT Asset Notes

`it_assets` ยังไม่ผูก FK กับ `profiles` เพราะข้อมูลผู้ถือครองเก็บเป็น `user_name`, `user_position`, `work_group` แบบ snapshot จากทะเบียนเดิม เหมาะกับการนำเข้าและตรวจสอบครุภัณฑ์ แต่ถ้าต้องการเชื่อม user จริงในอนาคตควรเพิ่ม `assigned_user_id uuid references profiles(user_id)` แยกจาก snapshot fields

## SPD Service Management

```mermaid
erDiagram
  PROFILES {
    uuid user_id PK
    text full_name
    text department
    text work_group
  }

  SPD_SERVICE_CATEGORIES {
    uuid id PK
    text name UK
    text description
    boolean is_active
    int sort_order
    timestamptz created_at
    timestamptz updated_at
  }

  SPD_SERVICE_TICKETS {
    uuid id PK
    text ticket_no UK
    uuid requester_id FK
    text requester_name
    text requester_department
    text requester_phone
    uuid category_id FK
    text category_name
    spd_service_urgency urgency
    spd_service_ticket_status status
    text subject
    text description
    uuid assigned_to FK
    timestamptz assigned_at
    timestamptz started_at
    timestamptz completed_at
    timestamptz cancelled_at
    text problem_cause
    text resolution_method
    text resolution_result
    int resolution_minutes
    timestamptz created_at
    timestamptz updated_at
  }

  SPD_SERVICE_TICKET_TIMELINE {
    uuid id PK
    uuid ticket_id FK
    uuid actor_id FK
    text action
    spd_service_ticket_status from_status
    spd_service_ticket_status to_status
    text note
    jsonb metadata
    timestamptz created_at
  }

  SPD_SERVICE_SATISFACTION_SURVEYS {
    uuid id PK
    uuid ticket_id FK
    uuid requester_id FK
    int speed_rating
    int quality_rating
    int courtesy_rating
    int overall_rating
    text comment
    timestamptz created_at
  }

  SPD_SERVICE_NOTIFICATION_SETTINGS {
    uuid id PK
    text setting_key UK
    text setting_value
    boolean is_secret
    boolean is_active
    uuid updated_by FK
    timestamptz created_at
    timestamptz updated_at
  }

  PROFILES ||--o{ SPD_SERVICE_TICKETS : requester
  PROFILES ||--o{ SPD_SERVICE_TICKETS : assignee
  SPD_SERVICE_CATEGORIES ||--o{ SPD_SERVICE_TICKETS : category
  SPD_SERVICE_TICKETS ||--o{ SPD_SERVICE_TICKET_TIMELINE : timeline
  PROFILES ||--o{ SPD_SERVICE_TICKET_TIMELINE : actor
  SPD_SERVICE_TICKETS ||--o| SPD_SERVICE_SATISFACTION_SURVEYS : survey
  PROFILES ||--o{ SPD_SERVICE_SATISFACTION_SURVEYS : requester
  PROFILES ||--o{ SPD_SERVICE_NOTIFICATION_SETTINGS : updated_by
```

### Enums

| Enum | Values |
|---|---|
| `spd_service_ticket_status` | `NEW`, `ASSIGNED`, `IN_PROGRESS`, `WAITING`, `COMPLETED`, `CANCELLED` |
| `spd_service_urgency` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |

## SPD Assistant

```mermaid
erDiagram
  PROFILES {
    uuid user_id PK
    user_role role
  }

  SPD_ASSISTANT_SOURCES {
    uuid id PK
    text source_key UK
    text title
    text source_type
    text file_path
    text version
    boolean active
    uuid created_by FK
    timestamptz created_at
    timestamptz updated_at
  }

  SPD_ASSISTANT_KNOWLEDGE {
    uuid id PK
    uuid source_id FK
    text title
    text module
    text route
    text[] keywords
    text question
    text answer
    user_role[] related_roles
    text language
    text content_type
    int priority
    boolean active
    text search_text
    uuid created_by FK
    uuid updated_by FK
    timestamptz created_at
    timestamptz updated_at
  }

  SPD_ASSISTANT_PAGE_CONTEXTS {
    uuid id PK
    text route UK
    text page_name_th
    text module_name_th
    text description_th
    text help_text_th
    text[] available_actions_th
    text[] common_questions_th
    user_role[] related_roles
    boolean active
    timestamptz created_at
    timestamptz updated_at
  }

  SPD_ASSISTANT_CONVERSATIONS {
    uuid id PK
    uuid user_id FK
    text route
    text page_name_th
    text module_name_th
    user_role user_role
    timestamptz created_at
  }

  SPD_ASSISTANT_MESSAGES {
    uuid id PK
    uuid conversation_id FK
    uuid user_id FK
    text role
    text content
    text route
    uuid matched_knowledge_id FK
    numeric score
    timestamptz created_at
  }

  SPD_ASSISTANT_FEEDBACK {
    uuid id PK
    uuid message_id FK
    uuid user_id FK
    text rating
    text comment
    timestamptz created_at
  }

  PROFILES ||--o{ SPD_ASSISTANT_SOURCES : created_by
  SPD_ASSISTANT_SOURCES ||--o{ SPD_ASSISTANT_KNOWLEDGE : source
  PROFILES ||--o{ SPD_ASSISTANT_KNOWLEDGE : created_by
  PROFILES ||--o{ SPD_ASSISTANT_KNOWLEDGE : updated_by
  PROFILES ||--o{ SPD_ASSISTANT_CONVERSATIONS : user
  SPD_ASSISTANT_CONVERSATIONS ||--o{ SPD_ASSISTANT_MESSAGES : messages
  PROFILES ||--o{ SPD_ASSISTANT_MESSAGES : user
  SPD_ASSISTANT_KNOWLEDGE ||--o{ SPD_ASSISTANT_MESSAGES : matched_knowledge
  SPD_ASSISTANT_MESSAGES ||--o{ SPD_ASSISTANT_FEEDBACK : feedback
  PROFILES ||--o{ SPD_ASSISTANT_FEEDBACK : user
```

### Assistant Notes

| ประเด็น | รายละเอียด |
|---|---|
| Search | `spd_assistant_knowledge.search_text` ถูกสร้างจาก trigger เพื่อใช้ค้นหาแบบ trigram |
| Access control | Knowledge และ page contexts ใช้ `related_roles user_role[]` ร่วมกับ RLS |
| Conversation | ผู้ใช้เห็น conversation/message ของตัวเอง ส่วน admin/super_admin ใช้เพื่อ governance |
| Feedback | rating จำกัดเป็น `helpful` หรือ `not_helpful` |

## Site Content

```mermaid
erDiagram
  PROFILES {
    uuid user_id PK
    user_role role
  }

  SITE_CONTENT_DOCUMENTS {
    uuid id PK
    text content_key UK
    text title
    jsonb content
    site_content_status status
    timestamptz published_at
    uuid created_by FK
    uuid updated_by FK
    timestamptz created_at
    timestamptz updated_at
  }

  SITE_CONTENT_HISTORY {
    uuid id PK
    uuid document_id FK
    text content_key
    jsonb content
    site_content_status status
    text action
    uuid actor_id FK
    timestamptz created_at
  }

  PROFILES ||--o{ SITE_CONTENT_DOCUMENTS : created_by
  PROFILES ||--o{ SITE_CONTENT_DOCUMENTS : updated_by
  SITE_CONTENT_DOCUMENTS ||--o{ SITE_CONTENT_HISTORY : history
  PROFILES ||--o{ SITE_CONTENT_HISTORY : actor
```

### Enums

| Enum | Values |
|---|---|
| `site_content_status` | `published`, `draft`, `scheduled` |

## Storage Buckets

Supabase Storage ไม่ใช่ public schema entity หลักของระบบ แต่มี bucket/policy สำคัญที่ควรแสดงในเอกสาร HTML

```mermaid
erDiagram
  STORAGE_BUCKETS {
    text id PK
    text name
    boolean public
    bigint file_size_limit
    text[] allowed_mime_types
  }

  STORAGE_OBJECTS {
    uuid id PK
    text bucket_id FK
    text name
    uuid owner
    jsonb metadata
    timestamptz created_at
    timestamptz updated_at
  }

  STORAGE_BUCKETS ||--o{ STORAGE_OBJECTS : contains
```

| Bucket | Public | Allowed MIME Types | ใช้กับ |
|---|---:|---|---|
| `spd-assistant-imports` | false | `application/json`, `text/markdown`, `text/plain` | นำเข้าฐานความรู้ SPD Assistant |
| `site-content-assets` | true | `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml` | รูป/โลโก้/asset สำหรับ public website |

## Relationship Matrix

| From | To | Cardinality | FK / Field | Delete behavior |
|---|---|---:|---|---|
| `auth.users` | `profiles` | 1:1 | `profiles.user_id` | cascade |
| `profiles` | `login_history` | 1:N | `login_history.user_id` | set null |
| `profiles` | `audit_logs` | 1:N | `audit_logs.actor_id` | set null |
| `profiles` | `training_records` | 1:N | `training_records.user_id` | cascade |
| `profiles` | `training_records` | 1:N | `training_records.created_by` | set null |
| `training_records` | `certificates` | 1:0..1 | `certificates.training_id` | cascade |
| `training_records` | `development_analysis` | 1:0..1 | `development_analysis.training_id` | cascade |
| `profiles` | `development_analysis` | 1:N | `development_analysis.user_id` | cascade |
| `profiles` | `strategy_events` | 1:N | `created_by`, `cancelled_by` | set null |
| `profiles` | `meeting_room_reservations` | 1:N | `created_by`, `cancelled_by` | set null |
| `profiles` | `spd_service_tickets` | 1:N | `requester_id` | restrict |
| `profiles` | `spd_service_tickets` | 1:N | `assigned_to` | set null |
| `spd_service_categories` | `spd_service_tickets` | 1:N | `category_id` | set null |
| `spd_service_tickets` | `spd_service_ticket_timeline` | 1:N | `ticket_id` | cascade |
| `spd_service_tickets` | `spd_service_satisfaction_surveys` | 1:0..1 | `ticket_id` | cascade |
| `profiles` | `spd_service_ticket_timeline` | 1:N | `actor_id` | set null |
| `profiles` | `spd_service_satisfaction_surveys` | 1:N | `requester_id` | restrict |
| `profiles` | `spd_service_notification_settings` | 1:N | `updated_by` | set null |
| `profiles` | `spd_assistant_sources` | 1:N | `created_by` | set null |
| `spd_assistant_sources` | `spd_assistant_knowledge` | 1:N | `source_id` | set null |
| `profiles` | `spd_assistant_knowledge` | 1:N | `created_by`, `updated_by` | set null |
| `profiles` | `spd_assistant_conversations` | 1:N | `user_id` | set null |
| `spd_assistant_conversations` | `spd_assistant_messages` | 1:N | `conversation_id` | cascade |
| `profiles` | `spd_assistant_messages` | 1:N | `user_id` | set null |
| `spd_assistant_knowledge` | `spd_assistant_messages` | 1:N | `matched_knowledge_id` | set null |
| `spd_assistant_messages` | `spd_assistant_feedback` | 1:N | `message_id` | cascade |
| `profiles` | `spd_assistant_feedback` | 1:N | `user_id` | set null |
| `profiles` | `site_content_documents` | 1:N | `created_by`, `updated_by` | set null |
| `site_content_documents` | `site_content_history` | 1:N | `document_id` | cascade |
| `profiles` | `site_content_history` | 1:N | `actor_id` | set null |
| `auth.users` | `it_asset_evaluation_settings` | 1:N | `updated_by` | set null |

## Tables Without Hard FK

| Table / Field | เหตุผลหรือสถานะปัจจุบัน | ข้อเสนอหากต้อง normalize |
|---|---|---|
| `profiles.department` | เก็บชื่อหน่วยงานเป็น text | เพิ่ม `department_id uuid references departments(id)` |
| `profiles.work_group` | เก็บกลุ่มงานเป็น text | เพิ่มตาราง `work_groups` หรือใช้ `departments` แบบ hierarchy |
| `training_records.category`, `subcategory` | เก็บ snapshot ของ category/subcategory | เพิ่ม `course_category_id uuid references course_categories(id)` |
| `it_assets.user_name`, `user_position`, `work_group` | snapshot จากทะเบียนครุภัณฑ์ | เพิ่ม `assigned_user_id uuid references profiles(user_id)` |
| `meeting_room_reservations.booker_name`, `work_group` | เก็บชื่อผู้จองแบบ text เพื่อรองรับข้อมูล legacy | เพิ่ม `booker_user_id uuid references profiles(user_id)` |

## Recommended HTML Sections

เมื่อนำไปสร้าง `er_diagrams.html` แนะนำให้แบ่งหน้าเป็น tabs หรือ anchor sections ดังนี้

1. Overview
2. Global ER
3. Identity & RBAC
4. Training & Development
5. Strategy Calendar
6. IT Assets
7. SPD Service
8. SPD Assistant
9. Site Content
10. Storage
11. Relationship Matrix
12. Normalization Notes

## Source References

| Source | ใช้สำหรับ |
|---|---|
| `graphify-out/GRAPH_REPORT.md` | แยก community/domain ของระบบ |
| `supabase/migrations/202605080001_auth_rbac_foundation.sql` | Auth, profiles, login history, audit logs |
| `supabase/migrations/202605080002_training_domain_schema.sql` | Training, certificates, development analysis |
| `supabase/migrations/202605260001_extend_profiles_user_management.sql` | Profile demographic fields |
| `supabase/migrations/202606040001_create_strategy_events.sql` | Strategy calendar |
| `supabase/migrations/202606090001_create_it_assets.sql` | IT assets |
| `supabase/migrations/202606090002_create_spd_assistant.sql` | SPD Assistant |
| `supabase/migrations/202606100001_create_it_asset_evaluation_settings.sql` | IT asset evaluation settings |
| `supabase/migrations/202606110001_create_spd_service.sql` | SPD service management |
| `supabase/migrations/202606120001_create_meeting_room_reservations.sql` | Meeting room reservations |
| `supabase/migrations/202606150001_create_site_content.sql` | Site content documents/history |
| `supabase/migrations/202606150007_create_site_content_assets.sql` | Storage bucket/policies for site assets |
| `src/types/database.types.ts` | Frontend type names and current app-facing schema |
