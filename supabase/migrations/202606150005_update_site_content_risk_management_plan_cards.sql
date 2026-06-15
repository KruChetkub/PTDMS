-- Add risk-management plan document cards to the public Home content JSON.

update public.site_content_documents
set
  content = jsonb_set(
    content,
    '{riskManagementPlanCards}',
    '[
      {
        "title": "แผนบริหารความเสี่ยงยุทธศาสตร์",
        "subtitle": "กรมควบคุมโรค",
        "iconKey": "file",
        "color": "bg-violet-600",
        "actionLabel": "ดูแผน/เอกสาร",
        "pdfUrl": "",
        "status": "published"
      }
    ]'::jsonb,
    true
  ),
  updated_at = now()
where content_key = 'public-home'
  and not (content ? 'riskManagementPlanCards');
