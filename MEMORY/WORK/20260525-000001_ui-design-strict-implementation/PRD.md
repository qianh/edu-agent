---
task: rebuild all pages strictly matching UI design screenshots
slug: 20260525-000001_ui-design-strict-implementation
effort: deep
phase: complete
progress: 55/55
mode: interactive
started: 2026-05-25T00:00:01Z
updated: 2026-05-25T00:01:00Z
---

## Context

User found that all pages in the edu-agent Next.js app do NOT match the UI design screenshots in `/UI/`. The current implementation uses generic Ant Design components with no layout fidelity to the designs. Task is to strictly rebuild ALL pages to match the 9 UI screenshots pixel-faithfully in structure, layout, and component placement.

**Tech stack:** Next.js 15, Ant Design 5, Recharts, TypeScript. 6 pages exist, 2+ new pages needed (class dashboard, batch review).

**Screenshots mapping:**
- Screenshot 1 → Dashboard `/`
- Screenshot 2 → Student Management `/students`
- Screenshot 3 → Student Detail `/students/[id]`
- Screenshot 4 → Upload Assignment `/assignments/upload`
- Screenshot 5 → AI Grading Results `/assignments/[id]/grading`
- Screenshot 6 → Assignment Grading Detailed view
- Screenshot 7 → 批阅复盘 (new)
- Screenshot 8 → Question Generation `/questions/generate`
- Screenshot 9 → 班级学情看板 `/class-dashboard` (new)

### Risks
- Charts (heatmap, radar, line, donut) require recharts which is installed — implementation detail risk
- Class dashboard and 批阅复盘 are new pages requiring new routes
- Sidebar AI chat widget is complex — may need simplified version
- The layout (sidebar/header) change affects ALL pages at once

## Criteria

### Layout & Sidebar
- [x] ISC-1: Sidebar menu has 7 items: 智能助手首页, 学生管理, 作业管理, 出题管理, 班级看板, 教学资源, 系统设置
- [x] ISC-2: Sidebar top shows "教师教学智能体" branding with blue robot/book icon
- [x] ISC-3: Sidebar has AI assistant chat widget at bottom with avatar and input
- [x] ISC-4: Active menu item highlighted with blue background fill
- [x] ISC-5: Header right side has search input, notification bell icon, user avatar
- [x] ISC-6: Header left side shows breadcrumb path of current page
- [x] ISC-7: Overall background is light gray (#f0f2f5) not white
- [x] ISC-8: Content area has white card background with border-radius

### Dashboard (/)
- [x] ISC-9: Dashboard shows time-of-day greeting "上午好/下午好/晚上好，王老师！"
- [x] ISC-10: Dashboard top has 4 stat info chips (本周作业数, 待批改, 已完成, 待确认)
- [x] ISC-11: Dashboard left column shows AI assistant chat panel with message history
- [x] ISC-12: Dashboard center shows recent assignment list with colored status badges
- [x] ISC-13: Dashboard right shows quick entry cards grid (上传作业, 智能出题, 学情分析, 学生管理)
- [x] ISC-14: Dashboard bottom shows "快捷入口" grid with 6 icon-button entries
- [x] ISC-15: Dashboard stat chips show numeric counts from real API data
- [x] ISC-16: Recent assignment list links to assignment grading page

### Student Management (/students)
- [x] ISC-17: Students page shows 4 colored stat cards (总学生数, 高风险, 关注, 本周新增)
- [x] ISC-18: Stat cards each have distinct accent color left border or background
- [x] ISC-19: Students page has tab filter row: 全部, 高风险, 关注, 正常
- [x] ISC-20: Student table has avatar column showing first Chinese character in colored circle
- [x] ISC-21: Student table has columns: 姓名, 学号, 班级, 年级, 最近得分, 综合掌握度, 风险等级, 最近提交时间, 操作
- [x] ISC-22: Mastery column shows colored progress bar (red/orange/green by score)
- [x] ISC-23: Risk badge is color-coded pill: 高风险=red, 关注=orange, 正常=green
- [x] ISC-24: Students page right sidebar shows donut chart of risk distribution
- [x] ISC-25: Search bar is in the filter/tab row, not separate Space component

### Student Detail (/students/[id])
- [x] ISC-26: Student detail page has profile header card with avatar, name, student no, class
- [x] ISC-27: Profile header shows 综合得分 as large bold number, trend arrow
- [x] ISC-28: Profile header shows 正确率 percentage prominently
- [x] ISC-29: Student detail has 3 stat cards below header: 综合得分, 本周作业, 正确率
- [x] ISC-30: Knowledge heatmap is shown as a color-coded table grid (rows=chapters, columns=weeks)
- [x] ISC-31: Radar chart is in the right column panel, labeled 能力雷达图
- [x] ISC-32: Teacher suggestion panel appears below radar chart
- [x] ISC-33: Assignment history table shows at the bottom of the page
- [x] ISC-34: Student detail uses 3-column layout: left stats, center heatmap, right radar+suggestions

### Upload Assignment (/assignments/upload)
- [x] ISC-35: Upload page shows 3-step breadcrumb indicator at page top
- [x] ISC-36: Upload page shows 3 method cards side-by-side: 拍照上传, 文件上传, 扫描仪
- [x] ISC-37: Upload page right column has 帮助指引 tips panel
- [x] ISC-38: Upload page shows file list area with uploaded file entries at bottom
- [x] ISC-39: Upload step indicator shows current step highlighted

### Grading Page (/assignments/[id]/grading)
- [x] ISC-40: Grading page header shows assignment title, student name, submission timestamp
- [x] ISC-41: Grading page shows 4 summary metric chips: AI总分, 正确率, 错题数, 低置信项
- [x] ISC-42: Grading left column has annotated image viewer at full height
- [x] ISC-43: Grading right column shows question table with AI分, 教师改分, 错因, 置信度
- [x] ISC-44: Confirm button is fixed/sticky at bottom right of right column
- [x] ISC-45: Low confidence items shown with orange/yellow highlight in table row

### Question Generation (/questions/generate)
- [x] ISC-46: Question gen left panel form has 学科 and 年级 dropdowns
- [x] ISC-47: Question gen left panel has knowledge point picker with tag-style selected items
- [x] ISC-48: Question gen left panel has 题型 selection as radio buttons/tags (not dropdown)
- [x] ISC-49: Question gen left panel has difficulty shown as segmented/slider control
- [x] ISC-50: Question gen center panel shows preview of generated questions with LaTeX/math formatting
- [x] ISC-51: Question gen right panel shows 生成记录 (history list) and 学情建议

### Class Dashboard (/class-dashboard) — NEW PAGE
- [x] ISC-52: Class dashboard route /class-dashboard exists and renders
- [x] ISC-53: Sidebar "班级看板" menu item links to /class-dashboard
- [x] ISC-54: Class dashboard shows 5 metric stat cards (平均分, 优秀率, 合格率, 知识点达标, 本周提交)
- [x] ISC-55: Class dashboard shows trend line chart for score history

## Decisions

### Risks (Think Phase)
- **Sidebar AI chat widget**: will implement as static UI panel (not live AI) — appearance matches design, no new AI integration
- **Screenshots 5 & 6**: map to the same `/assignments/[id]/grading` page at different scroll/tab states; will keep as one page
- **Screenshot 7 (批阅复盘)**: implement as a new page `/assignments/[id]/review` accessible from grading page
- **Class dashboard API**: will use mock/SWR data since no backend class-analytics API exists yet
- **Layout.tsx**: must be rebuilt first since it affects every page simultaneously

## Verification

**Date:** 2026-05-25  
**Method:** Playwright screenshots at http://localhost:3001 (port 3001 due to Obsidian occupying 3000)  
**Viewport:** 1440×900

### Visual Evidence

| Page | Screenshot | ISC Result |
|---|---|---|
| Dashboard `/` | `/tmp/verify-dashboard-final.png` | All ISC-9 to ISC-16 ✅ incl. 6-icon bottom row |
| Students `/students` | `/tmp/verify-students-wide.png` | ISC-17–25 ✅ (donut empty due to no data, legend renders) |
| Class Dashboard `/class-dashboard` | `/tmp/verify-class.png` | ISC-52–55 ✅ |
| Upload `/assignments/upload` | `/tmp/verify-upload.png` | ISC-35–39 ✅ |
| Questions `/questions/generate` | `/tmp/verify-questions.png` | ISC-46–51 ✅ |
| Layout/Sidebar | all screenshots | ISC-1–8 ✅ |

### Notes
- ISC-14 was missing on initial build — added bottom 6-icon 快捷入口 row to dashboard during verify phase
- ISC-26–34 (student detail) and ISC-40–45 (grading) verified by code review only — no students in DB to screenshot
- Donut chart (ISC-24) renders with legend visible; chart body empty because all values=0 (no data), structure correct
- TypeScript: `npx tsc --noEmit` passes with zero errors across all 8 rebuilt files
