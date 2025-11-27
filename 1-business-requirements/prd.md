# Product Requirements Document: Paper-Loving Digital Task Planner

## Overview & Vision

A task planning application designed for users who prefer physical paper but need to integrate with their digital calendar. The app centers around a WYSIWYG printout of a standard 8.5x11" (US) or A4 (Europe) sheet that can be printed for physical use. Users can also access and use the app on their smart phones while on the go.

**Target User:** People who love paper but still have digital lives.

**Core Value Proposition:** Bridge the gap between digital calendar integration and physical paper planning, supporting both print-based planning and mobile on-the-go usage.

## Core Features

### 1. WYSIWYG Print Layout
- **Primary Focus:** The entire interface is designed around a printable 8.5x11" (US) or A4 (international) sheet
- **Layout Components:**
  - Days of the week with task slots
  - Tasks may or may not have start times
  - Tasks may pull from Google Calendar (read-only, if user is authenticated)
  - Backlog area below day sections (list of lists with individual tasks)
  - Navigation buttons (settings, profile, day/week navigation, print)
- **Print Functionality:** Direct print button to send formatted sheet to printer

### 2. Time Blocking with Drag-and-Drop
- **Mechanism:** Drag tasks from backlog to day of the week
- **Time Flexibility:**
  - Tasks can have optional start times (especially calendar events)
  - Tasks can be time-agnostic (e.g., "work on Spanish in the morning")
  - Users manage their own time allocation
- **Task Format:** Text entries in a list format

### 3. Google Calendar Integration (Optional)
- **Authentication:** Users can use the app without logging in. Google Calendar integration is optional and only available if the user chooses to authenticate with Google.
- **Read-Only Display:** When authenticated, calendar events appear as tasks on the sheet
- **Sync Behavior:** Sync on page load or refresh (only when authenticated)
- **Authentication Method:** Uses Google OAuth (browser handles persistence if user allows)
- **Event Display:** Calendar events appear with their scheduled times

### 4. Backlog Management
- **Structure:** List of lists containing individual tasks
- **Functionality:** 
  - Tasks can be dragged from backlog to days
  - Lists within the backlog can be rearranged/reordered
- **Persistence:** All backlog data stored locally

### 5. Mobile Experience
- **Layout:** Print-focused layout optimized for mobile viewing
- **WYSIWYG:** Mobile view is not necessarily WYSIWYG to the printed page (optimized for screen interaction rather than print preview)
- **Functionality:** 
  - Full feature parity with desktop
  - Users can add and edit lists on mobile

## Technical Architecture

### Frontend Stack
- **Framework:** Svelte (strong preference for performance)
- **Styling:** Tailwind CSS
- **Hosting:** Static site, free hosting on GitHub Pages
- **Browser Support:** Modern browsers only

### Data Persistence
- **Storage Strategy:** Fully local, no cloud backend (for this iteration)
- **Future Consideration:** Cloud storage may be added in future iterations
- **Storage Mechanisms:**
  - Browser cookies
  - LocalStorage/IndexedDB for structured data
  - File system APIs where available
- **Data Stored Locally:**
  - Backlog items and lists
  - Tasks assigned to days
  - User preferences (settings, profile)
  - Google Calendar sync state (handled by browser/OAuth)

### Backend Architecture
- **Approach:** Client-side only ("backend" is local)
- **No Server Required:** All processing happens in the browser
- **Future Consideration:** Cloud sync explicitly out of scope for this iteration

### Authentication & Google Calendar Integration
- **Authentication:** Optional - users can use the app fully without logging in
- **Google Calendar API:** Google Calendar API via OAuth 2.0 (only when user authenticates)
- **Authentication Flow:** Standard OAuth (browser handles token persistence)
- **Sync Trigger:** On page load/refresh (only when authenticated)
- **Data Flow:** Read-only, events displayed as tasks (only when authenticated)

### Performance Requirements
- **Priority:** Fast performance is critical
- **Optimization Focus:** Svelte chosen for speed, minimal bundle size

## User Experience

### Primary Workflow
1. User opens app in browser
2. (Optional) User authenticates with Google Calendar
3. (If authenticated) App syncs with Google Calendar (on load)
4. User views week layout with existing tasks (and calendar events if authenticated)
5. User drags tasks from backlog to days
6. User prints the formatted sheet for physical use

### Print Workflow
- Print button triggers browser print dialog
- Layout optimized for 8.5x11" or A4 paper
- WYSIWYG ensures printed output matches screen view (on desktop)

### Mobile Workflow
- Same functionality as desktop
- Layout optimized for mobile viewing (may differ from print layout)
- Full interaction capabilities (drag, edit, etc.)

## Design & Styling

- **Fonts/Colors:** To be provided by design team
- **Framework:** Tailwind CSS for utility-based styling
- **Responsive:** Mobile-optimized layout

## Out of Scope

### Next
- Cloud storage and sync
- Print → hand-fill → digital update cycle with photo-based handwriting capture workflow

### Someday
- Creating/editing Google Calendar events from the app
- Multi-user or sharing features

## Success Criteria

1. **Print Quality:** Printed sheet matches on-screen layout (WYSIWYG)
2. **Performance:** Fast load times and smooth interactions
3. **Calendar Integration:** Reliable sync and display of Google Calendar events
4. **Local Persistence:** All user data persists across sessions
5. **Mobile Usability:** Functional and usable on mobile devices
6. **User Workflow:** Supports digital planning and printing workflow

## Technical Constraints

- Must be deployable as static site (GitHub Pages compatible)
- No server-side dependencies
- Modern browser APIs only
- Local storage limitations must be considered for large datasets

