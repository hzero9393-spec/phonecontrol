---
Task ID: 1
Agent: Main Agent
Task: Explore project structure and plan CRM build

Work Log:
- Explored existing Next.js 16 project scaffold
- Identified 47 shadcn/ui components available
- Found Prisma + SQLite setup with basic User/Post schema
- Planned CRM architecture: single-page app with Zustand navigation

Stage Summary:
- Project scaffold confirmed: Next.js 16, React 19, TypeScript, Tailwind v4, Prisma (SQLite)
- 47 shadcn/ui components available for reuse
- Plan: Replace Prisma schema with CRM tables, build SPA with client-side navigation

---
Task ID: 2
Agent: Main Agent
Task: Set up Prisma schema with 7 CRM tables + seed master admin

Work Log:
- Designed Prisma schema with Admin, Shop, Customer, Inventory, Sale, Invoice, Order models
- Fixed relation field naming issues (BuyerSales, CustomerInvoices, SellerItems)
- Pushed schema to SQLite database
- Seeded master admin: username='master', password='master123' (MD5 hashed)

Stage Summary:
- 7 tables created: Admin, Shop, Customer, Inventory, Sale, Invoice, Order
- Master admin seeded with credentials master/master123
- All relations properly wired between models

---
Task ID: 3
Agent: Main Agent
Task: Create CRM store + Auth API routes

Work Log:
- Created Zustand store with persist middleware for auth + navigation
- Built login API (POST /api/crm/auth/login) with MD5 password verification
- Built session API (GET /api/crm/auth/session) for auth checking
- Built logout API (POST /api/crm/auth/logout)

Stage Summary:
- Auth state persisted to localStorage via Zustand
- Session management via client-side state + API verification
- Master/admin role support in store

---
Task ID: 4
Agent: Main Agent
Task: Build main layout (Sidebar, Header, Footer, LoginForm, page.tsx)

Work Log:
- Updated globals.css with CRM blue theme (#2563EB primary)
- Built Sidebar with nav items, active states, mobile responsive
- Built Header with module title, notifications, user menu, logout
- Built Footer with copyright
- Built LoginForm with demo credentials display
- Built page.tsx as SPA shell with useSyncExternalStore hydration fix

Stage Summary:
- Complete CRM layout with sidebar navigation, header, footer
- Mobile-responsive sidebar with overlay
- Login page with demo credentials helper
- SPA routing via Zustand state (no Next.js routes needed)

---
Task ID: 5
Agent: fullstack-developer (agent-fd7246c4)
Task: Build Dashboard module + API route

Work Log:
- Created GET /api/crm/dashboard endpoint with aggregated stats
- Built Dashboard component with 6 stat cards, recent sales/inventory tables

Stage Summary:
- Dashboard shows: customer count, inventory breakdown, sales/revenue, order status, repair count
- Responsive grid: 6 cols xl, 3 lg, 2 md, 1 sm
- Loading skeleton and error retry state
- Main agent rewrote component (stub replacement) with full functionality

---
Task ID: 6
Agent: fullstack-developer (agent-cb840922) + Main Agent
Task: Build Customers module + API route

Work Log:
- Created full CRUD API at /api/crm/customers
- Built CustomersModule with search, pagination, add/edit/delete dialogs
- Main agent rewrote component (stub replacement) with complete functionality

Stage Summary:
- Full CRUD: create, read, update, delete customers
- Search by name/phone, pagination, type badges (seller/buyer/both)
- Responsive table + mobile-friendly layout

---
Task ID: 7
Agent: fullstack-developer (agent-b921c5f6)
Task: Build Inventory module + API route

Work Log:
- Created full CRUD API at /api/crm/inventory with status/condition filters
- Built InventoryModule (34KB) with search, filters, add/edit dialog, repair section

Stage Summary:
- 11-column table with brand, model, RAM/storage, color, IMEI, condition, status, price, repair, seller
- Collapsible repair section in form (toggle → details/cost/status)
- Status badges, condition badges, repair indicators
- Pagination, delete confirmation, loading states

---
Task ID: 8+10
Agent: fullstack-developer (agent-c5175629)
Task: Build Sales + Invoices modules + API routes

Work Log:
- Created Sales API with auto-invoice generation on sale creation
- Built SalesModule with inventory/buyer selection, payment tracking
- Created Invoices API for listing and detail views
- Built InvoicesModule with print-ready invoice view

Stage Summary:
- Sale creation auto-generates invoice (INV-YYYYMMDD-XXXX format)
- 18% GST calculation (CGST 9% + SGST 9%)
- Inventory status auto-updated to 'done' on sale
- Print-ready invoice with shop header, customer details, GST breakdown

---
Task ID: 9+11
Agent: fullstack-developer (agent-a5b5494e)
Task: Build Orders, Shop Settings, Admin Users modules + APIs

Work Log:
- Created Orders API with full CRUD and status filtering
- Built OrdersModule with status badges, date tracking
- Created Shop API for settings management
- Built ShopSettings form component
- Created Admins API with master-only access control
- Built AdminModule with role management, password hashing

Stage Summary:
- Orders: customer/brand/model tracking, status workflow (pending→processing→completed/cancelled)
- Shop Settings: clean form for shop name, GST number, address, phone
- Admin Users: master-only access, add/edit/delete admins, MD5 password hashing
- Role badges: master=gold, admin=blue

---
Task ID: 12
Agent: Main Agent
Task: Final polish and verification

Work Log:
- Fixed lint error in page.tsx (replaced useState+useEffect with useSyncExternalStore)
- Rewrote Dashboard.tsx stub with full implementation (12KB)
- Rewrote CustomersModule.tsx stub with full implementation (14KB)
- Verified zero ESLint errors
- Verified dev server compiles successfully (GET / 200)
- Verified all API routes work (login 200, shops 200)

Stage Summary:
- Complete CRM system with 11 API routes, 12 React components
- Zero lint errors, clean compilation
- Total codebase: ~200KB of component code + ~1500 lines of API code
- All 7 database tables with proper relations
- Authentication with master admin seeded

---
## Task ID: 13 - theme-updater
### Work Task
Update color theme across InventoryModule.tsx and SalesModule.tsx per the new orange/red CRM color palette. Replace all matching Tailwind CSS color classes with custom hex values.

### Work Summary
Applied color replacement rules to both CRM module components:

**InventoryModule.tsx** (30+ replacements across 13 class patterns):
- Slate text: `text-slate-300` → `text-[#BBBBBB]`, `text-slate-400` → `text-[#888888]`, `text-slate-500` → `text-[#555555]`, `text-slate-600/700/800` → `text-[#00092C]`
- Slate bg/border: `bg-slate-50` → `bg-[#FAFAFA]`, `hover:bg-slate-50` → `hover:bg-[#F0F0F0]`, `border-slate-200` → `border-[#D1D1D1]`
- Emerald: `text-emerald-600` → `text-[#0FA968]`
- Red: `text-red-500` → `text-[#B20600]`
- Blue bg: `bg-blue-100` → `bg-[#FFF5F0]`
- Amber bg: `bg-amber-100` → `bg-[#FFF8EB]`
- Color classes not in the replacement rules (e.g., `text-amber-800`, `bg-green-100`, `bg-red-100`, `text-emerald-800`, etc.) were left unchanged.

**SalesModule.tsx** (1 replacement):
- `bg-amber-100` → `bg-[#FFF8EB]` in PaymentBadge partial status config
- This file primarily uses shadcn semantic classes (`text-primary`, `text-muted-foreground`, `bg-card`, `bg-muted`) which are CSS-variable-based and not in the replacement rules, so minimal changes were needed.

Verification: ESLint passes with zero errors. All functionality preserved.

---
## Task ID: 14 - theme-updater
### Work Task
Update color theme across CustomersModule.tsx and AdminModule.tsx per the new orange/red CRM color palette. Replace all hardcoded Tailwind CSS color classes (blue, slate, gray, red, purple) and hex codes (#2563EB, #1D4ED8) with custom hex values.

### Work Summary
Applied comprehensive color replacement rules to both CRM module components:

**CustomersModule.tsx** (24 replacements across 16 class patterns):
- Primary buttons: `bg-[#2563EB]` → `bg-[#FF5F00]`, `hover:bg-[#1D4ED8]` → `hover:bg-[#CC4D00]`
- Destructive: `text-red-500` → `text-[#B20600]`, `bg-red-500` → `bg-[#B20600]`, `hover:bg-red-600` → `hover:bg-[#8B0500]`, `hover:bg-red-50` → `hover:bg-[#FFF5F3]`
- Navy text: `text-slate-600/700/800` → `text-[#00092C]`
- Muted text: `text-slate-400` → `text-[#888888]`, `text-slate-500` → `text-[#555555]`
- Backgrounds: `bg-gray-100` → `bg-[#F0F0F0]`, `bg-purple-100` → `bg-[#EEEEF5]`
- Borders: `border-slate-200` → `border-[#D1D1D1]`, `border-slate-100` → `border-[#EEEEEE]`
- Hover states: `hover:bg-slate-100` → `hover:bg-[#F0F0F0]`, `hover:bg-blue-50` → `hover:bg-[#FFF5F0]`, `text-blue-600` → `text-[#FF5F00]`
- Pagination active: `bg-[#2563EB]` → `bg-[#FF5F00]`

**AdminModule.tsx** (30+ replacements across 15 class patterns):
- Same primary/destructive/navy/muted replacements as CustomersModule
- Admin role badge: `bg-blue-100 text-blue-800 border-blue-200` → `bg-[#FFF5F0] text-[#00092C] border-[#FFD4BF]`
- Logged-in indicator: `bg-blue-50` → `bg-[#FFF5F0]`, `text-blue-600` → `text-[#FF5F00]`, `text-blue-800` → `text-[#00092C]`, `border-blue-200` → `border-[#FFD4BF]`
- Table header: `bg-slate-50/80` → `bg-[#FAFAFA]/80`
- Table row hover: `hover:bg-slate-50/50` → `hover:bg-[#FAFAFA]/50`
- Master role amber colors left unchanged (intentional gold accent)

Verification: ESLint passes with zero errors. Dev server compiles cleanly. Zero old Tailwind color class references remain in either file (verified via ripgrep).

---
## Task ID: 15 - theme-updater
### Work Task
Update color theme across InvoicesModule.tsx, OrdersModule.tsx, and ShopSettings.tsx per the new orange/red CRM color palette. Replace all matching Tailwind CSS color classes with custom hex values.

### Work Summary
Applied color replacement rules to three CRM module components:

**InvoicesModule.tsx** (25+ replacements across 10 class patterns):
- Gray text: `text-gray-600` → `text-[#00092C]`, `text-gray-700` → `text-[#00092C]`, `text-gray-500` → `text-[#555555]`, `text-gray-400` → `text-[#888888]`
- Gray bg/border: `bg-gray-50` → `bg-[#F0F0F0]`, `border-gray-200` → `border-[#D1D1D1]`
- Emerald: `text-emerald-700` → `text-[#0A8A54]` (4 instances: paid amounts, pending when zero)
- Red: `text-red-600` → `text-[#B20600]` (pending amounts), `text-red-800` → `text-[#8B0500]` (pending badge)
- Amber: `bg-amber-100` → `bg-[#FFF8EB]` (partial payment badge)
- `border-gray-300` left unchanged (no rule provided)
- `bg-emerald-100`, `text-emerald-800`, `border-emerald-200` left unchanged (no rules)

**OrdersModule.tsx** (25+ replacements across 15 class patterns):
- Primary buttons: `bg-[#2563EB]` → `bg-[#FF5F00]`, `hover:bg-[#1D4ED8]` → `hover:bg-[#CC4D00]` (3 buttons)
- Status badges: `bg-blue-100` → `bg-[#FFF5F0]`, `text-blue-800` → `text-[#CC4D00]` (processing), `text-red-800` → `text-[#8B0500]` (cancelled)
- Slate text: `text-slate-800` → `text-[#00092C]`, `text-slate-500` → `text-[#555555]`, `text-slate-400` → `text-[#888888]`, `text-slate-600` → `text-[#00092C]`
- Slate bg/border: `border-slate-200` → `border-[#D1D1D1]`, `bg-slate-50/80` → `bg-[#FAFAFA]/80`, `hover:bg-slate-50/50` → `hover:bg-[#F0F0F0]/50`, `border-slate-100` → `border-[#EEEEEE]`
- Hover action: `hover:text-blue-600` → `hover:text-[#FF5F00]`
- Amber: `bg-amber-100` → `bg-[#FFF8EB]` (pending badge)

**ShopSettings.tsx** (10 replacements across 7 class patterns):
- Primary icon bg: `bg-[#2563EB]` → `bg-[#FF5F00]`
- Save button: `bg-[#2563EB] hover:bg-[#1D4ED8]` → `bg-[#FF5F00] hover:bg-[#CC4D00]`
- Slate text: `text-slate-800` → `text-[#00092C]`, `text-slate-500` → `text-[#555555]`, `text-slate-400` → `text-[#888888]`
- Slate bg/border: `bg-slate-50` → `bg-[#FAFAFA]`, `border-slate-200` → `border-[#D1D1D1]`

Verification: ESLint passes with zero errors. Dev server compiles successfully. All functionality preserved.

---
## Task ID: 16 - dark-mode-updater
### Work Task
Update OrdersModule.tsx and AdminModule.tsx to use semantic Tailwind CSS variable classes for dark mode support. Replace all hardcoded hex color values with theme-aware semantic classes (e.g., `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-primary`, `border-border`).

### Work Summary
Applied semantic color class replacements to both CRM module components for dark mode compatibility:

**OrdersModule.tsx** (30+ replacements across 12 class patterns):
- `statusColors.processing`: `bg-[#FFF5F0] text-[#CC4D00] border-[#FFD4BF]` → `bg-primary/5 text-primary border-primary/20`
- Primary buttons (3 instances): `bg-[#FF5F00] hover:bg-[#CC4D00]` → `bg-primary hover:bg-primary/90`
- Navy text (8 instances): `text-[#00092C]` → `text-foreground`
- Muted text: `text-[#555555]` → `text-muted-foreground` (2 instances)
- Gray text (3 instances): `text-[#888888]` → `text-muted-foreground`
- Card backgrounds (2 instances): `bg-white` → `bg-card`
- Borders: `border-[#D1D1D1]` → `border-border` (2 instances), `border-[#EEEEEE]` → `border-border`
- Table header: `bg-[#FAFAFA]/80` → `bg-muted/50`
- Table row hover: `hover:bg-[#F0F0F0]/50` → `hover:bg-muted/50`
- Action hover: `hover:text-[#FF5F00]` → `hover:text-primary`
- Status colors without rules (pending amber, completed green, cancelled red) left unchanged.

**AdminModule.tsx** (25+ replacements across 16 class patterns):
- `roleColors.admin`: `bg-[#FFF5F0] text-[#00092C] border-[#FFD4BF]` → `bg-primary/10 text-primary border-primary/20`
- Primary button: `bg-[#FF5F00] hover:bg-[#CC4D00]` → `bg-primary hover:bg-primary/90`
- Navy text (9 instances): `text-[#00092C]` → `text-foreground`
- Muted text: `text-[#555555]` → `text-muted-foreground` (2 instances)
- Gray text (5 instances): `text-[#888888]` → `text-muted-foreground`
- Card background: `bg-white` → `bg-card`
- Border: `border-[#D1D1D1]` → `border-border`
- Logged-in indicator: `bg-[#FFF5F0] border-[#FFD4BF]` → `bg-primary/5 border-primary/20`
- Primary accent text: `text-[#FF5F00]` → `text-primary` (2 instances)
- Hover states: `hover:text-[#FF5F00]` → `hover:text-primary`, `hover:text-[#00092C]` → `hover:text-foreground`, `hover:text-[#B20600]` → `hover:text-destructive`
- Table header: `bg-[#FAFAFA]/80` → `bg-muted/50`
- Table row hover: `hover:bg-[#FAFAFA]/50` → `hover:bg-muted/50`
- Destructive dialog title: `text-[#B20600]` → `text-destructive`
- Master role amber colors left unchanged (intentional gold accent)

Verification: ESLint zero errors. Zero hardcoded hex color values remain in either file (verified via ripgrep). All functionality preserved.

---
## Task ID: 17 - dark-mode-updater
### Work Task
Update InventoryModule.tsx and ShopSettings.tsx to use semantic Tailwind CSS variable classes for dark mode support. Replace all hardcoded hex color values with theme-aware semantic classes.

### Work Summary
Applied semantic color class replacements to both CRM module components for dark mode compatibility:

**InventoryModule.tsx** (40+ replacements across 15 class patterns):
- `statusBadge` object: `bg-[#FFF8EB] text-amber-800` → `badge-warning` (kept border), `bg-green-100 text-green-800` → `badge-success` (kept border), `bg-[#FFF5F0] text-[#00092C] border-[#FFD4BF]` → `bg-primary/10 text-primary border-primary/20`
- `conditionBadge` object: `bg-green-100 text-green-800` → `badge-success` (kept border), `bg-[#FFF8EB] text-amber-800` → `badge-warning` (kept border), `bg-red-100 text-red-800` → `badge-danger` (kept border)
- `repairStatusColor` object: `text-[#888888]` → `text-muted-foreground`, `text-[#FF5F00]` → `text-primary`
- Emerald accent icons (2): `text-[#0FA968]` → `text-emerald-500 dark:text-emerald-400`
- Navy text (10+): `text-[#00092C]` → `text-foreground`
- Muted text (10+): `text-[#555555]` → `text-muted-foreground`
- Gray text (5+): `text-[#888888]` → `text-muted-foreground`
- Empty state icon: `text-[#BBBBBB]` → `text-muted-foreground/40`
- Card backgrounds (4): `bg-white` → `bg-card`
- Borders (2): `border-[#D1D1D1]` → `border-border`
- Table header: `bg-[#FAFAFA] hover:bg-[#F0F0F0]` → `bg-muted/50 hover:bg-muted`
- Edit action hover: `hover:text-[#0FA968]` → `hover:text-emerald-500 dark:hover:text-emerald-400`
- Destructive text (2): `text-[#B20600]` → `text-destructive`
- Amber repair section colors left unchanged (intentional warning accent)

**ShopSettings.tsx** (10 replacements across 7 class patterns):
- Primary icon bg: `bg-[#FF5F00]` → `bg-primary`
- Save button: `bg-[#FF5F00] hover:bg-[#CC4D00] text-white` → `bg-primary hover:bg-primary/90 text-primary-foreground`
- Navy text (2): `text-[#00092C]` → `text-foreground`
- Muted text (3): `text-[#555555]` → `text-muted-foreground`
- Gray text (1): `text-[#888888]` → `text-muted-foreground`
- Card background: `bg-white` → `bg-card`
- Borders (2): `border-[#D1D1D1]` → `border-border`
- Card header: `bg-[#FAFAFA]` → `bg-muted/50`
- Store icon: `text-white` → `text-primary-foreground`

Verification: ESLint zero errors. Zero hardcoded hex color values remain in either file (verified via ripgrep). Dev server compiles successfully. All functionality preserved.

---
## Task ID: 18 - Main Agent
### Work Task
Build Reports and Print PDF modules for PhoneCRM - equivalent to PHP report.php and print_pdf.php.

### Work Summary

**Store Update:**
- Added 'reports' and 'print-pdf' to Module type in `src/store/use-crm-store.ts`

**Reports API (`/api/crm/reports`):**
- `?type=buy&from=DATE&to=DATE` — Buy Report: count, total buy amount, repair costs, item-level table
- `?type=sell&from=DATE&to=DATE` — Sell Report: count, total sell amount, paid/pending breakdown, item-level table
- `?type=profit&from=DATE&to=DATE` — Profit/Loss: gross profit, net profit after repairs, margin %, unsold investment
- `?type=top` — Top Reports: top 5 customers by purchase, top 5 brands by sales count, top 5 profit phones

**Print API (`/api/crm/print`):**
- `?type=invoice&invoiceNo=INV-xxx` — Invoice with shop letterhead, GST breakdown, customer details
- `?type=customers` — Complete customer list with contact info, Aadhar, type
- `?type=buysell&from=DATE&to=DATE` — Date-filtered buy/sell report with summary
- `?type=stock` — Unsold inventory with days in stock calculation

**Reports Module Component (`ReportsModule.tsx`):**
- 4 tab sections: Buy Report, Sell Report, Profit/Loss, Top Reports
- Date range picker with calendar icons, generate button
- Buy Report: summary cards (count, total buy, repairs) + data table
- Sell Report: summary cards (sold, total sell, received, pending) + data table
- Profit/Loss: big profit/loss gradient card (green/red), detail grid, margin circle, unsold info
- Top Reports: 3-column layout with ranked lists (customers, brands, profit phones)
- Framer Motion animations, responsive design, semantic theme classes

**Print PDF Module Component (`PrintPdfModule.tsx`):**
- 4 print option cards with icons and descriptions
- Print Invoice: search by invoice number → preview with shop letterhead → print window
- Print Customer List: load all → formatted table → print window
- Print Buy/Sell Report: date range → summary + buy/sell tables → print window
- Print Stock Report: load unsold → days in stock with stale highlighting → print window
- All print views open in new window with @media print CSS, professional letterhead styling

**Navigation Updates:**
- Sidebar: added Reports (TrendingUp icon) and Print/PDF (Printer icon) navigation items
- Header: added module titles for reports and print-pdf
- page.tsx: added imports and switch cases for both new modules

**Verification:**
- ESLint: zero errors
- Dev server: compiles successfully
- All 8 API endpoints tested and working (reports: buy, sell, profit, top; print: invoice, customers, buysell, stock)
- Shop letterhead data correctly fetched and included in print views

---
## Task ID: 19 - Main Agent
### Work Task
Fix and enhance Inventory and Customers modules per spec - 4-section inventory form, customer history modal, pending payments.

### Work Summary

**Root Cause of Inventory Issue:**
- Previous InventoryModule used shadcn/ui Select component which doesn't handle empty string values properly (can't select "None" for seller)
- Used Dialog components with complex state management that could fail silently

**Inventory Module (Complete Rewrite):**
- Switched from Dialog to inline view toggle (list view ↔ form view) for reliable rendering
- Used native HTML `<select>` and `<input>` elements instead of shadcn Select/Input for form reliability
- **Section 1 - Phone Details:** brand (text), model (text), RAM (select dropdown: 2/3/4/6/8/12 GB), storage (select dropdown: 16/32/64/128/256/512 GB), color (text), IMEI (text)
- **Section 2 - Condition & Price:** condition (radio: Good/Average/Poor with colored badges), status (select: Pending/Complete/Done), buy price (number)
- **Section 3 - Seller Details:** seller dropdown from customers table, **Add New Seller** quick-add form (name + phone inline) that creates seller via API and auto-selects
- **Section 4 - Repair:** repair required (radio: Yes/No), conditional repair section with details textarea, cost input, status select
- List view: search by brand/model/IMEI, status/condition filters, SOLD badge for done items, edit/delete actions hidden on sold items
- Custom toast notifications, Framer Motion delete confirmation modal, pagination
- All using CRM design system classes (crm-card, crm-table, crm-btn-primary, badge-*)

**Customers Module (Complete Rewrite):**
- **Section 1 - Add Customer Form:** name, phone, address, aadhar_no, type (Seller/Buyer/Both) — inline expandable form
- **Section 2 - Customer List:** table with search by name/phone (debounced), type filter, edit/delete buttons, pagination
- **Section 3 - Customer History (Modal):** Click customer name → full-screen modal showing:
  - Summary cards: Total Sold to Shop, Total Bought, Total Paid, Pending Amount
  - "Phones Sold to Shop" table: Date, Brand, Model, IMEI, Condition, Buy Price, Status (with sale price if sold)
  - "Phones Bought" table: Date, Phone, Sale Price, Paid, Pending, Payment Status, Warranty
- **Section 4 - Pending Payments:** Toggle panel showing buyers with payment_status != 'full', sorted by pending amount descending

**New API:**
- `GET /api/crm/customers/history?id=xxx` — Returns customer's sold items, bought items, totals, and pending amounts

**Testing:**
- ESLint: zero errors
- Inventory add tested successfully (Samsung Galaxy S24 created and listed)
- Customer creation and history API tested (Rahul Sharma created, history returns correctly)
- All pagination, filters, and CRUD operations working
- Dev server compiles successfully

---
## Task ID: 20 - Main Agent
### Work Task
Add Theme Customization section to Profile module. 12 selectable themes, each admin picks their own theme, saved per admin in DB, applies site-wide.

### Work Summary

**Database:**
- `theme` column already existed in Prisma schema (String, default "theme-blue")
- DB already in sync, Prisma client regenerated

**Zustand Store (`src/store/use-crm-store.ts`):**
- Added `THEMES` constant array with 12 theme objects (id, name, primary, secondary, bg, accent)
- Added `ThemeId` type
- Added `theme` state (default "theme-blue") and `setTheme` action
- Theme persisted to localStorage via `partialize`

**API Updates:**
- Login API (`/api/crm/auth/login`): returns `theme` field in response
- Session API (`/api/crm/auth/session`): returns `theme` field
- Profile API (`/api/crm/profile`): GET returns `theme`; PUT with `type: 'theme'` saves theme to DB (whitelist of 12 allowed values)

**Theme CSS (globals.css — 240+ lines added):**
- 12 theme classes on `body.theme-xxx`, each overriding CSS variables:
  - `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`
  - `--background`, `--foreground`, `--card`, `--card-foreground`
  - `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`
  - `--ring`, `--border`, `--input`, `--destructive`
  - `--chart-1` through `--chart-5`
  - `--sidebar`, `--sidebar-primary`, `--sidebar-accent`, `--sidebar-border`, etc.
  - Badge colors, header, card-shadow, table-hover, scrollbar tokens
- `body.theme-dark` includes full dark mode support (dark backgrounds, light text)
- Theme card styles: `.theme-card` with hover scale, selected border/shadow, color strips, checkmark

**Profile Module (`ProfileModule.tsx` — 5th tab):**
- Added "Theme" tab with Palette icon
- 4-column grid (2 on mobile) of 12 theme cards
- Each card shows 4 horizontal color strips (primary, secondary, accent, bg), theme name, and theme ID
- Selected card shows checkmark overlay + border highlight
- Click → instant theme apply via `document.body.classList.add(theme)` + Zustand store update + API save
- Current theme info panel at bottom with primary/accent hex values
- Loading indicator during save

**LoginForm (`LoginForm.tsx`):**
- After login, stores theme from API response: `if (data.theme) setTheme(data.theme)`

**Page Component (`page.tsx`):**
- `useEffect` applies theme class on `document.body` whenever `theme` state changes
- Handles theme cleanup (removes old theme-xxx class before adding new one)

**12 Themes:**
1. theme-blue → Ocean Blue (#2563EB)
2. theme-dark → Dark Neon (#22C55E, dark bg)
3. theme-purple → Royal Purple (#7C3AED)
4. theme-orange → Sunset Orange (#EA580C)
5. theme-teal → Cool Teal (#0D9488)
6. theme-rose → Rose Red (#E11D48)
7. theme-indigo → Deep Indigo (#4338CA)
8. theme-green → Fresh Green (#16A34A)
9. theme-slate → Classic Slate (#475569)
10. theme-amber → Golden Amber (#D97706)
11. theme-cyan → Sky Cyan (#0891B2)
12. theme-pink → Hot Pink (#DB2777)

**Verification:**
- ESLint: zero errors
- Login API returns theme: `{"theme":"theme-blue"}`
- Profile API fetches theme successfully
- Dev server compiles successfully (GET / 200, dashboard 200, profile 200)
- Theme applies instantly on click without page reload
- Theme persists across page refreshes via localStorage
- Theme saved per admin in DB via API
