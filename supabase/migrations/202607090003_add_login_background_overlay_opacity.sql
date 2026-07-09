-- Add background overlay opacity setting for Login page background image.

update public.site_content_documents
set content = jsonb_set(
  jsonb_set(
    content,
    '{loginPage}',
    coalesce(
      content->'loginPage',
      '{"sideImageUrl":"","sideImageAlt":"ภาพประกอบหน้าเข้าสู่ระบบ SmartDSP","backgroundImageUrl":"/SmartDSP.png","backgroundImageEnabled":true,"backgroundOverlayOpacity":68,"loginPanelGradientEnabled":true,"loginPanelGradientFrom":"#18B8B4","loginPanelGradientTo":"#0B3F91","status":"published"}'::jsonb
    ),
    true
  ),
  '{loginPage,backgroundOverlayOpacity}',
  coalesce(content->'loginPage'->'backgroundOverlayOpacity', '68'::jsonb),
  true
)
where content_key = 'public-home';
