# Sentinel Counsel LLP

## Overview
Sentinel Counsel LLP is an enterprise-grade AI-powered platform for comprehensive compliance monitoring and management. It provides real-time surveillance, AI-driven detection, robust case management, extensive regulatory knowledge bases, and advanced analytics. The platform aims to minimize compliance risk for large organizations by supporting adherence to regulations like FCPA, Federal Antitrust, SOX, and BSA/AML. Key capabilities include advanced document search, an AI interview system, chronological event tracking, an anonymous whistleblower portal, and a crisis response module, offering a smart, centralized solution for navigating complex regulatory landscapes, enabling proactive compliance and effective risk mitigation.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18, TypeScript, Vite, Wouter, and TanStack Query. Styling is based on Shadcn/ui (Radix UI) and Tailwind CSS, adhering to Carbon Design System patterns. Features include hierarchical sidebar navigation, role-based access control, customizable column visibility, 7 themes, advanced document search interfaces, collaborative highlighting and commenting, and specialized chat message review. Progressive reveal animations are applied using utility classes.

### Technical Implementations
The backend uses Node.js, Express.js, and TypeScript, providing RESTful API endpoints. Authentication leverages Replit Auth (OpenID Connect with Passport.js) and Microsoft OAuth 365, including automatic account linking and role-based access control. Data persistence is managed by PostgreSQL (Neon serverless driver) with Drizzle ORM. The system supports secure file uploads with automatic text extraction, a comprehensive email ingestion module, and an extensible Third-Party Connector Ingestion Framework.

### Feature Specifications
- **Communication Ingestion:** Processes various email and chat message formats.
- **Analytics Dashboards:** Offers Communication Analytics (Top Communicators, Heatmap, Unified Timeline) and Management Analytics (AI-powered insights for behavioral patterns, topic clusters, sentiment trends, PII redaction).
- **Tag Management:** Comprehensive system for document coding and categorization with "Quick Tags," dynamic updates, user-specific tracking, color coding, and text selection tagging.
- **AI Integration:** Uses OpenAI GPT-5 for violation analysis and risk scoring; Google Gemini for semantic document search (RAG) in the "Ask About Case" Investigation Assistant and for real-time meeting insights; Emma AI Assistant chatbot for context-aware guidance; and Claude (Anthropic) for intelligent boolean query generation in Ambient Intelligence.
- **AI Interview Module:** Redesigned system with live video, real-time transcription, automated AI analysis, evidence linking, and a Witness Video Recording Platform.
- **Compliance Workflows:** Supports defined workflows for alerts, GRC incidents, and risks with sector-specific rule packs and a no-code Compliance Logic Studio.
- **eDiscovery & Privilege:** Document processing including deduplication, email threading, TAR/Predictive Coding with AI-generated responsiveness predictions, production set management with Bates numbering, PII scanning, template-based redactions, auto-generation of privilege logs, and 7 export formats.
- **Case Lifecycle Management:** Administrator-controlled case close, archive, and reopen functionality with audit trails.
- **Intelligent Document Processing:** AI-powered document classification, deal terms extraction, and generation of transaction document types.
- **Virtual Data Room (VDR):** Enterprise-grade VDR for M&A with hierarchical folder structures, templates, document upload, advanced access control, Q&A Due Diligence, and in-app document preview.
- **Court Pleadings System:** Manages legal documents with automatic text extraction, RAG indexing for AI-powered search, file persistence, pleading type classification, and filing date tracking. Includes a dedicated Court Docket Tab for displaying filings and bulk upload functionality.
- **Ambient Intelligence:** Real-time meeting transcription with AI-powered document discovery, smart search queries, and risk-based results, including real-time meeting insights (summary, key_point, action_item suggestions).
- **Auto Search Term Generation:** AI-powered legal discovery system for automated Boolean search term generation with workflows for Discovery Response, Prove Your Case, and Privilege Log.
- **Cause of Action Checklist:** AI-powered litigation management tool for tracking legal elements and evidence, including AI extraction of elements, evidence linking, strength assessment, and AI document suggestions.
- **DD Boolean Search & Checklist System:** Two-stage M&A due diligence pipeline using boolean pre-filtering and Google Gemini AI analysis, with 23 sections and 69 seeded boolean queries, customizable queries, AI-generated findings, and PDF report generation.
- **Deal Templates System:** Pre-built transaction checklists with template management, item status tracking, document linking, and an auto-matching engine.
- **Privileged Research:** A Claude-like AI chat interface for confidential legal research.
- **Recorded Statements Upload System:** Manages depositions, interviews, and witness statements with multi-format upload, AI transcription, credibility analysis, summarization, and key moments extraction.
- **Email Integration:** OAuth-connected external email accounts (Microsoft 365, Gmail) with a three-column mailbox UI, matter tagging, privilege classification, email sync, and search functionality.
- **External Calendar Integration:** Secure bidirectional sync with Google Calendar and Microsoft Outlook. Features OAuth 2.0 with HMAC-signed state, database-backed single-use nonces for replay protection, AES-256-GCM token encryption at rest, and session-bound callbacks. Mobile-optimized calendar with iOS-style month grid (color-coded event pills, swipe navigation, Today button), day view with week strip header and hourly timeline, and touch-friendly event creation. Requires environment variables: GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, MICROSOFT_CALENDAR_CLIENT_ID, MICROSOFT_CALENDAR_CLIENT_SECRET.
- **Video Meeting/Deposition System:** WebRTC-based video conferencing with features including pre-join screen, real-time peer-to-peer video/audio, meeting controls, participant management, case/transaction linking, privilege/confidential stamping, guest access, resizable video tiles, and Ambient Intelligence integration. Enhanced with flexible three-mode layout, recording, real-time chat, screen sharing, waiting room, meeting scheduling, and virtual backgrounds. AI meeting enhancements include automatic transcription, AI-powered meeting summaries (brief, comprehensive, action_items, key_decisions) with speaker identification and action items.
- **Relationship Intelligence Module:** Deal-aware intelligence engine that monitors professional contacts, scans news for mentions, cross-references against the knowledge base, and generates AI-powered outreach suggestions. Five engines: Contact Ingestion (CSV upload with deduplication, Case Import from communications with email header parsing and frequency-based priority, OAuth-ready architecture for Outlook/Google/iCloud), News Scanning (Event Registry / newsapi.ai integration via POST to eventregistry.org/api/v1/article/getArticles, API key stored as NewsAPI_API secret, with AI-powered name disambiguation and article verification; three scan modes: "both" (company search + VIP person search, company articles without name matches accepted via skipMatchFilter for highest-priority contact), "person" (individual name search for all contacts), "company" (company-only search, all articles accepted); frontend scan mode selector on Intelligence Feed page), AI Draft Response (GPT-powered context-aware response drafting: generates boolean search terms from article+contact, searches communications table for personal connections/shared history, drafts personalized 1-5 sentence response incorporating email context; expandable context source cards with full email preview, copy/regenerate/log-as-sent actions; integrated email sending via connected Microsoft Outlook or Gmail accounts using OAuth — SendEmailSection component with account selector, send confirmation, and automatic outreach logging), Knowledge Base Connection (text-based entity matching with AI synthesis of connection summaries), AI Outreach Generation (3 message variants: short/medium/detailed with channel and tone suggestions), and Dashboard Digest (priority-grouped alert feed with stats). Case Import feature extracts contacts from case communications by parsing sender/recipient email headers (handles "Name" <email>, "'Name' via Reporting" <shared@email>, bare emails), deduplicates by email, maps domains to organizations, assigns priority by communication frequency, and batch-inserts with transactions. DB tables: contact_sources, relationship_contacts, news_alerts, knowledge_base_entries, outreach_log. Enum contact_source_type includes: csv_upload, outlook, google, icloud, salesforce, linkedin, manual, case_import. Routes in server/routes/relationship-intelligence.ts. Article Detail Dialog (clickable alert cards on contact detail page open dialog with headline, summary, sentiment/category badges, "Read Full Article" external link, and Email Overlap section showing matching communications via GET /api/relationship-intelligence/alerts/:alertId/overlap?contactId=X endpoint). Intelligence Feed Case Import (CaseImportFeedDialog on Intelligence Feed page — 3-step flow: select case, preview discovered people with search/filter/checkboxes, import all or selected individuals as monitored contacts; uses GET /api/cases/:caseId/discovered-entities for people preview, POST /api/relationship-intelligence/import-from-case for bulk import, POST /api/relationship-intelligence/import-from-case-selective for selective import by email list; shows import results with counts, top communicators, and organizations). Frontend pages: /relationship-intelligence (dashboard with case import), /relationship-contacts (contacts management with pagination, case import dialog, article detail dialog).

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