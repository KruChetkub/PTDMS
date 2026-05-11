-- Add unique constraints to allow upsert by training_id
alter table public.certificates add constraint certificates_training_id_key unique (training_id);
alter table public.development_analysis add constraint development_analysis_training_id_key unique (training_id);
