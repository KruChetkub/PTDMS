# SPD Dashboard Color System
## Disease Control Strategic Planning Portal

Version: 1.0
Last Updated: 2026

---

# วัตถุประสงค์

กำหนดมาตรฐานสี (Color System) สำหรับหน้า Dashboard ศูนย์รวมแผนด้านการป้องกันควบคุมโรคและภัยสุขภาพของประเทศ

แนวทางนี้ใช้สำหรับ

- Dashboard
- Card
- Section
- Button
- Badge
- Modal
- Data Visualization
- Future SPD Applications

---

# Design Concept

ใช้แนวคิด

"Color-Coded Strategic Navigation"

กำหนดสีประจำแต่ละหมวดงานเพื่อให้ผู้ใช้งานสามารถจดจำประเภทของข้อมูลได้ทันที

หลักการออกแบบ

- สีหลักใช้กับ Header และ Action Button
- สีอ่อนใช้กับ Background Card
- Border ใช้เฉดกลางของสีเดียวกัน
- ทุก Section ต้องมีเอกลักษณ์ชัดเจน
- รองรับการพัฒนา Responsive Dashboard ในอนาคต

---

# Global Colors

## Main Blue

ใช้กับ Header หลักของเว็บไซต์

```css
--primary-blue: #0B4A8B;
--primary-blue-light: #1E64B7;
```

---

## Main Green

ใช้กับข้อความรอง

```css
--primary-green: #0F766E;
--primary-green-light: #14B8A6;
```

---

# Section 1
# แผนระดับต่าง ๆ

## Color Identity

Strategic Planning

### Primary

```css
--strategy-primary: #087446;
```

### Secondary

```css
--strategy-secondary: #0F8A56;
```

### Border

```css
--strategy-border: #7BC5A4;
```

### Background

```css
--strategy-bg: #EAF5F0;
```

### Hover

```css
--strategy-hover: #0A8B52;
```

---

# Section 2
# แผนงานด้านการป้องกันควบคุมโรคและภัยสุขภาพ

## Color Identity

Disease Prevention Program

### Primary

```css
--disease-primary: #F54A85;
```

### Secondary

```css
--disease-secondary: #FF5E96;
```

### Border

```css
--disease-border: #F7A5C2;
```

### Background

```css
--disease-bg: #FDF0F5;
```

### Hover

```css
--disease-hover: #E93B77;
```

---

# Section 3
# แนวทางดำเนินงานประจำปี

## Color Identity

Annual Operation Guideline

### Primary

```css
--annual-primary: #2A7DDA;
```

### Secondary

```css
--annual-secondary: #4D97EB;
```

### Border

```css
--annual-border: #A7C9F0;
```

### Background

```css
--annual-bg: #EEF5FD;
```

### Hover

```css
--annual-hover: #1F70CC;
```

---

# Section 4
# แผนบริหารความเสี่ยงยุทธศาสตร์

## Color Identity

Risk Management

### Primary

```css
--risk-primary: #6E42C1;
```

### Secondary

```css
--risk-secondary: #8A63D2;
```

### Border

```css
--risk-border: #C8B4E8;
```

### Background

```css
--risk-bg: #F3EFFB;
```

### Hover

```css
--risk-hover: #5E33B2;
```

---

# Section 5
# นโยบายผู้บริหาร

## Color Identity

Executive Policy

### Primary

```css
--policy-primary: #F57C00;
```

### Secondary

```css
--policy-secondary: #FF9730;
```

### Border

```css
--policy-border: #F9C28A;
```

### Background

```css
--policy-bg: #FFF4EC;
```

### Hover

```css
--policy-hover: #E86F00;
```

---

# Modern Dashboard Theme (Recommended)

หากต้องการปรับเว็บไซต์ให้ทันสมัยขึ้นในปี 2026

แนะนำให้ใช้ชุดสีดังนี้

```css
:root {

  /* Main */
  --primary-blue: #0B4A8B;
  --primary-green: #0F766E;

  /* Strategic Plan */
  --strategy: #0F766E;

  /* Disease Program */
  --disease: #EC4899;

  /* Annual Guideline */
  --annual: #2563EB;

  /* Risk */
  --risk: #7C3AED;

  /* Executive Policy */
  --policy: #EA580C;

}
```

ข้อดี

- Modern UI
- รองรับ Dark Mode
- รองรับ Tailwind CSS
- รองรับ React Dashboard
- สีสอดคล้องกับมาตรฐาน Government Dashboard
- ใช้งานกับ Data Visualization ได้ดี

---

# Card Standard

```css
.card {
    background: white;
    border-radius: 16px;
    border: 1px solid #E5E7EB;
    padding: 24px;
    transition: all .3s ease;
}

.card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(0,0,0,.08);
}
```

---

# Button Standard

```css
.btn {
    border-radius: 999px;
    font-weight: 600;
    padding: 10px 18px;
    transition: .3s;
}
```

ตัวอย่าง

```css
.btn-strategy {
    background: var(--strategy-primary);
    color: white;
}

.btn-disease {
    background: var(--disease-primary);
    color: white;
}

.btn-annual {
    background: var(--annual-primary);
    color: white;
}

.btn-risk {
    background: var(--risk-primary);
    color: white;
}

.btn-policy {
    background: var(--policy-primary);
    color: white;
}
```

---

# Typography Recommendation

## Header

```css
font-weight: 700;
```

## Section Title

```css
font-weight: 600;
```

## Card Content

```css
font-weight: 400;
```

---

# SPD Design Principle

1. สีต้องสื่อถึงประเภทข้อมูล
2. ทุกหมวดต้องมีสีประจำหมวดชัดเจน
3. สีพื้นหลังต้องอ่อนกว่าสีหลักอย่างน้อย 80%
4. Action Button ใช้สีหลักของหมวด
5. Border ใช้สีระดับกลาง
6. รองรับ Accessibility และ Contrast Ratio
7. พร้อมต่อยอดเป็น SPD Super Dashboard ในอนาคต
