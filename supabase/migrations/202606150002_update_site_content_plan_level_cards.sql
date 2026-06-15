-- Add plan-level document cards to the public Home content JSON.

update public.site_content_documents
set
  content = jsonb_set(
    content,
    '{planLevelCards}',
    '[
      {
        "title": "ยุทธศาสตร์ชาติ 20 ปี",
        "subtitle": "พ.ศ. 2561 - 2580",
        "iconKey": "landmark",
        "color": "bg-blue-600",
        "actionLabel": "รายละเอียด",
        "pdfUrl": "",
        "status": "published"
      },
      {
        "title": "แผนแม่บทภายใต้ยุทธศาสตร์ชาติ",
        "subtitle": "พ.ศ. 2566 - 2580",
        "description": "ฉบับแก้ไขเพิ่มเติม",
        "iconKey": "goal",
        "color": "bg-teal-600",
        "actionLabel": "รายละเอียด",
        "pdfUrl": "",
        "status": "published"
      },
      {
        "title": "แผนการปฏิรูปประเทศ",
        "subtitle": "ฉบับปรับปรุง",
        "iconKey": "puzzle",
        "color": "bg-amber-500",
        "actionLabel": "รายละเอียด",
        "pdfUrl": "",
        "status": "published"
      },
      {
        "title": "แผนพัฒนาเศรษฐกิจและสังคมแห่งชาติ ฉบับที่ 13",
        "subtitle": "พ.ศ. 2566 - 2570",
        "iconKey": "growth",
        "color": "bg-violet-600",
        "actionLabel": "รายละเอียด",
        "pdfUrl": "",
        "status": "published"
      },
      {
        "title": "แผนพัฒนาสุขภาพแห่งชาติ ฉบับที่ 13",
        "subtitle": "",
        "iconKey": "heart",
        "color": "bg-pink-500",
        "actionLabel": "รายละเอียด",
        "pdfUrl": "",
        "status": "published"
      },
      {
        "title": "ยุทธศาสตร์ชาติ ระยะ 20 ปี ด้านสาธารณสุข",
        "subtitle": "พ.ศ. 2560 - 2579",
        "iconKey": "health",
        "color": "bg-emerald-600",
        "actionLabel": "รายละเอียด",
        "pdfUrl": "",
        "status": "published"
      },
      {
        "title": "แผนปฏิบัติการด้านการป้องกันควบคุมโรคและภัยสุขภาพของประเทศ 20 ปี",
        "subtitle": "พ.ศ. 2561 - 2580",
        "description": "ระยะที่ 2 สร้างความเข้มแข็ง",
        "iconKey": "shield-users",
        "color": "bg-teal-600",
        "actionLabel": "รายละเอียด",
        "pdfUrl": "",
        "status": "published"
      }
    ]'::jsonb,
    true
  ),
  updated_at = now()
where content_key = 'public-home'
  and not (content ? 'planLevelCards');
