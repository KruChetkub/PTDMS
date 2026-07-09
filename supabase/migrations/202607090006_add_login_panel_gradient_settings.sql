-- Add configurable Login panel gradient colors.

update public.site_content_documents
set content = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        content,
        '{loginPage}',
        coalesce(
          content->'loginPage',
          '{"sideImageUrl":"","sideImageAlt":"ภาพประกอบหน้าเข้าสู่ระบบ SmartDSP","backgroundImageUrl":"/SmartDSP.png","backgroundImageEnabled":true,"backgroundOverlayOpacity":68,"loginPanelGradientEnabled":true,"loginPanelGradientFrom":"#18B8B4","loginPanelGradientTo":"#0B3F91","status":"published"}'::jsonb
        ),
        true
      ),
      '{loginPage,loginPanelGradientEnabled}',
      coalesce(content->'loginPage'->'loginPanelGradientEnabled', 'true'::jsonb),
      true
    ),
    '{loginPage,loginPanelGradientFrom}',
    coalesce(content->'loginPage'->'loginPanelGradientFrom', '"#18B8B4"'::jsonb),
    true
  ),
  '{loginPage,loginPanelGradientTo}',
  coalesce(content->'loginPage'->'loginPanelGradientTo', '"#0B3F91"'::jsonb),
  true
)
where content_key = 'public-home';
