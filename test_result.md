Build a complete, fully responsive multi-page frontend for "Happen" — a workplace 
operating system for human-centered companies. This is both a marketing website AND 
a role-based web application (demo mode).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESIGN SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Colors:
  --navy:   #1A2B3F  (headings, sidebar)
  --teal:   #3B7A77  (secondary actions, icons)
  --coral:  #F4A261  (primary CTAs, highlights)
  --bg:     #F8F9FA  (page background)
  --text:   #2D3E50  (body copy)
  --green:  #6B8F7A  (success states)
  --amber:  #E6B17E  (warnings)

Typography: Inter or Plus Jakarta Sans (Google Fonts)
Border radius: 12px on cards, 8px on buttons
Shadows: subtle — box-shadow: 0 2px 12px rgba(0,0,0,0.07)
Icons: Font Awesome 6 Free (CDN)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART A — MARKETING WEBSITE (6 pages)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All pages share a fixed top navbar:
  Left: "Happen" logo
  Center links: Product (dropdown: Features, How It Works, Integrations) | 
                Resources | About
  Right: Sign In | [Start Free Trial] (coral button)
  Mobile: hamburger menu

All pages share a footer:
  4-column links: Product / Company / Resources / Legal
  Copyright: © 2026 Happen. All rights reserved.
  Social icons (placeholder)

--- index.html ---
1. Hero
   - Headline: "Work shouldn't force people to choose between their lives and their jobs"
   - Subheadline: "Happen brings transparency, fairness, and automation to workplace 
     operations. No more burnout disguised as dedication."
   - Buttons: [See How It Works] (teal) + [Start Free Trial] (coral)
   - Background: soft abstract wave SVG in navy/teal tones
   - Subtle entrance animation on text

2. Trust Bar
   - "Trusted by companies that actually care"
   - 3 placeholder logos: DesignCo | AgencyX | BuildTeam

3. The Problem (3-column cards with icons)
   - Opaque Decisions | Burnout Epidemic | Fragmented Tools
   - Each: icon + bold label + 1-sentence description

4. The Solution
   - Headline: "Happen connects everything. So work finally works for everyone."
   - Placeholder dashboard mockup image (grey box with label)
   - 4-column features grid with icons:
     Intelligent Leave | Workload Visibility | Fair Queue | Emergency Leave

5. How It Works (3 steps, numbered, horizontal)
   - Connect → Configure → Breathe
   - Each step: number circle + title + short description

6. Culture Features (3 columns)
   - Leave Donation | Wellness Days | Team Recognition

7. Transparency Dashboard Preview
   - Blurred/dimmed placeholder UI mockup
   - 4 bullet features listed alongside

8. Safeguards (2 columns)
   - Bias Prevention | Legal Compliance

9. Testimonials (3 cards)
   - Sarah K. (Agency Collective) | Marcus T. (BuildLab) | Elena R. (Design Studio)
   - Avatar initials + quote + name + company

10. Final CTA
    - "Make work happen better."
    - [Start Your Free Trial] + "No credit card needed. 14 days of happy."

--- features.html ---
Seven full-width alternating sections (image left / text right, then flip):
  1. Intelligent Leave Management — flow diagram placeholder
  2. Fair Queue System — queue visualization placeholder
  3. Emergency Leave — mobile mockup placeholder
  4. Workload Visibility Dashboard — dashboard cards placeholder
  5. All-in-One Ecosystem — split screen placeholder
  6. Culture Building — icon grid
  7. Safeguards & Privacy — shield checklist layout

--- how-it-works.html ---
- 3 large step sections (Connect / Configure / Launch) with placeholder visuals
- Integration partners logo wall (9 tools: Jira, Asana, Trello, Google Workspace, 
  Microsoft 365, Gusto, ADP, Slack, Zoom)
- Implementation timeline table:
    Small (20): 1–2 hrs | Medium (20–200): half day | Enterprise (200+): 2–3 days
- Support section: 5 bullet points

--- about.html ---
- Hero with founding story paragraph
- Mission statement (large centered callout block)
- 3 core values cards: Dignity First | Radical Transparency | Practical Humanity
- Team section: 3 placeholder cards (Alex Chen CEO, Maya Rodriguez CPO, David Kim CTO)
  Each: avatar circle (initials) + name + title + 1 sentence bio
- "Why Work With Us" 3-point list
- Join Our Mission CTA + [View Careers] button

--- resources.html ---
- Hero
- 5 featured article cards (title + category badge + fake date + "Read More")
- Categories sidebar/filter pills: Research | Case Studies | Manager Guides | 
  HR Strategy | Company Culture
- Newsletter signup form (email input + subscribe button, no backend needed)

--- contact.html ---
- 4 contact option cards: Sales | Support | Partnerships | Press
- Contact form: Name, Email, Company Size (dropdown), Message, [Send Message]
- Office hours block

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART B — WEB APPLICATION (post-login)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All app pages share:
  - Collapsible left sidebar (navy background, white icons/text)
    Links depend on role — conditionally show/hide:
      Dashboard | Calendar | Leave Requests | Queue | Meetings |
      Team (team lead+) | Analytics (manager+) | HR Panel (hr) |
      Accounting (accounting) | Admin Panel (admin)
  - Top bar: search input | notification bell (badge count) | 
    profile dropdown (Profile / Settings / Logout)
  - "DEMO MODE" badge pinned top-right corner
  - Role badge shown next to user name in top bar

--- login.html ---
- Centered card, Happen logo at top
- Email + Password inputs
- [Sign In] button (coral)
- Divider + "Demo Access" section:
    Role selector dropdown + [Login as Role] button
    Shows credential hints per role
- On login: store role in localStorage, redirect to /app/dashboard.html

--- app/dashboard.html --- (renders differently per role)

EMPLOYEE VIEW (e.g. James Wu):
  3-column grid:
  Left card — Leave Balances:
    Annual: 12 days remaining
    Sick: 1 day used
    Wellness: 2 remaining
    Emergency: 3 remaining
    Buttons: [Request Leave] [Emergency Leave] [My Calendar]
  
  Middle card — Team Workload:
    Circular gauge at 65% (use CSS conic-gradient)
    Trend arrow ↑ 10%
    Upcoming deadlines list
    If pending request: queue status banner 
    "#2 in queue — Est. approval: Mar 12"
  
  Right card — Team Calendar:
    Mini calendar (pure CSS/JS, no library)
    Today's events list
    Upcoming meetings with [Join] buttons
  
  Bottom — Recent Activity feed (3-5 items)

TEAM LEAD VIEW (e.g. Sarah Chen):
  Top stats row: 4 metric cards 
    (Team workload % | Members count | On leave today | Pending requests)
  
  Tabs: Overview | Team Requests | Queue | Analytics
  
  Team Requests tab — table:
    Columns: Employee | Dates | Days | Type | Requested | 
             System Recommendation | Actions
    Action buttons: [Approve] (green) [Deny] (red) [Override] (amber)
    Override click → modal with required reason textarea + confirm

MANAGER VIEW (Michael Brown):
  Company workload overview — 4 team cards each with workload gauge
  Burnout risk alerts section (highlighted amber cards)
  Override patterns summary
  All-teams deadline timeline

HR VIEW (Lisa Wong):
  Alert banners at top (emergency proof expiring, bias flags)
  3 panels: Emergency Leave Review table | Bias Detection table | Appeals Queue
  Employee search bar → profile drawer slides in from right

ACCOUNTING VIEW (Robert Chen):
  Payroll summary cards (total, deductions, pending)
  Leave impact by department table
  Integration status (Gusto connected, ADP connected)
  Recent transactions list

ADMIN VIEW (Alex Rivera):
  Stat cards: Total users | Active today | Pending leaves | System alerts
  Quick links to all admin sections

--- app/leave-request.html ---
  Form: Leave type select | Start date | End date | Half-day checkbox | 
        Reason textarea | Emergency checkbox
  Smart preview panel (right side):
    Shows: current workload, estimated queue position, expected decision date
    Updates dynamically as user picks dates
  Submit → success toast with result (approved / queued / emergency confirmed)

--- app/queue.html ---
  Page title: "Team Leave Queue"
  Table with position numbers, highlight current user's row in coral
  Progress indicator showing queue movement
  Info note about priority algorithm

--- app/calendar.html ---
  Full month calendar view (pure JS, no external library)
  Legend: Blue=Approved | Yellow=Pending | Gray=Holiday | 
          Green=Wellness | Red=Emergency
  Filter bar: All Teams / by team name
  Click date → quick leave request popup

--- app/meetings.html ---
  "Create New Meeting" form: title, duration, attendee multi-select
  Availability grid (placeholder colored cells)
  Suggested times list
  Upcoming meetings table

--- app/leave-donation.html ---
  Two active campaigns with progress bars
  [Donate Days] button → modal: days input + recipient dropdown
  [Request Donation] button → separate form
  Donation history list

--- app/wellness.html ---
  Wellness day counter (0 of 2 used, progress bar)
  Explanation block
  [Take Wellness Day] big coral button → instant confirmation modal

--- app/admin/ ---
  admin/users.html — searchable/sortable table, 32 rows, Edit/Reset/View actions
  admin/passwords.html — WARNING banner + table with visible passwords + 
                          [Force Reset] buttons
  admin/impersonate.html — user dropdown + [Login As] button + warning text
  admin/audit.html — filterable table: timestamp | user | action | details | IP

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPONENT LIBRARY (reuse across pages)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Build these as reusable JS components or include blocks:

WorkloadGauge(percent, label)
  → circular CSS conic-gradient ring, color changes:
    green <50% | amber 50-80% | red >80%

LeaveCard(type, balance, used)
  → small card with icon, balance number large, used small

QueueBadge(position, estimatedDate)
  → pill-shaped badge, coral background

StatusBadge(status)
  → "Approved" green | "Pending" amber | "Denied" red | "Emergency" coral

OverrideModal(requestId)
  → full-screen overlay, required reason, warning text, confirm/cancel

NotificationPanel()
  → slide-in panel from right, list of notifications with timestamps

ProfileDrawer(employeeId)
  → slide-in from right for HR view, full employee details

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATE MANAGEMENT (localStorage)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Store in localStorage:
  happen_user        — { id, name, email, role, team }
  happen_leaves      — array of leave request objects
  happen_queue       — array of queue entries
  happen_workloads   — { design: 65, development: 89, marketing: 45, clientSuccess: 70 }
  happen_audit_log   — array of audit entries
  happen_notifications — array

On every page load: check happen_user exists, else redirect to login.html
On logout: clear happen_user only (preserve demo data)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEMO DATA (hardcode in data.js)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current demo date: March 8, 2026

32 employees with fields:
  id, firstName, lastName, email, password, role, team, 
  leaveBalanceAnnual, leaveBalanceSick, wellnessDaysUsed, 
  emergencyLeavesUsed, lastLeaveDate

Leave requests (pre-populated 6 sample requests as described)

Sample meetings (3 upcoming)

Sample notifications (5 per user type)

Audit log entries (10 sample rows)

Credentials — expose all in data.js for demo purposes:
  Admin:      admin@happen.com / Admin2026!
  Manager:    michael@creativesolutions.com / MichaelMgr456!
  HR:         lisa@creativesolutions.com / LisaHR789!
  Accounting: robert@creativesolutions.com / RobertAcct789!
  Team Lead:  sarah@creativesolutions.com / SarahLead123!
  Employee:   james.wu@creativesolutions.com / JamesWu123!
  (all 32 in data.js)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/
├── index.html
├── features.html
├── how-it-works.html
├── about.html
├── resources.html
├── contact.html
├── login.html
├── assets/
│   ├── css/
│   │   ├── global.css        (design tokens, reset, typography)
│   │   ├── marketing.css     (marketing pages only)
│   │   └── app.css           (sidebar layout, dashboard styles)
│   ├── js/
│   │   ├── data.js           (all demo data + credentials)
│   │   ├── auth.js           (login/logout/role check)
│   │   ├── components.js     (WorkloadGauge, LeaveCard, etc.)
│   │   └── app.js            (dashboard rendering per role)
│   └── img/                  (placeholder SVGs)
└── app/
    ├── dashboard.html
    ├── leave-request.html
    ├── queue.html
    ├── calendar.html
    ├── meetings.html
    ├── leave-donation.html
    ├── wellness.html
    └── admin/
        ├── users.html
        ├── passwords.html
        ├── impersonate.html
        └── audit.html

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECHNICAL REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Vanilla HTML + CSS + JavaScript only (no frameworks)
- No external dependencies except Font Awesome CDN + Google Fonts CDN
- Fully responsive: mobile 320px → desktop 1440px
- Smooth transitions: sidebar collapse, modal open/close, page tab switches
- All buttons must have hover states (0.2s transition)
- WCAG AA color contrast minimum
- Semantic HTML (nav, main, section, article, aside)
- No console errors on load
- All forms client-side validated before submit