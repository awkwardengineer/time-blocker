# Technical Architecture Document

## System Architecture Overview

The application is a fully client-side, static web application with no server-side dependencies. All data persistence is handled locally in the browser, and the application can be hosted as a static site on GitHub Pages.

```mermaid
graph TB
    User[User Browser] --> App[Static Web App]
    App --> IndexedDB[IndexedDB via Dexie.js]
    App --> GoogleAPI[Google Calendar API]
    App --> Print[Browser Print Dialog]
    
    style App fill:#e1f5ff
    style IndexedDB fill:#fff4e1
    style GoogleAPI fill:#e8f5e9
```

## Technology Stack

### Frontend Framework
- **Svelte**: Primary framework chosen for performance and minimal bundle size
- **SvelteKit**: For routing and build tooling (if needed) or vanilla Svelte with Vite

### Styling
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Custom fonts/colors**: To be provided by design team

### Data Storage Library
- **Dexie.js**: IndexedDB wrapper library for simplified database operations
- **Rationale**: Provides simple Promise-based API, TypeScript support, and handles schema migrations

### Build Tools
- **Vite**: Build tool and dev server (if using SvelteKit or standalone Svelte)
- **Static output**: Must produce static files deployable to GitHub Pages

## Data Storage Architecture

### Storage Strategy
All data is stored locally in the browser using IndexedDB via Dexie.js. No cloud backend or server-side storage.

```mermaid
graph TB
    App[Application] --> Dexie[Dexie.js]
    Dexie --> IndexedDB[IndexedDB]
    
    IndexedDB --> Tasks[Tasks Table<br/>Core Entities]
    IndexedDB --> BacklogLists[Backlog Lists Table]
    IndexedDB --> BacklogItems[Backlog Items Table<br/>Junction: Tasks ↔ Lists]
    IndexedDB --> CalendarState[Calendar Sync State]
    IndexedDB --> UserPrefs[User Preferences]
    
    Tasks -.->|referenced by| BacklogItems
    BacklogLists -.->|referenced by| BacklogItems
```

### Data Models

#### Tasks (Primary Entities)
- **Tasks are independent entities** that can be referenced from multiple places
- **Task Properties**: 
  - `id`: Unique identifier
  - `text`: Task content
  - `time`: Optional start time (if time-specific)
  - `day`: Which day the task is assigned to (null if not assigned to a day)
  - `source`: User-created or Google Calendar
  - `weekId`: Week identifier for organization
- **Task Relationships**:
  - A task can exist in a day (has `day` property) without being in any backlog list
  - A task can exist in backlog lists (via BacklogItems junction table) without a day
  - A task can exist in both (has `day` and is linked to backlog lists)
  - A task can only be assigned to one day at a time

#### Backlog Structure
- **Backlog Lists**: Collections that organize tasks
  - `id`: Unique identifier
  - `name`: List name
  - `order`: Display order
- **Backlog Items**: Junction table linking tasks to lists (many-to-many relationship)
  - `id`: Unique identifier
  - `listId`: Reference to backlog list
  - `taskId`: Reference to task
  - `order`: Display order within the list
- **Display Logic**: To show "planned" status in backlog, check if the linked task has a `day` value

#### Days
- **Days are not separate entities** - they are represented by querying tasks where `day` is not null
- To display days with tasks: Query tasks grouped by `day` property
- Day values can be day names (e.g., "Monday") or dates (e.g., "2024-01-15")

#### User Preferences
- Settings
- Profile information
- Display preferences

### Storage Implementation
- **Storage Method**: IndexedDB via Dexie.js for all data (tasks, backlog, preferences, calendar state)
- **Data Format**: Structured objects stored directly (no JSON serialization needed)

### Dexie.js Database Schema Example
```javascript
import Dexie from 'dexie';

const db = new Dexie('TaskPlannerDB');
db.version(1).stores({
  tasks: '++id, day, time, weekId, text, source',
  backlogLists: '++id, name, order',
  backlogItems: '++id, listId, taskId, order',
  preferences: 'key',
  calendarSyncState: 'key'
});
```

- **Tasks Table**: Core task entities with indexes on `day`, `time`, `weekId` for efficient queries
- **BacklogLists Table**: Backlog list definitions
- **BacklogItems Table**: Junction table linking tasks to lists (indexed on `listId` and `taskId` for efficient lookups)
- **Auto-increment**: Primary keys use `++id` for automatic ID generation
- **Migrations**: Dexie handles schema versioning and migrations automatically
- **Query Patterns**:
  - Get tasks for a day: `db.tasks.where('day').equals(dayName).toArray()`
  - Get tasks in a backlog list: Join `backlogItems` (filtered by `listId`) with `tasks` (filtered by `taskId`)
  - Get planned tasks in backlog: Tasks that have both a `day` value and are linked via `backlogItems`

## Google Calendar Integration

### Authentication Flow
Optional authentication using Google OAuth 2.0. Users can use the app without logging in.

```mermaid
sequenceDiagram
    participant User
    participant App
    participant GoogleOAuth
    participant GoogleAPI
    
    User->>App: Opens App
    App->>User: Display (no auth required)
    User->>App: Clicks "Connect Calendar"
    App->>GoogleOAuth: Initiate OAuth Flow
    GoogleOAuth->>User: Google Login
    User->>GoogleOAuth: Authenticate
    GoogleOAuth->>App: Return Auth Token
    App->>GoogleAPI: Request Calendar Events
    GoogleAPI->>App: Return Events
    App->>App: Store Events Locally
    App->>User: Display Calendar Events
```

### API Integration
- **API**: Google Calendar API v3
- **Authentication**: OAuth 2.0
- **Scope**: Read-only calendar access
- **Sync Trigger**: On page load/refresh (when authenticated)
- **Token Storage**: Browser handles OAuth token persistence
- **Data Flow**: User authenticates (optional) → App requests calendar events → Events stored locally → Events displayed as tasks (read-only)

## Print Functionality

### Print Architecture
The application uses CSS print media queries to format the layout for printing.

```mermaid
graph TB
    User[User] --> PrintBtn[Print Button]
    PrintBtn --> PrintCSS[Print CSS Media Queries]
    PrintCSS --> BrowserPrint[Browser Print Dialog]
    BrowserPrint --> Printer[Physical Printer]
    
    PrintCSS --> WYSIWYG[WYSIWYG Layout<br/>Desktop Only]
    PrintCSS --> MobileView[Mobile Optimized View<br/>Not WYSIWYG]
```

### Implementation Details
- **Print Trigger**: Browser's `window.print()` API
- **Layout**: CSS `@media print` queries
- **Page Size**: 8.5x11" (US) or A4 (international)
- **Print Resolution**: Printers print at 96 DPI (device independent pixels per inch)
- **8.5x11" Dimensions**: 816 × 1056 DIP/px (8.5 × 96 = 816, 11 × 96 = 1056)
- **Layout Constraints**: Print layout should be designed within these pixel dimensions for accurate WYSIWYG rendering
- **WYSIWYG**: Desktop view matches print output
- **Mobile**: Optimized for screen, not necessarily WYSIWYG

## Mobile Architecture

### Responsive Design
- **Framework**: Tailwind CSS responsive utilities
- **Breakpoints**: Standard Tailwind breakpoints (sm, md, lg, xl)
- **Layout**: Same print-focused layout, optimized for mobile viewing

### Mobile-Specific Considerations
- Touch interactions for drag-and-drop
- Mobile-optimized UI (not strictly WYSIWYG)
- Full feature parity with desktop
- Ability to add and edit lists on mobile

## Build & Deployment

### Build Process
```mermaid
graph LR
    Source[4-src/] --> Build[Build Process]
    Build --> Static[5-dist/]
    Static --> GitHub[GitHub Pages]
    
    Build --> HTML[HTML]
    Build --> JS[JavaScript]
    Build --> CSS[CSS]
    Build --> Assets[Assets]
```

### Deployment
- **Hosting**: GitHub Pages (static site)
- **Build Output**: Static HTML, CSS, JavaScript files
- **No Server Required**: Fully static deployment
- **CDN**: GitHub Pages provides CDN for static assets

### Development Workflow
1. Develop in `4-src/` folder
2. Build process compiles to `5-dist/` folder
3. Deploy `5-dist/` contents to GitHub Pages
4. Changes should not be made directly in `5-dist/`

### Design Kit / Component Library
- **Purpose**: Development-only HTML page showcasing design system and components
- **Location**: Live-coded HTML page in development environment (not included in production build)
- **Contents**: 
  - Design tokens (colors, fonts, spacing)
  - Component examples (buttons, inputs, task items, etc.)
  - Layout patterns
  - Print layout preview
- **Usage**: Reference for developers during implementation, ensures design consistency
- **Exclusion**: Not deployed to production (excluded from build output)

## Performance Considerations

### Optimization Strategies
- **Svelte**: Chosen for minimal bundle size and fast runtime
- **Code Splitting**: Lazy load Google Calendar integration (only when authenticated)
- **Dexie.js/IndexedDB**: Use indexes for efficient queries, load only current week's tasks by default
- **Print CSS**: Optimized print stylesheets to reduce print dialog delay

### Performance Targets
- Fast initial load time
- Smooth drag-and-drop interactions
- Quick print dialog rendering
- Efficient local storage operations

## Browser Compatibility

### Supported Browsers
- Modern browsers only (Chrome, Firefox, Safari, Edge - latest versions)
- No support for Internet Explorer or legacy browsers
- Mobile browsers: iOS Safari, Chrome Mobile, Firefox Mobile

### Required Browser Features
- ES6+ JavaScript support
- IndexedDB API
- CSS Grid/Flexbox
- OAuth 2.0 support
- Print API

## Testing Strategy

### Testing Framework
- **Vitest**: Test runner (Vite-native, fast, ESM support, Jest-compatible API)
- **@testing-library/svelte**: Component testing utilities for Svelte (rendering, queries)
- **jsdom**: DOM simulation for browser environment testing (configured in vite.config.js)
- **@testing-library/jest-dom**: DOM matchers for readable assertions (`toBeInTheDocument()`, `toHaveClass()`, etc.)
- **@testing-library/user-event**: User interaction simulation for integration tests (more realistic than `fireEvent`)
- **Playwright**: End-to-end browser testing for PDF validation (generates actual PDFs to verify single-page constraint)

### Test Categories

#### Unit Tests
- Component rendering and behavior
- Utility functions and helpers
- Data model operations (Dexie.js queries)

#### Integration Tests
- Component interactions
- Data persistence (IndexedDB operations)
- Google Calendar API integration (mocked)

#### End-to-End PDF Tests (Playwright)
- **PDF output validation**: Generate actual PDFs and verify single-page constraint
  - Generate PDF from print layout using Playwright's `page.pdf()`
  - Verify PDF contains exactly 1 page (no overflow to page 2)
  - Test with realistic data (full task lists, maximum content)
  - Validate dimensions match expected 816 × 1056 px layout
  - *Validates actual PDF output - if PDF is 1 page, CSS is working correctly*

### Test Structure & Commands
```
4-src/
  src/
    __tests__/
      components/
      utils/
      print/
        print-layout.test.js        # CSS validation (Vitest)
        print-pdf.e2e.test.js      # PDF output validation (Playwright)
```

**Commands:**
- `npm test`: Run all Vitest tests (unit + integration)
- `npm run test:watch`: Watch mode for Vitest
- `npm run test:coverage`: Coverage report
- `npm run test:e2e`: Run Playwright PDF validation tests (slower, run separately)

### Test Requirements
- All new features must include tests
- Print layout changes must include both CSS validation tests and PDF output validation
- Minimum 80% code coverage target (Vitest tests)
- All tests (including PDF validation) run in CI/CD pipeline before deployment

## Security Considerations

### OAuth Security
- OAuth tokens stored in browser (handled by Google's OAuth flow)
- No server-side token storage required
- HTTPS required for OAuth (GitHub Pages provides HTTPS)

### Local Data Security
- All data stored locally in user's browser
- No data transmitted to external servers (except Google Calendar API)
- User has full control over their local data

## Future Architecture Considerations

### Cloud Storage (Next Iteration)
- Potential migration path for cloud sync
- Maintain backward compatibility with local storage
- Hybrid approach: local-first with cloud backup

### Handwriting Capture (Next Iteration)
- Photo upload functionality
- Image processing for handwriting recognition
- Integration with existing task system

