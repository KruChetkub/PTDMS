-- Add disease-control plan document cards to the public Home content JSON.

update public.site_content_documents
set
  content = jsonb_set(
    content,
    '{diseaseControlPlanCards}',
    '[
      {
        "title": "แผนงานด้านการป้องกันควบคุมโรคและภัยสุขภาพ ระยะ 5 ปี",
        "subtitle": "พ.ศ. 2566 - 2570",
        "description": "Pinkbook",
        "iconKey": "file",
        "color": "bg-rose-500",
        "actionLabel": "เปิดเอกสาร",
        "pdfUrl": "",
        "status": "published"
      }
    ]'::jsonb,
    true
  ),
  updated_at = now()
where content_key = 'public-home'
  and not (content ? 'diseaseControlPlanCards');
