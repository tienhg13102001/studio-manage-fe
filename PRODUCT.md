# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Two primary contexts (confirmed 2026-11-03): phones for staff on the move, and desktop for admin and accounting at a desk. The app ships a bottom tab bar under `md` and a sidebar above it. Desktop must work well from laptop width (~1280px) up to external monitors (~1920px+).

## Users

Every internal role of Yume Studio uses the app, mostly on a phone:

- **Superadmin / Admin**: run the studio, configure packages, costumes, categories, seasons, users.
- **Sale** and **Cộng tác viên sale**: bring in classes (lớp), record class and student info, follow their own classes.
- **Thợ chụp ảnh** / **Thợ quay phim**: check which shoots they are assigned to, where and when.
- **Kế toán**: record and review income and expenses.

Typical scenes:

- **On the move** (sale, thợ): meeting a class, at a shoot location, between shoots; short sessions, one hand, checking or updating one thing.
- **At a desk** (admin, kế toán): longer sessions doing batch work: arranging the schedule and assigning crew, entering income and expenses, reviewing classes and season numbers. Mouse and keyboard, laptop or external monitor.

## Product Purpose

Internal operations app for Yume Studio, a yearbook (kỷ yếu) photo studio for school classes. It tracks classes as customers, shoot schedules and crew (in-house and external photographers, MV videographers), costumes, packages and their profit, finances per season, and customer feedback. Success: everyone knows what shoot is next and who is on it, and the studio knows what each class and season earns.

## Operating Context

- Work is organised by season (Mùa chụp, e.g. "Mùa 2026 - 2027"), selected globally in the top bar.
- Core loop: sale creates a class → schedule shoot(s) → assign crew → shoot → record income/costs → collect feedback.
- Public-facing pieces live outside the app shell: student info form (`/form/:customer`), feedback form (`/feedback`), studio portfolio (`/portfolio`).
- Notifications reach staff via Telegram (account linking in Hồ sơ cá nhân).

## Capabilities and Constraints

- Role-based access per route (`src/config/navItems.ts`); a user can hold several roles.
- Vietnamese only; no i18n.
- Light and dark mode are both required.
- Stack: React + Vite + Tailwind + shadcn/ui-style components (`src/components/ui`), Express/MongoDB backend.
- A Pencil design file exists (`design/app_yume_design.pen`). On 2026-11-02 the user did not mark it as binding for UI redesigns; earlier screens were built to it.

## Brand Commitments

- Name: Yume Studio; the "yume" wordmark logo stays.
- Amber (#f59e0b) stays the brand colour.

## Evidence on Hand

- Real operational data lives in the backend (test DB locally); no testimonials, metrics or claims for marketing use are recorded here. Do not invent any.

## Product Principles

1. The next shoot comes first: what is happening today and this week, where, and who is going outranks summary numbers.
2. Both contexts are first-class: every task must be doable one-handed on a phone, and desktop must make batch work fast (density, side-by-side context, keyboard), without becoming a different product.
3. Show each role its own work; hide what a role cannot act on.
4. Season is the frame for every number.
