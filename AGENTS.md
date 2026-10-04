# AGENTS.md — Persistent Context & Memory for PEAK REAL ESTATE

This file is automatically injected into the system instructions for all future agent sessions. It ensures permanent memory of all design rules, brand identity, features, and technical architecture.

---

## 1. Brand Identity & Design System
- **Brand Name**: PEAK REAL ESTATE (พีค เรียล เอสเตท)
- **Application Type**: Comprehensive Real Estate CRM & Property Operations Platform (ระบบบริหารจัดการอสังหาริมทรัพย์และทีมเอเจนต์ครบวงจร)
- **Target Audience / Roles**:
  - Super Admin & Admin (ผู้บริหาร/แอดมินระบบ)
  - Branch / Sales Manager (ผู้จัดการฝ่ายขาย)
  - Real Estate Agent (เอเจนต์/นายหน้า)
  - Operations Staff & Technician Coordinator (เจ้าหน้าที่ปฏิบัติการ/ช่าง)
- **Official Brand Assets**:
  - **Emblem**: 3D Platinum Ribbon 'P' enclosed in a luxury dark matte squircle with specular curved rim light and soft ambient shadows.
  - **Wordmark**: High-contrast luxury serif `P E ∧ K` featuring an iconic mountain-peak chevron for the letter 'A' (no crossbar), paired with the tracking-spaced subtitle `— REAL ESTATE —`.
  - **Primary Colors**:
    - Midnight Luxury: `#0A0C10` (Dark canvas, header, hero sections)
    - Platinum Silver: `#E2E8F0` / `#94A3B8` (Metal gradient accents, luxury borders)
    - Crimson Accent: `#DC2626` / `red-600` (Key CTAs, Hot status badges, alerts)
    - Pearl Neutral: `#F8F9FA` (Clean, high-legibility light dashboard background)
- **Typography**:
  - Headings & Brand: *Cinzel* & *Plus Jakarta Sans*
  - Body & Thai Language: *Prompt* & *Inter* fallback

---

## 2. Core Functional Modules & Scope
1. **Dashboard & KPIs**:
   - Monthly sales/rental targets, closed revenue, active listings, deal conversion rates, urgent notifications, and today's work summary.
2. **Properties (สต็อกอสังหาริมทรัพย์)**:
   - Statuses: `Available`, `Rented`, `Sold`, `Under Offer`.
   - Dual pricing: Rental per month and Sale price, common fee, commission percentage, room specs, coordinates, amenities, photos.
3. **Customers / Leads (ทะเบียนลูกค้า & ลีด)**:
   - Roles: `Buyer`, `Tenant`, `Landlord`, `Investor`.
   - Intent levels: `Hot` (🔥), `Warm` (☀️), `Cold` (❄️).
   - Budget constraints, preferred locations, quick action to book viewing.
4. **Viewings (นัดหมายพาชมทรัพย์)**:
   - Scheduling calendar, customer linkage, status tracking (`Scheduled`, `Confirmed`, `Completed`, `Cancelled`), feedback scores (1-5 stars) and post-tour client notes.
5. **Contracts (สัญญาเช่าและสัญญาซื้อขาย)**:
   - Tenant/buyer identification, lease duration, deposit tracking, commission calculations, expiring contract alerts (< 30 days).
6. **Check-in & Check-out (ตรวจรับและส่งมอบห้อง)**:
   - Digital meter readings (Electricity, Water) with photo records, item-by-item condition checklist, damage itemization, deposit deduction, refund tracking.
7. **Maintenance (แจ้งซ่อมและงานช่าง)**:
   - Urgent & regular issue ticketing, vendor assignment, repair cost allocation (`Owner` vs `Tenant`), status workflow (`New` -> `In Progress` -> `Resolved` -> `Closed`).
8. **Work Tasks (ตารางงานประจำวัน)**:
   - Task list with checkbox completion toggles, due dates, priority tags.
9. **User Management & Role Switching**:
   - Switchable active user profiles to test RBAC roles across Admin, Manager, Agent, and Staff.
10. **Data Persistence & Settings**:
    - Local storage persistence under key `PEAK_REAL_ESTATE_STORE_V1`.
    - One-click CSV Export for sales & commissions.
    - One-click JSON Backup & Restore.
    - Reset to Seed Data capability.
    - Dual Language Support: Thai (ภาษาไทย) and English (EN).

---

## 3. Engineering & Stability Mandates
- **Always provide safe fallbacks** for state arrays (e.g. `tasks = db.tasks || db.workTasks || []`, `properties = []`, etc.) to prevent `undefined is not an object` runtime errors when reading legacy local storage records.
- **Do not introduce unwanted features or breaking redesigns** without user request.
- **Maintain mobile-responsive touch targets** (min 44px) and desktop hover clarity.
- **Keep all API keys/sensitive keys server-side** if external APIs are introduced.
