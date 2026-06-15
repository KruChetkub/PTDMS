import { CalendarClock, FileText, Image, LayoutList, Megaphone, MousePointerClick, Newspaper, PanelsTopLeft } from 'lucide-react';
import type { SiteManagerEditableArea, SiteManagerSummaryItem } from '../types/siteManager.types';

export const siteManagerSummaryItems: SiteManagerSummaryItem[] = [
  {
    label: 'Hero banners',
    value: '3',
    detail: '1 published, 2 draft',
    icon: Image,
  },
  {
    label: 'Navigation buttons',
    value: '5',
    detail: 'linked to Home sections',
    icon: MousePointerClick,
  },
  {
    label: 'News items',
    value: '12',
    detail: 'latest public announcements',
    icon: Newspaper,
  },
  {
    label: 'Document groups',
    value: '5',
    detail: 'plan and policy sections',
    icon: FileText,
  },
];

export const siteManagerEditableAreas: SiteManagerEditableArea[] = [
  {
    title: 'จัดการป้ายประชาสัมพันธ์หน้า Home',
    description: 'เปลี่ยนรูป ข้อความ ปุ่ม และช่วงเวลาการเผยแพร่ของ hero banner เต็มจอ',
    status: 'published',
    updatedAt: '15 มิ.ย. 2569',
    icon: PanelsTopLeft,
  },
  {
    title: 'จัดการปุ่มนำทาง',
    description: 'กำหนดปุ่มลัดให้เลื่อนลงไปยัง section แผนงาน ข่าว และเอกสารสำคัญ',
    status: 'draft',
    updatedAt: 'รอจัดทำ',
    icon: MousePointerClick,
  },
  {
    title: 'จัดการข่าวประชาสัมพันธ์',
    description: 'เพิ่มข่าว ประกาศ หนังสือเวียน และสื่อประชาสัมพันธ์สำหรับหน้า public',
    status: 'scheduled',
    updatedAt: 'เตรียมเชื่อมฐานข้อมูล',
    icon: Megaphone,
  },
  {
    title: 'จัดการหมวดแผนและเอกสาร',
    description: 'จัดกลุ่มแผนระดับต่าง ๆ แนวทางประจำปี นโยบาย และเอกสารดาวน์โหลด',
    status: 'draft',
    updatedAt: 'เตรียมเชื่อมไฟล์เอกสาร',
    icon: LayoutList,
  },
  {
    title: 'ตั้งค่าการเผยแพร่',
    description: 'กำหนด draft/published/scheduled และตรวจ preview ก่อนแสดงผลจริง',
    status: 'draft',
    updatedAt: 'ออกแบบ workflow',
    icon: CalendarClock,
  },
];
