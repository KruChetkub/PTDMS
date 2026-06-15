-- Add annual guideline document cards to the public Home content JSON.

update public.site_content_documents
set
  content = jsonb_set(
    content,
    '{annualGuidelineCards}',
    '[
      {
        "title": "แนวทางการดำเนินงานป้องกันควบคุมโรคและภัยสุขภาพ",
        "subtitle": "ประจำปีงบประมาณ",
        "iconKey": "file",
        "color": "bg-sky-600",
        "actionLabel": "ดาวน์โหลดเอกสาร",
        "pdfUrl": "",
        "status": "published"
      }
    ]'::jsonb,
    true
  ),
  updated_at = now()
where content_key = 'public-home'
  and not (content ? 'annualGuidelineCards');
