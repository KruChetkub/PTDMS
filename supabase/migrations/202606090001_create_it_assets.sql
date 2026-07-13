-- IT Asset Dashboard domain.
-- This module is intentionally separate from the PTDMS training and strategy calendar domains.

create table if not exists public.it_assets (
  id uuid primary key default gen_random_uuid(),
  source_row_number integer,
  asset_code text not null,
  computer_name text,
  machine_brand_model text,
  asset_type text,
  operating_system text,
  office_software text,
  cpu text,
  mainboard text,
  memory_gb numeric(8,2),
  graphics text,
  video_memory text,
  disk1_type text,
  disk1_product text,
  disk1_drive_letters text,
  disk1_hours integer,
  disk2_type text,
  disk2_product text,
  disk2_drive_letters text,
  disk2_hours integer,
  total_disk_hours integer,
  monitor1_brand text,
  monitor1_manufacture_date text,
  monitor2_brand text,
  monitor2_serial_number text,
  monitor2_manufacture_date text,
  user_name text,
  user_position text,
  work_group text,
  received_date date,
  received_date_raw text,
  source_asset_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint it_assets_asset_code_not_blank check (length(trim(asset_code)) > 0),
  constraint it_assets_asset_code_unique unique (asset_code)
);

create index if not exists idx_it_assets_asset_type on public.it_assets(asset_type);
create index if not exists idx_it_assets_operating_system on public.it_assets(operating_system);
create index if not exists idx_it_assets_work_group on public.it_assets(work_group);
create index if not exists idx_it_assets_received_date on public.it_assets(received_date);

drop trigger if exists set_it_assets_updated_at on public.it_assets;
create trigger set_it_assets_updated_at
before update on public.it_assets
for each row
execute function public.set_updated_at();

alter table public.it_assets enable row level security;

drop policy if exists "it assets active users read" on public.it_assets;
create policy "it assets active users read"
on public.it_assets
for select
to authenticated
using (public.current_user_role() is not null);

drop policy if exists "it assets admin write" on public.it_assets;
create policy "it assets admin write"
on public.it_assets
for all
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

grant select on public.it_assets to authenticated;
grant insert, update, delete on public.it_assets to authenticated;

insert into public.it_assets (
  source_row_number,
  asset_code,
  computer_name,
  machine_brand_model,
  asset_type,
  operating_system,
  office_software,
  cpu,
  mainboard,
  memory_gb,
  graphics,
  video_memory,
  disk1_type,
  disk1_product,
  disk1_drive_letters,
  disk1_hours,
  disk2_type,
  disk2_product,
  disk2_drive_letters,
  disk2_hours,
  total_disk_hours,
  monitor1_brand,
  monitor1_manufacture_date,
  monitor2_brand,
  monitor2_serial_number,
  monitor2_manufacture_date,
  user_name,
  user_position,
  work_group,
  received_date,
  received_date_raw,
  source_asset_code
) values
  (1, '06-7440-001-00014(66)', 'DSP-PEX', 'LENOVO 11RMS01H00', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'AMD Ryzen 7 4700G', 'LENOVO 11RMS01H00', 8, 'AMD Radeon Vega', '512 MBytes of DDR4 SDRAM', 'NVMe', 'WD PC SN740 SDDQNQD-512G-1001', 'C:, D:', 1390, null, null, null, null, 1390, 'HP P201', 'Week: 15, Year: 2015', 'Lenovo E20-30', 'VY960448', 'Week: 35, Year: 2022', 'นายตุลวัฒน์ พูนเพิ่มสุขสมบัติ (เป๊ก)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มยุทธศาสตร์และพัฒนาองค์กร', '2023-01-04', '04/01/2566', '06-7440-001-00014(66)'),
  (2, '0404-038.1-297-63', 'DESKTOP-8CKQT7C', 'Acer Veriton ES2735G', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i7-9700', 'Acer Veriton ES2735G', 8, 'Intel UHD Graphics 630', '4274934 KBytes of SDRAM', 'NVMe', 'HFM512GDJTNG-8310A', 'C:, D:', 2659, null, null, null, null, 2659, 'Acer V246HL', 'Week: 24, Year: 2020', null, null, null, 'นายปุลวัฒน์ พุ่มเรือง (เติ้ล)', 'หัวหน้ากลุ่มนักวิเคราะห์นโยบายและแผนชำนาญการ', 'กลุ่มยุทธศาสตร์และพัฒนาองค์กร', '2020-09-15', '15/09/2563', '0404-038.1-297-63'),
  (3, '0404-038.1-301(63)', 'DSP_USER', 'Acer Veriton ES2735G', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i7-9700', 'Acer Veriton ES2735G', 12, 'NVIDIA NVS 310', '1024 MBytes of DDR3 SDRAM [Hynix]', 'NVMe', 'HFM512GDJTNG-8310A', 'C:, D:, N:', 2687, 'HDD', 'Seagate ST1000DM010-2EP102 7200 RPM', 'E:, F:', 7728, 10415, 'Acer V246HL', 'Week: 24, Year: 2020', null, null, null, 'นายอชิตพล สุวรรณราช (เพชร)', 'เจ้าพนักงานคอมพิวเตอร์', 'กลุ่มยุทธศาสตร์และพัฒนาองค์กร', null, null, '0404-038.1-301(63)'),
  (4, '0407-038.1-012-64', 'DESKTOP-JG0J8LN', 'ASUS ASUS EXPERTCENTER D700SC_D700SC', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i5-10500', 'ASUS D700SC', 8, 'NVIDIA GeForce GT 730', '2048 MBytes of GDDR5 SDRAM [Samsung]', 'NVMe', 'INTEL SSDPEKNU512GZ', 'C:, D:', 5596, null, null, null, null, 5596, 'Acer V206HQLB', 'Week: 48, Year: 2019', null, null, null, 'นางสาวมินตรา สายพิมพ์ (ดาว)', 'นักทรัพยากรบุคคล', 'กลุ่มยุทธศาสตร์และพัฒนาองค์กร', null, null, '0407-038.1-012-64'),
  (5, '0407-038.1-013-66', 'DSP-KAL', 'ASUS ASUS EXPERTCENTER D700SC_D700SC', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i5-10500', 'ASUS D700SC', 8, 'NVIDIA GeForce GT 730', '2048 MBytes of GDDR5 SDRAM [Samsung]', 'NVMe', 'INTEL SSDPEKNU512GZ', 'C:, D:', 6764, null, null, null, null, 6764, 'ASUS C1241Q', 'Week: 29, Year: 2021', null, null, null, 'นางสาวกัลยา กาบแก้ว (กัล)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มยุทธศาสตร์และพัฒนาองค์กร', null, null, '0407-038.1-013-66'),
  (6, '06-7440-001-00028(66)', 'DESKTOP-CAITCBH', 'HP HP Pro Tower 280 G9 E PCI Desktop PC', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i7-14700', 'HP 8B26', 16, 'Intel UHD Graphics', '8359248 KBytes of SDRAM', 'NVMe', 'WD PC SN5000S SDEPNSJ-512G-1006', 'C:', 13, null, null, null, null, 13, 'HP 324pf', 'Week: 37, Year: 2025', null, null, null, 'นายพิเชษฐ์ ศรีพิชัย (เชษฐ์)', 'นักวิชาการคอมพิวเตอร์', 'กลุ่มยุทธศาสตร์และพัฒนาองค์กร', null, null, '06-7440-001-00028(66)'),
  (7, '06-7440-001-00012(66)', 'DSP-EAKGACHAI', 'LENOVO 11RMS01J00', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'AMD Ryzen 5 4600G', 'LENOVO 3752', 8, 'AMD Radeon Vega', '512 MBytes of DDR4 SDRAM', 'NVMe', 'SKHynix_HFM256GD3HX015N', 'C:, D:', 3595, null, null, null, null, 3595, 'Lenovo E20-30', 'Week: 35, Year: 2022', null, null, null, 'นายอภิณัฐ เจ้ยทองศรี (โฟโต้)', 'นักวิชาการสาธารณสุขปฏิบัติการ', 'กลุ่มพัฒนาและบริหารยุทธศาสตร์', null, null, '06-7440-001-00012(66)'),
  (8, '06-7440-001-00013(66)', 'DSP_AE', 'LENOVO 11RMS01H00', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'AMD Ryzen 7 4700G', 'AMD Pro 565', 8, 'AMD Radeon Vega', '512 MBytes of DDR4 SDRAM', 'NVMe', 'WD PC SN740 SDDQNQD-512G-1001', 'C:, D:', 1361, 'HDD', 'Seagate ST1000DM003-1ER162', 'F:, G:, H:', 13975, 15336, 'Lenovo E20-30', 'Week: 35, Year: 2022', null, null, null, 'นายนัฐวุธ แก้วสมบัติ (เอ๋)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มพัฒนาและบริหารยุทธศาสตร์', null, null, '06-7440-001-00013(66)'),
  (9, '06-7440-001-00021(67)', 'DSP-PHATTARAPOR', 'LENOVO 12JB0032TA', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i5-13400', 'LENOVO 332A', 8, 'Intel UHD Graphics 730', '4132316 KBytes of SDRAM', 'NVMe', 'SAMSUNG MZVL4256HBJD-00BLL', 'C:, D:', 2605, 'HDD', 'Seagate ST1000DM010-2EP102', 'E:, F:, G:', 8483, 11088, 'Lenovo S24e-20', 'Week: 4, Year: 2024', null, null, null, 'นางสาวภัทราภรณ์ เครือกุณา (อ้อ)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มพัฒนาและบริหารยุทธศาสตร์', null, null, '06-7440-001-00021(67)'),
  (10, '06-7440-00019(67)', 'DESKTOP-8LHL0LU', 'HP HP Pro Tower 280 G9 E PCI Desktop PC', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i7-13700', 'HP 8B3D', 8, 'Intel UHD Graphics', '4163792 KBytes of SDRAM', 'NVMe', 'SAMSUNG MZVL2512HCJQ-00BH1', 'C:', 2085, null, null, null, null, 2085, 'HP P24v G5', 'Week: 22, Year: 2023', null, null, null, 'นางสาวกุลภัสสรณ์ ศิริมนัสสกุล (เชียร์)', 'หัวหน้ากลุ่มนักวิเคราะห์นโยบายและแผนชำนาญการพิเศษ', 'กลุ่มพัฒนาและบริหารยุทธศาสตร์', null, null, '06-7440-00019(67)'),
  (11, '0404-038.1-279', 'DSP-KHEMTHIDA', 'Acer Veriton X2660G', 'Desktop Computer', 'Microsoft Windows 10', 'Microsoft - 365', 'Intel Core i3-8100', 'Acer Veriton X2660G', 8, 'Intel UHD Graphics 630', null, 'SSD', 'TS512GSSD230S', 'D:', 981, 'HDD', 'Seagate ST1000DM010-2EP102', 'C:, E:', 10389, 11370, 'Acer V206HQLB', 'Week: 12, Year: 2019', null, null, null, 'นางสาวชนนิกานต์ ทุมวารีย์ (อัยอาย)', 'นักวิชาการสาธารณสุข', 'กลุ่มพัฒนาและบริหารยุทธศาสตร์', null, null, '0404-038.1-279'),
  (12, '0404-038.1-286(63)', 'DESKTOP-6AD2O6U', 'Acer Veriton ES2730G', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i3-9300', 'Acer Veriton ES2730G', 8, 'Intel UHD Graphics 630', '4265554 KBytes of SDRAM', 'SSD', 'TS512GSSD230S', 'C:, D:', 1103, 'HDD', 'Seagate ST1000DM010-2EP102', 'H:', 6915, 8018, 'Acer V206HQLB', 'Week: 48, Year: 2019', null, null, null, 'นางสาวณัฐนันท์ คงยิ่งใหญ่ (แนน)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มพัฒนาและบริหารยุทธศาสตร์', null, null, '0404-038.1-286(63)'),
  (13, '0404-038.1-290-63', 'DESKTOP-1KO1HAR', 'Acer Veriton ES2730G', 'Desktop Computer', 'Microsoft Windows 10', 'Microsoft - 365', 'Intel Core i3-9100', 'Acer Veriton ES2730G', 8, 'Intel UHD Graphics 630', '4265550 KBytes of SDRAM', 'SSD', 'TS512GSSD230S', 'C:, D:', 617, null, null, null, null, 617, 'Acer V206HQLB', 'Week: 48, Year: 2019', null, null, null, 'นางจุฑารัตน์ บุญผ่อง (เล็ก)', 'นักวิเคราะห์นโยบายและแผนชำนาญการพิเศษ', 'กลุ่มพัฒนาและบริหารยุทธศาสตร์', null, null, '0404-038.1-290-63'),
  (14, '0407-038.1-001(64)', 'DSP-AIMMI', 'ASUS ASUS EXPERTCENTER D700SC_D700SC', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i5-10500', 'ASUS D700SC', 8, 'NVIDIA GeForce GT 730', '2048 MBytes of GDDR5 SDRAM [Samsung]', 'NVMe', 'INTEL SSDPEKNU512GZ', 'C:, D:', 5898, null, null, null, null, 5898, 'ASUS C1241Q', 'Week: 29, Year: 2021', null, null, null, 'นางธารินี ศรีแก้ว (ปู)', 'นักวิชาการสาธารณสุขปฎิบัติการ', 'กลุ่มพัฒนาและบริหารยุทธศาสตร์', null, null, '0407-038.1-001(64)'),
  (15, '06-7440-001-00020(66)', 'DESKTOP-RGJU7B0', 'HP HP Pro Tower 280 G9 PCI Desktop PC', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i5-12500', 'HP 89B3', 8, 'Intel UHD Graphics 770', '4164238 KBytes of SDRAM', 'NVMe', 'WD PC SN740 SDDPNQD-256G-1006', 'C:', 191, null, null, null, null, 191, 'HP P24v G5', 'Week: 22, Year: 2023', null, null, null, 'นางสาวเวสารัช สรรพอาษา (เชอรี่)', 'หัวหน้ากลุ่มนักวิเคราะห์นโยบายและแผนชำนาญการพิเศษ', 'กลุ่มพัฒนาเครือข่ายและประสานงานพิเศษ', null, null, '06-7440-001-00020(66)'),
  (16, '06-7440-001-00023(67)', 'DSP-SIRIRAT', 'LENOVO 12JB0032TA', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i5-13400', 'LENOVO 332A', 8, 'Intel UHD Graphics 730', '4132316 KBytes of SDRAM', 'NVMe', 'SAMSUNG MZVL4256HBJD-00BLL', 'C:, D:', 2588, 'HDD', 'Seagate ST1000DM010-2EP102', 'E:, F:, G:', 8999, 11587, 'Lenovo S24e-20', 'Week: 49, Year: 2023', null, null, null, 'นายศุภณัฐ พูลแสง (เบย์)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มพัฒนาเครือข่ายและประสานงานพิเศษ', null, null, '06-7440-001-00023(67)'),
  (17, '0404-038.1-275', 'DESKTOP-7Q9N8JV', 'Acer', 'Desktop Computer', 'Microsoft Windows 10', 'Microsoft - 365', 'Intel Core i5-8400', 'Acer', 8, 'Intel UHD Graphics 630', '4013990 KBytes of SDRAM', 'SSD', 'TS512GSSD230S', 'C:', 652, 'HDD', 'Seagate ST3320418AS', 'D:', 24465, 25117, 'Acer V206HQLB', 'Week: 12, Year: 2019', null, null, null, 'นางสาวดาริกา มุสิกุล (ดา)', 'นักวิเคราะห์นโยบายและแผนชำนาญการ', 'กลุ่มพัฒนาเครือข่ายและประสานงานพิเศษ', null, null, '0404-038.1-275'),
  (18, '0404-038.1-292(63)', 'DSP_NARINK', 'Acer Veriton ES2730G', 'Desktop Computer', 'Microsoft Windows 10', 'Microsoft - 365', 'Intel Core i3-9100', 'Acer Veriton ES2730G', 4, 'Intel UHD Graphics 630', '2168398 KBytes of SDRAM', 'HDD', 'Seagate ST1000DM010-2EP102 7200 RPM', 'C:, D:', 10309, null, null, null, null, 10309, 'Acer V206HQLB', 'Week: 48, Year: 2019', null, null, null, 'นายนรินทร์ กรรณเทพ (อ้วน)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มพัฒนาเครือข่ายและประสานงานพิเศษ', null, null, '0404-038.1-292(63)'),
  (19, '0404-038.1-294(63)', 'DESKTOP-8LEUP6A', 'Acer Veriton ES2730G', 'Desktop Computer', 'Microsoft Windows 10', 'Microsoft - 365', 'Intel Core i3-9100', 'Acer Veriton ES2730G', 8, 'Intel UHD Graphics 630', '4265546 KBytes of SDRAM', 'SSD', 'TS512GSSD230S', null, 2293, 'HDD', 'Seagate ST1000DM010-2EP102', 'C:, D:, G:', 9927, 12220, 'Acer V206HQLB', 'Week: 48, Year: 2019', null, null, null, 'นายพิพัฒน์ สอนเลิศ (ธีร์)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มพัฒนาเครือข่ายและประสานงานพิเศษ', null, null, '0404-038.1-294(63)'),
  (20, '06-7440-001-00010(66)', 'DSP-POOMTAWAN', 'LENOVO 11RMS01J00', 'Desktop Computer', 'Microsoft Windows 10', 'Microsoft - 365', 'AMD Ryzen 5 4600G', 'LENOVO 3752', 8, 'AMD Radeon Vega', '512 MBytes of DDR4 SDRAM', 'NVMe', 'SKHynix_HFM256GD3HX015N', 'C:, D:', 4461, null, null, null, null, 4461, 'Lenovo E20-30', 'Week: 35, Year: 2022', null, null, null, 'นางสาวฉัตรนภา เขียวยศ (แป้ง)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มแผนปฏิบัติราชการ', null, null, '06-7440-001-00010(66)'),
  (21, '06-7440-001-00011(66)', 'DESKTOP-V348LH0', 'LENOVO 11RMS01J00', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'AMD Ryzen 5 4600G', 'LENOVO 3752', 8, 'AMD Radeon Vega', '512 MBytes of DDR4 SDRAM', 'NVMe', 'SKHynix_HFM256GD3HX015N', 'C:, D:', 4309, null, null, null, null, 4309, 'Lenovo E20-31', 'Week: 35, Year: 2022', null, null, null, 'นางสาวเบญจพร พุทธรรมมา (โม)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มแผนปฏิบัติราชการ', null, null, '06-7440-001-00011(66)'),
  (22, '06-7440-001-00018(66)', 'DSP-KANOKPORN', 'HP HP Pro Tower 280 G9 E PCI Desktop PC', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i7-13700', 'HP 8B3D', 8, 'Intel UHD Graphics', '4163790 KBytes of SDRAM', 'NVMe', 'SAMSUNG MZVL2512HCJQ-00BH1', 'C:, D:', 2591, null, null, null, null, 2591, 'HP P24v G5', 'Week: 22, Year: 2023', null, null, null, 'นางสาวกนกพร เตวะสุข (พราว)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มแผนปฏิบัติราชการ', null, null, '06-7440-001-00018(66)'),
  (23, '06-7440-001-00022(67)', 'DESKTOP-4MOKPV9', 'LENOVO 12JB0032TA', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i5-13400', 'LENOVO 332A', 8, 'Intel UHD Graphics 730', '4132310 KBytes of SDRAM', 'NVMe', 'SAMSUNG MZVL4256HBJD-00BLL', 'C:, D:', 2493, 'HDD', 'WDC WD10EZEX-08WN4A0', 'E:, F:', 11631, 14124, 'Lenovo S24e-20', 'Week: 4, Year: 2024', null, null, null, 'นางวาสนา วัฒนไกรสิทธิ์ (กอล์ฟ)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มแผนปฏิบัติราชการ', null, null, '06-7440-001-00022(67)'),
  (24, '06-7440-001-00027(67)', 'DESKTOP-4MOKPV9', 'LENOVO 12JB0035TA', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i7-13700', 'LENOVO 332A', 8, 'Intel UHD Graphics', '4132108 KBytes of SDRAM', 'NVMe', 'WD PC SN740 SDDQNQD-512G-1201', 'C:, D:', 2807, 'HDD', 'WDC WD10EZEX-08WN4A0', 'F:, G:, H:', 13078, 15885, 'Lenovo S24e-21', 'Week: 49, Year: 2023', null, null, null, 'ว่าที่ ร.ต.หญิงธัญญลักษณ์ สมจา (หยง)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มแผนปฏิบัติราชการ', null, null, '06-7440-001-00027(67)'),
  (25, '0404-038.1-277', 'DESKTOP-HCT2HL9', 'Acer Veriton X2660G', 'Desktop Computer', 'Microsoft Windows 10', 'Microsoft - 365', 'Intel Core i5-8400', 'Acer Veriton X2660G', 8, 'Intel UHD Graphics 630', '4012002 KBytes of SDRAM', 'SSD', 'WDC WDS480G2G0A-00JH30', 'C:', 8718, 'HDD', 'Seagate ST1000DM010-2EP102', 'E:', 11556, 20274, 'Acer V196HQL', 'Week: 16, Year: 2013', null, null, null, 'นางสาวจิราวรรณ อรุณฤกษ์ (กบ)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มแผนปฏิบัติราชการ', null, null, '0404-038.1-277'),
  (26, '0404-038.1-282', 'DESKTOP-DT7ESAF', 'Acer Veriton X2660G', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i3-8100', 'Acer Veriton X2660G', 8, 'Intel UHD Graphics 630', '4259790 KBytes of SDRAM', 'SSD', 'TS512GSSD230S', 'C:', 864, 'HDD', 'Seagate ST1000DM010-2EP102', 'D:, E:', 9419, 10283, 'Acer V206HQLB', 'Week: 12, Year: 2019', null, null, null, 'นางสาววรรณิภา บรรลังก์ (ก้อย)', 'นักวิเคราะห์นโยบายและแผนปฏิบัติการ', 'กลุ่มแผนปฏิบัติราชการ', null, null, '0404-038.1-282'),
  (27, '0407-038.1-014-64', 'DESKTOP-BPCGS0U', 'ASUS ASUS EXPERTCENTER D700SC_D700SC', 'Desktop Computer', 'Microsoft Windows 10', 'Microsoft - 365', 'Intel Core i5-10500', 'ASUS D700SC', 8, 'NVIDIA GeForce GT 730', '2048 MBytes of GDDR5 SDRAM [Samsung]', 'NVMe', 'INTEL SSDPEKNU512GZ', 'C:, D:', 5739, null, null, null, null, 5739, 'ASUS C1241Q', 'Week: 29, Year: 2021', null, null, null, 'นางสาวสกุณา อยู่ดี (นก)', 'หัวหน้ากลุ่มนักวิเคราะห์นโยบายและแผนชำนาญการพิเศษ', 'กลุ่มแผนปฏิบัติราชการ', null, null, 'หน.พี่นก'),
  (28, '06-7440-001-00005(66)', 'DSP_AON', 'LENOVO 11RMS01K00', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'AMD Ryzen 3 4300G', 'LENOVO 3752', 4, 'AMD Radeon Vega', '512 MBytes of DDR4 SDRAM', 'NVMe', 'SKHynix_HFM256GD3HX015N', 'C:, D:', 4753, null, null, null, null, 4753, 'Lenovo E20-30', 'Week: 35, Year: 2022', null, null, null, 'นางสาววรางคณา แจ้งธรรมมา (อ้น)', 'นักจัดการงานทั่วไป', 'กลุ่มบริหารทั่วไป', null, null, '06-7440-001-00005(66)'),
  (29, '06-7440-001-00007(66)', 'DSP_EYE', 'LENOVO 11RMS01K00', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'AMD Ryzen 3 4300G', 'LENOVO 3752', 4, 'AMD Radeon Vega', '512 MBytes of DDR4 SDRAM', 'NVMe', 'SKHynix_HFM256GD3HX015N', 'C:, D:', 3915, null, null, null, null, 3915, 'Lenovo E20-30', 'Week: 35, Year: 2022', null, null, null, 'นางสาวอรณี ตระการภาสกุล (อาย)', 'นักวิชาการเงินและบัญชี', 'กลุ่มบริหารทั่วไป', null, null, '06-7440-001-00007(66)'),
  (30, '06-7440-001-00024(67)', 'DESKTOP-4MOKPV9', 'LENOVO 12JB0032TA', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i5-13400', 'LENOVO 332A', 8, 'Intel UHD Graphics 730', '4132316 KBytes of SDRAM', 'NVMe', 'SAMSUNG MZVL4256HBJD-00BLL', 'C:, D:', 2134, 'HDD', 'Seagate ST1000DM003-1CH162', 'E:, F:, G:', 25025, 27159, 'Lenovo S24e-20', 'Week: 4, Year: 2024', null, null, null, 'นางสาวสุนทรี เครือฟ้า (ติ๊ก)', 'นักจัดการงานทั่วไป', 'กลุ่มบริหารทั่วไป', null, null, '06-7440-001-00024(67)'),
  (31, '06-7440-001-00025(67)', 'DESKTOP-4MOKPV9', 'LENOVO 12JB0032TA', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i5-13400', 'LENOVO 332A', 8, 'Intel UHD Graphics 730', '4132310 KBytes of SDRAM', 'NVMe', 'SAMSUNG MZVL4256HBJD-00BLL', 'C:, D:', 2253, null, null, null, null, 2253, 'Lenovo S24e-20', 'Week: 4, Year: 2024', null, null, null, 'นายประกอบ ตั้งธนากุล (ดั๊ก)', 'นักวิชาการพัสดุชำนาญการ', 'กลุ่มบริหารทั่วไป', null, null, '06-7440-001-00025(67)'),
  (32, '0404-038.1-230', 'DSP-MAYUREE', 'Hewlett-Packard h8-1325l', 'Desktop Computer', 'Microsoft Windows 10', 'Microsoft - 365', 'Intel Core i5-3550', 'PEGATRON CORPORATION 2AD5', 12, 'NVIDIA GeForce GT 620', '1024 MBytes of DDR3 SDRAM [Hynix]', 'SSD', 'TS256GSSD230S', 'C:', 3666, 'HDD', 'Seagate ST1000DM010-2EP102', 'D:, G:, H:', 14463, 18129, 'HP W2072b', 'Week: 3, Year: 2012', null, null, null, 'นางมยุรี ราชสีห์วรรณ (แดง)', 'เจ้าพนักงานธุรการชำนาญงาน', 'กลุ่มบริหารทั่วไป', null, null, '0404-038.1-230'),
  (33, '0404-038.1-261-63', 'DSP_SURANYAW', 'Acer Veriton ES2730G', 'Desktop Computer', 'Microsoft Windows 10', 'Microsoft - 365', 'Intel Core i3-9100', 'Acer Veriton ES2730G', 8, 'Intel UHD Graphics 630', '4265550 KBytes of SDRAM', 'HDD', 'Seagate ST1000DM010-2EP102 7200 RPM', 'C:, D:, F:', 8957, null, null, null, null, 8957, 'Acer V206HQLB', 'Week: 48, Year: 2019', null, null, null, 'นางสุรัญญา วรรลยางกูร (มน)', 'เจ้าพนักงานการเงินและบัญชีชำนาญงาน', 'กลุ่มบริหารทั่วไป', null, null, '0404-038.1-261-63'),
  (34, '0404-038.1-265', 'DSP-TONGG', 'LENOVO 10B2CTO1WW', 'Desktop Computer', 'Microsoft Windows 10', 'Microsoft - 365', 'Intel Core i7-4790', 'LENOVO', 16, 'NVIDIA GeForce GT 730', '2048 MBytes of GDDR5 SDRAM [Micron]', 'HDD', 'Seagate ST1000DM010-2EP102', 'C:, D:', 8668, 'HDD', 'WDC WD10EZEX-08M2NA0', 'E:, F:', 11894, 20562, 'Lenovo LEN E2224A', 'Week: 15, Year: 2016', null, null, null, 'นายนิติ ศิริรัตน์ (ต้อง)', 'เจ้าพนักงานธุรการปฎิบัติงาน', 'กลุ่มบริหารทั่วไป', null, null, '0404-038.1-265'),
  (35, '0404-038.1-266', 'DSP-SIRIKORN', 'LENOVO 10B2CTO1WW', 'Desktop Computer', 'Microsoft Windows 10', 'Microsoft - 365', 'Intel Core i7-4790', 'LENOVO', 8, 'NVIDIA GeForce GT 620', '1024 MBytes of DDR3 SDRAM [Hynix]', 'HDD', 'WDC WD10EZEX-08M2NA0', 'C:, E:', 16015, null, null, null, null, 16015, 'Lenovo LEN E2224A', 'Week: 15, Year: 2016', null, null, null, 'นางสาวสิริกร หาธรรมมี (น้อง)', 'เจ้าพนักงานธุรการชำนาญงาน', 'กลุ่มบริหารทั่วไป', null, null, '0404-038.1-266'),
  (36, '0404-038.1-267', 'DSP_SUKONTIPC', 'LENOVO 10B2CTO1WW', 'Desktop Computer', 'Microsoft Windows 10', 'Microsoft - 365', 'Intel Core i7-4790', 'LENOVO', 4, 'NVIDIA GeForce GT 620', '1024 MBytes of DDR3 SDRAM [Hynix]', 'HDD', 'WDC WD10EZEX-08M2NA0', 'C:, D:', 16483, null, null, null, null, 16483, 'Lenovo LEN E2224A', 'Week: 15, Year: 2016', null, null, null, 'นางสาวกานต์พิชชา สุวบุตร (บุษ)', 'นักจัดการงานทั่วไปชำนาญการ', 'กลุ่มบริหารทั่วไป', null, null, '0404-038.1-267'),
  (37, '0404-038.1-273', 'DESKTOP-RRD9I2I', 'LENOVO 10TV003GTA', 'Desktop Computer', 'Microsoft Windows 10', 'Microsoft - 365', 'Intel Core i3-8100', 'LENOVO 313A', 8, 'Intel UHD Graphics 630', '3364312 KBytes of SDRAM', 'SSD', 'TS512GSSD230S', 'C:', 664, 'HDD', 'Seagate ST1000DM010-2EP102', 'D:, E:, F:', 7703, 8367, 'Lenovo LEN E2054A', 'Week: 31, Year: 2018', null, null, null, 'นางสาวเบญญาภา สังข์แก้ว', 'เจ้าพนักงานธุรการปฏิบัติงาน', 'กลุ่มบริหารทั่วไป', null, null, '0404-038.1-273'),
  (38, '0404-038.1-281', 'DESKTOP-JNMGNL0', 'Acer Veriton X2660G', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i3-8100', 'Acer Veriton X2660G', 8, 'Intel UHD Graphics 630', null, 'SSD', 'TS256GSSD230S', 'C:', 3984, 'HDD', 'Seagate ST1000DM010-2EP102', 'D:, F:', 11404, 15388, 'Acer V206HQLB', 'Week: 12, Year: 2019', null, null, null, 'นางสาวกัญจน์ณมล ฤกธิ์ประวัติ (จุ้น)', 'เจ้าพนักงานพัสดุ', 'กลุ่มบริหารทั่วไป', null, null, '0404-038.1-281'),
  (39, '0404-038.1-288(63)', 'DESKTOP-C3M0BVT', 'Acer Veriton ES2730G', 'Desktop Computer', 'Microsoft Windows 10', 'Microsoft - 365', 'Intel Core i3-9100', 'Acer Veriton ES2730G', 8, 'Intel UHD Graphics 630', '4265548 KBytes of SDRAM', 'SSD', 'TS512GSSD230S', 'C:, G:', 870, 'HDD', 'Seagate ST1000DM010-2EP102', 'D:, E:, F:', 9228, 10098, 'Acer V206HQLB', 'Week: 48, Year: 2019', null, null, null, 'นางพัชรีย์ สานนท์ (พัช)', 'เจ้าพนักงานธุรการชำนาญงาน', 'กลุ่มบริหารทั่วไป', null, null, '0404-038.1-288(63)'),
  (40, '0404-038.1-293(63)', 'DESKTOP-K6IK6TA', 'Acer Veriton ES2730G', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i3-9100', 'Acer Veriton ES2730G', 8, 'Intel UHD Graphics 630', '4265554 KBytes of SDRAM', 'SSD', 'TS512GSSD230S', 'E:', 1237, 'HDD', 'Seagate ST1000DM010-2EP102', 'C:, G:, H:', 8473, 9710, 'Acer V206HQLB', 'Week: 48, Year: 2019', null, null, null, 'นางสาวจิระณี คงเกิด (แพม)', 'หัวหน้ากลุ่มนักจัดการงานทั่วไปชำนาญการพิเศษ', 'กลุ่มบริหารทั่วไป', null, null, '0404-038.1-293(63)'),
  (41, '06-7440-001-00001(66)', 'DESKTOP-VEV86OF', 'LENOVO 11RMS01K00', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'AMD Ryzen 3 4300G', 'LENOVO 3752', 4, 'AMD Radeon Vega', '512 MBytes of DDR4 SDRAM', 'NVMe', 'SKHynix_HFM256GD3HX015N', 'C:, D:', 4910, null, null, null, null, 4910, 'HP P201', 'Week: 15, Year: 2015', null, null, null, 'นางสาวประไพพรรณ แฟงชัยภูมิ (ส้ม)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มติดตามและประเมินผล', null, null, '06-7440-001-00001(66)'),
  (42, '06-7440-001-00003(66)', 'DESKTOP-QVBECJK', 'LENOVO 11RMS01K00', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'AMD Ryzen 3 4300G', 'LENOVO 3752', 4, 'AMD Radeon Vega', '512 MBytes of DDR4 SDRAM', 'NVMe', 'SKHynix_HFM256GD3HX015N', 'C:, D:', null, null, null, null, null, 0, 'Lenovo E20-30', 'Week: 35, Year: 2022', null, null, null, 'นางสาวสุทธิดา ขุนไกร (หยก)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มติดตามและประเมินผล', null, null, '06-7440-001-00003(66)'),
  (43, '06-7440-001-00004(66)', 'DESKTOP-OOGSLG7', 'LENOVO 11RMS01K00', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'AMD Ryzen 3 4300G', 'LENOVO 3752', 4, 'AMD Radeon Vega', '512 MBytes of DDR4 SDRAM', 'NVMe', 'SKHynix_HFM256GD3HX015N', 'C:, D:', 4660, null, null, null, null, 4660, 'Lenovo E20-30', 'Week: 35, Year: 2022', null, null, null, 'นางสาวนิติยา ประสิทธิ์อ้น (ดูดี)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มติดตามและประเมินผล', null, null, '06-7440-001-00004(66)'),
  (44, '06-7440-001-00008(66)', 'DESKTOP-3HIDRNA', 'LENOVO 11RMS01J00', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'AMD Ryzen 5 4600G', 'LENOVO 3752', 8, 'AMD Radeon Vega', '512 MBytes of DDR4 SDRAM', 'NVMe', 'SKHynix_HFM256GD3HX015N', 'C:, D:', 4566, null, null, null, null, 4566, 'Lenovo E20-30', 'Week: 35, Year: 2022', null, null, null, 'นางสาวธิติมา หงคำเมือง (เอ)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มติดตามและประเมินผล', null, null, '06-7440-001-00008(66)'),
  (45, '06-7440-001-00026(67)', 'DESKTOP-4MOKPV9', 'LENOVO 12JB0035TA', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i7-13700', 'LENOVO 332A', 8, 'Intel UHD Graphics', '4132114 KBytes of SDRAM', 'NVMe', 'WD PC SN740 SDDQNQD-512G-1201', 'C:, D:', 2277, null, null, null, null, 2277, 'Lenovo S24e-20', 'Week: 49, Year: 2023', null, null, null, 'นางสาวนิสรา กันนิกา (จ๋า)', 'นักวิชาการสาธารณสุขปฎิบัติการ', 'กลุ่มติดตามและประเมินผล', null, null, '06-7440-001-00026(67)'),
  (46, '0404-038.1-258', 'DESKTOP-3JEVM0K', 'Hewlett-Packard HP ProDesk 400 G2 MT (TPM DP)', 'Desktop Computer', 'Microsoft Windows 10', 'Microsoft - 365', 'Intel Core i3-4130', 'Hewlett-Packard 198E', 8, 'Intel HD Graphics 4400', '1024 MBytes', 'HDD', 'Seagate ST3500418AS', 'C:, D:', 24363, null, null, null, null, 24363, 'HP P201', 'Week: 15, Year: 2015', null, null, null, 'นางสาวอภิญญา เอี่ยมสุวรรณ (เตย)', 'รักษาการในตำแหน่งหัวหน้ากลุ่มนักวิเคราะห์นโยบายและแผนชำนาญการ', 'กลุ่มติดตามและประเมินผล', null, null, '0404-038.1-258'),
  (47, '0404-038.1-272', 'DSP-APINAT', 'Acer Veriton X2660G', 'Desktop Computer', 'Microsoft Windows 10', 'Microsoft - 365', 'Intel Core i3-8100', 'Acer Veriton X2660G', 8, 'Intel UHD Graphics 630', null, 'SSD', 'TS512GSSD230S', 'C:, E:', 975, null, null, null, null, 975, 'Acer V206WQL', 'Week: 8, Year: 2017', null, null, null, 'นางสาวธัญวดี ศิลานุภาพ (มุก)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มติดตามและประเมินผล', null, null, '0404-038.1-272'),
  (48, '0404-038.1-274', 'DESKTOP-KJ15PSM', 'LENOVO 10TV003GTA', 'Desktop Computer', 'Microsoft Windows 10', 'Microsoft - 365', 'Intel Core i3-8100', 'LENOVO 313A', 8, 'Intel UHD Graphics 630', '4265432 KBytes of SDRAM', 'HDD', 'TOSHIBA DT01ACA100', 'C:, D:', 15805, null, null, null, null, 15805, 'Lenovo LEN E2054A', 'Week: 31, Year: 2018', null, null, null, 'นายเทิดศักดิ์ เขี้ยวสิงห์ (เบนซ์)', 'นักวิชาการสาธารณสุขปฏิบัติการ', 'กลุ่มติดตามและประเมินผล', null, null, '0404-038.1-274'),
  (49, '06-7440-001-00002(66)', 'DSP_CHANCANIN', 'LENOVO 11RMS01K00', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'AMD Ryzen 3 4300G', 'LENOVO 3752', 4, 'AMD Radeon Vega', '512 MBytes of DDR4 SDRAM', 'NVMe', 'SKHynix_HFM256GD3HX015N', 'C:, D:', 4546, null, null, null, null, 4546, 'Lenovo E20-30', 'Week: 35, Year: 2022', null, null, null, 'นางสาวจิรภัญญา จีปน (มายด์)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มงบประมาณ', null, null, '06-7440-001-00002(66)'),
  (50, '06-7440-001-00009(66)', 'DSP-AKKARAPOL', 'LENOVO 11RMS01J00', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'AMD Ryzen 5 4600G', 'LENOVO 3752', 8, 'AMD Radeon Vega', '512 MBytes of DDR4 SDRAM', 'NVMe', 'SKHynix_HFM256GD3HX015N', 'C:, D:', 4932, null, null, null, null, 4932, 'Lenovo E20-30', 'Week: 35, Year: 2022', null, null, null, 'นายอัครพล บุญประเสริฐ (โอ๊ต)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มงบประมาณ', null, null, '06-7440-001-00009(66)'),
  (51, '06-7440-001-00017(66)', 'DSP-DOUNGDAW', 'HP HP Pro Tower 280 G9 PCI Desktop PC', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i5-12500', 'HP 89B3', 8, 'Intel UHD Graphics 770', '4164234 KBytes of SDRAM', 'NVMe', 'WD PC SN740 SDDPNQD-256G-1006', 'C:, D:', 548, null, null, null, null, 548, 'HP P24v G5', 'Week: 22, Year: 2023', null, null, null, 'นางสาวดวงดาว ศรีนักราช (ดวงดาว)', 'นักวิเคราะห์นโยบายและแผนปฎิบัติการ', 'กลุ่มงบประมาณ', null, null, '06-7440-001-00017(66)'),
  (52, '0404-038.1-298(63)', 'DSP_MAICHURATT', 'Acer Veriton ES2735G', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i7-9700', 'Acer Veriton ES2735G', 8, 'Intel UHD Graphics 630', '4272772 KBytes of SDRAM', 'NVMe', 'HFM512GDJTNG-8310A', 'C:, D:', 4832, 'HDD', 'Seagate ST1000LM024 HN-M101MBB', 'F:', 7316, 12148, 'Lenovo LEN L1711pC', 'Week: 40, Year: 2013', null, null, null, 'นางสาวมัญชุรัศมิ์ เถื่อนสุคนธ์ (ปลาย)', 'หัวหน้ากลุ่มนักวิเคราะห์นโยบายและแผนชำนาญการ', 'กลุ่มงบประมาณ', null, null, '0404-038.1-298(63)'),
  (53, '0404-038.1-299(63)', 'DSP-HOBBIT', 'Acer Veriton ES2735G', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i7-9700', 'Acer Veriton ES2735G', 8, 'Intel UHD Graphics 630', '4272772 KBytes of SDRAM', 'NVMe', 'HFM512GDJTNG-8310A', 'C:, D:', 3254, null, null, null, null, 3254, 'Acer V246HL', 'Week: 24, Year: 2020', null, null, null, 'นายนรากร แตงไทย (เอก)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มงบประมาณ', null, null, '0404-038.1-299(63)'),
  (54, '0404-038.1-300(63)', 'DSP_NUNTIYAT', 'Acer Veriton ES2735G', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i7-9700', 'Acer Veriton ES2735G', 8, 'AMD Radeon R5 235X/HD 8490', '1024 MBytes of DDR3 SDRAM [Hynix]', 'NVMe', 'HFM512GDJTNG-8310A', 'C:, D:', 2559, null, null, null, null, 2559, 'Acer V246HL', 'Week: 24, Year: 2020', null, null, null, 'นางสาวนันทิยา แตงเผือก (ก้อย)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มงบประมาณ', null, null, '0404-038.1-300(63)'),
  (55, '0407-038.1-015(64)', 'DSP-SIRIRAT-C', 'ASUS ASUS EXPERTCENTER D700SC_D700SC', 'Desktop Computer', 'Microsoft Windows 11', 'Microsoft - 365', 'Intel Core i5-10500', 'ASUS D700SC', 8, 'NVIDIA GeForce GT 730', '2048 MBytes of GDDR5 SDRAM [Samsung]', 'NVMe', 'INTEL SSDPEKNU512GZ', 'C:, D:', 7711, null, null, null, null, 7711, 'ASUS C1241Q', 'Week: 29, Year: 2021', null, null, null, 'นางสาวสิริรัตน์ ชิลนาค (ฝ้าย)', 'นักวิเคราะห์นโยบายและแผน', 'กลุ่มงบประมาณ', null, null, '0407-038.1-015(64)')
on conflict (asset_code) do update set
  source_row_number = excluded.source_row_number,
  computer_name = excluded.computer_name,
  machine_brand_model = excluded.machine_brand_model,
  asset_type = excluded.asset_type,
  operating_system = excluded.operating_system,
  office_software = excluded.office_software,
  cpu = excluded.cpu,
  mainboard = excluded.mainboard,
  memory_gb = excluded.memory_gb,
  graphics = excluded.graphics,
  video_memory = excluded.video_memory,
  disk1_type = excluded.disk1_type,
  disk1_product = excluded.disk1_product,
  disk1_drive_letters = excluded.disk1_drive_letters,
  disk1_hours = excluded.disk1_hours,
  disk2_type = excluded.disk2_type,
  disk2_product = excluded.disk2_product,
  disk2_drive_letters = excluded.disk2_drive_letters,
  disk2_hours = excluded.disk2_hours,
  total_disk_hours = excluded.total_disk_hours,
  monitor1_brand = excluded.monitor1_brand,
  monitor1_manufacture_date = excluded.monitor1_manufacture_date,
  monitor2_brand = excluded.monitor2_brand,
  monitor2_serial_number = excluded.monitor2_serial_number,
  monitor2_manufacture_date = excluded.monitor2_manufacture_date,
  user_name = excluded.user_name,
  user_position = excluded.user_position,
  work_group = excluded.work_group,
  received_date = excluded.received_date,
  received_date_raw = excluded.received_date_raw,
  source_asset_code = excluded.source_asset_code,
  updated_at = now();
