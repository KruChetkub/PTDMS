-- Add executive policy document cards to the public Home content JSON.

update public.site_content_documents
set
  content = jsonb_set(
    content,
    '{executivePolicyCards}',
    '[
      {
        "title": "นโยบายรัฐมนตรีว่าการกระทรวงสาธารณสุข",
        "subtitle": "นโยบาย รมว.",
        "iconKey": "shield-users",
        "color": "bg-orange-500",
        "actionLabel": "อ่านเพิ่มเติม",
        "pdfUrl": "",
        "status": "published"
      },
      {
        "title": "นโยบายอธิบดีกรมควบคุมโรค",
        "subtitle": "นโยบาย อธิบดี",
        "iconKey": "shield-users",
        "color": "bg-red-500",
        "actionLabel": "อ่านเพิ่มเติม",
        "pdfUrl": "",
        "status": "published"
      }
    ]'::jsonb,
    true
  ),
  updated_at = now()
where content_key = 'public-home'
  and not (content ? 'executivePolicyCards');
