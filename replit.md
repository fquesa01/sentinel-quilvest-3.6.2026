# Sentinel Counsel LLP

## Overview
Sentinel Counsel LLP is an enterprise-grade AI-powered platform designed for comprehensive compliance monitoring and management. It provides real-time surveillance, AI-driven detection, robust case management, extensive regulatory knowledge bases, and advanced analytics. The platform aims to minimize compliance risk for large organizations by supporting adherence to regulations like FCPA, Federal Antitrust, SOX, and BSA/AML. Key capabilities include advanced document search, an AI interview system, chronological event tracking, an anonymous whistleblower portal, and a crisis response module, offering a smart, centralized solution for navigating complex regulatory landscapes, enabling proactive compliance and effective risk mitigation.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend is built with React 18, TypeScript, Vite, Wouter, and TanStack Query. Styling uses Shadcn/ui (Radix UI) and Tailwind CSS, adhering to Carbon Design System patterns. Features include hierarchical sidebar navigation, role-based access control, customizable column visibility, 7 themes (Light, Dark, Green, Sentinel, Navy, Linear, Orange), advanced document search interfaces, collaborative highlighting and commenting, and specialized chat message review. Progressive reveal animations (`fadeSlideUp`) are applied using utility classes `stagger-1` through `stagger-8`.

### Technical Implementations
The backend uses Node.js, Express.js, and TypeScript, providing RESTful API endpoints. Authentication leverages Replit Auth (OpenID Connect with Passport.js) and Microsoft OAuth 365, including automatic account linking and role-based access control. Data persistence is managed by PostgreSQL (Neon serverless driver) with Drizzle ORM. The system supports secure file uploads with automatic text extraction, a comprehensive email ingestion module, and an extensible Third-Party Connector Ingestion Framework.

### Feature Specifications
- **Communication Ingestion:** Processes 17 email and 9+ chat message formats, normalizing them.
- **Analytics Dashboards:** Offers Communication Analytics (Top Communicators, Heatmap, Unified Timeline) and Management Analytics (AI-powered insights for behavioral patterns, topic clusters, sentiment trends, PII redaction).
- **Tag Management:** Comprehensive system for document coding and categorization with "Quick Tags," dynamic updates, user-specific tracking, color coding, and text selection tagging.
- **AI Integration:** Uses OpenAI GPT-5 for violation analysis and risk scoring; Google Gemini for semantic document search (RAG) in the "Ask About Case" Investigation Assistant; Emma AI Assistant chatbot for context-aware guidance; and Claude (Anthropic) for intelligent boolean query generation in Ambient Intelligence.
- **AI Interview Module:** Redesigned system with live video, real-time transcription, automated AI analysis, evidence linking, and a Witness Video Recording Platform.
- **Compliance Workflows:** Supports defined workflows for alerts, GRC incidents, and risks with sector-specific rule packs and a no-code Compliance Logic Studio.
- **eDiscovery & Privilege:** Document processing including deduplication, email threading, TAR/Predictive Coding with AI-generated responsiveness predictions, production set management with Bates numbering, PII scanning, template-based redactions, auto-generation of privilege logs, and 7 export formats.
- **Case Lifecycle Management:** Administrator-controlled case close, archive, and reopen functionality with audit trails.
- **Intelligent Document Processing:** AI-powered document classification (33 types), deal terms extraction from LOI/Term Sheets, and generation of 8 transaction document types using deal terms.
- **Virtual Data Room (VDR):** Enterprise-grade VDR for M&A with hierarchical folder structures, templates, document upload, advanced access control, Q&A Due Diligence, and in-app document preview.
- **Court Pleadings System:** Upload and manage legal documents (complaints, motions, briefs, discovery) with automatic text extraction from PDF/Word/text files, RAG indexing for AI-powered search, and file persistence in object storage. Includes pleading type classification, filing date tracking, and download functionality. Documents are automatically indexed for Ambient Intelligence discovery.
- **Ambient Intelligence:** Real-time meeting transcription with AI-powered document discovery, smart search queries, and risk-based results.
- **DD Boolean Search & Checklist System:** Two-stage M&A due diligence pipeline using boolean pre-filtering across all document sources (data rooms, PE deal documents, communications, court pleadings) followed by Google Gemini AI analysis. Features 23 due diligence sections with 69 seeded boolean queries covering Corporate Structure, Capitalization, Financial DD, Tax, Litigation, Material Contracts, IP, Real Property, Environmental, HR, Insurance, IT, Regulatory, and more. Supports customizable per-deal boolean queries, comprehensive document matching with relevance scoring, AI-generated findings with risk levels and recommendations, document tagging capability, and PDF report generation with professional formatting including color-coded sections, risk indicators, and document citations. Database tables: dd_checklist_sections, dd_boolean_queries (master library), dd_deal_queries (per-deal editable), dd_analysis_runs, dd_section_results, dd_document_matches. API endpoints: /api/dd-boolean-search for search/analysis, /api/dd-boolean-search/analysis/results/:runId/pdf for report export.
- **Deal Templates System:** Pre-built transaction checklists with template management, item status tracking, document linking, and an auto-matching engine.
- **Privileged Research:** A Claude-like AI chat interface for confidential legal research with session management, streaming AI responses, and privilege protection.
- **Recorded Statements Upload System:** Manages depositions, interviews, and witness statements with multi-format upload, AI transcription, credibility analysis, summarization, key moments extraction, and a document conversation interface.
- **Email Integration:** OAuth-connected external email accounts (Microsoft 365, Gmail) with three-column mailbox UI (folder navigation, email list, email detail), matter tagging, privilege classification, email sync, star/unstar, and search functionality. Backend includes AES-256-GCM token encryption for secure OAuth token storage, auto-CC rules, and stamp templates.
- **Video Meeting/Deposition System:** WebRTC-based video conferencing for depositions, recorded statements, witness interviews, and team meetings. Features include pre-join screen with camera/microphone preview, real-time peer-to-peer video/audio, meeting controls (mute, video toggle, recording), participant management, case/transaction linking, privilege/confidential stamping, guest access for external participants (witnesses, deponents, opposing counsel), and resizable video tiles. Enhanced with Ambient Intelligence integration featuring live transcription panel and AI-powered document discovery suggestions when enabled. Integrated with the existing WebRTC signaling server infrastructure. **Flexible Three-Mode Layout System**: Transcript Focus (resizable transcript + AI panels with drag handle), Balanced (256px video sidebar + flexible transcript + 288px AI panel), and Video Focus (full-screen video with Grid/Speaker toggle and minimized info bar). Includes ViewModePicker dropdown with ARIA accessibility, Participant Audio Bar with animated speaking indicators, and active speaker detection using Web Audio API analyzers (threshold: 30/255, 1000ms silence timeout). **Keyboard Shortcuts**: M (mute toggle), V (video toggle), 1/2/3 (view modes), G (grid/speaker layout), Escape (close dropdowns). **View Mode Persistence**: User's preferred view mode and video layout persist via localStorage. **Phase 3 Enhancements**: (1) Recording functionality using MediaRecorder API with object storage upload via presigned URLs and metadata persistence; (2) Real-time meeting chat via WebSocket with message persistence and chat panel UI; (3) Screen sharing using getDisplayMedia with track switching in peer connections; (4) Waiting room system with lobby state management, WebSocket signaling for admit/deny flow, and host approval panel; (5) Meeting scheduling with invitation CRUD, SendGrid email delivery with ICS calendar attachments, and secure guest access tokens with 7-day expiration; (6) Virtual backgrounds using canvas-based blur effect with elliptical clipping and proper cleanup to prevent frame leakage during mute. **Phase 4 AI Meeting Enhancements**: (1) Automatic transcription generation from recordings using OpenAI Whisper or AI-generated content with speaker identification, timestamped segments, word count, confidence scores, and searchable text; (2) AI-powered meeting summaries with key points, action items (assignee/due date/priority), decisions, topics, sentiment analysis; (3) Four summary types: brief, comprehensive, action_items, key_decisions; (4) Auto-transcribe and auto-summarize flags for automatic post-recording processing; (5) Full CRUD API endpoints for transcriptions and summaries with regeneration support; (6) MeetingTranscriptionSummary UI component with tabs, recording selection, and rich display of action items.

### System Design Choices
Comprehensive data models are used for entities such as Users, Communications, Alerts, Cases, Regulations, Interviews, Audit Logs, Connector Configurations, Legal Holds, Detection Rules, Tags, Remediation Plans, Regulatory Strategies, Disclosure Playbooks, Board Reports, Whistleblower Reports, Policies, Training Assignments, Certifications, Risks, Controls, Incidents, Chat Sessions, Chat Messages, Case Messages, Chat Threads, Ingested Chat Messages, and Chat Message Notes.

## External Dependencies

### Cloud Services
- Replit platform for hosting and deployment.
- Replit AI Integrations for OpenAI API access (GPT-5).
- Replit AI Integrations for Anthropic Claude API access.
- Neon for serverless PostgreSQL database.

### Communication Integrations
- Connectors for M365, Gmail, Slack, Teams, Zoom chat, OneDrive, SharePoint, Google Drive, corporate MDM for SMS monitoring.
- Website and social media ingestion for web browsing history, LinkedIn, Instagram, Facebook, Twitter/X, TikTok, YouTube, Reddit, Snapchat, WhatsApp, and Telegram.
- SendGrid for email notifications (optional).
- Twilio for SMS notifications (optional).
- ElevenLabs for transcription.

### Third-Party Libraries
- Radix UI for accessible component primitives.
- Recharts for data visualization.
- `date-fns` for date manipulation.
- Zod for runtime validation.
- Nanoid for unique ID generation.
- Libraries for email ingestion (`pst-extractor`, `@kenjiuno/msgreader`, `mailparser`, `node-mbox`, `mhtml2html`, `ical.js`, `vcf`, `adm-zip`, `jsdom`).
- `jspdf-autotable` for PDF exports.
- `docx` for Word exports.