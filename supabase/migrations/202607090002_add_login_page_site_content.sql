-- Add Login page image settings to public Home site content.

update public.site_content_documents
set content = jsonb_set(
  content,
  '{loginPage}',
  coalesce(
    content->'loginPage',
    '{"sideImageUrl":"","sideImageAlt":"ภาพประกอบหน้าเข้าสู่ระบบ SmartDSP","backgroundImageUrl":"/SmartDSP.png","backgroundImageEnabled":true,"backgroundOverlayOpacity":68,"loginPanelGradientEnabled":true,"loginPanelGradientFrom":"#18B8B4","loginPanelGradientTo":"#0B3F91","status":"published"}'::jsonb
  ),
  true
)
where content_key = 'public-home';
