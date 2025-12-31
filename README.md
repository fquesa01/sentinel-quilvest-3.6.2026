# Sentinel Counsel LLP

## Overview

Sentinel Counsel LLP is an enterprise-grade AI-powered platform for compliance monitoring and management. The platform provides real-time surveillance, AI-driven detection, comprehensive case management, regulatory knowledge bases, and analytics to help large organizations identify, investigate, and resolve regulatory violations across various communication channels.

## Key Features

### 🔍 Evidence Collection & Ingestion
- **Multi-Format Email Ingestion**: Support for 17 email formats (PST, MSG, EML, MBOX, MHTML, ICS, VCF, ZIP archives)
- **Chat Message Processing**: Ingestion for 9+ chat platforms (WhatsApp, iOS SMS, Android SMS, Slack, Teams, etc.)
- **Third-Party Connectors**: Extensible adapter framework for Slack, Dropbox, M365, OneDrive, SharePoint, and Google Drive
- **Automatic File Processing**: Text extraction and metadata enrichment with case-scoped isolation

### 📋 Document Review & eDiscovery
- **Advanced Search System**: Collapsible panel with autocomplete, keyboard shortcuts (`/` for search, `Shift+A` to toggle panel)
- **Date Range Filtering** (Phase 2): 
  - 6 preset buttons (Today, Last 7/30 Days, This/Last Month, This Year)
  - Custom dual calendar pickers with same-day selection support
  - Double-layer date normalization (component + API level)
  - localStorage persistence across sessions
- **Tag Management**: Quick tags, custom tags, color coding, and bulk operations
- **Dual-Sidebar System**: Left panel for hierarchical navigation, right panel for document coding
- **Attachment Viewer**: In-context attachment viewing with AI-powered translation
- **Production & Export**: PDF/Word export with customizable branding and metadata

### 🤖 AI-Powered Analytics
- **Violation Detection**: OpenAI GPT-5 integration for automated rule-based detection and LLM analysis
- **Gemini File Search RAG**: Semantic document search with natural language queries and AI-grounded answers
- **Management Analytics**: COO-level employee communication analysis with:
  - Topic clustering (Gemini embeddings)
  - Sentiment analysis (OpenAI GPT-5)
  - Collaboration network visualization
  - Communication pattern detection
  - 30-day result caching with audit logging
- **Ava AI Assistant**: Context-aware chatbot with persistent history and document citations
- **AI Interview Module**: OpenAI-powered dynamic questioning with ElevenLabs transcription

### 📊 Communication Analytics
- **Unified Dashboard**: Comprehensive insights across emails and chat messages
- **Top Communicators**: Horizontal bar chart with participant statistics
- **Communication Heatmap**: Interactive grid visualization
- **Unified Timeline**: Chronological view with channel badges
- **Advanced Filtering**: Multi-dimensional filtering with real-time updates

### ⚖️ Compliance & GRC
- **Case Management**: Comprehensive investigation workflows with chronological event tracking
- **Compliance Logic Studio**: No-code templates for 11 regulatory frameworks (FCPA, Antitrust, SOX, BSA/AML, etc.)
- **Legal Hold System**: Document preservation with custodian management
- **Attorney-Client Privilege**: Privilege log and redaction tools
- **Risk & Control Management**: Integrated GRC workflows

### 🔐 Security & Access Control
- **Role-Based Access**: 7 distinct roles (Super Admin, Compliance Officer, Investigator, Attorney, External Counsel, Employee, Auditor)
- **Multi-Provider Auth**: Replit Auth (OIDC) and Microsoft OAuth 365 with automatic account linking
- **Case-Scoped Isolation**: Strict data boundaries preventing cross-case contamination
- **Audit Logging**: Comprehensive tracking of all sensitive operations
- **PII Redaction**: Basic redaction for emails, phone numbers, SSNs, credit cards before AI processing

### 📈 Analytics & Reporting
- **Whistleblower Portal**: Anonymous submission with secure token-based access
- **Board Reports**: Executive summaries with visualization
- **Disclosure Playbooks**: Automated regulatory disclosure workflows
- **Training & Certification**: Policy management and compliance training tracking

## Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: Wouter
- **State Management**: TanStack Query v5
- **UI Components**: Shadcn/ui (Radix UI primitives) + Tailwind CSS
- **Design System**: Carbon Design System patterns
- **Charts**: Recharts for data visualization
- **Date Handling**: date-fns for manipulation and formatting

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM
- **Authentication**: Passport.js with OpenID Connect and OAuth 2.0
- **Session Management**: express-session with PostgreSQL store
- **File Upload**: Secure multipart processing with automatic text extraction

### AI & External Services
- **OpenAI GPT-5**: Via Replit AI Integrations for violation analysis, sentiment detection, and chatbot
- **Google Gemini**: File Search API for RAG, embeddings for topic clustering
- **ElevenLabs**: Audio transcription for interview module
- **SendGrid**: Optional email notifications
- **Twilio**: Optional SMS notifications

### Data Models
Comprehensive schemas for Users, Communications, Alerts, Cases, Regulations, Interviews, Audit Logs, Connector Configurations, Legal Holds, Detection Rules, Tags, Document Tags, Remediation Plans, Regulatory Strategies, Disclosure Playbooks, Board Reports, Whistleblower Reports, Policies, Training Assignments, Certifications, Risks, Controls, Incidents, Chat Sessions, Chat Messages, and Case Messages.

## Tech Stack

### Core Technologies
- **Languages**: TypeScript, JavaScript (ES2020+)
- **Frontend**: React 18, Vite, Wouter, TanStack Query v5
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **UI**: Shadcn/ui, Radix UI, Tailwind CSS, Framer Motion

### Key Libraries
- **Form Handling**: react-hook-form, Zod validation
- **File Processing**: pst-extractor, mailparser, mammoth, pdf-parse, docx, jspdf
- **Authentication**: Passport.js, OpenID Client, Google Auth Library
- **Data Visualization**: Recharts, react-force-graph-2d
- **File Upload**: Uppy (AWS S3 compatible)
- **Animations**: Framer Motion for UI transitions
- **Utilities**: date-fns, memoizee

## Setup Instructions

### Prerequisites
- Node.js 20+ (automatically configured via Replit)
- PostgreSQL database (Neon serverless via Replit)
- Environment variables (see below)

### Environment Variables

Create or verify the following secrets in your Replit environment:

```bash
# Database (auto-configured by Replit PostgreSQL)
DATABASE_URL=postgresql://...
PGHOST=...
PGPORT=...
PGUSER=...
PGPASSWORD=...
PGDATABASE=...

# Session Management
SESSION_SECRET=your-random-secret-key

# AI Services (via Replit AI Integrations)
# OpenAI API key is automatically managed by Replit AI Integrations
GEMINI_API_KEY=your-gemini-api-key

# Optional: Audio Transcription
ELEVENLABS_API_KEY=your-elevenlabs-api-key

# Optional: Object Storage (auto-configured if using Replit Object Storage)
DEFAULT_OBJECT_STORAGE_BUCKET_ID=...
PUBLIC_OBJECT_SEARCH_PATHS=...
PRIVATE_OBJECT_DIR=...
```

### Installation

1. **Clone the repository** (or fork on Replit)

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up the database**:
   ```bash
   npm run db:push
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Access the application**:
   - Development: `http://localhost:5000`
   - Production: Via Replit deployment URL

### First-Time Setup

1. **Create Admin Account**: Navigate to the login page and authenticate via Replit Auth or Microsoft OAuth
2. **Configure Roles**: The first user is automatically assigned Super Admin role
3. **Create Cases**: Navigate to Cases and create your first investigation case
4. **Upload Evidence**: Use the Evidence tab to upload emails, documents, or configure third-party connectors
5. **Configure AI Services**: Ensure GEMINI_API_KEY is set for File Search RAG functionality

## Development

### Project Structure

```
sentinel-counsel/
├── client/                  # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components (routed)
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities and helpers
├── server/                  # Backend Express application
│   ├── routes.ts           # API route definitions
│   ├── storage.ts          # Database access layer
│   ├── replitAuth.ts       # Authentication configuration
│   ├── services/           # Business logic services
│   ├── connectors/         # Third-party connector framework
│   └── ingestion/          # Email and chat ingestion modules
├── shared/                  # Shared types and schemas
│   └── schema.ts           # Drizzle ORM schemas + Zod validators
└── migrations/              # Database schema migrations
```

### Key Commands

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run db:push          # Sync database schema with Drizzle
```

### Coding Conventions

- **TypeScript**: Strict mode enabled, explicit typing required
- **React**: Functional components with hooks, no class components
- **API Routes**: RESTful conventions, Zod validation on all inputs
- **Database**: Drizzle ORM with type-safe queries, no raw SQL unless necessary
- **Styling**: Tailwind CSS utility classes, Shadcn/ui components for consistency

## Phase 2: Date Range Filtering

The latest enhancement adds comprehensive date range filtering to the Document Review interface:

### Features
- **6 Preset Buttons**: Today, Last 7 Days, Last 30 Days, This Month, Last Month, This Year
- **Custom Date Pickers**: Dual calendars (From/To) with same-day selection support
- **Smart Normalization**: Double-layer approach (component + API level) prevents timezone issues
- **Persistence**: Filter state saved to localStorage and survives page reloads
- **Real-Time Updates**: Active filter count badge and formatted date displays

### Implementation Highlights
- **Component**: `client/src/components/date-range-filter.tsx` (Shadcn Popover + Calendar)
- **State Management**: `client/src/hooks/use-advanced-filters.ts` with localStorage integration
- **Backend**: `server/routes.ts` + `server/storage.ts` with PostgreSQL timestamp filtering
- **Date Handling**: Uses `date-fns` for robust date manipulation and formatting

### Technical Details
- Same-day selection enabled via `startOfDay` comparison in calendar disabled predicate
- "From" dates normalized to 00:00:00.000, "To" dates to 23:59:59.999 for full-day coverage
- Query keys include date filters for proper TanStack Query cache invalidation
- Compatible with existing quick filter system (sender, recipient, date)

## Deployment

### Replit Deployment
The application is configured for seamless Replit deployment:

1. Click "Deploy" in the Replit interface
2. Configure environment variables via Secrets tab
3. Enable PostgreSQL database via Replit Database integration
4. Deploy to production with automatic HTTPS and custom domain support

### Manual Deployment
For non-Replit deployments:

1. Build the application: `npm run build`
2. Set all required environment variables
3. Configure PostgreSQL connection
4. Serve the application via Node.js: `node dist/index.js`

## License

Proprietary - Sentinel Counsel LLP. All rights reserved.

## Support

For issues, questions, or feature requests, please contact the development team or open an issue in the repository.

---

**Version**: 2.0.0 (Phase 2: Date Range Filtering)  
**Last Updated**: November 24, 2025
