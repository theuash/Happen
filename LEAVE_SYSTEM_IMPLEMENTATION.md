# Leave Management System Implementation

## Overview
Implemented a comprehensive leave management system with the following features:

## Features Implemented

### 1. Leave Request Submission
- **Location**: `/leave/request`
- **Features**:
  - Submit leave requests with type (annual, sick, wellness, emergency)
  - Date range selection
  - Half-day option with AM/PM selection
  - Automatic approval/queuing based on team workload
  - Real-time feedback on request status
  - Queue position display for queued requests

### 2. My Leave Requests Page
- **Location**: `/leave`
- **Features**:
  - View all personal leave requests
  - Status indicators (approved, pending, queued, denied, emergency)
  - Queue position display
  - Quick access to create new requests
  - Link to view all leaves (for managers/HR/admin)

### 3. All Leaves Page (NEW)
- **Location**: `/leave/all`
- **Access**: Team leads, managers, HR, and admins only
- **Features**:
  - View all leave requests across the organization
  - Filter by status (all, pending, queued, approved, emergency, denied)
  - Approve/deny requests directly from the page
  - Detailed leave information modal
  - Real-time status updates
  - Queue position tracking
  - Team-based filtering for team leads

### 4. Enhanced Calendar View
- **Location**: `/calendar`
- **Features**:
  - Visual calendar showing who is on leave
  - Color-coded leave status (approved, emergency, pending)
  - Multi-day leave expansion
  - Employee names on leave dates
  - Summary statistics:
    - Total people on leave this month
    - Total leave days this month
    - Emergency leaves count
  - Today's date highlighting
  - Company-wide view for managers/HR/admin
  - Team-specific view for regular employees

## Backend Endpoints

### New Endpoint
- `GET /api/leave-requests/all` - Fetch all leave requests with filtering by role

### Existing Endpoints Used
- `POST /api/leave-requests` - Submit new leave request
- `GET /api/me/leave-requests` - Get user's leave requests
- `GET /api/teams/:teamId/calendar` - Get team calendar
- `GET /api/company/calendar?month=&year=` - Get company-wide calendar
- `PATCH /api/leave-requests/:id/approve` - Approve leave request
- `PATCH /api/leave-requests/:id/deny` - Deny leave request

## User Flow

### Employee Flow
1. Employee navigates to "Request Leave" (`/leave/request`)
2. Fills out leave request form
3. Submits request
4. System automatically:
   - Approves if team workload < 50%
   - Queues if team workload >= 50%
   - Grants emergency leave immediately
5. Employee can view their requests at `/leave`
6. Employee can see team calendar at `/calendar`

### Manager/HR/Admin Flow
1. Can view all leave requests at `/leave/all`
2. Filter by status (pending, queued, approved, etc.)
3. Approve or deny requests with optional reason
4. View company-wide calendar at `/calendar`
5. See real-time statistics and queue positions

## Navigation Updates
- Added "All Leaves" link in sidebar (visible to team_lead, manager, hr, admin)
- Updated "Leave Requests" to "My Leave Requests" for clarity
- Added quick navigation between personal and all leaves

## Status Types
- **Approved**: Automatically approved or manually approved by manager
- **Pending**: Awaiting manager review
- **Queued**: In queue due to high team workload (shows position)
- **Emergency**: Emergency leave granted immediately
- **Denied**: Rejected by manager with optional reason

## Visual Enhancements
- Color-coded status badges
- Queue position indicators
- Interactive calendar with hover tooltips
- Responsive grid layout
- Loading states
- Empty states with helpful messages
- Modal for detailed leave information

## Security & Permissions
- Role-based access control
- Team leads can only see their team's requests
- Managers, HR, and admins can see all requests
- Employees can only see their own requests
- Protected routes with role guards

## Next Steps (Optional Enhancements)
- Email notifications for leave approvals/denials
- Push notifications
- Leave balance tracking and display
- Conflict detection (overlapping leaves)
- Export calendar to iCal/Google Calendar
- Leave history and analytics
- Bulk approval/denial
- Comments/notes on leave requests
