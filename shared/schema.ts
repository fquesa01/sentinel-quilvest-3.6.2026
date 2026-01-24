import { sql, relations } from "drizzle-orm";
import {
  index,
  uniqueIndex,
  integer,
  bigint,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  pgEnum,
  boolean,
  unique,
  real,
  date,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "compliance_officer",
  "attorney",
  "auditor",
  "employee",
  "vendor",
  "external_counsel",
  "cro",
  "risk_manager",
]);

export const alertSeverityEnum = pgEnum("alert_severity", [
  "critical",
  "high",
  "medium",
  "low",
  "informational",
]);

export const caseStatusEnum = pgEnum("case_status", [
  "alert",
  "investigation",
  "review",
  "resolution",
  "closed",
]);

export const violationTypeEnum = pgEnum("violation_type", [
  "fcpa",
  "banking",
  "antitrust",
  "sec",
  "sox",
  "cta",
  "finra",
  "reg_bi",
  "custody_rule",
  "fda",
  "off_label_promotion",
  "clinical_trial",
  "anti_kickback",
  "itar",
  "export_control",
  "ear",
  "gdpr",
  "ccpa",
  "privacy",
  "florida_specific",
  "discrimination",
  "harassment",
  "retaliation",
  "wage_hour",
  "health_safety",
  "workplace_bullying",
  "theft_fraud",
  "policy_violation",
  "whistleblower",
  "accommodation",
  "insider_trading",
  "aml",
  "bsa",
  "insider_threat",
  "market_manipulation",
  "off_channel",
  "data_breach",
  "conflict_of_interest",
  "general_compliance",
  "other",
]);

export const industrySectorEnum = pgEnum("industry_sector", [
  "general",
  "broker_dealer",
  "investment_advisor",
  "life_sciences",
  "pharmaceutical",
  "medical_device",
  "defense_contractor",
  "aerospace",
  "technology",
  "financial_services",
]);

export const policyCategoryEnum = pgEnum("policy_category", [
  "code_of_conduct",
  "harassment",
  "discrimination",
  "data_privacy",
  "security",
  "ethics",
  "safety",
  "hr",
  "conflicts_of_interest",
  "workplace_respect",
  "diversity_inclusion",
]);

export const interviewTypeEnum = pgEnum("interview_type", [
  "fact_finding",
  "investigative",
  "training",
  "exit",
]);

export const interviewInviteStatusEnum = pgEnum("interview_invite_status", [
  "draft",
  "sent",
  "opened",
  "in_progress",
  "completed",
  "expired",
  "cancelled",
]);

export const liveInterviewStatusEnum = pgEnum("live_interview_status", [
  "scheduled",
  "lobby",
  "in_progress",
  "paused",
  "completed",
  "cancelled",
]);

export const interviewParticipantRoleEnum = pgEnum("interview_participant_role", [
  "interviewer",
  "subject",
  "observer",
  "counsel",
  "transcriber",
]);

export const transcriptSentimentEnum = pgEnum("transcript_sentiment", [
  "positive",
  "neutral",
  "negative",
]);

export const riskLevelEnum = pgEnum("risk_level", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const questionCategoryEnum = pgEnum("question_category", [
  "fact",
  "behavior",
  "compliance",
  "timeline",
  "admission",
  "denial",
  "clarification",
  "other",
]);

export const analysisStatusEnum = pgEnum("analysis_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const interviewDeliveryChannelEnum = pgEnum("interview_delivery_channel", [
  "email",
  "sms",
  "both",
]);

export const communicationSourceEnum = pgEnum("communication_source", [
  "email_m365",
  "email_google",
  "chat_slack",
  "chat_teams",
  "chat_zoom",
  "chat_meet",
  "sms_mobile",
  "file_share_drive",
  "file_share_sharepoint",
  "file_share_box",
  "web_history",
  "social_linkedin",
  "social_instagram",
  "social_facebook",
  "social_twitter",
  "social_tiktok",
  "social_youtube",
  "social_reddit",
  "social_snapchat",
  "social_whatsapp",
  "social_telegram",
  "social_other",
  "manual_entry",
  "other",
]);

export const privilegeStatusEnum = pgEnum("privilege_status", [
  "none",
  "attorney_client_privileged",
  "work_product",
  "both",
]);

export const privilegeBasisEnum = pgEnum("privilege_basis", [
  "upjohn_warning",
  "in_re_kbr",
  "attorney_work_product",
  "attorney_client_communication",
  "counsel_directed_investigation",
  "other",
]);

export const detectionTypeEnum = pgEnum("detection_type", [
  "off_channel_steering",
  "fcpa_foreign_official",
  "fcpa_third_party_risk",
  "fcpa_payment_intent",
  "antitrust_price_fixing",
  "antitrust_market_allocation",
  "aml_suspicious_transaction",
  "reg_sp_privacy_violation",
  "teaching_moment",
  "other_violation",
]);

export const tagCategoryEnum = pgEnum("tag_category", [
  "investigation_type",
  "classification",
  "priority",
  "evidence_type",
  "custom",
]);

export const documentIndexStatusEnum = pgEnum("document_index_status", [
  "pending",
  "indexing",
  "indexed",
  "failed",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "annotation_mention",
  "case_assignment",
  "document_review_request",
  "alert_escalation",
  "system",
]);

export const chatSourceTypeEnum = pgEnum("chat_source_type", [
  "whatsapp",
  "sms_ios",
  "sms_android",
  "imessage",
  "telegram",
  "signal",
  "other_chat",
]);

export const chatMessageDirectionEnum = pgEnum("chat_message_direction", [
  "inbound",
  "outbound",
  "unknown",
]);

export const tagColorEnum = pgEnum("tag_color", [
  "slate",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
]);

// Crisis Response Module Enums
export const expertTypeEnum = pgEnum("expert_type", [
  "forensic_consultant",
  "accounting_expert",
  "industry_specialist",
  "technical_consultant",
  "valuation_expert",
  "economic_expert",
  "scientific_expert",
  "other",
]);

export const regulatorBodyEnum = pgEnum("regulator_body", [
  "doj",
  "sec",
  "ftc",
  "cftc",
  "finra",
  "fda",
  "epa",
  "osha",
  "irs",
  "state_ag",
  "other",
]);

export const deadlineTypeEnum = pgEnum("deadline_type", [
  "subpoena_response",
  "cid_deadline",
  "production_deadline",
  "interview_deadline",
  "court_filing",
  "extension_request",
  "regulatory_meeting",
  "other",
]);

export const preservationSystemEnum = pgEnum("preservation_system", [
  "email_m365",
  "email_google",
  "chat_slack",
  "chat_teams",
  "file_share_sharepoint",
  "file_share_drive",
  "mobile_devices",
  "social_media",
  "financial_systems",
  "crm_erp",
  "cctv",
  "access_logs",
  "other",
]);

export const conflictTypeEnum = pgEnum("conflict_type", [
  "government_agency",
  "target_subject",
  "adverse_party",
  "other_parties",
  "current_client",
  "former_client",
]);

export const ingestionJobStatusEnum = pgEnum("ingestion_job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "partially_completed",
]);

export const ingestionFileStatusEnum = pgEnum("ingestion_file_status", [
  "queued",
  "processing",
  "completed",
  "failed",
  "skipped",
]);

export const fileTypeEnum = pgEnum("file_type", [
  "pst",
  "eml",
  "msg",
  "pdf",
  "docx",
  "doc",
  "txt",
  "xlsx",
  "csv",
  "zip",
  "other",
]);

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  microsoftId: varchar("microsoft_id").unique(),
  role: userRoleEnum("role").default("compliance_officer").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Communications being monitored
export const communications = pgTable("communications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  sender: text("sender").notNull(),
  recipients: jsonb("recipients").notNull(),
  communicationType: varchar("communication_type").notNull(), // email, slack, teams, sms
  sourceType: communicationSourceEnum("source_type"), // Specific connector source
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: jsonb("metadata"), // General metadata
  sourceMetadata: jsonb("source_metadata"), // Connector-specific metadata (thread_id, attachment_ids, etc)
  legalHold: varchar("legal_hold").default("none").notNull(), // none, pending, active
  retentionPeriod: integer("retention_period"), // Days to retain
  retentionExpiry: timestamp("retention_expiry"), // When eligible for deletion
  isImmutable: varchar("is_immutable").default("false").notNull(), // WORM compliance
  // eDiscovery: Email Threading & Families
  emailThreadId: varchar("email_thread_id"), // Thread identifier for email conversations
  documentFamilyId: varchar("document_family_id"), // Reference to document family (will be linked later)
  parentDocumentId: varchar("parent_document_id"), // For attachments: ID of parent email
  containsAttachments: varchar("contains_attachments").default("false").notNull(),
  attachmentCount: integer("attachment_count").default(0).notNull(),
  attachmentIds: jsonb("attachment_ids"), // Array of attachment document IDs
  // eDiscovery: Deduplication & Hashing
  documentHash: text("document_hash"), // MD5/SHA256 hash of body content for exact deduplication
  nearDuplicateHash: text("near_duplicate_hash"), // Simhash or MinHash for near-duplicate detection
  nearDuplicateGroupId: varchar("near_duplicate_group_id"), // Group ID for near-duplicates
  isDuplicate: varchar("is_duplicate").default("false").notNull(),
  masterDocumentId: varchar("master_document_id"), // If duplicate, reference to master/inclusive document
  // eDiscovery: Custodian & Production
  custodianId: varchar("custodian_id"), // Reference to custodians table (will be linked later)
  custodianName: text("custodian_name"), // Denormalized for performance
  custodianDepartment: varchar("custodian_department"), // Employee's department for filtering
  batesNumber: varchar("bates_number"), // Production numbering (e.g., SENT-000001)
  batesRange: varchar("bates_range"), // For multi-page docs (e.g., SENT-000001-000005)
  productionSetId: varchar("production_set_id"), // Reference to production set (will be linked later)
  productionStatus: varchar("production_status").default("not_produced").notNull(), // not_produced, pending, produced, withheld
  // eDiscovery: Review Workflow
  reviewStatus: varchar("review_status").default("not_reviewed").notNull(), // not_reviewed, in_progress, completed, qa_needed, skipped
  reviewBatchId: varchar("review_batch_id"), // Reference to review batch (will be linked later)
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewStartedAt: timestamp("review_started_at"),
  timeSpentSeconds: integer("time_spent_seconds").default(0).notNull(),
  // eDiscovery: Document Metadata
  fileSize: integer("file_size"), // Size in bytes
  filePath: text("file_path"), // Original file path if from file system
  fileExtension: varchar("file_extension"), // .eml, .msg, .txt, etc.
  mimeType: varchar("mime_type"), // MIME type
  language: varchar("language"), // Detected language (en, es, fr, etc.)
  wordCount: integer("word_count"), // Number of words in body
  // Translation
  originalLanguage: varchar("original_language"), // Original language of communication (e.g., "Spanish (es)")
  translatedSubject: text("translated_subject"), // AI-translated subject in English
  translatedBody: text("translated_body"), // AI-translated content in English
  isTranslated: boolean("is_translated").default(false).notNull(), // Whether translation has been generated
  // Privilege & Work Product Protection (Upjohn / In re KBR compliance)
  privilegeStatus: privilegeStatusEnum("privilege_status").default("none").notNull(),
  privilegeBasis: privilegeBasisEnum("privilege_basis"),
  privilegeAssertedBy: varchar("privilege_asserted_by").references(() => users.id),
  privilegeAssertedAt: timestamp("privilege_asserted_at"),
  privilegeReviewStatus: varchar("privilege_review_status").default("pending").notNull(), // pending, reviewed, approved, waived
  privilegeReviewedBy: varchar("privilege_reviewed_by").references(() => users.id),
  privilegeReviewedAt: timestamp("privilege_reviewed_at"),
  privilegeNotes: text("privilege_notes"),
  isRedacted: varchar("is_redacted").default("false").notNull(),
  redactionLog: jsonb("redaction_log"), // Track what was redacted and why
  privilegeStamp: text("privilege_stamp"), // Text of applied privilege stamp (e.g., "ATTORNEY-CLIENT PRIVILEGED")
  // Compliance Scoring & AI Analysis
  complianceScore: integer("compliance_score"), // 0-100 risk score
  riskLevel: varchar("risk_level"), // low, medium, high, critical
  aiComplianceAnalysis: text("ai_compliance_analysis"), // AI-generated violation explanation
  analyzedAt: timestamp("analyzed_at"), // When compliance analysis was performed
  // Case Association (for ingested documents)
  caseId: varchar("case_id").references(() => cases.id, { onDelete: "set null" }),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }), // Optional case association from ingestion
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chat Threads - Parent records for grouping chat conversations
export const chatThreads = pgTable("chat_threads", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull(),
  evidenceId: varchar("evidence_id"), // Reference to original evidence upload if applicable
  sourceType: chatSourceTypeEnum("source_type").notNull(), // whatsapp, sms_ios, sms_android, etc.
  sourceFileName: text("source_file_name").notNull(), // Original uploaded file
  conversationName: text("conversation_name").notNull(), // Chat group name or "1-on-1 with X"
  participants: jsonb("participants").notNull(), // Array of {id, display_name, phone}
  messageCount: integer("message_count").default(0).notNull(),
  startedAt: timestamp("started_at"), // First message timestamp
  endedAt: timestamp("ended_at"), // Last message timestamp
  // Review workflow
  reviewStatus: varchar("review_status").default("not_reviewed").notNull(), // not_reviewed, in_progress, completed
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  caseIdx: index("chat_threads_case_idx").on(table.caseId),
  sourceTypeIdx: index("chat_threads_source_type_idx").on(table.sourceType),
}));

// Ingested Chat Messages from various platforms (WhatsApp, SMS, iMessage, etc.)
// Separate from AI Assistant chatMessages (line 1010) to avoid naming conflicts
export const ingestedChatMessages = pgTable("ingested_chat_messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").references(() => chatThreads.id, { onDelete: "cascade" }), // Parent thread
  messageId: text("message_id").notNull(), // Original message ID from source
  messageIndex: integer("message_index"), // Order within the conversation
  sourceType: chatSourceTypeEnum("source_type").notNull(), // whatsapp, sms_ios, sms_android, etc.
  sourceFileName: text("source_file_name").notNull(), // Original uploaded file
  conversationId: text("conversation_id").notNull(), // Group chat or 1-on-1 conversation ID
  isGroup: boolean("is_group").default(false).notNull(),
  participants: jsonb("participants").notNull(), // Array of {id, display_name, phone}
  senderId: text("sender_id"), // ID/phone of message sender
  senderName: text("sender_name"), // Display name of sender
  senderPhone: text("sender_phone"), // Phone number if available
  sentAt: timestamp("sent_at"), // When message was sent
  text: text("text"), // Message text content
  mediaAttachments: jsonb("media_attachments"), // Array of {file_name, mime_type, local_path}
  direction: chatMessageDirectionEnum("direction").default("unknown").notNull(),
  rawMetadata: jsonb("raw_metadata"), // Original source metadata
  // Review workflow fields
  isFlagged: boolean("is_flagged").default(false).notNull(), // Flag for follow-up
  flaggedBy: varchar("flagged_by").references(() => users.id),
  flaggedAt: timestamp("flagged_at"),
  reviewStatus: varchar("review_status").default("not_reviewed").notNull(), // not_reviewed, reviewed, needs_attention
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  notes: text("notes"), // Collaborative notes on this message
  // Case Association (for ingested chat data)
  caseId: varchar("case_id").references(() => cases.id, { onDelete: "set null" }),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  threadIdx: index("ingested_chat_thread_idx").on(table.threadId),
  conversationIdx: index("ingested_chat_conversation_idx").on(table.conversationId),
  caseIdx: index("ingested_chat_case_idx").on(table.caseId),
  sentAtIdx: index("ingested_chat_sent_at_idx").on(table.sentAt),
  flaggedIdx: index("ingested_chat_flagged_idx").on(table.isFlagged),
}));

// Chat Message Notes - Collaborative notes/comments on individual messages
export const chatMessageNotes = pgTable("chat_message_notes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  messageId: varchar("message_id")
    .references(() => ingestedChatMessages.id, { onDelete: "cascade" })
    .notNull(),
  userId: varchar("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  userName: text("user_name").notNull(), // Denormalized for display
  noteText: text("note_text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document Relationships for tracking violation clusters
export const documentRelationships = pgTable("document_relationships", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sourceDocumentId: varchar("source_document_id")
    .references(() => communications.id)
    .notNull(),
  relatedDocumentId: varchar("related_document_id")
    .references(() => communications.id)
    .notNull(),
  relationshipType: varchar("relationship_type").notNull(), // same_thread, same_participants, temporal_cluster, topic_cluster, violation_chain
  confidenceScore: integer("confidence_score"), // 0-100, how confident the AI is in this relationship
  explanation: text("explanation"), // AI explanation of why these documents are related
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Alerts generated from communication monitoring
export const alerts = pgTable("alerts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  communicationId: varchar("communication_id")
    .references(() => communications.id)
    .notNull(),
  severity: alertSeverityEnum("severity").notNull(),
  violationType: violationTypeEnum("violation_type").notNull(),
  detectionTypes: detectionTypeEnum("detection_types").array(), // Array of detectionTypeEnum values
  flaggedKeywords: jsonb("flagged_keywords"),
  aiAnalysis: text("ai_analysis"),
  riskScore: integer("risk_score"), // 0-100
  confidenceScore: integer("confidence_score"), // 0-100, hybrid rules+ML confidence
  isTeachingMoment: varchar("is_teaching_moment").default("false").notNull(), // Coachable violation
  ruleMatches: jsonb("rule_matches"), // Which detection rules fired
  status: varchar("status").default("pending").notNull(), // pending, reviewed, dismissed
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cases for investigation
export const cases = pgTable("cases", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseNumber: varchar("case_number").unique().notNull(),
  alertId: varchar("alert_id").references(() => alerts.id),
  title: text("title").notNull(),
  description: text("description"),
  status: caseStatusEnum("status").default("alert").notNull(),
  violationType: violationTypeEnum("violation_type").notNull(),
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdBy: varchar("created_by")
    .references(() => users.id)
    .notNull(),
  priority: varchar("priority").default("medium").notNull(), // critical, high, medium, low
  employeeName: text("employee_name"),
  employeePosition: text("employee_position"),
  resolutionNotes: text("resolution_notes"),
  // Attorney Review Fields
  attorneyReviewRequired: varchar("attorney_review_required").default("false").notNull(),
  attorneyReviewStatus: varchar("attorney_review_status").default("pending").notNull(), // pending, in_review, approved, escalated
  reviewedByAttorney: varchar("reviewed_by_attorney").references(() => users.id),
  attorneyReviewNotes: text("attorney_review_notes"),
  attorneyReviewDecision: varchar("attorney_review_decision"), // approve, escalate, remediate, dismiss
  attorneyReviewedAt: timestamp("attorney_reviewed_at"),
  // Escalation tracking
  escalatedTo: varchar("escalated_to").references(() => users.id), // Senior counsel
  escalationReason: text("escalation_reason"),
  escalatedAt: timestamp("escalated_at"),
  // Privilege & Work Product Protection (Upjohn / In re KBR)
  isCounselDirected: varchar("is_counsel_directed").default("true").notNull(), // Default: counsel-owned for privilege
  privilegeStatus: privilegeStatusEnum("privilege_status").default("attorney_client_privileged").notNull(), // Default privileged
  privilegeBasis: privilegeBasisEnum("privilege_basis").default("counsel_directed_investigation").notNull(),
  privilegeAssertedBy: varchar("privilege_asserted_by").references(() => users.id),
  privilegeAssertedAt: timestamp("privilege_asserted_at"),
  privilegeReviewStatus: varchar("privilege_review_status").default("pending").notNull(), // pending, reviewed, approved, waived
  privilegeReviewedBy: varchar("privilege_reviewed_by").references(() => users.id),
  privilegeReviewedAt: timestamp("privilege_reviewed_at"),
  privilegeNotes: text("privilege_notes"),
  isRedacted: varchar("is_redacted").default("false").notNull(),
  redactionLog: jsonb("redaction_log"),
  privilegeStamp: text("privilege_stamp"), // Applied stamp text
  // AI Analysis & Risk Assessment
  riskScore: integer("risk_score"), // 0-100 risk score from AI analysis
  riskLevel: varchar("risk_level"), // critical, high, medium, low
  aiAnalysisSummary: text("ai_analysis_summary"), // Comprehensive AI legal analysis
  // Case Closure & Archival
  closedAt: timestamp("closed_at"),
  closedBy: varchar("closed_by").references(() => users.id),
  archivedAt: timestamp("archived_at"),
  archivedBy: varchar("archived_by").references(() => users.id),
  // Case Reopening
  reopenReason: text("reopen_reason"),
  reopenedAt: timestamp("reopened_at"),
  reopenedBy: varchar("reopened_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Case AI Analysis - Comprehensive AI-generated legal analysis for case detail page
export const caseAIAnalysis = pgTable("case_ai_analysis", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  aiSummaryText: text("ai_summary_text"), // Narrative overview
  keyFacts: jsonb("key_facts"), // Array of key facts
  keyIndividuals: jsonb("key_individuals"), // Array of key individuals
  keyEntities: jsonb("key_entities"), // Array of key entities (companies, subsidiaries)
  lawMatrix: jsonb("law_matrix"), // Array of applicable laws with analysis
  riskAssessmentText: text("risk_assessment_text"), // Risk assessment narrative
  suggestedNextSteps: jsonb("suggested_next_steps"), // Array of suggested actions
  regulatorPerspective: text("regulator_perspective"), // What regulators might think
  remediationThemes: jsonb("remediation_themes"), // Array of remediation themes
  communicationStrategy: text("communication_strategy"), // Board/regulator communication guidance
  riskHeatmap: jsonb("risk_heatmap"), // Risk by department/entity/issue
  // Auto-detected matter type and legal issues from ingested documents
  matterType: varchar("matter_type"), // litigation_fraud, hr_investigation, fcpa_violation, sexual_harassment, antitrust, etc.
  matterTypeConfidence: real("matter_type_confidence"), // 0-100 confidence score
  detectedLegalIssues: jsonb("detected_legal_issues"), // Array of {issue, description, severity, sources}
  documentsAnalyzedCount: integer("documents_analyzed_count").default(0), // Track how many docs analyzed
  lastIncrementalUpdate: timestamp("last_incremental_update"), // When last auto-update happened
  generatedBy: varchar("generated_by").references(() => users.id),
  lastGeneratedAt: timestamp("last_generated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Issue Topic Enum for classification - 10 compliance categories
export const issueTopicEnum = pgEnum("issue_topic", [
  "legal",
  "hr",
  "contracts",
  "finance",
  "safety",
  "sensitive",
  "compliance",
  "communications",
  "operations",
  "other",
]);

// Issue Risk Level Enum
export const issueRiskLevelEnum = pgEnum("issue_risk_level", [
  "critical",
  "high",
  "medium",
  "low",
]);

// Case Issues - AI-extracted issues from communications for Issue Heatmap Intelligence Module
export const caseIssues = pgTable("case_issues", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull(),
  // Topic classification
  topic: issueTopicEnum("topic").notNull(),
  subtopics: jsonb("subtopics").$type<string[]>().default(sql`'[]'::jsonb`), // Array of subtopic strings
  issueSummary: text("issue_summary").notNull(), // LLM-generated issue summary
  // Urgency and sentiment scores
  urgencyScore: integer("urgency_score").default(0).notNull(), // 0-10 scale (stored as 0-100 for precision)
  sentimentScore: integer("sentiment_score").default(0).notNull(), // -100 to +100 (mapped from -1 to +1)
  // People and organizations involved
  peopleInvolved: jsonb("people_involved").$type<string[]>().default(sql`'[]'::jsonb`), // Array of email addresses/names
  organizationsInvolved: jsonb("organizations_involved").$type<string[]>().default(sql`'[]'::jsonb`), // Array of domains
  // Volume and date tracking
  messageVolume: integer("message_volume").default(0).notNull(),
  dateRangeStart: timestamp("date_range_start"),
  dateRangeEnd: timestamp("date_range_end"),
  // Keywords and risk tags
  keywords: jsonb("keywords").$type<string[]>().default(sql`'[]'::jsonb`), // Array of extracted keywords
  riskTags: jsonb("risk_tags").$type<string[]>().default(sql`'[]'::jsonb`), // legal, sensitive, hr, etc.
  riskLevel: issueRiskLevelEnum("risk_level").default("low").notNull(),
  // Entity extraction details
  contractReferences: jsonb("contract_references").$type<string[]>().default(sql`'[]'::jsonb`), // Contract numbers
  locationReferences: jsonb("location_references").$type<string[]>().default(sql`'[]'::jsonb`), // Places
  projectReferences: jsonb("project_references").$type<string[]>().default(sql`'[]'::jsonb`), // Projects
  deadlineReferences: jsonb("deadline_references").$type<string[]>().default(sql`'[]'::jsonb`), // Deadlines
  // Escalation signals
  hasEscalationLanguage: boolean("has_escalation_language").default(false).notNull(),
  escalationPhrases: jsonb("escalation_phrases").$type<string[]>().default(sql`'[]'::jsonb`), // "don't forward", "take offline", etc.
  // Anomaly detection
  isAnomaly: boolean("is_anomaly").default(false).notNull(),
  anomalyType: varchar("anomaly_type"), // volume_spike, urgency_spike, new_participants, sentiment_shift, resurrection
  anomalyScore: integer("anomaly_score").default(0), // 0-100
  // Source communication IDs for drill-down
  sourceCommunicationIds: jsonb("source_communication_ids").$type<string[]>().default(sql`'[]'::jsonb`),
  // Analysis metadata
  lastAnalyzedAt: timestamp("last_analyzed_at"),
  analysisVersion: varchar("analysis_version"), // Model version used
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  caseIdx: index("case_issues_case_idx").on(table.caseId),
  topicIdx: index("case_issues_topic_idx").on(table.topic),
  urgencyIdx: index("case_issues_urgency_idx").on(table.urgencyScore),
  riskLevelIdx: index("case_issues_risk_level_idx").on(table.riskLevel),
  anomalyIdx: index("case_issues_anomaly_idx").on(table.isAnomaly),
}));

// Issue-Communication Link - Many-to-many relationship
export const issueCommunicationLinks = pgTable("issue_communication_links", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  issueId: varchar("issue_id")
    .references(() => caseIssues.id, { onDelete: "cascade" })
    .notNull(),
  communicationId: varchar("communication_id")
    .references(() => communications.id, { onDelete: "cascade" })
    .notNull(),
  relevanceScore: integer("relevance_score").default(100), // 0-100
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  issueIdx: index("issue_comm_link_issue_idx").on(table.issueId),
  commIdx: index("issue_comm_link_comm_idx").on(table.communicationId),
  uniqueLink: unique("issue_comm_unique").on(table.issueId, table.communicationId),
}));

// Case Parties/Custodians - Track individuals and entities involved in cases
export const caseParties = pgTable("case_parties", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  roleType: varchar("role_type").notNull(), // employee, vendor, regulator, outside_counsel, whistleblower, third_party
  caseRole: varchar("case_role").notNull(), // subject, witness, bystander, reporter, counsel
  email: text("email"),
  phone: text("phone"),
  department: text("department"),
  company: text("company"),
  title: text("title"),
  legalHoldStatus: varchar("legal_hold_status").default("not_issued"), // not_issued, issued, acknowledged, released
  legalHoldIssuedAt: timestamp("legal_hold_issued_at"),
  legalHoldAcknowledgedAt: timestamp("legal_hold_acknowledged_at"),
  dataSourcesCollected: jsonb("data_sources_collected"), // Array of: email, chat, phone, file_share, crm, etc.
  interviewStatus: varchar("interview_status").default("not_scheduled"), // not_scheduled, scheduled, completed, declined
  riskLevel: varchar("risk_level").default("low"), // low, medium, high
  notes: text("notes"),
  addedBy: varchar("added_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Timeline Risk Level Enum
export const timelineRiskLevel = pgEnum("timeline_risk_level", ["critical", "medium", "cleared", "neutral"]);

// Case Timeline Events - Track key events in case progression with AI-generated chronology
export const caseTimelineEvents = pgTable("case_timeline_events", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull(),
  eventType: varchar("event_type").notNull(), // email_thread, chat_thread, payment, meeting, interview_extract, alert, manual, system, correspondence_received, correspondence_sent, written_statement, statement_request
  title: text("title").notNull(),
  description: text("description"), // Legacy field - kept for backward compatibility
  summary: text("summary"), // AI-generated 2-6 sentence narrative
  eventDate: timestamp("event_date").notNull(),
  entityType: varchar("entity_type"), // Legacy - communication, alert, interview, document_set, task
  entityId: varchar("entity_id"), // Legacy - Link to the related entity
  icon: varchar("icon"), // Icon name for UI
  // Rich metadata for AI-generated events
  participants: jsonb("participants").$type<string[]>().default(sql`'[]'::jsonb`), // Array of person names/ids
  entities: jsonb("entities").$type<string[]>().default(sql`'[]'::jsonb`), // Array of companies, departments
  lawTags: jsonb("law_tags").$type<string[]>().default(sql`'[]'::jsonb`), // e.g., ["FCPA", "SOX", "Antitrust"]
  riskTags: jsonb("risk_tags").$type<string[]>().default(sql`'[]'::jsonb`), // e.g., ["bribe_risk", "revenue_recognition"]
  sourceDocumentIds: jsonb("source_document_ids").$type<string[]>().default(sql`'[]'::jsonb`), // Links to communications
  sourceInterviewIds: jsonb("source_interview_ids").$type<string[]>().default(sql`'[]'::jsonb`), // Links to interviews
  sourceAlertIds: jsonb("source_alert_ids").$type<string[]>().default(sql`'[]'::jsonb`), // Links to alerts
  // Scoring and curation
  importanceScore: integer("importance_score").default(50), // 0-100 for easier UI (0.5 = 50)
  confidenceScore: integer("confidence_score").default(100), // 0-100 for easier UI (1.0 = 100)
  isKeyEvent: boolean("is_key_event").default(false).notNull(), // User-pinned key milestone
  isHidden: boolean("is_hidden").default(false).notNull(), // User can hide AI events
  notes: text("notes"), // User-editable attorney notes
  // Risk assessment (manual or AI-assigned)
  riskLevel: timelineRiskLevel("risk_level").default("neutral").notNull(), // Visual risk indication
  riskReason: text("risk_reason"), // Short explanation for risk level
  // Correspondence-specific fields for investigation communications
  isCorrespondence: boolean("is_correspondence").default(false).notNull(), // Distinguishes correspondence from timeline events
  partyId: varchar("party_id").references(() => caseParties.id), // Link to party/custodian involved
  correspondenceDirection: varchar("correspondence_direction"), // inbound, outbound (for correspondence entries)
  correspondenceType: varchar("correspondence_type"), // document_request, document_submission, written_statement, statement_request, general
  privilegeStatus: varchar("privilege_status"), // attorney_client, work_product, confidential, none
  transmissionMethod: varchar("transmission_method"), // email, mail, hand_delivery, secure_portal, in_person
  acknowledgmentStatus: varchar("acknowledgment_status"), // pending, acknowledged, declined, not_required
  acknowledgmentDate: timestamp("acknowledgment_date"), // When acknowledgment was received
  attachmentIds: jsonb("attachment_ids").$type<string[]>().default(sql`'[]'::jsonb`), // Links to uploaded documents
  recipientPartyIds: jsonb("recipient_party_ids").$type<string[]>().default(sql`'[]'::jsonb`), // Multiple recipients for correspondence
  createdBy: varchar("created_by").references(() => users.id), // User ID or "system" for AI-generated
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Custom Timeline Columns - User-defined columns for timeline events
export const customTimelineColumns = pgTable("custom_timeline_columns", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull(),
  columnKey: text("column_key").notNull(), // Unique key for this column (e.g., "custom_review_status")
  columnLabel: text("column_label").notNull(), // Display label (e.g., "Review Status")
  columnType: varchar("column_type").default("text").notNull(), // text, number, date, select
  selectOptions: jsonb("select_options").$type<string[]>(), // For select type columns
  isVisible: boolean("is_visible").default(true).notNull(),
  displayOrder: integer("display_order").notNull(), // Position in column list
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint to prevent duplicate columns per case
  uniqueCaseColumn: unique().on(table.caseId, table.columnKey),
}));

// Custom Timeline Column Values - Store values for custom columns
export const customTimelineColumnValues = pgTable("custom_timeline_column_values", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  eventId: varchar("event_id")
    .references(() => caseTimelineEvents.id, { onDelete: "cascade" })
    .notNull(),
  columnId: varchar("column_id")
    .references(() => customTimelineColumns.id, { onDelete: "cascade" })
    .notNull(),
  value: text("value"), // Store as text, parse based on column type
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Case Tasks - Task management scoped to individual cases
export const caseTasks = pgTable("case_tasks", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  ownerId: varchar("owner_id").references(() => users.id),
  status: varchar("status").default("open").notNull(), // open, in_progress, done
  priority: varchar("priority").default("medium"), // low, medium, high, critical
  dueDate: timestamp("due_date"),
  entityType: varchar("entity_type"), // communication, alert, interview, party
  entityId: varchar("entity_id"), // Link to related object
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document Ingestion Jobs - Track file upload and processing jobs
export const ingestionJobs = pgTable("ingestion_jobs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  uploadedBy: varchar("uploaded_by")
    .references(() => users.id)
    .notNull(),
  caseId: varchar("case_id").references(() => cases.id, { onDelete: "set null" }),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }), // Optional case association
  status: ingestionJobStatusEnum("status").default("pending").notNull(),
  totalFiles: integer("total_files").default(0).notNull(),
  processedFiles: integer("processed_files").default(0).notNull(),
  failedFiles: integer("failed_files").default(0).notNull(),
  communicationsCreated: integer("communications_created").default(0).notNull(),
  alertsGenerated: integer("alerts_generated").default(0).notNull(),
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"), // Additional job metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Individual files within ingestion jobs
export const ingestionFiles = pgTable("ingestion_files", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  jobId: varchar("job_id")
    .references(() => ingestionJobs.id)
    .notNull(),
  fileName: text("file_name").notNull(),
  fileType: fileTypeEnum("file_type").notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(), // Size in bytes (bigint for files >2GB)
  objectStoragePath: text("object_storage_path").notNull(), // Path in object storage
  status: ingestionFileStatusEnum("status").default("queued").notNull(),
  communicationsExtracted: integer("communications_extracted").default(0).notNull(),
  alertsCreated: integer("alerts_created").default(0).notNull(),
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"), // File-specific metadata (email count for PST, pages for PDF, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Case Assignments - Track which users are assigned to cases (investigators, external counsel)
export const caseAssignments = pgTable("case_assignments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .references(() => cases.id)
    .notNull(),
  userId: varchar("user_id")
    .references(() => users.id)
    .notNull(),
  assignedBy: varchar("assigned_by")
    .references(() => users.id)
    .notNull(), // Admin who made the assignment
  assignmentRole: varchar("assignment_role").notNull(), // investigator, external_counsel, auditor
  accessLevel: varchar("access_level").default("full").notNull(), // full, read_only, limited
  notes: text("notes"), // Assignment notes/instructions
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  removedAt: timestamp("removed_at"), // When assignment was removed (soft delete)
  removedBy: varchar("removed_by").references(() => users.id), // Admin who removed the assignment
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tags for document coding and categorization
export const tags = pgTable("tags", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  category: tagCategoryEnum("category").notNull(),
  color: tagColorEnum("color").default("blue").notNull(),
  description: text("description"),
  isPreset: boolean("is_preset").default(false).notNull(), // Pre-set tags cannot be deleted
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Bulk tagging actions for audit trail and search reproducibility
export const bulkActions = pgTable("bulk_actions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  actionType: varchar("action_type").notNull(), // bulk_tag, bulk_assign_reviewer, etc.
  userId: varchar("user_id")
    .references(() => users.id)
    .notNull(),
  searchSnapshot: jsonb("search_snapshot").notNull(), // Stores query, filters, result count
  tagId: varchar("tag_id").references(() => tags.id), // Tag applied (for bulk_tag actions)
  scope: varchar("scope").notNull(), // selected, all_results
  selectedIds: jsonb("selected_ids"), // Array of document IDs if scope=selected
  includeFamilies: boolean("include_families").default(false).notNull(),
  includeDuplicates: boolean("include_duplicates").default(false).notNull(),
  includeThreads: boolean("include_threads").default(false).notNull(),
  totalDocumentsAffected: integer("total_documents_affected").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Junction table for document/communication/case tags
export const documentTags = pgTable("document_tags", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tagId: varchar("tag_id")
    .references(() => tags.id, { onDelete: "cascade" })
    .notNull(),
  // Can tag communications, cases, or other entities
  entityType: varchar("entity_type").notNull(), // communication, case, alert, interview
  entityId: varchar("entity_id").notNull(),
  taggedBy: varchar("tagged_by")
    .references(() => users.id)
    .notNull(),
  bulkActionId: varchar("bulk_action_id").references(() => bulkActions.id), // Links to bulk action if part of bulk operation
  taggedAt: timestamp("tagged_at").defaultNow().notNull(),
});

// Text selection tags - allows tagging specific text ranges within documents
export const textSelectionTags = pgTable("text_selection_tags", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  communicationId: varchar("communication_id")
    .references(() => communications.id, { onDelete: "cascade" })
    .notNull(),
  tagId: varchar("tag_id")
    .references(() => tags.id, { onDelete: "cascade" })
    .notNull(),
  selectedText: text("selected_text").notNull(), // The actual text that was selected
  startOffset: integer("start_offset").notNull(), // Character offset from start of document
  endOffset: integer("end_offset").notNull(), // Character offset for end of selection
  taggedBy: varchar("tagged_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Regulatory knowledge base with versioning
export const regulations = pgTable("regulations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  violationType: violationTypeEnum("violation_type").notNull(),
  industrySector: industrySectorEnum("industry_sector").default("general").notNull(), // Sector applicability
  sectorRulePackId: varchar("sector_rule_pack_id").references(() => sectorRulePacks.id), // Link to sector pack
  description: text("description").notNull(),
  content: text("content").notNull(),
  citation: text("citation"),
  jurisdiction: text("jurisdiction"), // federal, florida, etc
  version: integer("version").default(1).notNull(), // Version number
  previousVersionId: varchar("previous_version_id").references((): any => regulations.id), // Link to previous version
  effectiveDate: timestamp("effective_date"),
  expirationDate: timestamp("expiration_date"), // When this version expires
  isCurrent: varchar("is_current").default("true").notNull(), // Is this the current version?
  authoritySource: text("authority_source"), // DOJ, SEC, CFTC, FINRA, FDA, ITAR, state agency
  regulatoryBody: text("regulatory_body"), // Specific regulatory body (e.g., FINRA, FDA, DDTC)
  tags: jsonb("tags"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Interview scheduling with jurisdiction-aware consent
export const interviews = pgTable("interviews", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .references(() => cases.id)
    .notNull(),
  interviewType: interviewTypeEnum("interview_type").notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  interviewerIds: jsonb("interviewer_ids").notNull(), // array of user IDs
  intervieweeEmail: text("interviewee_email").notNull(),
  intervieweeName: text("interviewee_name").notNull(),
  intervieweePhone: text("interviewee_phone"),
  intervieweeJurisdiction: text("interviewee_jurisdiction"), // State/country for consent rules
  consentRequired: varchar("consent_required").default("true").notNull(), // Does jurisdiction require consent?
  consentObtained: varchar("consent_obtained").default("false").notNull(), // Has consent been obtained?
  consentFormUrl: text("consent_form_url"), // URL to signed consent form
  upjohnWarningGiven: varchar("upjohn_warning_given").default("false").notNull(), // Attorney-client privilege warning
  upjohnWarningTimestamp: timestamp("upjohn_warning_timestamp"), // When warning was given
  upjohnWarningText: text("upjohn_warning_text"), // Full text of Upjohn warning given
  meetingLink: text("meeting_link"),
  calendarEventId: text("calendar_event_id"), // Integration with calendar system
  accessToken: text("access_token"), // Unique token for instant interview link sharing
  templateId: varchar("template_id").references(() => interviewTemplates.id), // Optional link to template for questions
  questions: jsonb("questions"), // Array of question strings for self-recording interviews
  notes: text("notes"),
  recordingUrl: text("recording_url"),
  transcriptText: text("transcript_text"), // Full transcript
  transcriptUrl: text("transcript_url"),
  transcriptSegments: jsonb("transcript_segments"), // Word-level timestamped segments from ElevenLabs
  transcriptionMetadata: jsonb("transcription_metadata"), // Duration, language, model, confidence scores
  aiSummaryText: text("ai_summary_text"), // AI-generated interview summary
  // Privilege Protection (Upjohn doctrine - default privileged for counsel-directed interviews)
  isPrivileged: varchar("is_privileged").default("true").notNull(), // Default privileged under Upjohn
  privilegeStatus: privilegeStatusEnum("privilege_status").default("attorney_client_privileged").notNull(),
  privilegeBasis: privilegeBasisEnum("privilege_basis").default("upjohn_warning").notNull(),
  privilegeAssertedBy: varchar("privilege_asserted_by").references(() => users.id),
  privilegeAssertedAt: timestamp("privilege_asserted_at"),
  privilegeReviewStatus: varchar("privilege_review_status").default("pending").notNull(), // pending, reviewed, approved, waived
  privilegeReviewedBy: varchar("privilege_reviewed_by").references(() => users.id),
  privilegeReviewedAt: timestamp("privilege_reviewed_at"),
  privilegeNotes: text("privilege_notes"),
  isRedacted: varchar("is_redacted").default("false").notNull(),
  redactionLog: jsonb("redaction_log"),
  privilegeStamp: text("privilege_stamp"), // Applied privilege stamp
  status: varchar("status").default("scheduled").notNull(), // scheduled, completed, cancelled
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI Interview Templates
export const interviewTemplates = pgTable("interview_templates", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: violationTypeEnum("category").notNull(),
  narrative: text("narrative").default("").notNull(), // Attorney's description of areas of inquiry
  baseQuestions: jsonb("base_questions").notNull(), // Array of question strings
  draftQuestions: jsonb("draft_questions"), // AI-generated question suggestions with metadata
  metadata: jsonb("metadata"), // Tags, risk areas, etc
  createdBy: varchar("created_by")
    .references(() => users.id)
    .notNull(),
  isActive: varchar("is_active").default("true").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI Interview Invitations
export const interviewInvites = pgTable("interview_invites", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .references(() => cases.id)
    .notNull(),
  interviewTemplateId: varchar("interview_template_id")
    .references(() => interviewTemplates.id)
    .notNull(),
  intervieweeName: text("interviewee_name").notNull(),
  intervieweeEmail: text("interviewee_email"),
  intervieweePhone: text("interviewee_phone"),
  deliveryChannel: interviewDeliveryChannelEnum("delivery_channel").notNull(),
  status: interviewInviteStatusEnum("status").default("draft").notNull(),
  uniqueToken: varchar("unique_token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  pendingUploadPath: text("pending_upload_path"), // Tracks the pending video upload for security
  createdBy: varchar("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Recorded AI Interviews
export const recordedInterviews = pgTable("recorded_interviews", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .references(() => cases.id)
    .notNull(),
  interviewInviteId: varchar("interview_invite_id")
    .references(() => interviewInvites.id)
    .notNull(),
  intervieweeName: text("interviewee_name").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  videoUrl: text("video_url"),
  audioUrl: text("audio_url"),
  transcriptText: text("transcript_text"),
  transcriptSegments: jsonb("transcript_segments"), // Array with timestamps + speaker + text
  transcriptionMetadata: jsonb("transcription_metadata"), // Duration, language, model, confidence scores
  intervieweeEmail: text("interviewee_email"),
  aiSummaryText: text("ai_summary_text"),
  issuesTags: jsonb("issues_tags"), // Array of strings (FCPA, SOX, etc.)
  behavioralSignals: jsonb("behavioral_signals"), // Pauses, evasions, etc
  privilegeStatus: privilegeStatusEnum("privilege_status").default("attorney_client_privileged").notNull(),
  upjohnAcknowledged: varchar("upjohn_acknowledged").default("false").notNull(),
  consentCaptured: varchar("consent_captured").default("false").notNull(),
  identityVerification: jsonb("identity_verification"), // Verification checks performed
  timelineEvents: jsonb("timeline_events"), // Derived events with timestamps
  evidenceSuggestions: jsonb("evidence_suggestions"), // Suggested documents/emails to collect
  deviceMetadata: jsonb("device_metadata"), // Browser, OS, IP captured at start
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Interview Notes (for attorney annotations)
export const interviewNotes = pgTable("interview_notes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  recordedInterviewId: varchar("recorded_interview_id")
    .references(() => recordedInterviews.id)
    .notNull(),
  authorUserId: varchar("author_user_id")
    .references(() => users.id)
    .notNull(),
  transcriptSegmentRef: text("transcript_segment_ref"), // Timestamp or index reference
  noteText: text("note_text").notNull(),
  tags: jsonb("tags"), // Array of tags (follow_up, credibility, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Interview Responses (per-question video responses for self-recording interviews)
export const interviewResponses = pgTable("interview_responses", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  interviewId: varchar("interview_id")
    .references(() => interviews.id)
    .notNull(),
  questionIndex: integer("question_index").notNull(), // 0-based index of the question
  questionText: text("question_text").notNull(), // The actual question text
  videoUrl: text("video_url"), // URL to the recorded video response
  audioUrl: text("audio_url"), // URL to audio-only version
  duration: integer("duration"), // Duration in seconds
  transcriptText: text("transcript_text"), // Transcribed text of the response
  transcriptSegments: jsonb("transcript_segments"), // Word-level timestamps
  status: varchar("status").default("pending").notNull(), // pending, recording, uploaded, transcribed
  recordedAt: timestamp("recorded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Live Interview Sessions (WebRTC-based video interviews)
export const liveInterviewSessions = pgTable("live_interview_sessions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  interviewId: varchar("interview_id")
    .references(() => interviews.id)
    .notNull(),
  caseId: varchar("case_id")
    .references(() => cases.id)
    .notNull(),
  roomId: varchar("room_id").notNull().unique(),
  status: liveInterviewStatusEnum("status").default("scheduled").notNull(),
  scheduledStartTime: timestamp("scheduled_start_time").notNull(),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  duration: integer("duration"),
  upjohnWarningGivenAt: timestamp("upjohn_warning_given_at"),
  consentCapturedAt: timestamp("consent_captured_at"),
  signalingServerUrl: text("signaling_server_url"),
  iceServers: jsonb("ice_servers"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Live Interview Participants
export const liveInterviewParticipants = pgTable("live_interview_participants", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id")
    .references(() => liveInterviewSessions.id)
    .notNull(),
  userId: varchar("user_id")
    .references(() => users.id),
  externalEmail: text("external_email"),
  externalName: text("external_name"),
  role: interviewParticipantRoleEnum("role").notNull(),
  joinedAt: timestamp("joined_at"),
  leftAt: timestamp("left_at"),
  consentGiven: varchar("consent_given").default("false").notNull(),
  consentTimestamp: timestamp("consent_timestamp"),
  deviceInfo: jsonb("device_info"),
  connectionQuality: varchar("connection_quality"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Interview Recordings (video/audio files)
export const interviewRecordings = pgTable("interview_recordings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id")
    .references(() => liveInterviewSessions.id)
    .notNull(),
  recordingType: varchar("recording_type").default("combined").notNull(),
  videoUrl: text("video_url"),
  audioUrl: text("audio_url"),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"),
  fileSize: bigint("file_size", { mode: "number" }),
  format: varchar("format"),
  resolution: varchar("resolution"),
  status: varchar("status").default("recording").notNull(),
  storageProvider: varchar("storage_provider").default("object_storage").notNull(),
  encryptionKey: text("encryption_key"),
  retentionPolicy: varchar("retention_policy"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Interview Transcript Segments (detailed word-level segments with AI analysis)
export const interviewTranscriptSegments = pgTable("interview_transcript_segments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id")
    .references(() => liveInterviewSessions.id)
    .notNull(),
  recordingId: varchar("recording_id")
    .references(() => interviewRecordings.id),
  speakerId: varchar("speaker_id"),
  speakerRole: interviewParticipantRoleEnum("speaker_role"),
  speakerName: text("speaker_name"),
  startTime: integer("start_time").notNull(),
  endTime: integer("end_time").notNull(),
  text: text("text").notNull(),
  confidence: integer("confidence"),
  sentiment: transcriptSentimentEnum("sentiment"),
  stressScore: integer("stress_score"),
  riskLevel: riskLevelEnum("risk_level"),
  keywords: jsonb("keywords"),
  entities: jsonb("entities"),
  flags: jsonb("flags"),
  contradictionRefs: jsonb("contradiction_refs"),
  linkedQuestionId: varchar("linked_question_id"),
  isHighlighted: varchar("is_highlighted").default("false").notNull(),
  highlightColor: varchar("highlight_color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index("transcript_segments_session_idx").on(table.sessionId),
  timeIdx: index("transcript_segments_time_idx").on(table.startTime),
}));

// Interview Questions (template and actual questions asked)
export const interviewQuestions = pgTable("interview_questions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id")
    .references(() => liveInterviewSessions.id)
    .notNull(),
  templateQuestionId: varchar("template_question_id"),
  questionText: text("question_text").notNull(),
  category: questionCategoryEnum("category").default("other").notNull(),
  orderIndex: integer("order_index").notNull(),
  askedAt: timestamp("asked_at"),
  answeredAt: timestamp("answered_at"),
  responseSegmentIds: jsonb("response_segment_ids"),
  scoreLabel: varchar("score_label"),
  credibilityScore: integer("credibility_score"),
  riskLevel: riskLevelEnum("risk_level"),
  aiAnalysis: jsonb("ai_analysis"),
  followUpQuestionIds: jsonb("follow_up_question_ids"),
  evidenceLinks: jsonb("evidence_links"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Interview AI Analysis (comprehensive AI-generated analysis)
export const interviewAnalyses = pgTable("interview_analyses", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id")
    .references(() => liveInterviewSessions.id)
    .notNull(),
  analysisType: varchar("analysis_type").notNull(),
  status: analysisStatusEnum("status").default("pending").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  overallScore: integer("overall_score"),
  credibilityScore: integer("credibility_score"),
  complianceRiskScore: integer("compliance_risk_score"),
  documentConflictIndex: integer("document_conflict_index"),
  stressIndex: integer("stress_index"),
  evasionProbability: integer("evasion_probability"),
  summaryInsights: jsonb("summary_insights"),
  keyAdmissions: jsonb("key_admissions"),
  keyDenials: jsonb("key_denials"),
  riskFactors: jsonb("risk_factors"),
  timelineHighlights: jsonb("timeline_highlights"),
  policyReferences: jsonb("policy_references"),
  contradictions: jsonb("contradictions"),
  followUpRecommendations: jsonb("follow_up_recommendations"),
  questionScores: jsonb("question_scores"),
  behavioralSignals: jsonb("behavioral_signals"),
  rawAiResponse: jsonb("raw_ai_response"),
  modelUsed: varchar("model_used"),
  tokensUsed: integer("tokens_used"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Interview Session Notes (privileged collaborative notes during/after interview)
export const interviewSessionNotes = pgTable("interview_session_notes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id")
    .references(() => liveInterviewSessions.id)
    .notNull(),
  authorId: varchar("author_id")
    .references(() => users.id)
    .notNull(),
  linkedSegmentId: varchar("linked_segment_id")
    .references(() => interviewTranscriptSegments.id),
  linkedQuestionId: varchar("linked_question_id")
    .references(() => interviewQuestions.id),
  noteText: text("note_text").notNull(),
  isPrivileged: varchar("is_privileged").default("true").notNull(),
  privilegeType: privilegeStatusEnum("privilege_type").default("attorney_client_privileged"),
  tags: jsonb("tags"),
  timestamp: integer("timestamp"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Interview Evidence Links (connect interview segments to case documents)
export const interviewEvidenceLinks = pgTable("interview_evidence_links", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id")
    .references(() => liveInterviewSessions.id)
    .notNull(),
  segmentId: varchar("segment_id")
    .references(() => interviewTranscriptSegments.id),
  questionId: varchar("question_id")
    .references(() => interviewQuestions.id),
  communicationId: varchar("communication_id")
    .references(() => communications.id),
  chatMessageId: varchar("chat_message_id"),
  documentUrl: text("document_url"),
  evidenceType: varchar("evidence_type").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  relevance: varchar("relevance"),
  linkedBy: varchar("linked_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Video Meeting Status Enum (for simple video depositions/recorded statements)
export const videoMeetingStatusEnum = pgEnum("video_meeting_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

// Video Meeting Type Enum
export const videoMeetingTypeEnum = pgEnum("video_meeting_type", [
  "deposition",
  "recorded_statement",
  "witness_interview",
  "expert_consultation",
  "client_meeting",
  "team_meeting",
  "other",
]);

// Video Meetings (simplified video conferencing for depositions, recorded statements, etc.)
export const videoMeetings = pgTable("video_meetings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .references(() => cases.id),
  title: text("title").notNull(),
  description: text("description"),
  meetingType: videoMeetingTypeEnum("meeting_type").default("deposition").notNull(),
  roomId: varchar("room_id").notNull().unique(),
  status: videoMeetingStatusEnum("status").default("scheduled").notNull(),
  scheduledStartTime: timestamp("scheduled_start_time"),
  scheduledEndTime: timestamp("scheduled_end_time"),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  duration: integer("duration"),
  hostId: varchar("host_id")
    .references(() => users.id)
    .notNull(),
  inviteLink: text("invite_link"),
  waitingRoomEnabled: varchar("waiting_room_enabled").default("true").notNull(),
  recordingEnabled: varchar("recording_enabled").default("false").notNull(),
  transcriptionEnabled: varchar("transcription_enabled").default("false").notNull(),
  autoTranscribe: varchar("auto_transcribe").default("false").notNull(),
  autoSummarize: varchar("auto_summarize").default("false").notNull(),
  screenSharingAllowed: varchar("screen_sharing_allowed").default("true").notNull(),
  chatEnabled: varchar("chat_enabled").default("true").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Video Meeting Participant Status Enum (for waiting room)
export const videoMeetingParticipantStatusEnum = pgEnum("video_meeting_participant_status", [
  "invited",
  "waiting",
  "admitted",
  "declined",
  "left",
]);

// Video Meeting Participants
export const videoMeetingParticipants = pgTable("video_meeting_participants", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id")
    .references(() => videoMeetings.id)
    .notNull(),
  userId: varchar("user_id")
    .references(() => users.id),
  name: text("name").notNull(),
  email: text("email"),
  role: varchar("role").default("participant").notNull(),
  participantStatus: videoMeetingParticipantStatusEnum("participant_status").default("invited"),
  joinedAt: timestamp("joined_at"),
  leftAt: timestamp("left_at"),
  admittedAt: timestamp("admitted_at"),
  admittedBy: varchar("admitted_by").references(() => users.id),
  consentGiven: varchar("consent_given").default("false").notNull(),
  consentTimestamp: timestamp("consent_timestamp"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Video Meeting Recordings
export const videoMeetingRecordings = pgTable("video_meeting_recordings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id")
    .references(() => videoMeetings.id)
    .notNull(),
  videoUrl: text("video_url"),
  audioUrl: text("audio_url"),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"),
  fileSize: bigint("file_size", { mode: "number" }),
  format: varchar("format"),
  resolution: varchar("resolution"),
  status: varchar("status").default("recording").notNull(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Video Meeting Chat Messages (real-time chat during meetings)
export const videoMeetingChatMessages = pgTable("video_meeting_chat_messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id")
    .references(() => videoMeetings.id)
    .notNull(),
  senderId: varchar("sender_id")
    .references(() => users.id),
  senderName: text("sender_name").notNull(),
  content: text("content").notNull(),
  messageType: varchar("message_type").default("text").notNull(), // text, file, system
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  isPrivileged: varchar("is_privileged").default("false").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  meetingIdx: index("video_meeting_chat_messages_meeting_idx").on(table.meetingId),
  senderIdx: index("video_meeting_chat_messages_sender_idx").on(table.senderId),
}));

// Meeting Invitations (for scheduled meeting emails)
export const meetingInvitations = pgTable("meeting_invitations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id")
    .references(() => videoMeetings.id)
    .notNull(),
  inviteeEmail: text("invitee_email").notNull(),
  inviteeName: text("invitee_name"),
  inviteeRole: varchar("invitee_role").default("participant").notNull(),
  status: varchar("status").default("pending").notNull(), // pending, sent, accepted, declined
  emailSentAt: timestamp("email_sent_at"),
  respondedAt: timestamp("responded_at"),
  responseNote: text("response_note"),
  accessToken: varchar("access_token").unique(), // Unique token for guest access
  tokenExpiresAt: timestamp("token_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  meetingIdx: index("meeting_invitations_meeting_idx").on(table.meetingId),
  emailIdx: index("meeting_invitations_email_idx").on(table.inviteeEmail),
}));

// Meeting Transcription Processing Status Enum
export const meetingTranscriptionStatusEnum = pgEnum("meeting_transcription_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

// Meeting Transcriptions (generated from recordings or live sessions)
export const meetingTranscriptions = pgTable("meeting_transcriptions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id")
    .references(() => videoMeetings.id)
    .notNull(),
  recordingId: varchar("recording_id")
    .references(() => videoMeetingRecordings.id),
  transcriptionText: text("transcription_text"),
  segments: jsonb("segments"), // Array of {startTime, endTime, speaker, text}
  language: varchar("language").default("en"),
  confidence: real("confidence"),
  wordCount: integer("word_count"),
  duration: integer("duration"), // Duration in seconds
  status: meetingTranscriptionStatusEnum("status").default("pending").notNull(),
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  errorMessage: text("error_message"),
  source: varchar("source").default("recording").notNull(), // 'recording', 'live', 'upload'
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  meetingIdx: index("meeting_transcriptions_meeting_idx").on(table.meetingId),
  recordingIdx: index("meeting_transcriptions_recording_idx").on(table.recordingId),
  statusIdx: index("meeting_transcriptions_status_idx").on(table.status),
}));

// Meeting Summary Status Enum
export const meetingSummaryStatusEnum = pgEnum("meeting_summary_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

// Meeting Summaries (AI-generated from transcriptions)
export const meetingSummaries = pgTable("meeting_summaries", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id")
    .references(() => videoMeetings.id)
    .notNull(),
  transcriptionId: varchar("transcription_id")
    .references(() => meetingTranscriptions.id),
  summaryType: varchar("summary_type").default("comprehensive").notNull(), // 'brief', 'comprehensive', 'action_items', 'key_decisions'
  summaryText: text("summary_text"),
  keyPoints: jsonb("key_points"), // Array of key discussion points
  actionItems: jsonb("action_items"), // Array of {description, assignee, dueDate, priority}
  decisions: jsonb("decisions"), // Array of decisions made
  participants: jsonb("participants"), // Array of {name, role, speakingTime}
  topics: jsonb("topics"), // Array of main topics discussed
  sentiment: varchar("sentiment"), // 'positive', 'neutral', 'negative', 'mixed'
  status: meetingSummaryStatusEnum("status").default("pending").notNull(),
  aiModel: varchar("ai_model"), // Model used for generation (e.g., 'gpt-4', 'gemini-pro')
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  errorMessage: text("error_message"),
  generatedBy: varchar("generated_by").references(() => users.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  meetingIdx: index("meeting_summaries_meeting_idx").on(table.meetingId),
  transcriptionIdx: index("meeting_summaries_transcription_idx").on(table.transcriptionId),
  statusIdx: index("meeting_summaries_status_idx").on(table.status),
  typeIdx: index("meeting_summaries_type_idx").on(table.summaryType),
}));

// Immutable audit logs with cryptographic hashing
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(), // case_created, alert_reviewed, etc
  entityType: text("entity_type").notNull(), // case, alert, interview, etc
  entityId: varchar("entity_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  previousLogHash: text("previous_log_hash"), // Hash of previous audit log entry (blockchain-style)
  currentLogHash: text("current_log_hash"), // Hash of this entry
  isImmutable: varchar("is_immutable").default("true").notNull(), // Append-only
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Ava AI Assistant Chat Sessions
export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .references(() => users.id)
    .notNull(),
  title: text("title").notNull(), // Auto-generated from first message
  contextType: varchar("context_type"), // "case", "alert", "regulation", "policy", "general"
  contextId: varchar("context_id"), // ID of related entity (case_id, alert_id, etc)
  contextData: jsonb("context_data"), // Additional context information
  isActive: boolean("is_active").default(true).notNull(), // Is this an active/recent session?
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Ava AI Assistant Chat Messages
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id")
    .references(() => chatSessions.id)
    .notNull(),
  role: varchar("role").notNull(), // "user" or "assistant"
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // Additional metadata (model used, tokens, etc)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Case Messages Table - Internal investigator communications
export const caseMessages = pgTable("case_messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .references(() => cases.id)
    .notNull(),
  senderId: varchar("sender_id")
    .references(() => users.id)
    .notNull(),
  recipientIds: text("recipient_ids").array().notNull(), // Array of user IDs
  subject: text("subject").notNull(),
  content: text("content").notNull(), // Message content
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  readBy: text("read_by").array().default(sql`ARRAY[]::text[]`).notNull(), // Array of user IDs who have read the message
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  caseIdx: index("case_messages_case_idx").on(table.caseId),
  senderIdx: index("case_messages_sender_idx").on(table.senderId),
}));

// Connector configurations for external integrations
export const connectorConfigurations = pgTable("connector_configurations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  connectorType: communicationSourceEnum("connector_type").notNull(),
  connectorName: text("connector_name").notNull(), // User-friendly name
  isActive: varchar("is_active").default("true").notNull(),
  syncFrequency: integer("sync_frequency").default(300), // Seconds between syncs
  lastSyncAt: timestamp("last_sync_at"),
  nextSyncAt: timestamp("next_sync_at"),
  credentialsEncrypted: text("credentials_encrypted"), // Encrypted API keys/tokens
  configurationData: jsonb("configuration_data"), // Connector-specific settings
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Google Gemini File Search stores - RAG for document search
export const fileSearchStores = pgTable("file_search_stores", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .references(() => cases.id),
  dealId: varchar("deal_id")
    .references(() => deals.id),
  storeName: text("store_name").notNull().unique(), // Gemini File Search store name (globally scoped)
  displayName: text("display_name").notNull(), // User-friendly name
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document indexing status tracking for Gemini File Search RAG
export const documentIndexStatus = pgTable("document_indexing_status", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull(), // References communications.id or ingestedChatMessages.id
  caseId: varchar("case_id")
    .references(() => cases.id)
    .notNull(),
  status: documentIndexStatusEnum("status").notNull().default("pending"),
  indexedAt: timestamp("indexed_at"),
  indexVersion: integer("index_version").notNull().default(1), // Track schema changes for re-indexing
  contentHash: text("content_hash"), // SHA-256 hash for deduplication
  errorMessage: text("error_message"), // Error details for failed indexing
  retryCount: integer("retry_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  documentIdIdx: index("document_index_status_document_id_idx").on(table.documentId),
  caseIdIdx: index("document_index_status_case_id_idx").on(table.caseId),
  statusIdx: index("document_index_status_status_idx").on(table.status),
  contentHashIdx: index("document_index_status_content_hash_idx").on(table.contentHash),
  // Unique constraint to prevent duplicate indexing (race condition protection)
  uniqueContentHash: unique("unique_case_hash_version").on(table.caseId, table.contentHash, table.indexVersion),
}));

// Legal hold records for compliance
export const legalHolds = pgTable("legal_holds", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id),
  holdName: text("hold_name").notNull(),
  reason: text("reason").notNull(),
  custodians: jsonb("custodians").notNull(), // Array of user emails/names affected by hold
  dateRange: jsonb("date_range"), // {start: date, end: date} for communications to preserve
  keywords: jsonb("keywords"), // Keywords to identify relevant communications
  status: varchar("status").default("active").notNull(), // active, released
  activatedAt: timestamp("activated_at").defaultNow().notNull(),
  releasedAt: timestamp("released_at"),
  releasedBy: varchar("released_by").references(() => users.id),
  notificationsSent: jsonb("notifications_sent"), // Log of hold notifications sent to custodians
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Detection rules for hybrid rules+ML engine
export const detectionRules = pgTable("detection_rules", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  ruleName: text("rule_name").notNull(),
  ruleDescription: text("rule_description"),
  detectionType: detectionTypeEnum("detection_type").notNull(),
  violationType: violationTypeEnum("violation_type").notNull(),
  industrySectors: industrySectorEnum("industry_sectors").array(), // Applicable sectors (null = all sectors)
  sectorRulePackId: varchar("sector_rule_pack_id").references(() => sectorRulePacks.id), // Optional link to rule pack
  keywords: jsonb("keywords").notNull(), // Array of keywords/phrases to match
  regexPatterns: jsonb("regex_patterns"), // Array of regex patterns
  severity: alertSeverityEnum("severity").notNull(),
  riskScore: integer("risk_score").default(50).notNull(), // Base risk score for matches
  isActive: varchar("is_active").default("true").notNull(),
  requiresAiConfirmation: varchar("requires_ai_confirmation").default("false").notNull(), // Must AI also flag?
  // Custom Rule Support (Compliance Logic Studio)
  isCustom: varchar("is_custom").default("false").notNull(), // true if user-created, false if built-in
  conditionGroups: jsonb("condition_groups"), // Array of {operator: "AND"|"OR", conditions: [{type, field, operator, value}]}
  numericThresholds: jsonb("numeric_thresholds"), // Array of {field: "amount"|"count", operator: ">"|"<"|">="|"<="|"=", value: number}
  entityExclusions: jsonb("entity_exclusions"), // {departments: [], subsidiaries: [], countries: [], users: []}
  ruleVersion: integer("rule_version").default(1).notNull(), // Version number for change tracking
  testResults: jsonb("test_results"), // Array of {testCase, matched, explanation, timestamp}
  triggerCount: integer("trigger_count").default(0).notNull(), // How many times this rule has triggered
  lastTriggered: timestamp("last_triggered"), // Most recent trigger timestamp
  templateId: varchar("template_id"), // Reference to template if instantiated from one
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Remediation Plans
export const remediationPlans = pgTable("remediation_plans", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id).notNull(),
  planName: text("plan_name").notNull(),
  violationType: violationTypeEnum("violation_type").notNull(),
  actionItems: jsonb("action_items").notNull(), // Array of {id, description, owner, deadline, status, evidence}
  milestones: jsonb("milestones"), // Array of {name, targetDate, completedDate, status}
  overallStatus: varchar("overall_status").default("draft").notNull(), // draft, in_progress, completed, cancelled
  progressPercentage: integer("progress_percentage").default(0).notNull(),
  evidenceUrls: jsonb("evidence_urls"), // Array of URLs to supporting documentation
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  targetCompletionDate: timestamp("target_completion_date"),
  actualCompletionDate: timestamp("actual_completion_date"),
  // Privilege & Work Product Protection (attorney work product)
  privilegeStatus: privilegeStatusEnum("privilege_status").default("work_product").notNull(), // Default work product
  privilegeBasis: privilegeBasisEnum("privilege_basis").default("attorney_work_product").notNull(),
  privilegeAssertedBy: varchar("privilege_asserted_by").references(() => users.id),
  privilegeAssertedAt: timestamp("privilege_asserted_at"),
  privilegeReviewStatus: varchar("privilege_review_status").default("pending").notNull(),
  privilegeReviewedBy: varchar("privilege_reviewed_by").references(() => users.id),
  privilegeReviewedAt: timestamp("privilege_reviewed_at"),
  privilegeNotes: text("privilege_notes"),
  isRedacted: varchar("is_redacted").default("false").notNull(),
  redactionLog: jsonb("redaction_log"),
  privilegeStamp: text("privilege_stamp"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Regulatory Strategies
export const regulatoryStrategies = pgTable("regulatory_strategies", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id).notNull(),
  strategyType: varchar("strategy_type").notNull(), // self_disclose, remediate_quiet, monitor, escalate
  violationType: violationTypeEnum("violation_type").notNull(),
  regulatoryAgencies: jsonb("regulatory_agencies").notNull(), // Array of {agency, contact, phone, email}
  selfDisclosureRecommendation: varchar("self_disclosure_recommendation"), // recommend, do_not_recommend, pending_analysis
  selfDisclosureRationale: text("self_disclosure_rationale"),
  disclosureTimeline: jsonb("disclosure_timeline"), // {decision_date, disclosure_window_end, submission_target}
  riskAssessment: text("risk_assessment"),
  strategicRecommendations: text("strategic_recommendations"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Disclosure Playbooks
export const disclosurePlaybooks = pgTable("disclosure_playbooks", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id).notNull(),
  playbookType: varchar("playbook_type").notNull(), // fcpa_self_disclosure, off_channel_cleanup, antitrust_leniency
  violationType: violationTypeEnum("violation_type").notNull(),
  checklistItems: jsonb("checklist_items").notNull(), // Array of {item, completed, evidence, notes}
  disclosureLetter: text("disclosure_letter"), // Draft letter content
  regulatoryContacts: jsonb("regulatory_contacts"), // Array of agency contacts coordinated
  submissionStatus: varchar("submission_status").default("draft").notNull(), // draft, ready, submitted, acknowledged
  submittedAt: timestamp("submitted_at"),
  acknowledgmentReceived: varchar("acknowledgment_received").default("false").notNull(),
  followUpActions: jsonb("follow_up_actions"), // Array of required follow-ups
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Board Reports
export const boardReports = pgTable("board_reports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  reportPeriodStart: timestamp("report_period_start").notNull(),
  reportPeriodEnd: timestamp("report_period_end").notNull(),
  reportType: varchar("report_type").default("quarterly").notNull(), // monthly, quarterly, annual, ad_hoc
  executiveSummary: text("executive_summary"),
  keyMetrics: jsonb("key_metrics").notNull(), // {total_alerts, critical_cases, avg_resolution_time, etc}
  trendAnalysis: jsonb("trend_analysis"), // Violation trends, risk scores over time
  openCases: jsonb("open_cases"), // Summary of critical open cases
  recommendedActions: text("recommended_actions"),
  pdfUrl: text("pdf_url"), // URL to generated PDF report
  presentedAt: timestamp("presented_at"),
  presentedBy: varchar("presented_by").references(() => users.id),
  // Privilege & Work Product Protection (attorney work product)
  privilegeStatus: privilegeStatusEnum("privilege_status").default("work_product").notNull(),
  privilegeBasis: privilegeBasisEnum("privilege_basis").default("attorney_work_product").notNull(),
  privilegeAssertedBy: varchar("privilege_asserted_by").references(() => users.id),
  privilegeAssertedAt: timestamp("privilege_asserted_at"),
  privilegeReviewStatus: varchar("privilege_review_status").default("pending").notNull(),
  privilegeReviewedBy: varchar("privilege_reviewed_by").references(() => users.id),
  privilegeReviewedAt: timestamp("privilege_reviewed_at"),
  privilegeNotes: text("privilege_notes"),
  isRedacted: varchar("is_redacted").default("false").notNull(),
  redactionLog: jsonb("redaction_log"),
  privilegeStamp: text("privilege_stamp"), // "CONFIDENTIAL - PREPARED AT REQUEST OF COUNSEL"
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Privilege Log for eDiscovery
export const privilegeLogs = pgTable("privilege_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id),
  batesNumber: varchar("bates_number").unique(), // Unique document identifier (e.g., SENT-000001)
  documentType: text("document_type").notNull(), // communication, interview_transcript, report, memo, etc
  documentId: varchar("document_id").notNull(), // ID of the actual document
  documentDate: timestamp("document_date").notNull(),
  documentDescription: text("document_description").notNull(), // Brief description for privilege log
  author: text("author").notNull(), // Document author
  recipients: jsonb("recipients"), // Array of recipients
  privilegeType: privilegeStatusEnum("privilege_type").notNull(), // attorney_client_privileged, work_product, both
  privilegeBasis: privilegeBasisEnum("privilege_basis").notNull(),
  privilegeAssertion: text("privilege_assertion").notNull(), // Detailed assertion text
  isCounselDirected: varchar("is_counsel_directed").default("true").notNull(),
  isPartiallyPrivileged: varchar("is_partially_privileged").default("false").notNull(),
  redactionApplied: varchar("redaction_applied").default("false").notNull(),
  assertedBy: varchar("asserted_by").references(() => users.id).notNull(),
  assertedAt: timestamp("asserted_at").defaultNow().notNull(),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  exportedForLitigation: varchar("exported_for_litigation").default("false").notNull(),
  exportedAt: timestamp("exported_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document Sets for grouping communications into categories
export const documentSets = pgTable("document_sets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // investigation, evidence, privilege, review_batch, custom
  caseId: varchar("case_id").references(() => cases.id), // Optional: link to a specific case
  color: varchar("color"), // For UI identification
  documentCount: integer("document_count").default(0).notNull(),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Junction table for documents in sets (many-to-many)
export const documentSetMembers = pgTable("document_set_members", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  documentSetId: varchar("document_set_id").references(() => documentSets.id, { onDelete: "cascade" }).notNull(),
  communicationId: varchar("communication_id").references(() => communications.id, { onDelete: "cascade" }).notNull(),
  addedBy: varchar("added_by").references(() => users.id).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  notes: text("notes"), // Optional notes about why this document is in this set
});

// Document Forwards for sharing documents with others
export const documentForwards = pgTable("document_forwards", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  communicationId: varchar("communication_id").references(() => communications.id, { onDelete: "cascade" }).notNull(),
  forwardedBy: varchar("forwarded_by").references(() => users.id).notNull(),
  recipientType: varchar("recipient_type").notNull(), // internal_investigator, investigation_subject, external_party
  recipientUserId: varchar("recipient_user_id").references(() => users.id), // For internal users
  recipientEmail: varchar("recipient_email"), // For external recipients
  recipientName: text("recipient_name"), // Display name for recipient
  subject: text("subject"), // Forward message subject
  message: text("message"), // Forward message body
  accessGranted: varchar("access_granted").default("true").notNull(), // Can be revoked
  accessRevokedBy: varchar("access_revoked_by").references(() => users.id),
  accessRevokedAt: timestamp("access_revoked_at"),
  viewedAt: timestamp("viewed_at"), // Track if/when recipient viewed
  forwardedAt: timestamp("forwarded_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // Optional expiration date
});

// Sector Rule Packs for industry-specific compliance
export const sectorRulePacks = pgTable("sector_rule_packs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  packName: text("pack_name").notNull(),
  industrySector: industrySectorEnum("industry_sector").notNull(),
  description: text("description").notNull(),
  regulatoryBodies: jsonb("regulatory_bodies").notNull(), // Array of {name, acronym, jurisdiction}
  ruleCategories: jsonb("rule_categories").notNull(), // Array of rule categories specific to this sector
  isActive: varchar("is_active").default("true").notNull(),
  version: integer("version").default(1).notNull(),
  effectiveDate: timestamp("effective_date"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Data Subject Access Requests (GDPR/CCPA)
export const dsarRequests = pgTable("dsar_requests", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  requestNumber: varchar("request_number").unique().notNull(), // DSAR-2024-00001
  requestType: varchar("request_type").notNull(), // access, deletion, portability, correction, opt_out
  dataSubjectEmail: text("data_subject_email").notNull(),
  dataSubjectName: text("data_subject_name").notNull(),
  jurisdiction: text("jurisdiction").notNull(), // GDPR, CCPA, CPRA, etc
  requestDetails: text("request_details").notNull(),
  verificationStatus: varchar("verification_status").default("pending").notNull(), // pending, verified, failed
  verificationMethod: text("verification_method"), // email_verification, id_document, etc
  verifiedAt: timestamp("verified_at"),
  status: varchar("status").default("received").notNull(), // received, in_progress, completed, rejected
  dataLocations: jsonb("data_locations"), // Array of systems/databases where data is found
  fulfillmentPackageUrl: text("fulfillment_package_url"), // URL to exported data package
  completedAt: timestamp("completed_at"),
  slaDeadline: timestamp("sla_deadline").notNull(), // 30 days for GDPR, 45 days for CCPA
  assignedTo: varchar("assigned_to").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// White-Label Training Content
export const trainingCourses = pgTable("training_courses", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  courseTitle: text("course_title").notNull(),
  courseDescription: text("course_description").notNull(),
  industrySector: industrySectorEnum("industry_sector").default("general").notNull(),
  violationTypes: violationTypeEnum("violation_types").array(), // Related compliance topics
  modules: jsonb("modules").notNull(), // Array of {id, title, content, duration, quiz}
  estimatedDuration: integer("estimated_duration"), // Minutes
  passingScore: integer("passing_score").default(80).notNull(), // Percentage needed to pass
  certificateTemplate: text("certificate_template"), // HTML template for certificate
  isPublished: varchar("is_published").default("false").notNull(),
  clientBranding: jsonb("client_branding"), // {logo_url, primary_color, company_name}
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Training Enrollment and Completion Tracking
export const trainingEnrollments = pgTable("training_enrollments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").references(() => trainingCourses.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  progress: integer("progress").default(0).notNull(), // Percentage
  quizScores: jsonb("quiz_scores"), // Array of {module_id, score, attempts}
  finalScore: integer("final_score"),
  passedStatus: varchar("passed_status").default("not_started").notNull(), // not_started, in_progress, passed, failed
  certificateUrl: text("certificate_url"), // URL to generated certificate
  certificateIssuedAt: timestamp("certificate_issued_at"),
  lastAccessedAt: timestamp("last_accessed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// HR Compliance: Policies & Procedures
export const policies = pgTable("policies", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  policyName: text("policy_name").notNull(),
  policyCategory: policyCategoryEnum("policy_category").notNull(),
  description: text("description").notNull(),
  policyContent: text("policy_content").notNull(), // Full policy text or HTML
  version: varchar("version").notNull(), // e.g., "1.0", "2.1"
  previousVersionId: varchar("previous_version_id").references((): any => policies.id),
  isCurrent: varchar("is_current").default("true").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  requiresAttestation: varchar("requires_attestation").default("true").notNull(),
  attestationFrequency: varchar("attestation_frequency"), // once, annually, upon_update
  attestationText: text("attestation_text"), // Custom acknowledgment text
  // Applicability
  applicableRoles: jsonb("applicable_roles"), // Array of user roles
  applicableDepartments: jsonb("applicable_departments"), // Array of departments
  applicableLocations: jsonb("applicable_locations"), // Array of locations/jurisdictions
  isMandatory: varchar("is_mandatory").default("true").notNull(),
  // Tracking
  totalAttestations: integer("total_attestations").default(0).notNull(),
  pendingAttestations: integer("pending_attestations").default(0).notNull(),
  documentUrl: text("document_url"), // URL to PDF/document version
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// HR Compliance: Policy Attestations
export const policyAttestations = pgTable("policy_attestations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  policyId: varchar("policy_id").references(() => policies.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  policyVersion: varchar("policy_version").notNull(),
  attestedAt: timestamp("attested_at").defaultNow().notNull(),
  attestationMethod: varchar("attestation_method").default("digital_signature").notNull(), // digital_signature, checkbox, verbal
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  attestationText: text("attestation_text"), // What the user agreed to
  signature: text("signature"), // Digital signature or typed name
  // Compliance tracking
  isValid: varchar("is_valid").default("true").notNull(), // Can be invalidated if policy updated
  invalidatedAt: timestamp("invalidated_at"),
  invalidationReason: text("invalidation_reason"),
  // Reminder & escalation tracking
  remindersSent: integer("reminders_sent").default(0).notNull(),
  lastReminderSent: timestamp("last_reminder_sent"),
  escalatedTo: varchar("escalated_to").references(() => users.id), // Manager/HR escalation
  escalatedAt: timestamp("escalated_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// HR Compliance: Training Assignments (Mandatory Training)
export const trainingAssignments = pgTable("training_assignments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").references(() => trainingCourses.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  assignmentReason: varchar("assignment_reason").notNull(), // new_hire, annual, role_change, incident_based, policy_update, regulatory_requirement
  assignedBy: varchar("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  dueDate: timestamp("due_date").notNull(),
  completedAt: timestamp("completed_at"),
  // Status tracking
  status: varchar("status").default("assigned").notNull(), // assigned, in_progress, completed, overdue, waived
  isMandatory: varchar("is_mandatory").default("true").notNull(),
  priority: varchar("priority").default("normal").notNull(), // urgent, high, normal, low
  // Reminder & escalation
  remindersSent: integer("reminders_sent").default(0).notNull(),
  lastReminderSent: timestamp("last_reminder_sent"),
  escalatedTo: varchar("escalated_to").references(() => users.id),
  escalatedAt: timestamp("escalated_at"),
  escalationReason: text("escalation_reason"),
  // Waiver/exemption
  isWaived: varchar("is_waived").default("false").notNull(),
  waivedBy: varchar("waived_by").references(() => users.id),
  waivedAt: timestamp("waived_at"),
  waiverReason: text("waiver_reason"),
  // Completion tracking
  enrollmentId: varchar("enrollment_id").references(() => trainingEnrollments.id),
  certificateUrl: text("certificate_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// HR Compliance: Certification Tracking
export const certifications = pgTable("certifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  certificationType: varchar("certification_type").notNull(), // harassment_prevention, data_privacy, security_awareness, ethics, etc
  certificationName: text("certification_name").notNull(),
  issuedBy: text("issued_by"), // Organization or system that issued
  issuedDate: timestamp("issued_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  certificateNumber: varchar("certificate_number"),
  certificateUrl: text("certificate_url"),
  // Renewal tracking
  requiresRenewal: varchar("requires_renewal").default("false").notNull(),
  renewalPeriodDays: integer("renewal_period_days"), // Days before expiry to trigger renewal
  renewalStatus: varchar("renewal_status").default("valid").notNull(), // valid, expiring_soon, expired, renewed
  renewalRemindersSent: integer("renewal_reminders_sent").default(0).notNull(),
  lastReminderSent: timestamp("last_reminder_sent"),
  // Related training/policy
  courseId: varchar("course_id").references(() => trainingCourses.id),
  policyId: varchar("policy_id").references(() => policies.id),
  // Audit trail
  verificationStatus: varchar("verification_status").default("unverified").notNull(), // unverified, verified, disputed
  verifiedBy: varchar("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Note: reporterIdentities table disabled - using inline reporter fields in hotlineReports for now
// Whistleblowing & Hotline: Reporter Identity (Encrypted PII Storage) - FUTURE ENHANCEMENT
// export const reporterIdentities = pgTable("reporter_identities", { ... });

// Whistleblowing & Hotline: Hotline Reports (Incident Intake)
export const hotlineReports = pgTable("hotline_reports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  reportNumber: varchar("report_number").notNull().unique(), // AUTO-HTL-2025-0001
  // Reporter Information
  isAnonymous: varchar("is_anonymous").default("true").notNull(),
  reporterName: text("reporter_name"),
  reporterEmail: text("reporter_email"),
  reporterPhone: text("reporter_phone"),
  reporterRelationship: varchar("reporter_relationship"), // employee, contractor, vendor, customer, third_party
  reporterDepartment: text("reporter_department"),
  reporterLocation: text("reporter_location"),
  anonymousAccessCode: varchar("anonymous_access_code"), // For anonymous follow-up (hashed)
  // Intake Channel
  intakeChannel: varchar("intake_channel").notNull(), // phone, web, email, mobile_app, in_person, mail
  intakeDate: timestamp("intake_date").defaultNow().notNull(),
  // Incident Details
  incidentCategory: varchar("incident_category").notNull(), // fraud, harassment, discrimination, safety, ethics, retaliation, conflicts_of_interest, data_breach, environmental, other
  incidentSubcategory: text("incident_subcategory"), // Specific type within category
  incidentDescription: text("incident_description").notNull(),
  incidentDate: timestamp("incident_date"), // When did incident occur
  incidentLocation: text("incident_location"),
  // Involved Parties
  allegedViolators: jsonb("alleged_violators"), // Array of {name, title, department, relationship}
  witnesses: jsonb("witnesses"), // Array of witness info
  // Jurisdictional Information
  jurisdiction: varchar("jurisdiction"), // US, EU_UK, EU_FR, EU_DE, ADGM, etc.
  applicableLaws: jsonb("applicable_laws"), // Array of SOX, Dodd-Frank, EU_Directive, etc.
  // Severity & Priority
  severity: varchar("severity").default("medium").notNull(), // critical, high, medium, low
  priority: varchar("priority").default("normal").notNull(), // urgent, high, normal, low
  // Confidentiality & Protection
  requiresConfidentiality: varchar("requires_confidentiality").default("true").notNull(),
  requiresWhistleblowerProtection: varchar("requires_whistleblower_protection").default("false").notNull(),
  protectionType: varchar("protection_type"), // sox_806, dodd_frank_922, eu_directive, state_law
  // Status & Assignment
  status: varchar("status").default("intake").notNull(), // intake, triage, assigned, under_investigation, resolved, closed, withdrawn
  assignedTo: varchar("assigned_to").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  // SLA Tracking (EU: 7 days acknowledgment, 90 days follow-up)
  acknowledgmentDeadline: timestamp("acknowledgment_deadline"), // 7 days for EU
  acknowledgmentSent: varchar("acknowledgment_sent").default("false").notNull(),
  acknowledgmentSentAt: timestamp("acknowledgment_sent_at"),
  followUpDeadline: timestamp("follow_up_deadline"), // 90 days for EU
  followUpSent: varchar("follow_up_sent").default("false").notNull(),
  followUpSentAt: timestamp("follow_up_sent_at"),
  // Evidence & Attachments
  evidenceUrls: jsonb("evidence_urls"), // Array of uploaded file URLs
  supportingDocuments: jsonb("supporting_documents"), // Document metadata
  // Case Linkage
  caseId: varchar("case_id").references(() => cases.id), // Linked investigation case
  // Audit Trail
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  closedBy: varchar("closed_by").references(() => users.id),
});

// Whistleblowing & Hotline: Case Notes for Hotline Reports
export const hotlineReportNotes = pgTable("hotline_report_notes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").references(() => hotlineReports.id).notNull(),
  noteType: varchar("note_type").default("general").notNull(), // general, investigator_note, follow_up, status_update, evidence
  noteContent: text("note_content").notNull(),
  isConfidential: varchar("is_confidential").default("true").notNull(),
  visibleToReporter: varchar("visible_to_reporter").default("false").notNull(), // For anonymous communication
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Whistleblowing & Hotline: Whistleblower Protection Tracking
export const whistleblowerProtections = pgTable("whistleblower_protections", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").references(() => hotlineReports.id),
  userId: varchar("user_id").references(() => users.id), // Protected individual
  protectionType: varchar("protection_type").notNull(), // sox_806, dodd_frank_922, eu_directive_2019_1937, state_law, company_policy
  protectionStatus: varchar("protection_status").default("active").notNull(), // active, expired, lifted, violated
  protectionStartDate: timestamp("protection_start_date").defaultNow().notNull(),
  protectionEndDate: timestamp("protection_end_date"),
  // Identity Protection
  identityConcealed: varchar("identity_concealed").default("true").notNull(),
  accessRestrictedTo: jsonb("access_restricted_to"), // Array of user IDs with access to identity
  // Retaliation Monitoring
  retaliationMonitoring: varchar("retaliation_monitoring").default("active").notNull(), // active, inactive, incident_detected
  monitoringActions: jsonb("monitoring_actions"), // Array of {action, date, notes}
  retaliationIncidents: jsonb("retaliation_incidents"), // Array of suspected retaliation
  // Regulatory Compliance
  regulatoryBasis: text("regulatory_basis"), // Legal basis for protection
  complianceJurisdiction: varchar("compliance_jurisdiction"), // US, EU, UK, etc.
  // Protection Measures
  protectionMeasures: jsonb("protection_measures"), // Array of {measure_type, implementation_date, notes}
  // Review & Audit
  lastReviewDate: timestamp("last_review_date"),
  nextReviewDate: timestamp("next_review_date"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Whistleblowing & Hotline: Retaliation Alerts
export const retaliationAlerts = pgTable("retaliation_alerts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  protectionId: varchar("protection_id").references(() => whistleblowerProtections.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(), // Protected individual
  reportId: varchar("report_id").references(() => hotlineReports.id),
  // Alert Details
  alertType: varchar("alert_type").notNull(), // termination, demotion, suspension, harassment, discrimination, performance_action, transfer, pay_reduction, benefits_reduction
  alertDescription: text("alert_description").notNull(),
  alertDate: timestamp("alert_date").notNull(),
  detectionMethod: varchar("detection_method"), // hr_system_flag, employee_report, manager_escalation, audit_review, third_party
  // Investigation
  investigationStatus: varchar("investigation_status").default("pending").notNull(), // pending, under_review, substantiated, unsubstantiated, inconclusive
  investigatedBy: varchar("investigated_by").references(() => users.id),
  investigationNotes: text("investigation_notes"),
  // Outcome
  isRetaliatory: varchar("is_retaliatory").default("pending").notNull(), // pending, confirmed, not_confirmed
  remedialActions: jsonb("remedial_actions"), // Array of actions taken
  // Escalation
  escalatedTo: varchar("escalated_to").references(() => users.id),
  escalatedAt: timestamp("escalated_at"),
  // Regulatory Reporting
  reportedToRegulator: varchar("reported_to_regulator").default("false").notNull(),
  regulatorReportDate: timestamp("regulator_report_date"),
  regulatorName: text("regulator_name"), // SEC, OSHA, EU Authority, etc.
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Whistleblowing & Hotline: Global Jurisdictional Requirements
export const whistleblowingJurisdictions = pgTable("whistleblowing_jurisdictions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  jurisdictionCode: varchar("jurisdiction_code").notNull().unique(), // US, EU, EU_FR, EU_DE, UK, ADGM, etc.
  jurisdictionName: text("jurisdiction_name").notNull(),
  region: varchar("region"), // north_america, europe, middle_east, asia_pacific
  // Regulatory Framework
  primaryLegislation: text("primary_legislation"), // SOX, Dodd-Frank, EU Directive 2019/1937, PIDA 1998, etc.
  regulatoryBody: text("regulatory_body"), // SEC, OSHA, EU Commission, FCA, etc.
  // Requirements
  mandatoryHotline: varchar("mandatory_hotline").default("false").notNull(),
  anonymousReportingRequired: varchar("anonymous_reporting_required").default("false").notNull(),
  acknowledgmentDeadlineDays: integer("acknowledgment_deadline_days"), // 7 for EU
  followUpDeadlineDays: integer("follow_up_deadline_days"), // 90 for EU
  investigationDeadlineDays: integer("investigation_deadline_days"),
  // Employee Threshold
  employeeThreshold: integer("employee_threshold"), // 50 for EU, varies by jurisdiction
  applicableSectors: jsonb("applicable_sectors"), // Array of sectors (all, financial, public, etc.)
  // Protection Standards
  retaliationProtection: varchar("retaliation_protection").default("true").notNull(),
  confidentialityRequired: varchar("confidentiality_required").default("true").notNull(),
  dataProtectionLaw: text("data_protection_law"), // GDPR, CCPA, etc.
  // Compliance Requirements
  reportingChannels: jsonb("reporting_channels"), // Array of required channels (internal, external, public)
  documentationRequirements: jsonb("documentation_requirements"),
  trainingRequirements: jsonb("training_requirements"),
  // ISO 37002 Alignment
  iso37002Aligned: varchar("iso37002_aligned").default("false").notNull(),
  // Status
  isActive: varchar("is_active").default("true").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Whistleblowing & Hotline: Regulatory Change Management
export const regulatoryChanges = pgTable("regulatory_changes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  changeType: varchar("change_type").notNull(), // new_regulation, amendment, repeal, court_ruling, guidance_update
  changeTitle: text("change_title").notNull(),
  changeDescription: text("change_description").notNull(),
  jurisdictionId: varchar("jurisdiction_id").references(() => whistleblowingJurisdictions.id),
  affectedLegislation: text("affected_legislation"), // SOX, Dodd-Frank, EU Directive, etc.
  // Dates
  announcementDate: timestamp("announcement_date"),
  effectiveDate: timestamp("effective_date"),
  complianceDeadline: timestamp("compliance_deadline"),
  // Impact Assessment
  impactLevel: varchar("impact_level").default("medium").notNull(), // critical, high, medium, low
  impactedAreas: jsonb("impacted_areas"), // Array of affected program areas
  impactSummary: text("impact_summary"),
  // Implementation
  implementationStatus: varchar("implementation_status").default("pending").notNull(), // pending, in_progress, completed, not_applicable
  implementationPlan: text("implementation_plan"),
  responsibleParty: varchar("responsible_party").references(() => users.id),
  implementationDeadline: timestamp("implementation_deadline"),
  implementationCompletedAt: timestamp("implementation_completed_at"),
  // Gap Analysis
  complianceGaps: jsonb("compliance_gaps"), // Array of identified gaps
  remediationActions: jsonb("remediation_actions"), // Array of actions to close gaps
  // Documentation
  sourceUrl: text("source_url"),
  documentUrls: jsonb("document_urls"), // Array of related documents
  // Tracking
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// eDiscovery: Custodian Profiles for Collection Management
export const custodians = pgTable("custodians", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  title: text("title"),
  department: text("department"),
  location: text("location"),
  employeeId: text("employee_id"),
  custodianType: varchar("custodian_type").default("employee").notNull(), // employee, contractor, third_party
  isCritical: varchar("is_critical").default("false").notNull(), // High-priority custodian
  legalHoldStatus: varchar("legal_hold_status").default("not_applicable").notNull(), // not_applicable, pending, acknowledged, released
  holdAcknowledgedAt: timestamp("hold_acknowledged_at"),
  holdReleasedAt: timestamp("hold_released_at"),
  questionnaireCompleted: varchar("questionnaire_completed").default("false").notNull(),
  questionnaireResponses: jsonb("questionnaire_responses"), // Custodian interview responses
  dataSources: jsonb("data_sources"), // Array of {type, identifier, status} (email, drive, slack, etc)
  collectionStatus: varchar("collection_status").default("pending").notNull(), // pending, in_progress, completed, failed
  documentCount: integer("document_count").default(0).notNull(),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// eDiscovery: Document Families (email threads + attachments)
export const documentFamilies = pgTable("document_families", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id),
  familyType: varchar("family_type").notNull(), // email_thread, email_attachments, document_versions
  parentDocumentId: varchar("parent_document_id"), // ID of parent email or root document
  memberDocumentIds: jsonb("member_document_ids").notNull(), // Array of document IDs in family
  threadMetadata: jsonb("thread_metadata"), // {subject, participants, message_count, date_range}
  inclusiveMessageId: varchar("inclusive_message_id"), // For email threads: the "inclusive" message
  hasAttachments: varchar("has_attachments").default("false").notNull(),
  attachmentCount: integer("attachment_count").default(0).notNull(),
  familyHash: text("family_hash"), // For de-duplication
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// eDiscovery: Review Batches for Document Assignment
export const reviewBatches = pgTable("review_batches", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id).notNull(),
  batchName: text("batch_name").notNull(),
  batchNumber: integer("batch_number").notNull(),
  batchType: varchar("batch_type").default("first_pass").notNull(), // first_pass, qc, privilege_review
  // Custodian-based batching
  custodianIds: jsonb("custodian_ids"), // Array of custodian IDs for this batch
  primaryCustodianId: varchar("primary_custodian_id").references(() => custodians.id), // Primary custodian if batch is custodian-specific
  documentIds: jsonb("document_ids").notNull(), // Array of communication IDs in this batch
  documentCount: integer("document_count").notNull(),
  assignedTo: varchar("assigned_to").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  status: varchar("status").default("pending").notNull(), // pending, in_progress, completed, locked
  isLocked: varchar("is_locked").default("false").notNull(),
  lockedBy: varchar("locked_by").references(() => users.id),
  lockedAt: timestamp("locked_at"),
  completedAt: timestamp("completed_at"),
  reviewedCount: integer("reviewed_count").default(0).notNull(),
  qcReviewerId: varchar("qc_reviewer_id").references(() => users.id),
  qcStatus: varchar("qc_status").default("not_started").notNull(), // not_started, in_progress, completed
  qcCompletedAt: timestamp("qc_completed_at"),
  batchCriteria: jsonb("batch_criteria"), // {date_range, keywords, etc}
  // Reviewer capacity management
  maxDocumentsPerReviewer: integer("max_documents_per_reviewer"), // Optional capacity limit
  currentReviewerLoad: integer("current_reviewer_load").default(0).notNull(), // Current doc count assigned
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// eDiscovery: Reviewer Assignments (per-document assignment tracking)
export const reviewerAssignments = pgTable("reviewer_assignments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull(), // References communication.id
  caseId: varchar("case_id").references(() => cases.id).notNull(),
  batchId: varchar("batch_id").references(() => reviewBatches.id),
  reviewerId: varchar("reviewer_id").references(() => users.id).notNull(),
  assignmentType: varchar("assignment_type").default("first_pass").notNull(), // first_pass, qc, privilege
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  assignedBy: varchar("assigned_by").references(() => users.id),
  // Status tracking
  reviewStatus: varchar("review_status").default("pending").notNull(), // pending, in_progress, completed, skipped
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  timeSpentSeconds: integer("time_spent_seconds").default(0).notNull(),
  // QC tracking
  qcReviewerId: varchar("qc_reviewer_id").references(() => users.id),
  qcStatus: varchar("qc_status").default("not_applicable").notNull(), // not_applicable, pending, in_progress, approved, overturned
  qcStartedAt: timestamp("qc_started_at"),
  qcCompletedAt: timestamp("qc_completed_at"),
  wasOverturned: varchar("was_overturned").default("false").notNull(),
  overturnReason: text("overturn_reason"),
  // Reassignment tracking
  reassignmentHistory: jsonb("reassignment_history"), // Array of {from_user, to_user, reason, timestamp}
  reassignmentCount: integer("reassignment_count").default(0).notNull(),
  // Priority and workflow
  priority: varchar("priority").default("normal").notNull(), // urgent, high, normal, low
  isLocked: varchar("is_locked").default("false").notNull(),
  lockedBy: varchar("locked_by").references(() => users.id),
  lockedAt: timestamp("locked_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// eDiscovery: Coding Forms (customizable review fields)
export const codingForms = pgTable("coding_forms", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id),
  formName: text("form_name").notNull(),
  formType: varchar("form_type").default("standard").notNull(), // standard, privilege, custom
  fields: jsonb("fields").notNull(), // Array of {field_id, label, type, options, required}
  issueCodes: jsonb("issue_codes"), // Hierarchical issue list {id, label, parent_id, color}
  confidentialityLevels: jsonb("confidentiality_levels"), // Array of {level, label, description}
  isActive: varchar("is_active").default("true").notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// eDiscovery: Document Review Codings (responses to coding forms)
export const documentCodings = pgTable("document_codings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull(), // References communication.id
  caseId: varchar("case_id").references(() => cases.id),
  codingFormId: varchar("coding_form_id").references(() => codingForms.id),
  reviewerId: varchar("reviewer_id").references(() => users.id).notNull(),
  batchId: varchar("batch_id").references(() => reviewBatches.id),
  // Core coding fields
  responsiveness: varchar("responsiveness"), // responsive, non_responsive, potentially_responsive
  isPrivileged: varchar("is_privileged").default("false").notNull(),
  privilegeType: privilegeStatusEnum("privilege_type"),
  confidentialityLevel: varchar("confidentiality_level"), // public, confidential, attorneys_eyes_only
  isHot: varchar("is_hot").default("false").notNull(), // Key document flag
  issueCodes: jsonb("issue_codes"), // Array of issue code IDs
  customFields: jsonb("custom_fields"), // Dynamic field responses {field_id: value}
  reviewNotes: text("review_notes"),
  // QC tracking
  qcReviewerId: varchar("qc_reviewer_id").references(() => users.id),
  qcStatus: varchar("qc_status").default("pending").notNull(), // pending, approved, overturned
  qcNotes: text("qc_notes"),
  wasOverturned: varchar("was_overturned").default("false").notNull(),
  originalCoding: jsonb("original_coding"), // Store original values if overturned
  qcReviewedAt: timestamp("qc_reviewed_at"),
  reviewedAt: timestamp("reviewed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Annotation Mentions: Track user mentions in document annotations
export const annotationMentions = pgTable("annotation_mentions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  documentCodingId: varchar("document_coding_id").references(() => documentCodings.id, { onDelete: "cascade" }).notNull(),
  mentionedUserId: varchar("mentioned_user_id").references(() => users.id).notNull(),
  mentionedBy: varchar("mentioned_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  documentCodingIdx: index("annotation_mentions_document_coding_idx").on(table.documentCodingId),
  mentionedUserIdx: index("annotation_mentions_mentioned_user_idx").on(table.mentionedUserId),
}));

// Notifications: System notifications for users
export const notifications = pgTable("notifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  recipientUserId: varchar("recipient_user_id").references(() => users.id),
  type: varchar("type").default("general").notNull(), // annotation_mention, case_assignment, document_review_request, alert_escalation, system, general
  title: text("title"),
  message: text("message"),
  actionUrl: text("action_url"), // Deep link to relevant content
  metadata: jsonb("metadata"), // Additional context (documentId, caseId, etc)
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  emailSent: boolean("email_sent").default(false).notNull(),
  emailSentAt: timestamp("email_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  recipientUnreadIdx: index("notifications_recipient_unread_idx").on(table.recipientUserId, table.isRead, table.createdAt),
}));

// eDiscovery: Production Sets for Export Management
export const productionSets = pgTable("production_sets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id).notNull(),
  productionName: text("production_name").notNull(),
  productionNumber: varchar("production_number").unique().notNull(), // PROD-001
  productionType: varchar("production_type").default("rolling").notNull(), // initial, supplemental, rolling, re_production
  status: varchar("status").default("draft").notNull(), // draft, in_progress, validated, transmitted, completed
  // Bates numbering configuration
  batesPrefix: varchar("bates_prefix").default("SENT").notNull(),
  batesStartNumber: integer("bates_start_number").default(1).notNull(),
  batesEndNumber: integer("bates_end_number"),
  batesPadding: integer("bates_padding").default(6).notNull(), // Number of digits (e.g., 000001)
  batesLevel: varchar("bates_level").default("page").notNull(), // page, document
  // Export format configuration
  exportFormat: varchar("export_format").default("relativity").notNull(), // relativity, concordance, ipro, csv, json
  renditionType: varchar("rendition_type").default("native_pdf").notNull(), // native, pdf, tiff, near_native
  includeNatives: varchar("include_natives").default("true").notNull(),
  includeText: varchar("include_text").default("true").notNull(),
  includeMetadata: varchar("include_metadata").default("true").notNull(),
  metadataFields: jsonb("metadata_fields"), // Array of fields to include
  // Content scope
  documentIds: jsonb("document_ids"), // Array of document IDs to produce
  documentCount: integer("document_count").default(0).notNull(),
  pageCount: integer("page_count").default(0).notNull(),
  // Confidentiality & redaction
  confidentialityStamp: text("confidentiality_stamp"), // "CONFIDENTIAL", "ATTORNEYS' EYES ONLY"
  applyRedactions: varchar("apply_redactions").default("true").notNull(),
  redactionStyle: varchar("redaction_style").default("black_box").notNull(), // black_box, white_box, translucent
  // Production validation
  validationStatus: varchar("validation_status").default("pending").notNull(), // pending, passed, failed
  validationErrors: jsonb("validation_errors"), // Array of {type, document_id, message}
  hashManifest: jsonb("hash_manifest"), // {document_id: {sha256, md5}}
  // Transmission tracking
  transmittedTo: text("transmitted_to"), // Recipient email/organization
  transmittedAt: timestamp("transmitted_at"),
  transmissionMethod: varchar("transmission_method"), // secure_link, sftp, physical_media
  deliveryReceipt: text("delivery_receipt"), // URL or confirmation number
  coverLetterUrl: text("cover_letter_url"),
  productionLogUrl: text("production_log_url"),
  exportPackageUrl: text("export_package_url"), // URL to download package
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Production Records: High-level tracking of productions sent/received
export const productionRecords = pgTable("production_records", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id).notNull(),
  direction: varchar("direction").notNull(), // "outgoing" (our production to them) or "incoming" (their production to us)
  productionDate: timestamp("production_date").notNull(),
  productionNumber: varchar("production_number"), // e.g., "DEF-PROD-001"
  partyName: text("party_name").notNull(), // Name of receiving/producing party
  summary: text("summary").notNull(), // Description of what was produced
  reasonType: varchar("reason_type").notNull(), // "discovery_request", "rule_26", "subpoena", "voluntary", "other"
  reasonDetails: text("reason_details"), // Additional details about the reason (e.g., RFP number)
  documentCount: integer("document_count").default(0).notNull(),
  pageCount: integer("page_count").default(0),
  batesRange: varchar("bates_range"), // e.g., "SENT000001 - SENT000500"
  privilegeLogId: varchar("privilege_log_id").references(() => privilegeLogs.id),
  privilegeLogEntryCount: integer("privilege_log_entry_count").default(0),
  linkedProductionSetId: varchar("linked_production_set_id").references(() => productionSets.id),
  notes: text("notes"),
  attachmentUrl: text("attachment_url"), // URL to production cover letter or manifest
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// eDiscovery: Production Record Files - Documents uploaded for received productions
export const productionRecordFiles = pgTable("production_record_files", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  productionRecordId: varchar("production_record_id").references(() => productionRecords.id, { onDelete: "cascade" }).notNull(),
  fileName: text("file_name").notNull(),
  originalFileName: text("original_file_name").notNull(),
  fileType: varchar("file_type").notNull(), // pdf, pst, jpg, png, etc.
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  storagePath: text("storage_path").notNull(), // object storage path
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

// eDiscovery: Redaction Templates for Pattern-Based Redaction
export const redactionTemplates = pgTable("redaction_templates", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  templateName: text("template_name").notNull(),
  templateType: varchar("template_type").notNull(), // regex, entity, manual
  description: text("description"),
  // Pattern configuration
  regexPattern: text("regex_pattern"), // For regex-based redaction
  entityType: varchar("entity_type"), // ssn, bank_account, credit_card, email, phone, dob, name
  keywords: jsonb("keywords"), // Array of keywords to match
  caseSensitive: varchar("case_sensitive").default("false").notNull(),
  // Redaction styling
  redactionColor: varchar("redaction_color").default("black").notNull(), // black, white, gray
  redactionReason: text("redaction_reason").notNull(), // "Contains SSN", "PII Redaction", etc
  requiresApproval: varchar("requires_approval").default("false").notNull(),
  // Usage tracking
  isActive: varchar("is_active").default("true").notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// eDiscovery: Document Redactions (applied redactions)
export const documentRedactions = pgTable("document_redactions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull(), // References communication.id
  caseId: varchar("case_id").references(() => cases.id),
  redactionType: varchar("redaction_type").notNull(), // text, area, page, metadata
  templateId: varchar("template_id").references(() => redactionTemplates.id),
  // Redaction location
  pageNumber: integer("page_number"),
  coordinates: jsonb("coordinates"), // {x, y, width, height} for area redactions
  textSelection: jsonb("text_selection"), // {start, end, content} for text redactions
  redactedContent: text("redacted_content"), // Original content (encrypted/hashed)
  redactionReason: text("redaction_reason").notNull(),
  // Approval workflow
  status: varchar("status").default("pending").notNull(), // pending, approved, rejected
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  // Tracking
  appliedBy: varchar("applied_by").references(() => users.id).notNull(),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  isAutomatic: varchar("is_automatic").default("false").notNull(), // Auto vs manual redaction
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// eDiscovery: Saved Searches for Reusable Queries
export const savedSearches = pgTable("saved_searches", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id),
  searchName: text("search_name").notNull(),
  description: text("description"),
  searchType: varchar("search_type").default("standard").notNull(), // standard, keyword, dtSearch, conceptual, regex
  // Search configuration
  query: text("query"), // The actual search query string
  conditions: jsonb("conditions").notNull(), // Array of {field, operator, value, logic} objects
  scope: varchar("scope").default("all").notNull(), // all, folder, saved_search
  scopeIds: jsonb("scope_ids"), // Array of folder/search IDs if scope is limited
  includesFamily: varchar("includes_family").default("false").notNull(), // Include email families/attachments
  // Index configuration
  indexType: varchar("index_type").default("keyword").notNull(), // keyword, dtSearch, analytics
  useProximity: varchar("use_proximity").default("false").notNull(),
  useStemming: varchar("use_stemming").default("false").notNull(),
  useFuzziness: varchar("use_fuzziness").default("false").notNull(),
  proximityDistance: integer("proximity_distance").default(10), // Words apart for proximity
  // Results & performance
  resultCount: integer("result_count").default(0).notNull(),
  lastRunAt: timestamp("last_run_at"),
  lastRunDuration: integer("last_run_duration"), // Milliseconds
  requiresManualRerun: varchar("requires_manual_rerun").default("false").notNull(),
  // Access control
  isPublic: varchar("is_public").default("false").notNull(),
  ownerId: varchar("owner_id").references(() => users.id).notNull(),
  sharedWith: jsonb("shared_with"), // Array of user IDs
  // Organization
  folderPath: text("folder_path"), // Folder path for organization
  tags: jsonb("tags"), // Array of tags for categorization
  isActive: varchar("is_active").default("true").notNull(),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// eDiscovery: Persistent Highlight Sets (terms to highlight in viewer)
export const highlightSets = pgTable("highlight_sets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id),
  setName: text("set_name").notNull(),
  description: text("description"),
  // Highlight terms configuration
  terms: jsonb("terms").notNull(), // Array of {term, color, caseSensitive, wholeWord} objects
  termsArray: jsonb("terms_array"), // Flat array of term strings for quick access
  highlightColor: varchar("highlight_color").default("yellow").notNull(), // Default color
  // Scope & application
  applyToAllDocuments: varchar("apply_to_all_documents").default("true").notNull(),
  documentScope: jsonb("document_scope"), // Array of document IDs if not all
  caseScope: jsonb("case_scope"), // Array of case IDs
  // Display options
  showOnlyHighlights: varchar("show_only_highlights").default("false").notNull(),
  groupByTerm: varchar("group_by_term").default("false").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  // Access control
  isPublic: varchar("is_public").default("false").notNull(),
  ownerId: varchar("owner_id").references(() => users.id).notNull(),
  sharedWith: jsonb("shared_with"), // Array of user IDs
  isActive: varchar("is_active").default("true").notNull(),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// eDiscovery: Document Viewing History (track what each reviewer has seen)
export const viewingHistory = pgTable("viewing_history", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull(), // References communication.id
  userId: varchar("user_id").references(() => users.id).notNull(),
  caseId: varchar("case_id").references(() => cases.id),
  batchId: varchar("batch_id").references(() => reviewBatches.id),
  // Viewing details
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
  viewDuration: integer("view_duration"), // Seconds spent viewing
  scrollPercentage: integer("scroll_percentage"), // How much of document was scrolled
  actionsPerformed: jsonb("actions_performed"), // Array of {action, timestamp} (tagged, annotated, etc)
  // Context
  viewSource: varchar("view_source").default("review_queue").notNull(), // review_queue, search, thread, related
  previousDocumentId: varchar("previous_document_id"), // For navigation tracking
  nextDocumentId: varchar("next_document_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== CRISIS RESPONSE MODULE =====

// Expert Retention Tracking (under privilege)
export const experts = pgTable("experts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id).notNull(),
  expertType: expertTypeEnum("expert_type").notNull(),
  firmName: text("firm_name").notNull(),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  // Privilege Protection (Kovel doctrine)
  retainedUnderPrivilege: varchar("retained_under_privilege").default("true").notNull(),
  privilegeBasis: text("privilege_basis").default("Kovel doctrine - retained by counsel to assist in providing legal advice").notNull(),
  engagementLetterUrl: text("engagement_letter_url"),
  engagementDate: timestamp("engagement_date").notNull(),
  // Scope of Work
  scopeOfWork: text("scope_of_work").notNull(),
  deliverables: jsonb("deliverables"), // Array of expected deliverables
  // Budget & Billing
  estimatedFees: integer("estimated_fees"),
  actualFees: integer("actual_fees").default(0).notNull(),
  billingStatus: varchar("billing_status").default("active").notNull(), // active, completed, on_hold
  // Work Product
  reportsSubmitted: jsonb("reports_submitted"), // Array of {title, date, url}
  workProductUrls: jsonb("work_product_urls"), // Array of URLs to work product
  // Status
  status: varchar("status").default("active").notNull(), // active, completed, terminated
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Regulator Communication Log
export const regulatorCommunications = pgTable("regulator_communications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id).notNull(),
  regulatorBody: regulatorBodyEnum("regulator_body").notNull(),
  regulatorName: text("regulator_name"), // Specific agency/office
  // Communication Details
  communicationType: varchar("communication_type").notNull(), // phone, email, meeting, letter, filing
  communicationDate: timestamp("communication_date").notNull(),
  subject: text("subject").notNull(),
  summary: text("summary").notNull(),
  // Participants
  regulatorAttendees: jsonb("regulator_attendees"), // Array of {name, title}
  companyAttendees: jsonb("company_attendees"), // Array of {name, title}
  attorneyAttendees: jsonb("attorney_attendees"), // Array of user IDs
  // Commitments & Follow-ups
  commitmentsMade: jsonb("commitments_made"), // Array of {description, deadline}
  documentsRequested: jsonb("documents_requested"), // Array of requested documents
  documentsProvided: jsonb("documents_provided"), // Array of provided documents
  nextSteps: text("next_steps"),
  followUpRequired: varchar("follow_up_required").default("false").notNull(),
  followUpDeadline: timestamp("follow_up_deadline"),
  // Privilege
  isPrivileged: varchar("is_privileged").default("true").notNull(),
  privilegeAsserted: varchar("privilege_asserted").default("false").notNull(), // Was privilege asserted during communication?
  privilegeLog: text("privilege_log"), // Description of documents withheld on privilege grounds
  // Documentation
  documentUrls: jsonb("document_urls"), // Array of URLs to correspondence/transcripts
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Investigation Deadline Tracker
export const investigationDeadlines = pgTable("investigation_deadlines", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id).notNull(),
  deadlineType: deadlineTypeEnum("deadline_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date").notNull(),
  // Priority & Status
  priority: varchar("priority").default("high").notNull(), // critical, high, medium, low
  status: varchar("status").default("pending").notNull(), // pending, in_progress, completed, overdue
  // Assignment
  assignedTo: varchar("assigned_to").references(() => users.id),
  responsibleParty: text("responsible_party"), // Department or external party
  // Completion
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by").references(() => users.id),
  completionNotes: text("completion_notes"),
  // Extension Tracking
  originalDueDate: timestamp("original_due_date"),
  extensionRequested: varchar("extension_requested").default("false").notNull(),
  extensionGranted: varchar("extension_granted").default("false").notNull(),
  extensionReason: text("extension_reason"),
  // Alerts
  alertDaysBefore: integer("alert_days_before").default(3).notNull(), // Send alert N days before
  alertSent: varchar("alert_sent").default("false").notNull(),
  // Dependencies
  dependsOn: jsonb("depends_on"), // Array of deadline IDs that must complete first
  relatedDocuments: jsonb("related_documents"), // Array of document IDs
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document Preservation Checklist
export const preservationChecklists = pgTable("preservation_checklists", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id).notNull(),
  system: preservationSystemEnum("system").notNull(),
  systemName: text("system_name").notNull(), // Specific system name
  // Preservation Details
  preservationRequired: varchar("preservation_required").default("true").notNull(),
  preservationStatus: varchar("preservation_status").default("pending").notNull(), // pending, in_progress, completed, not_applicable
  preservationDate: timestamp("preservation_date"),
  // Custodians
  affectedCustodians: jsonb("affected_custodians"), // Array of custodian IDs
  custodianCount: integer("custodian_count").default(0).notNull(),
  // IT Implementation
  itContactName: text("it_contact_name"),
  itContactEmail: text("it_contact_email"),
  preservationMethod: text("preservation_method"), // Legal hold, export, freeze, backup
  preservationLocation: text("preservation_location"), // Where data is being preserved
  // Data Volume
  estimatedDataVolume: text("estimated_data_volume"), // "500 GB", "10,000 emails", etc
  actualDataVolume: text("actual_data_volume"),
  // Verification
  verificationRequired: varchar("verification_required").default("true").notNull(),
  verificationCompleted: varchar("verification_completed").default("false").notNull(),
  verifiedBy: varchar("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  verificationNotes: text("verification_notes"),
  // Documentation
  preservationOrder: varchar("preservation_order_url"), // URL to preservation order
  confirmationDocuments: jsonb("confirmation_documents"), // Array of URLs
  notes: text("notes"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Conflict Check System
export const conflictChecks = pgTable("conflict_checks", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id),
  // Matter Details
  matterName: text("matter_name").notNull(),
  potentialClientName: text("potential_client_name").notNull(),
  matterDescription: text("matter_description").notNull(),
  investigationType: text("investigation_type"), // Subpoena, CID, investigation
  // Conflict Screening
  conflictType: conflictTypeEnum("conflict_type"),
  governmentAgency: text("government_agency"),
  adverseParties: jsonb("adverse_parties"), // Array of party names
  relatedParties: jsonb("related_parties"), // Array of related entities
  subjects: jsonb("subjects"), // Array of subjects/targets
  // Conflict Status
  status: varchar("status").default("pending").notNull(), // pending, cleared, conflicts_found, waived
  conflictsIdentified: jsonb("conflicts_identified"), // Array of {type, description, severity}
  conflictSeverity: varchar("conflict_severity"), // critical, high, medium, low
  // Resolution
  waiverRequired: varchar("waiver_required").default("false").notNull(),
  waiverObtained: varchar("waiver_obtained").default("false").notNull(),
  waiverDocuments: jsonb("waiver_documents"), // Array of URLs
  engagementApproved: varchar("engagement_approved").default("false").notNull(),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  declinedReason: text("declined_reason"),
  // Screening Details
  screenedBy: varchar("screened_by").references(() => users.id).notNull(),
  screenedAt: timestamp("screened_at").defaultNow().notNull(),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Legal Hold Notifications (extends custodian legal hold tracking)
export const legalHoldNotifications = pgTable("legal_hold_notifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id).notNull(),
  custodianId: varchar("custodian_id").references(() => custodians.id),
  // Notification Details
  recipientName: text("recipient_name").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  recipientType: varchar("recipient_type").default("custodian").notNull(), // custodian, it_admin, department_head
  notificationType: varchar("notification_type").default("initial").notNull(), // initial, reminder, release, supplemental
  // Sending
  sentAt: timestamp("sent_at"),
  sentBy: varchar("sent_by").references(() => users.id),
  deliveryStatus: varchar("delivery_status").default("pending").notNull(), // pending, sent, delivered, failed, bounced
  // Acknowledgment
  acknowledgmentRequired: varchar("acknowledgment_required").default("true").notNull(),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgmentMethod: varchar("acknowledgment_method"), // click, email_reply, signature
  // Content
  notificationSubject: text("notification_subject").notNull(),
  notificationBody: text("notification_body").notNull(),
  attachments: jsonb("attachments"), // Array of URLs to instructions/guides
  // Preservation Scope
  preservationScope: text("preservation_scope"), // Description of what to preserve
  preservationStartDate: timestamp("preservation_start_date"),
  preservationEndDate: timestamp("preservation_end_date"), // For hold releases
  // Follow-up
  reminderScheduled: varchar("reminder_scheduled").default("false").notNull(),
  reminderSentAt: timestamp("reminder_sent_at"),
  escalationRequired: varchar("escalation_required").default("false").notNull(),
  escalatedAt: timestamp("escalated_at"),
  escalatedTo: varchar("escalated_to").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Reports and Productions: Report Templates for Custom Reports
export const reportTemplates = pgTable("report_templates", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  templateName: text("template_name").notNull(),
  templateType: varchar("template_type").notNull(), // discovery, communication, custom, tag_analysis, privilege_log, custodian_summary
  description: text("description"),
  // Report Configuration
  sections: jsonb("sections").notNull(), // Array of section names to include: ["metadata", "custodians", "communications", "tags", "privilege", etc]
  filters: jsonb("filters"), // {dateRange, custodians, tags, privilegeStatus, etc}
  includeCharts: varchar("include_charts").default("true").notNull(),
  includeTimeline: varchar("include_timeline").default("false").notNull(),
  includeCommunicationGraph: varchar("include_communication_graph").default("false").notNull(),
  // Export Settings
  defaultExportFormat: varchar("default_export_format").default("pdf").notNull(), // pdf, excel, csv, json
  includeConfidentialityStamp: varchar("include_confidentiality_stamp").default("false").notNull(),
  confidentialityLevel: varchar("confidentiality_level"), // confidential, attorneys_eyes_only, public
  // Template Metadata
  isSystemTemplate: varchar("is_system_template").default("false").notNull(), // System vs user-created
  isPublic: varchar("is_public").default("false").notNull(), // Shared with organization
  usageCount: integer("usage_count").default(0).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  // Access Control
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  organizationId: varchar("organization_id"), // For multi-tenant support
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  casesCreated: many(cases, { relationName: "created_by" }),
  casesAssigned: many(cases, { relationName: "assigned_to" }),
  alertsReviewed: many(alerts),
  auditLogs: many(auditLogs),
}));

export const communicationsRelations = relations(communications, ({ many }) => ({
  alerts: many(alerts),
}));

export const alertsRelations = relations(alerts, ({ one, many }) => ({
  communication: one(communications, {
    fields: [alerts.communicationId],
    references: [communications.id],
  }),
  reviewer: one(users, {
    fields: [alerts.reviewedBy],
    references: [users.id],
  }),
  cases: many(cases),
}));

export const casesRelations = relations(cases, ({ one, many }) => ({
  alert: one(alerts, {
    fields: [cases.alertId],
    references: [alerts.id],
  }),
  assignedUser: one(users, {
    fields: [cases.assignedTo],
    references: [users.id],
    relationName: "assigned_to",
  }),
  creator: one(users, {
    fields: [cases.createdBy],
    references: [users.id],
    relationName: "created_by",
  }),
  interviews: many(interviews),
  interviewInvites: many(interviewInvites),
  recordedInterviews: many(recordedInterviews),
}));

export const interviewsRelations = relations(interviews, ({ one, many }) => ({
  case: one(cases, {
    fields: [interviews.caseId],
    references: [cases.id],
  }),
  template: one(interviewTemplates, {
    fields: [interviews.templateId],
    references: [interviewTemplates.id],
  }),
  responses: many(interviewResponses),
}));

export const interviewResponsesRelations = relations(interviewResponses, ({ one }) => ({
  interview: one(interviews, {
    fields: [interviewResponses.interviewId],
    references: [interviews.id],
  }),
}));

export const interviewTemplatesRelations = relations(interviewTemplates, ({ one, many }) => ({
  creator: one(users, {
    fields: [interviewTemplates.createdBy],
    references: [users.id],
  }),
  invites: many(interviewInvites),
}));

export const interviewInvitesRelations = relations(interviewInvites, ({ one, many }) => ({
  case: one(cases, {
    fields: [interviewInvites.caseId],
    references: [cases.id],
  }),
  template: one(interviewTemplates, {
    fields: [interviewInvites.interviewTemplateId],
    references: [interviewTemplates.id],
  }),
  creator: one(users, {
    fields: [interviewInvites.createdBy],
    references: [users.id],
  }),
  recordedInterview: one(recordedInterviews),
}));

export const recordedInterviewsRelations = relations(recordedInterviews, ({ one, many }) => ({
  case: one(cases, {
    fields: [recordedInterviews.caseId],
    references: [cases.id],
  }),
  invite: one(interviewInvites, {
    fields: [recordedInterviews.interviewInviteId],
    references: [interviewInvites.id],
  }),
  notes: many(interviewNotes),
}));

export const interviewNotesRelations = relations(interviewNotes, ({ one }) => ({
  recordedInterview: one(recordedInterviews, {
    fields: [interviewNotes.recordedInterviewId],
    references: [recordedInterviews.id],
  }),
  author: one(users, {
    fields: [interviewNotes.authorUserId],
    references: [users.id],
  }),
}));

export const liveInterviewSessionsRelations = relations(liveInterviewSessions, ({ one, many }) => ({
  interview: one(interviews, {
    fields: [liveInterviewSessions.interviewId],
    references: [interviews.id],
  }),
  case: one(cases, {
    fields: [liveInterviewSessions.caseId],
    references: [cases.id],
  }),
  participants: many(liveInterviewParticipants),
  recordings: many(interviewRecordings),
  transcriptSegments: many(interviewTranscriptSegments),
  questions: many(interviewQuestions),
  analyses: many(interviewAnalyses),
  notes: many(interviewSessionNotes),
  evidenceLinks: many(interviewEvidenceLinks),
}));

export const liveInterviewParticipantsRelations = relations(liveInterviewParticipants, ({ one }) => ({
  session: one(liveInterviewSessions, {
    fields: [liveInterviewParticipants.sessionId],
    references: [liveInterviewSessions.id],
  }),
  user: one(users, {
    fields: [liveInterviewParticipants.userId],
    references: [users.id],
  }),
}));

export const interviewRecordingsRelations = relations(interviewRecordings, ({ one, many }) => ({
  session: one(liveInterviewSessions, {
    fields: [interviewRecordings.sessionId],
    references: [liveInterviewSessions.id],
  }),
  transcriptSegments: many(interviewTranscriptSegments),
}));

export const interviewTranscriptSegmentsRelations = relations(interviewTranscriptSegments, ({ one, many }) => ({
  session: one(liveInterviewSessions, {
    fields: [interviewTranscriptSegments.sessionId],
    references: [liveInterviewSessions.id],
  }),
  recording: one(interviewRecordings, {
    fields: [interviewTranscriptSegments.recordingId],
    references: [interviewRecordings.id],
  }),
  notes: many(interviewSessionNotes),
  evidenceLinks: many(interviewEvidenceLinks),
}));

export const interviewQuestionsRelations = relations(interviewQuestions, ({ one, many }) => ({
  session: one(liveInterviewSessions, {
    fields: [interviewQuestions.sessionId],
    references: [liveInterviewSessions.id],
  }),
  notes: many(interviewSessionNotes),
  evidenceLinks: many(interviewEvidenceLinks),
}));

export const interviewAnalysesRelations = relations(interviewAnalyses, ({ one }) => ({
  session: one(liveInterviewSessions, {
    fields: [interviewAnalyses.sessionId],
    references: [liveInterviewSessions.id],
  }),
}));

export const interviewSessionNotesRelations = relations(interviewSessionNotes, ({ one }) => ({
  session: one(liveInterviewSessions, {
    fields: [interviewSessionNotes.sessionId],
    references: [liveInterviewSessions.id],
  }),
  author: one(users, {
    fields: [interviewSessionNotes.authorId],
    references: [users.id],
  }),
  linkedSegment: one(interviewTranscriptSegments, {
    fields: [interviewSessionNotes.linkedSegmentId],
    references: [interviewTranscriptSegments.id],
  }),
  linkedQuestion: one(interviewQuestions, {
    fields: [interviewSessionNotes.linkedQuestionId],
    references: [interviewQuestions.id],
  }),
}));

export const interviewEvidenceLinksRelations = relations(interviewEvidenceLinks, ({ one }) => ({
  session: one(liveInterviewSessions, {
    fields: [interviewEvidenceLinks.sessionId],
    references: [liveInterviewSessions.id],
  }),
  segment: one(interviewTranscriptSegments, {
    fields: [interviewEvidenceLinks.segmentId],
    references: [interviewTranscriptSegments.id],
  }),
  question: one(interviewQuestions, {
    fields: [interviewEvidenceLinks.questionId],
    references: [interviewQuestions.id],
  }),
  communication: one(communications, {
    fields: [interviewEvidenceLinks.communicationId],
    references: [communications.id],
  }),
  linkedByUser: one(users, {
    fields: [interviewEvidenceLinks.linkedBy],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

export type Communication = typeof communications.$inferSelect;
export const insertCommunicationSchema = createInsertSchema(communications).omit({
  id: true,
  createdAt: true,
  timestamp: true,
}).extend({
  timestamp: z.coerce.date().optional(),
});
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;

export type Alert = typeof alerts.$inferSelect;
export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
});
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type Case = typeof cases.$inferSelect;
export const insertCaseSchema = createInsertSchema(cases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  // Exclude columns that don't exist in the database yet (schema drift)
  riskScore: true,
  riskLevel: true,
  aiAnalysisSummary: true,
});
export type InsertCase = z.infer<typeof insertCaseSchema>;

export const updateCaseSchema = insertCaseSchema.partial().extend({
  // Coerce date strings to Date objects for timestamp fields
  closedAt: z.coerce.date().nullable().optional(),
  archivedAt: z.coerce.date().nullable().optional(),
  attorneyReviewedAt: z.coerce.date().nullable().optional(),
  escalatedAt: z.coerce.date().nullable().optional(),
  privilegeAssertedAt: z.coerce.date().nullable().optional(),
  privilegeReviewedAt: z.coerce.date().nullable().optional(),
});
export type UpdateCase = z.infer<typeof updateCaseSchema>;

export type CaseAIAnalysis = typeof caseAIAnalysis.$inferSelect;
export const insertCaseAIAnalysisSchema = createInsertSchema(caseAIAnalysis).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCaseAIAnalysis = z.infer<typeof insertCaseAIAnalysisSchema>;

export type CaseParty = typeof caseParties.$inferSelect;
export const insertCasePartySchema = createInsertSchema(caseParties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCaseParty = z.infer<typeof insertCasePartySchema>;

export type CaseTimelineEvent = typeof caseTimelineEvents.$inferSelect;
export const insertCaseTimelineEventSchema = createInsertSchema(caseTimelineEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  eventDate: z.coerce.date(),
  participants: z.array(z.string()).optional(),
  entities: z.array(z.string()).optional(),
  lawTags: z.array(z.string()).optional(),
  riskTags: z.array(z.string()).optional(),
  sourceDocumentIds: z.array(z.string()).optional(),
  sourceInterviewIds: z.array(z.string()).optional(),
  sourceAlertIds: z.array(z.string()).optional(),
  riskLevel: z.enum(["critical", "medium", "cleared", "neutral"]).optional(),
  riskReason: z.string().optional(),
});
export type InsertCaseTimelineEvent = z.infer<typeof insertCaseTimelineEventSchema>;

export const updateCaseTimelineEventSchema = insertCaseTimelineEventSchema.omit({
  caseId: true,
  assessmentNumber: true,
  assessor: true,
  createdBy: true,
}).partial();
export type UpdateCaseTimelineEvent = z.infer<typeof updateCaseTimelineEventSchema>;

export type CustomTimelineColumn = typeof customTimelineColumns.$inferSelect;
export const insertCustomTimelineColumnSchema = createInsertSchema(customTimelineColumns).omit({
  id: true,
  createdAt: true,
}).extend({
  selectOptions: z.array(z.string()).optional(),
});
export type InsertCustomTimelineColumn = z.infer<typeof insertCustomTimelineColumnSchema>;

export const updateCustomTimelineColumnSchema = insertCustomTimelineColumnSchema.omit({
  caseId: true,
  assessmentNumber: true,
  assessor: true,
  createdBy: true,
}).partial();
export type UpdateCustomTimelineColumn = z.infer<typeof updateCustomTimelineColumnSchema>;

export type CustomTimelineColumnValue = typeof customTimelineColumnValues.$inferSelect;
export const insertCustomTimelineColumnValueSchema = createInsertSchema(customTimelineColumnValues).omit({
  id: true,
  updatedAt: true,
});
export type InsertCustomTimelineColumnValue = z.infer<typeof insertCustomTimelineColumnValueSchema>;

export type CaseTask = typeof caseTasks.$inferSelect;
export const insertCaseTaskSchema = createInsertSchema(caseTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dueDate: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
});
export type InsertCaseTask = z.infer<typeof insertCaseTaskSchema>;

export type CaseAssignment = typeof caseAssignments.$inferSelect;
export const insertCaseAssignmentSchema = createInsertSchema(caseAssignments).omit({
  id: true,
  createdAt: true,
  assignedAt: true,
});
export type InsertCaseAssignment = z.infer<typeof insertCaseAssignmentSchema>;

export type IngestionJob = typeof ingestionJobs.$inferSelect;
export const insertIngestionJobSchema = createInsertSchema(ingestionJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIngestionJob = z.infer<typeof insertIngestionJobSchema>;

export type IngestionFile = typeof ingestionFiles.$inferSelect;
export const insertIngestionFileSchema = createInsertSchema(ingestionFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIngestionFile = z.infer<typeof insertIngestionFileSchema>;

export type Tag = typeof tags.$inferSelect;
export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTag = z.infer<typeof insertTagSchema>;

export type BulkAction = typeof bulkActions.$inferSelect;
export const insertBulkActionSchema = createInsertSchema(bulkActions).omit({
  id: true,
  createdAt: true,
});
export type InsertBulkAction = z.infer<typeof insertBulkActionSchema>;

export type DocumentTag = typeof documentTags.$inferSelect;
export const insertDocumentTagSchema = createInsertSchema(documentTags).omit({
  id: true,
  taggedAt: true,
});
export type InsertDocumentTag = z.infer<typeof insertDocumentTagSchema>;

export type TextSelectionTag = typeof textSelectionTags.$inferSelect;
export const insertTextSelectionTagSchema = createInsertSchema(textSelectionTags).omit({
  id: true,
  createdAt: true,
});
export type InsertTextSelectionTag = z.infer<typeof insertTextSelectionTagSchema>;

export type Regulation = typeof regulations.$inferSelect;
export const insertRegulationSchema = createInsertSchema(regulations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRegulation = z.infer<typeof insertRegulationSchema>;

export type Interview = typeof interviews.$inferSelect;
export const insertInterviewSchema = createInsertSchema(interviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scheduledFor: z.coerce.date(),
  privilegeAssertedAt: z.coerce.date().optional(),
  upjohnWarningTimestamp: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
});
export type InsertInterview = z.infer<typeof insertInterviewSchema>;

export type InterviewResponse = typeof interviewResponses.$inferSelect;
export const insertInterviewResponseSchema = createInsertSchema(interviewResponses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  recordedAt: z.coerce.date().optional(),
});
export type InsertInterviewResponse = z.infer<typeof insertInterviewResponseSchema>;

export type InterviewTemplate = typeof interviewTemplates.$inferSelect;
export const insertInterviewTemplateSchema = createInsertSchema(interviewTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInterviewTemplate = z.infer<typeof insertInterviewTemplateSchema>;
export const updateInterviewTemplateSchema = insertInterviewTemplateSchema.partial().omit({
  assessmentNumber: true,
  assessor: true,
  createdBy: true,
});
export type UpdateInterviewTemplate = z.infer<typeof updateInterviewTemplateSchema>;

export type InterviewInvite = typeof interviewInvites.$inferSelect;
export const insertInterviewInviteSchema = createInsertSchema(interviewInvites).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uniqueToken: true,
  sentAt: true,
  openedAt: true,
}).extend({
  expiresAt: z.coerce.date().optional(),
});
export type InsertInterviewInvite = z.infer<typeof insertInterviewInviteSchema>;
export const updateInterviewInviteSchema = z.object({
  status: z.enum(["draft", "sent", "opened", "in_progress", "completed", "expired", "cancelled"]).optional(),
  sentAt: z.coerce.date().optional(),
  openedAt: z.coerce.date().optional(),
  pendingUploadPath: z.string().nullable().optional(),
});
export type UpdateInterviewInvite = z.infer<typeof updateInterviewInviteSchema>;

export type RecordedInterview = typeof recordedInterviews.$inferSelect;
export const insertRecordedInterviewSchema = createInsertSchema(recordedInterviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
});
export type InsertRecordedInterview = z.infer<typeof insertRecordedInterviewSchema>;
export const updateRecordedInterviewSchema = z.object({
  videoUrl: z.string().optional(),
  audioUrl: z.string().optional(),
  transcriptText: z.string().optional(),
  transcriptSegments: z.any().optional(),
  aiSummaryText: z.string().optional(),
  issuesTags: z.any().optional(),
  behavioralSignals: z.any().optional(),
  timelineEvents: z.any().optional(),
  evidenceSuggestions: z.any().optional(),
  completedAt: z.coerce.date().optional(),
});
export type UpdateRecordedInterview = z.infer<typeof updateRecordedInterviewSchema>;

export type InterviewNote = typeof interviewNotes.$inferSelect;
export const insertInterviewNoteSchema = createInsertSchema(interviewNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInterviewNote = z.infer<typeof insertInterviewNoteSchema>;
export const updateInterviewNoteSchema = z.object({
  noteText: z.string().optional(),
  tags: z.any().optional(),
  transcriptSegmentRef: z.string().optional(),
});
export type UpdateInterviewNote = z.infer<typeof updateInterviewNoteSchema>;

export type LiveInterviewSession = typeof liveInterviewSessions.$inferSelect;
export const insertLiveInterviewSessionSchema = createInsertSchema(liveInterviewSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scheduledStartTime: z.coerce.date(),
  actualStartTime: z.coerce.date().optional(),
  actualEndTime: z.coerce.date().optional(),
  upjohnWarningGivenAt: z.coerce.date().optional(),
  consentCapturedAt: z.coerce.date().optional(),
});
export type InsertLiveInterviewSession = z.infer<typeof insertLiveInterviewSessionSchema>;
export const updateLiveInterviewSessionSchema = z.object({
  status: z.enum(["scheduled", "lobby", "in_progress", "paused", "completed", "cancelled"]).optional(),
  actualStartTime: z.coerce.date().optional(),
  actualEndTime: z.coerce.date().optional(),
  duration: z.number().optional(),
  upjohnWarningGivenAt: z.coerce.date().optional(),
  consentCapturedAt: z.coerce.date().optional(),
  signalingServerUrl: z.string().optional(),
  iceServers: z.any().optional(),
  metadata: z.any().optional(),
});
export type UpdateLiveInterviewSession = z.infer<typeof updateLiveInterviewSessionSchema>;

export type LiveInterviewParticipant = typeof liveInterviewParticipants.$inferSelect;
export const insertLiveInterviewParticipantSchema = createInsertSchema(liveInterviewParticipants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  joinedAt: z.coerce.date().optional(),
  leftAt: z.coerce.date().optional(),
  consentTimestamp: z.coerce.date().optional(),
});
export type InsertLiveInterviewParticipant = z.infer<typeof insertLiveInterviewParticipantSchema>;

export type InterviewRecording = typeof interviewRecordings.$inferSelect;
export const insertInterviewRecordingSchema = createInsertSchema(interviewRecordings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  expiresAt: z.coerce.date().optional(),
});
export type InsertInterviewRecording = z.infer<typeof insertInterviewRecordingSchema>;
export const updateInterviewRecordingSchema = z.object({
  videoUrl: z.string().optional(),
  audioUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  duration: z.number().optional(),
  fileSize: z.number().optional(),
  format: z.string().optional(),
  resolution: z.string().optional(),
  status: z.string().optional(),
});
export type UpdateInterviewRecording = z.infer<typeof updateInterviewRecordingSchema>;

export type InterviewTranscriptSegment = typeof interviewTranscriptSegments.$inferSelect;
export const insertInterviewTranscriptSegmentSchema = createInsertSchema(interviewTranscriptSegments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInterviewTranscriptSegment = z.infer<typeof insertInterviewTranscriptSegmentSchema>;
export const updateInterviewTranscriptSegmentSchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
  stressScore: z.number().optional(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
  keywords: z.any().optional(),
  entities: z.any().optional(),
  flags: z.any().optional(),
  contradictionRefs: z.any().optional(),
  isHighlighted: z.string().optional(),
  highlightColor: z.string().optional(),
});
export type UpdateInterviewTranscriptSegment = z.infer<typeof updateInterviewTranscriptSegmentSchema>;

export type InterviewQuestion = typeof interviewQuestions.$inferSelect;
export const insertInterviewQuestionSchema = createInsertSchema(interviewQuestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  askedAt: z.coerce.date().optional(),
  answeredAt: z.coerce.date().optional(),
});
export type InsertInterviewQuestion = z.infer<typeof insertInterviewQuestionSchema>;
export const updateInterviewQuestionSchema = z.object({
  askedAt: z.coerce.date().optional(),
  answeredAt: z.coerce.date().optional(),
  responseSegmentIds: z.any().optional(),
  scoreLabel: z.string().optional(),
  credibilityScore: z.number().optional(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
  aiAnalysis: z.any().optional(),
  followUpQuestionIds: z.any().optional(),
  evidenceLinks: z.any().optional(),
});
export type UpdateInterviewQuestion = z.infer<typeof updateInterviewQuestionSchema>;

export type InterviewAnalysis = typeof interviewAnalyses.$inferSelect;
export const insertInterviewAnalysisSchema = createInsertSchema(interviewAnalyses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
});
export type InsertInterviewAnalysis = z.infer<typeof insertInterviewAnalysisSchema>;
export const updateInterviewAnalysisSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  overallScore: z.number().optional(),
  credibilityScore: z.number().optional(),
  complianceRiskScore: z.number().optional(),
  documentConflictIndex: z.number().optional(),
  stressIndex: z.number().optional(),
  evasionProbability: z.number().optional(),
  summaryInsights: z.any().optional(),
  keyAdmissions: z.any().optional(),
  keyDenials: z.any().optional(),
  riskFactors: z.any().optional(),
  timelineHighlights: z.any().optional(),
  policyReferences: z.any().optional(),
  contradictions: z.any().optional(),
  followUpRecommendations: z.any().optional(),
  questionScores: z.any().optional(),
  behavioralSignals: z.any().optional(),
  rawAiResponse: z.any().optional(),
  modelUsed: z.string().optional(),
  tokensUsed: z.number().optional(),
  error: z.string().optional(),
});
export type UpdateInterviewAnalysis = z.infer<typeof updateInterviewAnalysisSchema>;

export type InterviewSessionNote = typeof interviewSessionNotes.$inferSelect;
export const insertInterviewSessionNoteSchema = createInsertSchema(interviewSessionNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInterviewSessionNote = z.infer<typeof insertInterviewSessionNoteSchema>;
export const updateInterviewSessionNoteSchema = z.object({
  noteText: z.string().optional(),
  isPrivileged: z.string().optional(),
  privilegeType: z.enum(["none", "attorney_client_privileged", "work_product", "both"]).optional(),
  tags: z.any().optional(),
  timestamp: z.number().optional(),
});
export type UpdateInterviewSessionNote = z.infer<typeof updateInterviewSessionNoteSchema>;

export type InterviewEvidenceLink = typeof interviewEvidenceLinks.$inferSelect;
export const insertInterviewEvidenceLinkSchema = createInsertSchema(interviewEvidenceLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInterviewEvidenceLink = z.infer<typeof insertInterviewEvidenceLinkSchema>;

// Video Meeting Types
export type VideoMeeting = typeof videoMeetings.$inferSelect;
export const insertVideoMeetingSchema = createInsertSchema(videoMeetings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scheduledStartTime: z.coerce.date().optional(),
  scheduledEndTime: z.coerce.date().optional(),
  actualStartTime: z.coerce.date().optional(),
  actualEndTime: z.coerce.date().optional(),
});
export type InsertVideoMeeting = z.infer<typeof insertVideoMeetingSchema>;
export const updateVideoMeetingSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
  scheduledStartTime: z.coerce.date().optional(),
  scheduledEndTime: z.coerce.date().optional(),
  actualStartTime: z.coerce.date().optional(),
  actualEndTime: z.coerce.date().optional(),
  duration: z.number().optional(),
  waitingRoomEnabled: z.string().optional(),
  recordingEnabled: z.string().optional(),
  transcriptionEnabled: z.string().optional(),
  screenSharingAllowed: z.string().optional(),
  chatEnabled: z.string().optional(),
  metadata: z.any().optional(),
});
export type UpdateVideoMeeting = z.infer<typeof updateVideoMeetingSchema>;

export type VideoMeetingParticipant = typeof videoMeetingParticipants.$inferSelect;
export const insertVideoMeetingParticipantSchema = createInsertSchema(videoMeetingParticipants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  joinedAt: z.coerce.date().optional(),
  leftAt: z.coerce.date().optional(),
  consentTimestamp: z.coerce.date().optional(),
});
export type InsertVideoMeetingParticipant = z.infer<typeof insertVideoMeetingParticipantSchema>;

export type VideoMeetingRecording = typeof videoMeetingRecordings.$inferSelect;
export const insertVideoMeetingRecordingSchema = createInsertSchema(videoMeetingRecordings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional(),
});
export type InsertVideoMeetingRecording = z.infer<typeof insertVideoMeetingRecordingSchema>;
export const updateVideoMeetingRecordingSchema = z.object({
  videoUrl: z.string().optional(),
  audioUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  duration: z.number().optional(),
  fileSize: z.number().optional(),
  format: z.string().optional(),
  resolution: z.string().optional(),
  status: z.string().optional(),
  endedAt: z.coerce.date().optional(),
});
export type UpdateVideoMeetingRecording = z.infer<typeof updateVideoMeetingRecordingSchema>;

// Video Meeting Chat Message Types
export type VideoMeetingChatMessage = typeof videoMeetingChatMessages.$inferSelect;
export const insertVideoMeetingChatMessageSchema = createInsertSchema(videoMeetingChatMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertVideoMeetingChatMessage = z.infer<typeof insertVideoMeetingChatMessageSchema>;

// Meeting Invitation Types
export type MeetingInvitation = typeof meetingInvitations.$inferSelect;
export const insertMeetingInvitationSchema = createInsertSchema(meetingInvitations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  emailSentAt: z.coerce.date().optional(),
  respondedAt: z.coerce.date().optional(),
  tokenExpiresAt: z.coerce.date().optional(),
});
export type InsertMeetingInvitation = z.infer<typeof insertMeetingInvitationSchema>;
export const updateMeetingInvitationSchema = z.object({
  status: z.enum(["pending", "sent", "accepted", "declined"]).optional(),
  emailSentAt: z.coerce.date().optional(),
  respondedAt: z.coerce.date().optional(),
  responseNote: z.string().optional(),
});
export type UpdateMeetingInvitation = z.infer<typeof updateMeetingInvitationSchema>;

// Update VideoMeetingParticipant schema to include waiting room fields
export const updateVideoMeetingParticipantSchema = z.object({
  participantStatus: z.enum(["invited", "waiting", "admitted", "declined", "left"]).optional(),
  joinedAt: z.coerce.date().optional(),
  leftAt: z.coerce.date().optional(),
  admittedAt: z.coerce.date().optional(),
  admittedBy: z.string().optional(),
  consentGiven: z.string().optional(),
  consentTimestamp: z.coerce.date().optional(),
});
export type UpdateVideoMeetingParticipant = z.infer<typeof updateVideoMeetingParticipantSchema>;

// Meeting Transcription Types
export type MeetingTranscription = typeof meetingTranscriptions.$inferSelect;
export const insertMeetingTranscriptionSchema = createInsertSchema(meetingTranscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  processingStartedAt: z.coerce.date().optional(),
  processingCompletedAt: z.coerce.date().optional(),
});
export type InsertMeetingTranscription = z.infer<typeof insertMeetingTranscriptionSchema>;
export const updateMeetingTranscriptionSchema = z.object({
  transcriptionText: z.string().optional(),
  segments: z.any().optional(),
  language: z.string().optional(),
  confidence: z.number().optional(),
  wordCount: z.number().optional(),
  duration: z.number().optional(),
  status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
  processingStartedAt: z.coerce.date().optional(),
  processingCompletedAt: z.coerce.date().optional(),
  errorMessage: z.string().optional(),
  source: z.string().optional(),
  metadata: z.any().optional(),
});
export type UpdateMeetingTranscription = z.infer<typeof updateMeetingTranscriptionSchema>;

// Meeting Summary Types
export type MeetingSummary = typeof meetingSummaries.$inferSelect;
export const insertMeetingSummarySchema = createInsertSchema(meetingSummaries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  processingStartedAt: z.coerce.date().optional(),
  processingCompletedAt: z.coerce.date().optional(),
});
export type InsertMeetingSummary = z.infer<typeof insertMeetingSummarySchema>;
export const updateMeetingSummarySchema = z.object({
  summaryType: z.enum(["brief", "comprehensive", "action_items", "key_decisions"]).optional(),
  summaryText: z.string().optional(),
  keyPoints: z.any().optional(),
  actionItems: z.any().optional(),
  decisions: z.any().optional(),
  participants: z.any().optional(),
  topics: z.any().optional(),
  sentiment: z.enum(["positive", "neutral", "negative", "mixed"]).optional(),
  status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
  aiModel: z.string().optional(),
  processingStartedAt: z.coerce.date().optional(),
  processingCompletedAt: z.coerce.date().optional(),
  errorMessage: z.string().optional(),
  metadata: z.any().optional(),
});
export type UpdateMeetingSummary = z.infer<typeof updateMeetingSummarySchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type ConnectorConfiguration = typeof connectorConfigurations.$inferSelect;
export const insertConnectorConfigurationSchema = createInsertSchema(connectorConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertConnectorConfiguration = z.infer<typeof insertConnectorConfigurationSchema>;

export type LegalHold = typeof legalHolds.$inferSelect;
export const insertLegalHoldSchema = createInsertSchema(legalHolds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  activatedAt: true,
});
export type InsertLegalHold = z.infer<typeof insertLegalHoldSchema>;

export type DetectionRule = typeof detectionRules.$inferSelect;
export const insertDetectionRuleSchema = createInsertSchema(detectionRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDetectionRule = z.infer<typeof insertDetectionRuleSchema>;

export type RemediationPlan = typeof remediationPlans.$inferSelect;
export const insertRemediationPlanSchema = createInsertSchema(remediationPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRemediationPlan = z.infer<typeof insertRemediationPlanSchema>;

export type RegulatoryStrategy = typeof regulatoryStrategies.$inferSelect;
export const insertRegulatoryStrategySchema = createInsertSchema(regulatoryStrategies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRegulatoryStrategy = z.infer<typeof insertRegulatoryStrategySchema>;

export type DisclosurePlaybook = typeof disclosurePlaybooks.$inferSelect;
export const insertDisclosurePlaybookSchema = createInsertSchema(disclosurePlaybooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDisclosurePlaybook = z.infer<typeof insertDisclosurePlaybookSchema>;

export type BoardReport = typeof boardReports.$inferSelect;
export const insertBoardReportSchema = createInsertSchema(boardReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBoardReport = z.infer<typeof insertBoardReportSchema>;

export type PrivilegeLog = typeof privilegeLogs.$inferSelect;
export const insertPrivilegeLogSchema = createInsertSchema(privilegeLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  assertedAt: true,
});
export type InsertPrivilegeLog = z.infer<typeof insertPrivilegeLogSchema>;

export type DocumentSet = typeof documentSets.$inferSelect;
export const insertDocumentSetSchema = createInsertSchema(documentSets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  documentCount: true,
});
export type InsertDocumentSet = z.infer<typeof insertDocumentSetSchema>;

export type DocumentSetMember = typeof documentSetMembers.$inferSelect;
export const insertDocumentSetMemberSchema = createInsertSchema(documentSetMembers).omit({
  id: true,
  addedAt: true,
});
export type InsertDocumentSetMember = z.infer<typeof insertDocumentSetMemberSchema>;

export type DocumentForward = typeof documentForwards.$inferSelect;
export const insertDocumentForwardSchema = createInsertSchema(documentForwards).omit({
  id: true,
  forwardedAt: true,
});
export type InsertDocumentForward = z.infer<typeof insertDocumentForwardSchema>;

export type SectorRulePack = typeof sectorRulePacks.$inferSelect;
export const insertSectorRulePackSchema = createInsertSchema(sectorRulePacks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSectorRulePack = z.infer<typeof insertSectorRulePackSchema>;

export type DsarRequest = typeof dsarRequests.$inferSelect;
export const insertDsarRequestSchema = createInsertSchema(dsarRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDsarRequest = z.infer<typeof insertDsarRequestSchema>;

export type TrainingCourse = typeof trainingCourses.$inferSelect;
export const insertTrainingCourseSchema = createInsertSchema(trainingCourses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTrainingCourse = z.infer<typeof insertTrainingCourseSchema>;

export type TrainingEnrollment = typeof trainingEnrollments.$inferSelect;
export const insertTrainingEnrollmentSchema = createInsertSchema(trainingEnrollments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  enrolledAt: true,
});
export type InsertTrainingEnrollment = z.infer<typeof insertTrainingEnrollmentSchema>;

export type Policy = typeof policies.$inferSelect;
export const insertPolicySchema = createInsertSchema(policies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPolicy = z.infer<typeof insertPolicySchema>;

export type PolicyAttestation = typeof policyAttestations.$inferSelect;
export const insertPolicyAttestationSchema = createInsertSchema(policyAttestations).omit({
  id: true,
  createdAt: true,
  attestedAt: true,
});
export type InsertPolicyAttestation = z.infer<typeof insertPolicyAttestationSchema>;

export type TrainingAssignment = typeof trainingAssignments.$inferSelect;
export const insertTrainingAssignmentSchema = createInsertSchema(trainingAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  assignedAt: true,
});
export type InsertTrainingAssignment = z.infer<typeof insertTrainingAssignmentSchema>;

export type Certification = typeof certifications.$inferSelect;
export const insertCertificationSchema = createInsertSchema(certifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCertification = z.infer<typeof insertCertificationSchema>;

// Note: ReporterIdentity types disabled - table not in use
// export type ReporterIdentity = typeof reporterIdentities.$inferSelect;
// export const insertReporterIdentitySchema = createInsertSchema(reporterIdentities).omit({...});
// export type InsertReporterIdentity = z.infer<typeof insertReporterIdentitySchema>;

export type HotlineReport = typeof hotlineReports.$inferSelect;
export const insertHotlineReportSchema = createInsertSchema(hotlineReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  intakeDate: true,
});
export type InsertHotlineReport = z.infer<typeof insertHotlineReportSchema>;

export type HotlineReportNote = typeof hotlineReportNotes.$inferSelect;
export const insertHotlineReportNoteSchema = createInsertSchema(hotlineReportNotes).omit({
  id: true,
  createdAt: true,
});
export type InsertHotlineReportNote = z.infer<typeof insertHotlineReportNoteSchema>;

export type WhistleblowerProtection = typeof whistleblowerProtections.$inferSelect;
export const insertWhistleblowerProtectionSchema = createInsertSchema(whistleblowerProtections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  protectionStartDate: true,
});
export type InsertWhistleblowerProtection = z.infer<typeof insertWhistleblowerProtectionSchema>;

export type RetaliationAlert = typeof retaliationAlerts.$inferSelect;
export const insertRetaliationAlertSchema = createInsertSchema(retaliationAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRetaliationAlert = z.infer<typeof insertRetaliationAlertSchema>;

export type WhistleblowingJurisdiction = typeof whistleblowingJurisdictions.$inferSelect;
export const insertWhistleblowingJurisdictionSchema = createInsertSchema(whistleblowingJurisdictions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUpdated: true,
});
export type InsertWhistleblowingJurisdiction = z.infer<typeof insertWhistleblowingJurisdictionSchema>;

export type RegulatoryChange = typeof regulatoryChanges.$inferSelect;
export const insertRegulatoryChangeSchema = createInsertSchema(regulatoryChanges).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRegulatoryChange = z.infer<typeof insertRegulatoryChangeSchema>;

export type Custodian = typeof custodians.$inferSelect;
export const insertCustodianSchema = createInsertSchema(custodians).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCustodian = z.infer<typeof insertCustodianSchema>;

export type DocumentFamily = typeof documentFamilies.$inferSelect;
export const insertDocumentFamilySchema = createInsertSchema(documentFamilies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDocumentFamily = z.infer<typeof insertDocumentFamilySchema>;

export type ReviewBatch = typeof reviewBatches.$inferSelect;
export const insertReviewBatchSchema = createInsertSchema(reviewBatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReviewBatch = z.infer<typeof insertReviewBatchSchema>;

export type ReviewerAssignment = typeof reviewerAssignments.$inferSelect;
export const insertReviewerAssignmentSchema = createInsertSchema(reviewerAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  assignedAt: true,
});
export type InsertReviewerAssignment = z.infer<typeof insertReviewerAssignmentSchema>;

export type CodingForm = typeof codingForms.$inferSelect;
export const insertCodingFormSchema = createInsertSchema(codingForms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCodingForm = z.infer<typeof insertCodingFormSchema>;

export type DocumentCoding = typeof documentCodings.$inferSelect;
export const insertDocumentCodingSchema = createInsertSchema(documentCodings).omit({
  id: true,
  reviewerId: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
});
export type InsertDocumentCoding = z.infer<typeof insertDocumentCodingSchema>;

export type AnnotationMention = typeof annotationMentions.$inferSelect;
export const insertAnnotationMentionSchema = createInsertSchema(annotationMentions).omit({
  id: true,
  createdAt: true,
});
export type InsertAnnotationMention = z.infer<typeof insertAnnotationMentionSchema>;

export type Notification = typeof notifications.$inferSelect;
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type ProductionSet = typeof productionSets.$inferSelect;
export const insertProductionSetSchema = createInsertSchema(productionSets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProductionSet = z.infer<typeof insertProductionSetSchema>;

export type ProductionRecord = typeof productionRecords.$inferSelect;
export const insertProductionRecordSchema = createInsertSchema(productionRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProductionRecord = z.infer<typeof insertProductionRecordSchema>;

export type ProductionRecordFile = typeof productionRecordFiles.$inferSelect;
export const insertProductionRecordFileSchema = createInsertSchema(productionRecordFiles).omit({
  id: true,
  uploadedAt: true,
});
export type InsertProductionRecordFile = z.infer<typeof insertProductionRecordFileSchema>;

export type RedactionTemplate = typeof redactionTemplates.$inferSelect;
export const insertRedactionTemplateSchema = createInsertSchema(redactionTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRedactionTemplate = z.infer<typeof insertRedactionTemplateSchema>;

export type DocumentRedaction = typeof documentRedactions.$inferSelect;
export const insertDocumentRedactionSchema = createInsertSchema(documentRedactions).omit({
  id: true,
  createdAt: true,
  appliedAt: true,
});
export type InsertDocumentRedaction = z.infer<typeof insertDocumentRedactionSchema>;

export type SavedSearch = typeof savedSearches.$inferSelect;
export const insertSavedSearchSchema = createInsertSchema(savedSearches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSavedSearch = z.infer<typeof insertSavedSearchSchema>;

export type HighlightSet = typeof highlightSets.$inferSelect;
export const insertHighlightSetSchema = createInsertSchema(highlightSets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertHighlightSet = z.infer<typeof insertHighlightSetSchema>;

export type ViewingHistory = typeof viewingHistory.$inferSelect;
export const insertViewingHistorySchema = createInsertSchema(viewingHistory).omit({
  id: true,
  createdAt: true,
  viewedAt: true,
});
export type InsertViewingHistory = z.infer<typeof insertViewingHistorySchema>;

// GRC (Governance, Risk & Compliance) Enums
export const riskLikelihoodEnum = pgEnum("risk_likelihood", [
  "rare",
  "unlikely",
  "possible",
  "likely",
  "almost_certain",
]);

export const riskImpactEnum = pgEnum("risk_impact", [
  "insignificant",
  "minor",
  "moderate",
  "major",
  "catastrophic",
]);

export const riskStatusEnum = pgEnum("risk_status", [
  "identified",
  "assessed",
  "mitigating",
  "mitigated",
  "accepted",
  "transferred",
  "closed",
]);

export const riskCategoryEnum = pgEnum("risk_category", [
  "operational",
  "financial",
  "compliance",
  "strategic",
  "reputational",
  "cybersecurity",
  "third_party",
  "legal",
]);

export const controlTypeEnum = pgEnum("control_type", [
  "preventive",
  "detective",
  "corrective",
  "directive",
]);

export const controlCategoryEnum = pgEnum("control_category", [
  "technical",
  "administrative",
  "physical",
  "managerial",
]);

export const controlEffectivenessEnum = pgEnum("control_effectiveness", [
  "not_tested",
  "ineffective",
  "partially_effective",
  "largely_effective",
  "fully_effective",
]);

export const controlTestStatusEnum = pgEnum("control_test_status", [
  "not_tested",
  "scheduled",
  "in_progress",
  "passed",
  "failed",
  "requires_remediation",
]);

export const incidentStatusEnum = pgEnum("incident_status", [
  "reported",
  "acknowledged",
  "investigating",
  "contained",
  "resolved",
  "closed",
]);

export const incidentSeverityEnum = pgEnum("incident_severity", [
  "critical",
  "high",
  "medium",
  "low",
]);

export const incidentTypeEnum = pgEnum("incident_type", [
  "security_breach",
  "data_breach",
  "compliance_violation",
  "operational_failure",
  "fraud",
  "policy_violation",
  "system_outage",
  "third_party_failure",
  "regulatory_violation",
  "other",
]);

// GRC Risks Table
export const grcRisks = pgTable("grc_risks", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  riskTitle: text("risk_title").notNull(),
  riskDescription: text("risk_description").notNull(),
  category: riskCategoryEnum("category").notNull(),
  likelihood: riskLikelihoodEnum("likelihood").notNull(),
  impact: riskImpactEnum("impact").notNull(),
  inherentRiskScore: integer("inherent_risk_score").notNull(), // Calculated: likelihood x impact
  residualRiskScore: integer("residual_risk_score"), // After controls applied
  riskOwner: varchar("risk_owner").notNull(), // User ID
  status: riskStatusEnum("status").notNull().default("identified"),
  mitigationStrategy: text("mitigation_strategy"),
  riskAppetite: text("risk_appetite"), // Organization's tolerance for this risk
  riskTolerance: text("risk_tolerance"), // Maximum acceptable deviation
  identifiedDate: timestamp("identified_date").notNull(),
  lastReviewDate: timestamp("last_review_date"),
  nextReviewDate: timestamp("next_review_date"),
  // Relationships tracked in JSONB
  relatedPolicyIds: jsonb("related_policy_ids"), // Array of policy IDs
  relatedControlIds: jsonb("related_control_ids"), // Array of control IDs
  relatedIncidentIds: jsonb("related_incident_ids"), // Array of incident IDs
  relatedRegulatoryIds: jsonb("related_regulatory_ids"), // Array of regulation IDs
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// GRC Controls Table
export const grcControls = pgTable("grc_controls", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  controlId: varchar("control_id").notNull().unique(), // e.g., "AC-001", "IT-SEC-042"
  controlTitle: text("control_title").notNull(),
  controlDescription: text("control_description").notNull(),
  controlType: controlTypeEnum("control_type").notNull(),
  controlCategory: controlCategoryEnum("control_category").notNull(),
  controlOwner: varchar("control_owner").notNull(), // User ID
  effectiveness: controlEffectivenessEnum("effectiveness").notNull().default("not_tested"),
  testingFrequency: varchar("testing_frequency"), // e.g., "quarterly", "annually", "monthly"
  lastTestDate: timestamp("last_test_date"),
  nextTestDate: timestamp("next_test_date"),
  testStatus: controlTestStatusEnum("test_status").notNull().default("not_tested"),
  testEvidence: text("test_evidence"), // Description or link to test documentation
  implementationStatus: varchar("implementation_status").notNull().default("planned"), // planned, implemented, operational
  automationLevel: varchar("automation_level"), // manual, semi_automated, fully_automated
  // Relationships
  relatedRiskIds: jsonb("related_risk_ids"), // Array of risk IDs this control mitigates
  relatedPolicyIds: jsonb("related_policy_ids"), // Array of policy IDs
  relatedIncidentIds: jsonb("related_incident_ids"), // Array of incident IDs
  relatedRegulatoryIds: jsonb("related_regulatory_ids"), // Array of regulation IDs
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// GRC Incidents Table
export const grcIncidents = pgTable("grc_incidents", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  incidentNumber: varchar("incident_number").notNull().unique(), // e.g., "INC-2025-001"
  incidentTitle: text("incident_title").notNull(),
  incidentDescription: text("incident_description").notNull(),
  incidentType: incidentTypeEnum("incident_type").notNull(),
  severity: incidentSeverityEnum("severity").notNull(),
  status: incidentStatusEnum("status").notNull().default("reported"),
  reportedBy: varchar("reported_by").notNull(), // User ID
  reportedDate: timestamp("reported_date").notNull().defaultNow(),
  acknowledgedDate: timestamp("acknowledged_date"),
  containedDate: timestamp("contained_date"),
  resolvedDate: timestamp("resolved_date"),
  closedDate: timestamp("closed_date"),
  incidentOwner: varchar("incident_owner"), // User ID assigned to investigate
  rootCause: text("root_cause"),
  correctiveActions: text("corrective_actions"),
  preventiveActions: text("preventive_actions"),
  lessonsLearned: text("lessons_learned"),
  financialImpact: integer("financial_impact"), // In dollars
  affectedSystems: jsonb("affected_systems"), // Array of system names
  affectedDataTypes: jsonb("affected_data_types"), // Array of data types (PII, PHI, etc.)
  notificationRequired: varchar("notification_required").default("no"), // yes/no
  notificationsSent: jsonb("notifications_sent"), // Array of {recipient, date, method}
  // Relationships
  relatedRiskIds: jsonb("related_risk_ids"), // Risks that materialized
  relatedControlIds: jsonb("related_control_ids"), // Controls that failed or need updating
  relatedPolicyIds: jsonb("related_policy_ids"), // Policies violated
  relatedCaseIds: jsonb("related_case_ids"), // Compliance cases
  relatedRegulatoryIds: jsonb("related_regulatory_ids"), // Regulatory violations
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Export types and schemas for GRC
export type GrcRisk = typeof grcRisks.$inferSelect;
export const insertGrcRiskSchema = createInsertSchema(grcRisks, {
  identifiedDate: z.coerce.date(),
  lastReviewDate: z.coerce.date().optional(),
  nextReviewDate: z.coerce.date().optional(),
}).omit({
  id: true,
  assessmentNumber: true,
  assessor: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGrcRisk = z.infer<typeof insertGrcRiskSchema>;

export type GrcControl = typeof grcControls.$inferSelect;
export const insertGrcControlSchema = createInsertSchema(grcControls, {
  lastTestDate: z.coerce.date().optional(),
  nextTestDate: z.coerce.date().optional(),
}).omit({
  id: true,
  assessmentNumber: true,
  assessor: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGrcControl = z.infer<typeof insertGrcControlSchema>;

export type GrcIncident = typeof grcIncidents.$inferSelect;
export const insertGrcIncidentSchema = createInsertSchema(grcIncidents, {
  reportedDate: z.coerce.date().optional(),
  acknowledgedDate: z.coerce.date().optional(),
  containedDate: z.coerce.date().optional(),
  resolvedDate: z.coerce.date().optional(),
  closedDate: z.coerce.date().optional(),
}).omit({
  id: true,
  assessmentNumber: true,
  assessor: true,
  createdBy: true,
  reportedBy: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGrcIncident = z.infer<typeof insertGrcIncidentSchema>;

// ===== Risk Assessments =====

export const assessmentStatusEnum = pgEnum("assessment_status", [
  "draft",
  "in_progress",
  "pending_review",
  "approved",
  "rejected",
  "completed",
]);

export const assessmentTypeEnum = pgEnum("assessment_type", [
  "initial",
  "periodic",
  "triggered",
  "ad_hoc",
]);

export const grcRiskAssessments = pgTable("grc_risk_assessments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  assessmentNumber: varchar("assessment_number").notNull().unique(), // e.g., "RA-2025-001"
  assessmentTitle: text("assessment_title").notNull(),
  assessmentType: assessmentTypeEnum("assessment_type").notNull(),
  status: assessmentStatusEnum("status").notNull().default("draft"),
  riskId: varchar("risk_id").notNull(), // FK to grcRisks
  assessor: varchar("assessor").notNull(), // User ID
  reviewer: varchar("reviewer"), // User ID for approval
  // Assessment Scoring
  inherentLikelihood: integer("inherent_likelihood").notNull(), // 1-5
  inherentImpact: integer("inherent_impact").notNull(), // 1-5
  inherentRiskScore: integer("inherent_risk_score").notNull(), // Calculated
  residualLikelihood: integer("residual_likelihood"), // 1-5 after controls
  residualImpact: integer("residual_impact"), // 1-5 after controls
  residualRiskScore: integer("residual_risk_score"), // Calculated
  controlEffectivenessScore: integer("control_effectiveness_score"), // 0-100%
  // Risk Quantification
  expectedLoss: integer("expected_loss"), // Annual expected loss in dollars
  worstCaseLoss: integer("worst_case_loss"), // 95th percentile loss
  bestCaseLoss: integer("best_case_loss"), // 5th percentile loss
  valueAtRisk: integer("value_at_risk"), // VaR at 95% confidence
  riskVelocity: varchar("risk_velocity"), // How fast risk can materialize: slow, moderate, fast, immediate
  // Assessment Details
  assessmentFindings: text("assessment_findings"),
  recommendations: text("recommendations"),
  mitigationActions: text("mitigation_actions"),
  assessmentNotes: text("assessment_notes"),
  // Dates
  assessmentDate: timestamp("assessment_date").notNull(),
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  nextAssessmentDate: timestamp("next_assessment_date"),
  // Metadata
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type GrcRiskAssessment = typeof grcRiskAssessments.$inferSelect;
export const insertGrcRiskAssessmentSchema = createInsertSchema(grcRiskAssessments, {
  assessmentDate: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  completedDate: z.coerce.date().optional(),
  nextAssessmentDate: z.coerce.date().optional(),
}).omit({
  id: true,
  assessmentNumber: true,
  assessor: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGrcRiskAssessment = z.infer<typeof insertGrcRiskAssessmentSchema>;

// ===== Key Risk Indicators (KRIs) =====

export const kriStatusEnum = pgEnum("kri_status", [
  "active",
  "inactive",
  "under_review",
]);

export const kriTrendEnum = pgEnum("kri_trend", [
  "improving",
  "stable",
  "deteriorating",
  "unknown",
]);

export const kriAlertLevelEnum = pgEnum("kri_alert_level", [
  "normal",
  "warning",
  "critical",
]);

export const grcKeyRiskIndicators = pgTable("grc_key_risk_indicators", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  kriCode: varchar("kri_code").notNull().unique(), // e.g., "KRI-FIN-001"
  kriName: text("kri_name").notNull(),
  kriDescription: text("kri_description").notNull(),
  category: riskCategoryEnum("category").notNull(),
  status: kriStatusEnum("status").notNull().default("active"),
  // Measurement
  measurementUnit: varchar("measurement_unit").notNull(), // e.g., "%", "count", "$", "days"
  measurementFrequency: varchar("measurement_frequency").notNull(), // daily, weekly, monthly, quarterly
  dataSource: varchar("data_source"), // Where the metric comes from
  calculationMethod: text("calculation_method"), // How to calculate the KRI
  // Thresholds
  greenThreshold: integer("green_threshold"), // Normal operating range
  yellowThreshold: integer("yellow_threshold"), // Warning threshold
  redThreshold: integer("red_threshold"), // Critical threshold
  thresholdDirection: varchar("threshold_direction").notNull().default("higher_is_worse"), // higher_is_worse, lower_is_worse
  // Current Values
  currentValue: integer("current_value"),
  previousValue: integer("previous_value"),
  trend: kriTrendEnum("trend").default("unknown"),
  alertLevel: kriAlertLevelEnum("alert_level").default("normal"),
  lastMeasuredAt: timestamp("last_measured_at"),
  // Relationships
  relatedRiskIds: jsonb("related_risk_ids"), // Array of risk IDs this KRI monitors
  owner: varchar("owner").notNull(), // User ID
  // Metadata
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type GrcKeyRiskIndicator = typeof grcKeyRiskIndicators.$inferSelect;
export const insertGrcKeyRiskIndicatorSchema = createInsertSchema(grcKeyRiskIndicators, {
  lastMeasuredAt: z.coerce.date().optional(),
}).omit({
  id: true,
  assessmentNumber: true,
  assessor: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGrcKeyRiskIndicator = z.infer<typeof insertGrcKeyRiskIndicatorSchema>;

// KRI Measurements History
export const grcKriMeasurements = pgTable("grc_kri_measurements", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  kriId: varchar("kri_id").notNull(), // FK to grcKeyRiskIndicators
  value: integer("value").notNull(),
  alertLevel: kriAlertLevelEnum("alert_level").notNull(),
  notes: text("notes"),
  measuredAt: timestamp("measured_at").notNull(),
  measuredBy: varchar("measured_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type GrcKriMeasurement = typeof grcKriMeasurements.$inferSelect;
export const insertGrcKriMeasurementSchema = createInsertSchema(grcKriMeasurements, {
  measuredAt: z.coerce.date(),
}).omit({
  id: true,
  createdAt: true,
});
export type InsertGrcKriMeasurement = z.infer<typeof insertGrcKriMeasurementSchema>;

// ===== Risk Appetite =====

export const riskAppetiteLevelEnum = pgEnum("risk_appetite_level", [
  "averse",      // Avoid risk at all costs
  "minimal",     // Prefer safe options
  "cautious",    // Prefer lower risk, limited tolerance
  "moderate",    // Balanced approach
  "open",        // Willing to consider higher risk
  "seeking",     // Actively pursue high risk/reward
]);

export const grcRiskAppetite = pgTable("grc_risk_appetite", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  category: riskCategoryEnum("category").notNull().unique(),
  appetiteLevel: riskAppetiteLevelEnum("appetite_level").notNull(),
  appetiteStatement: text("appetite_statement").notNull(), // Board-approved statement
  toleranceMin: integer("tolerance_min"), // Minimum acceptable risk score
  toleranceMax: integer("tolerance_max"), // Maximum acceptable risk score
  toleranceDescription: text("tolerance_description"),
  // Quantitative Limits
  maxAcceptableLoss: integer("max_acceptable_loss"), // Max $ loss acceptable per incident
  maxAnnualLoss: integer("max_annual_loss"), // Max $ loss acceptable per year
  maxRiskExposure: integer("max_risk_exposure"), // Total $ at risk
  // Governance
  approvedBy: varchar("approved_by"), // User ID
  approvedDate: timestamp("approved_date"),
  effectiveDate: timestamp("effective_date"),
  reviewDate: timestamp("review_date"),
  // Metadata
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type GrcRiskAppetite = typeof grcRiskAppetite.$inferSelect;
export const insertGrcRiskAppetiteSchema = createInsertSchema(grcRiskAppetite, {
  approvedDate: z.coerce.date().optional(),
  effectiveDate: z.coerce.date().optional(),
  reviewDate: z.coerce.date().optional(),
}).omit({
  id: true,
  assessmentNumber: true,
  assessor: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGrcRiskAppetite = z.infer<typeof insertGrcRiskAppetiteSchema>;

// ===== Bow-Tie Analysis =====

export const bowTieNodeTypeEnum = pgEnum("bow_tie_node_type", [
  "hazard",           // Central risk/hazard
  "threat",           // Left side - causes
  "consequence",      // Right side - effects
  "preventive_control", // Barrier on threat side
  "mitigating_control", // Barrier on consequence side
  "escalation_factor",  // Factor that can bypass controls
]);

export const grcBowTieAnalyses = pgTable("grc_bow_tie_analyses", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  analysisNumber: varchar("analysis_number").notNull().unique(), // e.g., "BTA-2025-001"
  title: text("title").notNull(),
  description: text("description"),
  riskId: varchar("risk_id").notNull(), // FK to grcRisks - the central hazard
  status: varchar("status").notNull().default("draft"), // draft, active, archived
  // Analysis Summary
  threatCount: integer("threat_count").default(0),
  consequenceCount: integer("consequence_count").default(0),
  preventiveControlCount: integer("preventive_control_count").default(0),
  mitigatingControlCount: integer("mitigating_control_count").default(0),
  // Metadata
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type GrcBowTieAnalysis = typeof grcBowTieAnalyses.$inferSelect;
export const insertGrcBowTieAnalysisSchema = createInsertSchema(grcBowTieAnalyses).omit({
  id: true,
  assessmentNumber: true,
  assessor: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGrcBowTieAnalysis = z.infer<typeof insertGrcBowTieAnalysisSchema>;

// Bow-Tie Nodes (threats, consequences, controls)
export const grcBowTieNodes = pgTable("grc_bow_tie_nodes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  analysisId: varchar("analysis_id").notNull(), // FK to grcBowTieAnalyses
  nodeType: bowTieNodeTypeEnum("node_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  // For controls - link to existing control
  controlId: varchar("control_id"), // FK to grcControls (optional)
  // Positioning for visualization
  positionX: integer("position_x").default(0),
  positionY: integer("position_y").default(0),
  // For threats/consequences - likelihood/severity
  likelihood: integer("likelihood"), // 1-5
  severity: integer("severity"), // 1-5
  // For controls - effectiveness
  effectiveness: varchar("effectiveness"), // high, medium, low
  // Relationships
  parentNodeId: varchar("parent_node_id"), // For escalation factors
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type GrcBowTieNode = typeof grcBowTieNodes.$inferSelect;
export const insertGrcBowTieNodeSchema = createInsertSchema(grcBowTieNodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGrcBowTieNode = z.infer<typeof insertGrcBowTieNodeSchema>;

// ===== Business Continuity Planning =====

export const bcpStatusEnum = pgEnum("bcp_status", [
  "draft",
  "pending_approval",
  "approved",
  "active",
  "under_review",
  "archived",
]);

export const bcpPriorityEnum = pgEnum("bcp_priority", [
  "critical",    // Must be restored within hours
  "high",        // Restore within 24 hours
  "medium",      // Restore within 72 hours
  "low",         // Can wait up to a week
]);

export const grcBusinessContinuityPlans = pgTable("grc_business_continuity_plans", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  planNumber: varchar("plan_number").notNull().unique(), // e.g., "BCP-2025-001"
  planTitle: text("plan_title").notNull(),
  planDescription: text("plan_description"),
  status: bcpStatusEnum("status").notNull().default("draft"),
  priority: bcpPriorityEnum("priority").notNull(),
  // Business Impact Analysis
  businessFunction: text("business_function").notNull(),
  department: varchar("department"),
  criticalityLevel: integer("criticality_level").notNull(), // 1-5
  maxTolerableDowntime: integer("max_tolerable_downtime"), // In hours
  recoveryTimeObjective: integer("recovery_time_objective"), // RTO in hours
  recoveryPointObjective: integer("recovery_point_objective"), // RPO in hours
  // Financial Impact
  hourlyLossEstimate: integer("hourly_loss_estimate"), // $ per hour of downtime
  dailyLossEstimate: integer("daily_loss_estimate"), // $ per day of downtime
  // Dependencies
  criticalSystems: jsonb("critical_systems"), // Array of system names
  criticalVendors: jsonb("critical_vendors"), // Array of vendor names
  criticalStaff: jsonb("critical_staff"), // Array of role/position names
  // Recovery Strategy
  recoveryStrategy: text("recovery_strategy"),
  alternateWorksite: text("alternate_worksite"),
  backupSystems: text("backup_systems"),
  communicationPlan: text("communication_plan"),
  // Testing
  lastTestDate: timestamp("last_test_date"),
  nextTestDate: timestamp("next_test_date"),
  testResults: text("test_results"),
  testScore: integer("test_score"), // 0-100%
  // Governance
  planOwner: varchar("plan_owner").notNull(), // User ID
  approvedBy: varchar("approved_by"),
  approvedDate: timestamp("approved_date"),
  effectiveDate: timestamp("effective_date"),
  reviewDate: timestamp("review_date"),
  // Related Risks
  relatedRiskIds: jsonb("related_risk_ids"),
  // Metadata
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type GrcBusinessContinuityPlan = typeof grcBusinessContinuityPlans.$inferSelect;
export const insertGrcBusinessContinuityPlanSchema = createInsertSchema(grcBusinessContinuityPlans, {
  lastTestDate: z.coerce.date().optional(),
  nextTestDate: z.coerce.date().optional(),
  approvedDate: z.coerce.date().optional(),
  effectiveDate: z.coerce.date().optional(),
  reviewDate: z.coerce.date().optional(),
}).omit({
  id: true,
  assessmentNumber: true,
  assessor: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGrcBusinessContinuityPlan = z.infer<typeof insertGrcBusinessContinuityPlanSchema>;

// BCP Recovery Steps
export const grcBcpRecoverySteps = pgTable("grc_bcp_recovery_steps", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull(), // FK to grcBusinessContinuityPlans
  stepNumber: integer("step_number").notNull(),
  stepTitle: text("step_title").notNull(),
  stepDescription: text("step_description"),
  responsibleRole: varchar("responsible_role"),
  estimatedDuration: integer("estimated_duration"), // In minutes
  dependencies: text("dependencies"),
  resources: text("resources"),
  verificationCriteria: text("verification_criteria"),
  completed: varchar("completed").default("no"), // yes/no
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type GrcBcpRecoveryStep = typeof grcBcpRecoverySteps.$inferSelect;
export const insertGrcBcpRecoveryStepSchema = createInsertSchema(grcBcpRecoverySteps, {
  completedAt: z.coerce.date().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGrcBcpRecoveryStep = z.infer<typeof insertGrcBcpRecoveryStepSchema>;

// ===== Third-Party/Vendor Risk Management =====

// Vendor Risk Enums
export const vendorStatusEnum = pgEnum("vendor_status", [
  "pending_onboarding",
  "onboarding_in_progress",
  "active",
  "under_review",
  "suspended",
  "terminated",
  "offboarding",
]);

export const vendorTierEnum = pgEnum("vendor_tier", [
  "critical",       // Mission-critical, high-risk
  "strategic",      // Strategic importance
  "tactical",       // Standard operational
  "low_risk",       // Minimal risk
]);

export const vendorOnboardingStatusEnum = pgEnum("vendor_onboarding_status", [
  "initiated",
  "documentation_submitted",
  "initial_review",
  "risk_assessment",
  "legal_review",
  "security_review",
  "compliance_review",
  "approved",
  "rejected",
]);

export const vendorRiskAlertSeverityEnum = pgEnum("vendor_risk_alert_severity", [
  "critical",
  "high",
  "medium",
  "low",
]);

export const vendorRiskAlertTypeEnum = pgEnum("vendor_risk_alert_type", [
  "risk_score_increase",
  "regulatory_change",
  "financial_distress",
  "security_breach",
  "compliance_violation",
  "ownership_change",
  "contract_expiration",
  "audit_finding",
  "news_alert",
  "sanction_list_match",
]);

// Employee & Vendor Monitoring Enums
export const deviceTypeEnum = pgEnum("device_type", [
  "mobile_phone",
  "laptop",
  "tablet",
  "desktop",
  "wearable",
]);

export const folderPlatformEnum = pgEnum("folder_platform", [
  "onedrive",
  "sharepoint",
  "google_drive",
  "dropbox",
  "box",
  "employee_agreements",
]);

export const communicationMethodEnum = pgEnum("communication_method", [
  "email",
  "sms",
  "teams",
  "slack",
  "whatsapp",
  "zoom",
  "phone",
]);

// Employees Table
export const employees = pgTable("employees", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeNumber: varchar("employee_number").unique().notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").unique().notNull(),
  department: varchar("department").notNull(),
  position: varchar("position").notNull(),
  hireDate: timestamp("hire_date"),
  location: varchar("location"),
  manager: varchar("manager"),
  complianceScore: integer("compliance_score").default(85),
  riskLevel: varchar("risk_level").default("low"),
  lastActivityDate: timestamp("last_activity_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("employee_email_idx").on(table.email),
  departmentIdx: index("employee_department_idx").on(table.department),
}));

// Vendor Contacts Table (individual people at vendor companies for monitoring)
export const vendorContacts = pgTable("vendor_contacts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").references(() => vendors.id), // Link to main vendor company
  contactNumber: varchar("contact_number").unique().notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").unique().notNull(),
  position: varchar("position"),
  phone: varchar("phone"),
  companyName: varchar("company_name").notNull(), // Denormalized for quick lookups
  vendorType: varchar("vendor_type").notNull(), // IT, Consulting, Legal, Accounting, etc
  location: varchar("location"),
  complianceScore: integer("compliance_score").default(85),
  riskLevel: varchar("risk_level").default("low"),
  lastActivityDate: timestamp("last_activity_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("vendor_contact_email_idx").on(table.email),
  vendorTypeIdx: index("vendor_contact_type_idx").on(table.vendorType),
  vendorIdIdx: index("vendor_contact_vendor_id_idx").on(table.vendorId),
}));

// Monitored Devices Table
export const monitoredDevices = pgTable("monitored_devices", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  personType: varchar("person_type").notNull(),
  personId: varchar("person_id").notNull(),
  deviceType: deviceTypeEnum("device_type").notNull(),
  deviceName: varchar("device_name").notNull(),
  serialNumber: varchar("serial_number"),
  platform: varchar("platform"),
  osVersion: varchar("os_version"),
  lastSyncDate: timestamp("last_sync_date"),
  status: varchar("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  personIdx: index("monitored_device_person_idx").on(table.personType, table.personId),
}));

// Folder Access Table
export const folderAccess = pgTable("folder_access", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  personType: varchar("person_type").notNull(),
  personId: varchar("person_id").notNull(),
  platform: folderPlatformEnum("platform").notNull(),
  folderPath: text("folder_path").notNull(),
  permissions: varchar("permissions").notNull(),
  dataVolumeMb: integer("data_volume_mb").default(0),
  lastAccessDate: timestamp("last_access_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  personIdx: index("folder_access_person_idx").on(table.personType, table.personId),
}));

// Communication Stats Table
export const communicationStats = pgTable("communication_stats", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  personId1: varchar("person_id_1").notNull(),
  personId2: varchar("person_id_2").notNull(),
  method: communicationMethodEnum("method").notNull(),
  messageCount: integer("message_count").default(0).notNull(),
  lastContactDate: timestamp("last_contact_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  person1Idx: index("comm_stats_person1_idx").on(table.personId1),
  person2Idx: index("comm_stats_person2_idx").on(table.personId2),
}));

// Data Volume History Table
export const dataVolumeHistory = pgTable("data_volume_history", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  personType: varchar("person_type").notNull(),
  personId: varchar("person_id").notNull(),
  date: timestamp("date").notNull(),
  volumeGb: integer("volume_gb").default(0).notNull(),
  messageCount: integer("message_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  personDateIdx: index("data_volume_person_date_idx").on(table.personType, table.personId, table.date),
}));

// Employee Analytics Cache Table (Management Insights)
export const employeeAnalyticsCache = pgTable("employee_analytics_cache", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(), // Reference to user or employee
  dateRangeStart: timestamp("date_range_start").notNull(),
  dateRangeEnd: timestamp("date_range_end").notNull(),
  // AI-generated insights from Gemini + OpenAI
  topics: jsonb("topics"), // Array of {topic: string, score: number, exemplars: string[], relatedCommunicationIds: string[]}
  patterns: jsonb("patterns"), // {collaborators: [], peakTimes: [], responseTime: {}, threadParticipation: {}}
  metrics: jsonb("metrics"), // {totalCommunications: number, avgResponseTime: number, busyHours: []}
  sentiment: jsonb("sentiment"), // {overall: string, timeline: [], trends: []}
  // Processing metadata
  status: varchar("status").default("pending").notNull(), // pending, processing, completed, failed
  jobId: varchar("job_id"), // For async job tracking
  errorMessage: text("error_message"),
  // Cache management
  cacheExpiry: timestamp("cache_expiry").notNull(),
  requestedBy: varchar("requested_by").notNull(), // User ID who requested the analysis
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  employeeIdx: index("employee_analytics_employee_idx").on(table.employeeId),
  statusIdx: index("employee_analytics_status_idx").on(table.status),
  expiryIdx: index("employee_analytics_expiry_idx").on(table.cacheExpiry),
}));

// Vendors Table
export const vendors = pgTable("vendors", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  vendorName: varchar("vendor_name").notNull(),
  legalName: varchar("legal_name").notNull(),
  vendorNumber: varchar("vendor_number").notNull().unique(), // e.g., "VND-2025-0001"
  tier: vendorTierEnum("tier").notNull().default("tactical"),
  status: vendorStatusEnum("status").notNull().default("pending_onboarding"),
  
  // Contact Information
  primaryContactName: varchar("primary_contact_name"),
  primaryContactEmail: varchar("primary_contact_email"),
  primaryContactPhone: varchar("primary_contact_phone"),
  website: varchar("website"),
  address: text("address"),
  country: varchar("country").notNull(),
  
  // Business Information
  industry: varchar("industry"),
  businessDescription: text("business_description"),
  servicesProvided: jsonb("services_provided"), // Array of service types
  annualSpend: integer("annual_spend"), // Annual spend in dollars
  contractStartDate: timestamp("contract_start_date"),
  contractEndDate: timestamp("contract_end_date"),
  
  // Ownership & Structure
  ownershipStructure: varchar("ownership_structure"), // private, public, government, nonprofit
  parentCompany: varchar("parent_company"),
  subsidiaries: jsonb("subsidiaries"), // Array of subsidiary names
  ultimateBeneficialOwners: jsonb("ultimate_beneficial_owners"), // Array of UBO names
  
  // Risk Metadata
  overallRiskScore: integer("overall_risk_score").default(0), // 0-100
  lastRiskAssessmentDate: timestamp("last_risk_assessment_date"),
  nextRiskReviewDate: timestamp("next_risk_review_date"),
  riskReviewFrequency: varchar("risk_review_frequency").default("annual"), // quarterly, annual, biennial
  
  // Certifications & Compliance
  certifications: jsonb("certifications"), // Array of {type, expiryDate, issuingBody}
  insuranceCoverage: jsonb("insurance_coverage"), // {type, amount, expiryDate}
  complianceStatus: varchar("compliance_status").default("pending"), // compliant, non_compliant, pending
  
  // Relationships
  assignedRiskManager: varchar("assigned_risk_manager"), // User ID
  relatedGrcRiskIds: jsonb("related_grc_risk_ids"), // Links to GRC risks
  relatedGrcControlIds: jsonb("related_grc_control_ids"), // Links to GRC controls
  relatedGrcIncidentIds: jsonb("related_grc_incident_ids"), // Links to GRC incidents
  
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Vendor Risk Assessments Table (50+ Categories)
export const vendorRiskAssessments = pgTable("vendor_risk_assessments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  assessmentDate: timestamp("assessment_date").notNull().defaultNow(),
  assessedBy: varchar("assessed_by").notNull(), // User ID
  overallScore: integer("overall_score").notNull().default(0), // 0-100 weighted average
  
  // ESG Risk Categories (Environmental, Social, Governance)
  environmentalCompliance: integer("environmental_compliance").default(0), // 0-100
  carbonFootprint: integer("carbon_footprint").default(0),
  wasteManagement: integer("waste_management").default(0),
  energyEfficiency: integer("energy_efficiency").default(0),
  waterUsage: integer("water_usage").default(0),
  biodiversityImpact: integer("biodiversity_impact").default(0),
  climateRisk: integer("climate_risk").default(0),
  laborPractices: integer("labor_practices").default(0),
  humanRights: integer("human_rights").default(0),
  diversityInclusion: integer("diversity_inclusion").default(0),
  healthSafety: integer("health_safety").default(0),
  communityImpact: integer("community_impact").default(0),
  productSafety: integer("product_safety").default(0),
  boardComposition: integer("board_composition").default(0),
  executiveCompensation: integer("executive_compensation").default(0),
  shareholderRights: integer("shareholder_rights").default(0),
  businessEthics: integer("business_ethics").default(0),
  antiCorruption: integer("anti_corruption").default(0),
  transparency: integer("transparency").default(0),
  
  // Regulatory & Compliance Risk Categories
  regulatoryCompliance: integer("regulatory_compliance").default(0),
  fcpaCompliance: integer("fcpa_compliance").default(0),
  gdprCompliance: integer("gdpr_compliance").default(0),
  ccpaCompliance: integer("ccpa_compliance").default(0),
  soxCompliance: integer("sox_compliance").default(0),
  pcidssCompliance: integer("pcidss_compliance").default(0),
  hipaaCompliance: integer("hipaa_compliance").default(0),
  iso27001Compliance: integer("iso27001_compliance").default(0),
  soc2Compliance: integer("soc2_compliance").default(0),
  exportControlCompliance: integer("export_control_compliance").default(0),
  sanctionsScreening: integer("sanctions_screening").default(0),
  antiMoneyLaundering: integer("anti_money_laundering").default(0),
  
  // Financial Risk Categories
  financialStability: integer("financial_stability").default(0),
  creditRating: integer("credit_rating").default(0),
  liquidityRisk: integer("liquidity_risk").default(0),
  profitability: integer("profitability").default(0),
  debtLevels: integer("debt_levels").default(0),
  cashFlowHealth: integer("cash_flow_health").default(0),
  
  // Operational Risk Categories
  businessContinuity: integer("business_continuity").default(0),
  disasterRecovery: integer("disaster_recovery").default(0),
  operationalResilience: integer("operational_resilience").default(0),
  qualityManagement: integer("quality_management").default(0),
  supplyChainRisk: integer("supply_chain_risk").default(0),
  geopoliticalRisk: integer("geopolitical_risk").default(0),
  concentrationRisk: integer("concentration_risk").default(0),
  
  // Cybersecurity & Data Risk Categories
  cyberSecurityPosture: integer("cyber_security_posture").default(0),
  dataProtection: integer("data_protection").default(0),
  incidentResponseCapability: integer("incident_response_capability").default(0),
  vulnerabilityManagement: integer("vulnerability_management").default(0),
  accessControls: integer("access_controls").default(0),
  encryptionPractices: integer("encryption_practices").default(0),
  thirdPartyRisk: integer("third_party_risk").default(0), // Vendor's own vendors
  
  // Reputational Risk Categories
  reputationalRisk: integer("reputational_risk").default(0),
  mediaPerception: integer("media_perception").default(0),
  customerSatisfaction: integer("customer_satisfaction").default(0),
  litigationHistory: integer("litigation_history").default(0),
  
  // Strategic Risk Categories
  strategicAlignment: integer("strategic_alignment").default(0),
  innovationCapacity: integer("innovation_capacity").default(0),
  marketPosition: integer("market_position").default(0),
  competitiveAdvantage: integer("competitive_advantage").default(0),
  
  // Notes and supporting evidence
  assessmentNotes: text("assessment_notes"),
  supportingDocuments: jsonb("supporting_documents"), // Array of document references
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  vendorIdIdx: index("vendor_risk_assessment_vendor_id_idx").on(table.vendorId),
  assessmentDateIdx: index("vendor_risk_assessment_date_idx").on(table.assessmentDate),
}));

// Vendor Onboarding Workflows Table
export const vendorOnboardingWorkflows = pgTable("vendor_onboarding_workflows", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  status: vendorOnboardingStatusEnum("status").notNull().default("initiated"),
  initiatedBy: varchar("initiated_by").notNull(), // User ID
  initiatedAt: timestamp("initiated_at").notNull().defaultNow(),
  
  // Workflow Steps & Completion
  documentationSubmittedAt: timestamp("documentation_submitted_at"),
  documentationSubmittedBy: varchar("documentation_submitted_by"),
  requiredDocuments: jsonb("required_documents"), // Array of {name, required, submitted, submittedDate}
  
  initialReviewCompletedAt: timestamp("initial_review_completed_at"),
  initialReviewCompletedBy: varchar("initial_review_completed_by"),
  initialReviewNotes: text("initial_review_notes"),
  
  riskAssessmentCompletedAt: timestamp("risk_assessment_completed_at"),
  riskAssessmentCompletedBy: varchar("risk_assessment_completed_by"),
  riskAssessmentId: varchar("risk_assessment_id"), // Link to vendorRiskAssessments
  
  legalReviewCompletedAt: timestamp("legal_review_completed_at"),
  legalReviewCompletedBy: varchar("legal_review_completed_by"),
  legalReviewNotes: text("legal_review_notes"),
  
  securityReviewCompletedAt: timestamp("security_review_completed_at"),
  securityReviewCompletedBy: varchar("security_review_completed_by"),
  securityReviewNotes: text("security_review_notes"),
  
  complianceReviewCompletedAt: timestamp("compliance_review_completed_at"),
  complianceReviewCompletedBy: varchar("compliance_review_completed_by"),
  complianceReviewNotes: text("compliance_review_notes"),
  
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by"),
  approvalNotes: text("approval_notes"),
  
  rejectedAt: timestamp("rejected_at"),
  rejectedBy: varchar("rejected_by"),
  rejectionReason: text("rejection_reason"),
  
  // SLA Tracking
  targetCompletionDate: timestamp("target_completion_date"),
  actualCompletionDate: timestamp("actual_completion_date"),
  slaStatus: varchar("sla_status").default("on_track"), // on_track, at_risk, overdue
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  vendorIdIdx: index("vendor_onboarding_vendor_id_idx").on(table.vendorId),
  statusIdx: index("vendor_onboarding_status_idx").on(table.status),
}));

// Vendor Risk Alerts Table
export const vendorRiskAlerts = pgTable("vendor_risk_alerts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  alertType: vendorRiskAlertTypeEnum("alert_type").notNull(),
  severity: vendorRiskAlertSeverityEnum("severity").notNull(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  
  // Alert Details
  triggeredAt: timestamp("triggered_at").notNull().defaultNow(),
  triggeredBy: varchar("triggered_by"), // User ID or "system" for automated alerts
  isAutomated: varchar("is_automated").notNull().default("yes"), // yes/no
  
  // Risk Score Changes
  previousRiskScore: integer("previous_risk_score"),
  currentRiskScore: integer("current_risk_score"),
  riskScoreChange: integer("risk_score_change"), // Positive = increase, negative = decrease
  
  // Alert Status & Resolution
  status: varchar("status").notNull().default("open"), // open, acknowledged, investigating, resolved, dismissed
  acknowledgedBy: varchar("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at"),
  assignedTo: varchar("assigned_to"), // User ID
  resolvedBy: varchar("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  
  // Notification Tracking
  notificationsSent: jsonb("notifications_sent"), // Array of {userId, email, sentAt, method}
  escalationLevel: integer("escalation_level").default(0), // 0 = initial, 1 = first escalation, etc.
  
  // Related Entities
  relatedAssessmentId: varchar("related_assessment_id"), // Link to vendorRiskAssessments
  relatedGrcRiskIds: jsonb("related_grc_risk_ids"),
  relatedGrcIncidentIds: jsonb("related_grc_incident_ids"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  vendorIdIdx: index("vendor_risk_alert_vendor_id_idx").on(table.vendorId),
  severityIdx: index("vendor_risk_alert_severity_idx").on(table.severity),
  statusIdx: index("vendor_risk_alert_status_idx").on(table.status),
  triggeredAtIdx: index("vendor_risk_alert_triggered_at_idx").on(table.triggeredAt),
}));

// Export types and schemas for Vendor Risk Management
export type Vendor = typeof vendors.$inferSelect;
export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  vendorNumber: true,
  assessmentNumber: true,
  assessor: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  vendorNumber: z.string().optional(),
});
export type InsertVendor = z.infer<typeof insertVendorSchema>;

export type VendorRiskAssessment = typeof vendorRiskAssessments.$inferSelect;
export const insertVendorRiskAssessmentSchema = createInsertSchema(vendorRiskAssessments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertVendorRiskAssessment = z.infer<typeof insertVendorRiskAssessmentSchema>;

export type VendorOnboardingWorkflow = typeof vendorOnboardingWorkflows.$inferSelect;
export const insertVendorOnboardingWorkflowSchema = createInsertSchema(vendorOnboardingWorkflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertVendorOnboardingWorkflow = z.infer<typeof insertVendorOnboardingWorkflowSchema>;

export type VendorRiskAlert = typeof vendorRiskAlerts.$inferSelect;
export const insertVendorRiskAlertSchema = createInsertSchema(vendorRiskAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertVendorRiskAlert = z.infer<typeof insertVendorRiskAlertSchema>;

// Ava AI Assistant Types
export type ChatSession = typeof chatSessions.$inferSelect;
export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Chat Thread Types (conversation groupings)
export type ChatThread = typeof chatThreads.$inferSelect;
export const insertChatThreadSchema = createInsertSchema(chatThreads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertChatThread = z.infer<typeof insertChatThreadSchema>;

// Ingested Chat Message Types (WhatsApp, SMS, etc.)
export type IngestedChatMessage = typeof ingestedChatMessages.$inferSelect;
export const insertIngestedChatMessageSchema = createInsertSchema(ingestedChatMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertIngestedChatMessage = z.infer<typeof insertIngestedChatMessageSchema>;

// Chat Message Notes Types
export type ChatMessageNote = typeof chatMessageNotes.$inferSelect;
export const insertChatMessageNoteSchema = createInsertSchema(chatMessageNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertChatMessageNote = z.infer<typeof insertChatMessageNoteSchema>;

export type CaseMessage = typeof caseMessages.$inferSelect;
export const insertCaseMessageSchema = createInsertSchema(caseMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCaseMessage = z.infer<typeof insertCaseMessageSchema>;

// Employee & Vendor Monitoring Types
export type Employee = typeof employees.$inferSelect;
export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  employeeNumber: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type VendorContact = typeof vendorContacts.$inferSelect;
export const insertVendorContactSchema = createInsertSchema(vendorContacts).omit({
  id: true,
  contactNumber: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertVendorContact = z.infer<typeof insertVendorContactSchema>;

export type MonitoredDevice = typeof monitoredDevices.$inferSelect;
export const insertMonitoredDeviceSchema = createInsertSchema(monitoredDevices).omit({
  id: true,
  createdAt: true,
});
export type InsertMonitoredDevice = z.infer<typeof insertMonitoredDeviceSchema>;

export type FolderAccess = typeof folderAccess.$inferSelect;
export const insertFolderAccessSchema = createInsertSchema(folderAccess).omit({
  id: true,
  createdAt: true,
});
export type InsertFolderAccess = z.infer<typeof insertFolderAccessSchema>;

export type CommunicationStat = typeof communicationStats.$inferSelect;
export const insertCommunicationStatSchema = createInsertSchema(communicationStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCommunicationStat = z.infer<typeof insertCommunicationStatSchema>;

export type DataVolumeHistory = typeof dataVolumeHistory.$inferSelect;
export const insertDataVolumeHistorySchema = createInsertSchema(dataVolumeHistory).omit({
  id: true,
  createdAt: true,
});
export type InsertDataVolumeHistory = z.infer<typeof insertDataVolumeHistorySchema>;

// ===== DOCUMENT HIGHLIGHTS & COMMENTS =====

// Table for storing highlighted text in documents
export const documentHighlights = pgTable("document_highlights", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  communicationId: varchar("communication_id")
    .notNull()
    .references(() => communications.id, { onDelete: "cascade" }),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  userName: text("user_name").notNull(), // Denormalized for display
  highlightedText: text("highlighted_text").notNull(),
  startOffset: integer("start_offset").notNull(), // Character position in document body where highlight starts
  endOffset: integer("end_offset").notNull(), // Character position in document body where highlight ends
  color: varchar("color").default("yellow").notNull(), // Highlight color
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Table for generated business intelligence reports linked to cases
export const businessReports = pgTable("business_reports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  companyName: varchar("company_name").notNull(),
  generatedBy: varchar("generated_by")
    .notNull()
    .references(() => users.id),
  fileName: varchar("file_name").notNull(),
  fileSize: integer("file_size"),
  pdfData: text("pdf_data"), // Base64 encoded PDF or object storage URL
  summaryJson: jsonb("summary_json"), // Full BusinessSummary JSON for reference
  communicationsCount: integer("communications_count"),
  overallConfidence: integer("overall_confidence"), // Stored as percentage (0-100)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Table for comments attached to highlights
export const highlightComments = pgTable("highlight_comments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  highlightId: varchar("highlight_id")
    .notNull()
    .references(() => documentHighlights.id, { onDelete: "cascade" }),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  userName: text("user_name").notNull(), // Denormalized for display
  commentText: text("comment_text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


// ===== CRISIS RESPONSE MODULE TYPES =====

export type Expert = typeof experts.$inferSelect;
export const insertExpertSchema = createInsertSchema(experts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertExpert = z.infer<typeof insertExpertSchema>;

export type RegulatorCommunication = typeof regulatorCommunications.$inferSelect;
export const insertRegulatorCommunicationSchema = createInsertSchema(regulatorCommunications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRegulatorCommunication = z.infer<typeof insertRegulatorCommunicationSchema>;

export type InvestigationDeadline = typeof investigationDeadlines.$inferSelect;
export const insertInvestigationDeadlineSchema = createInsertSchema(investigationDeadlines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInvestigationDeadline = z.infer<typeof insertInvestigationDeadlineSchema>;

export type PreservationChecklist = typeof preservationChecklists.$inferSelect;
export const insertPreservationChecklistSchema = createInsertSchema(preservationChecklists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPreservationChecklist = z.infer<typeof insertPreservationChecklistSchema>;

export type ConflictCheck = typeof conflictChecks.$inferSelect;
export const insertConflictCheckSchema = createInsertSchema(conflictChecks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertConflictCheck = z.infer<typeof insertConflictCheckSchema>;

export type LegalHoldNotification = typeof legalHoldNotifications.$inferSelect;
export const insertLegalHoldNotificationSchema = createInsertSchema(legalHoldNotifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLegalHoldNotification = z.infer<typeof insertLegalHoldNotificationSchema>;

// Reports and Productions Types
export type ReportTemplate = typeof reportTemplates.$inferSelect;
export const insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({
  id: true,
  usageCount: true,
  lastUsedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReportTemplate = z.infer<typeof insertReportTemplateSchema>;

// File Search Store Types
export type FileSearchStore = typeof fileSearchStores.$inferSelect;
export const insertFileSearchStoreSchema = createInsertSchema(fileSearchStores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFileSearchStore = z.infer<typeof insertFileSearchStoreSchema>;

// Document Index Status Types
export type DocumentIndexStatus = typeof documentIndexStatus.$inferSelect;
export const insertDocumentIndexStatusSchema = createInsertSchema(documentIndexStatus).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDocumentIndexStatus = z.infer<typeof insertDocumentIndexStatusSchema>;

// Employee Analytics Cache Types
export type EmployeeAnalyticsCache = typeof employeeAnalyticsCache.$inferSelect;
export const insertEmployeeAnalyticsCacheSchema = createInsertSchema(employeeAnalyticsCache).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEmployeeAnalyticsCache = z.infer<typeof insertEmployeeAnalyticsCacheSchema>;

// Document Highlights Types
export type DocumentHighlight = typeof documentHighlights.$inferSelect;
export const insertDocumentHighlightSchema = createInsertSchema(documentHighlights).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDocumentHighlight = z.infer<typeof insertDocumentHighlightSchema>;

// Highlight Comments Types
export type HighlightComment = typeof highlightComments.$inferSelect;
export const insertHighlightCommentSchema = createInsertSchema(highlightComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertHighlightComment = z.infer<typeof insertHighlightCommentSchema>;

// Business Reports Types
export type BusinessReport = typeof businessReports.$inferSelect;
export const insertBusinessReportSchema = createInsertSchema(businessReports).omit({
  id: true,
  createdAt: true,
});
export type InsertBusinessReport = z.infer<typeof insertBusinessReportSchema>;

// ===== COMMUNICATION ENTITIES (extracted person names) =====

// Enum for entity source type
export const entitySourceTypeEnum = pgEnum("entity_source_type", [
  "metadata",  // From email sender/recipient fields
  "body",      // Extracted from document content
]);

// Table for storing extracted entities from communications
export const communicationEntities = pgTable("communication_entities", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  communicationId: varchar("communication_id")
    .notNull()
    .references(() => communications.id, { onDelete: "cascade" }),
  entityName: text("entity_name").notNull(), // The person's name
  entityType: varchar("entity_type").notNull().default("person"), // person, organization, etc.
  sourceType: entitySourceTypeEnum("source_type").notNull(), // metadata or body
  email: varchar("email"), // Email address if available
  confidence: integer("confidence").default(100), // 0-100 confidence score
  mentionCount: integer("mention_count").default(1), // How many times mentioned in this doc
  context: text("context"), // Surrounding text for context
  processedAt: timestamp("processed_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  caseIdIdx: index("communication_entities_case_id_idx").on(table.caseId),
  communicationIdIdx: index("communication_entities_communication_id_idx").on(table.communicationId),
  entityNameIdx: index("communication_entities_entity_name_idx").on(table.entityName),
  sourceTypeIdx: index("communication_entities_source_type_idx").on(table.sourceType),
}));

// Types for Communication Entities
export type CommunicationEntity = typeof communicationEntities.$inferSelect;
export const insertCommunicationEntitySchema = createInsertSchema(communicationEntities).omit({
  id: true,
  processedAt: true,
  createdAt: true,
});
export type InsertCommunicationEntity = z.infer<typeof insertCommunicationEntitySchema>;

// Case Issues Types (Issue Heatmap Intelligence Module)
export type CaseIssue = typeof caseIssues.$inferSelect;
export const insertCaseIssueSchema = createInsertSchema(caseIssues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCaseIssue = z.infer<typeof insertCaseIssueSchema>;

// Issue-Communication Link Types
export type IssueCommunicationLink = typeof issueCommunicationLinks.$inferSelect;
export const insertIssueCommunicationLinkSchema = createInsertSchema(issueCommunicationLinks).omit({
  id: true,
  createdAt: true,
});
export type InsertIssueCommunicationLink = z.infer<typeof insertIssueCommunicationLinkSchema>;

// ===== MY QUEUE: BOOKMARKS & USER ACTIVITY =====

// Bookmark types for different content
export const bookmarkTypeEnum = pgEnum("bookmark_type", [
  "document",
  "page",
  "paragraph",
  "quote",
  "audio_timestamp",
  "video_timestamp",
  "chat_message",
  "cluster",
  "topic",
  "search_result",
]);

// ===== FINDINGS MODULE ENUMS =====

// Entry types for findings - distinct from tags/categories
export const findingEntryTypeEnum = pgEnum("finding_entry_type", [
  "note",           // General notes and observations
  "theory",         // Case theories and hypotheses
  "legal_issue",    // Legal issues and analysis
  "contradiction",  // Contradictions between evidence/statements
  "credibility",    // Witness credibility assessments
  "research",       // Legal research and precedents
  "article",        // External articles and references
  "to_do",          // Action items and follow-ups
  "timeline_event", // Key events for case timeline
  "recommendation", // Recommendations and conclusions
]);

export const findingCategoryEnum = pgEnum("finding_category", [
  "theory",
  "concern",
  "legal_issue",
  "credibility_note",
  "contradiction",
  "supporting_evidence",
  "todo",
  "legal_research",
  "external_article",
  "fact_pattern",
  "argument",
  "draft_conclusion",
]);

export const findingVersionTypeEnum = pgEnum("finding_version_type", [
  "original",
  "autosave",
  "manual",
  "ai_suggested",
  "user_accepted",
]);

export const findingAiActionTypeEnum = pgEnum("finding_ai_action_type", [
  "summarize_interview",
  "compare_witnesses",
  "compare_documents",
  "extract_legal_issues",
  "draft_liability_analysis",
  "cross_reference",
  "identify_contradictions",
  "credibility_analysis",
  "timeline_reconciliation",
  "apply_law",
  "build_theory",
  "draft_final_report",
]);

// Legal domains for the Legal Analysis Engine
export const legalDomainEnum = pgEnum("legal_domain", [
  "title_vii_retaliation",
  "title_vii_discrimination",
  "antitrust_anticompetitive",
  "whistleblower_interference",
  "fiduciary_duty_breach",
  "harassment_policy",
  "fraud",
  "contract_breach",
  "fcpa",
  "sox",
  "bsa_aml",
  "insider_trading",
  "data_privacy",
  "state_law_fl_448_102",
  "state_law_ca_lab_1102_5",
  "other",
]);

export const findingAiTaskStatusEnum = pgEnum("finding_ai_task_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

export const findingEvidenceLinkTypeEnum = pgEnum("finding_evidence_link_type", [
  "interview",
  "document",
  "communication",
  "chat_message",
  "custodian",
  "timeline_event",
  "alert",
]);

// ===== FINDINGS MODULE TABLES =====

// Findings - The main notebook entries for case investigations
export const findings = pgTable("findings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  authorId: varchar("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  entryType: findingEntryTypeEnum("entry_type").default("note").notNull(), // Type of finding entry
  title: text("title").notNull(),
  content: text("content").notNull(), // Rich text content
  summary: text("summary"), // Brief summary for list views
  isPinned: boolean("is_pinned").default(false).notNull(),
  lastAiTaskId: varchar("last_ai_task_id"), // Reference to most recent AI task
  versionCount: integer("version_count").default(1).notNull(),
  aiGenerated: boolean("ai_generated").default(false).notNull(), // Whether this was AI-generated
  legalDomain: legalDomainEnum("legal_domain"), // For legal analysis findings
  citations: jsonb("citations").$type<string[]>(), // Legal citations
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  caseIdIdx: index("findings_case_id_idx").on(table.caseId),
  authorIdIdx: index("findings_author_id_idx").on(table.authorId),
  isPinnedIdx: index("findings_is_pinned_idx").on(table.isPinned),
  entryTypeIdx: index("findings_entry_type_idx").on(table.entryType),
}));

// Finding Tags - Categories/tags for each finding
export const findingTags = pgTable("finding_tags", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  findingId: varchar("finding_id")
    .notNull()
    .references(() => findings.id, { onDelete: "cascade" }),
  category: findingCategoryEnum("category").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  findingIdIdx: index("finding_tags_finding_id_idx").on(table.findingId),
  categoryIdx: index("finding_tags_category_idx").on(table.category),
  uniqueFindingCategory: unique("unique_finding_category").on(table.findingId, table.category),
}));

// Finding Evidence Links - Connect findings to case evidence
export const findingEvidenceLinks = pgTable("finding_evidence_links", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  findingId: varchar("finding_id")
    .notNull()
    .references(() => findings.id, { onDelete: "cascade" }),
  targetType: findingEvidenceLinkTypeEnum("target_type").notNull(),
  targetId: varchar("target_id").notNull(),
  targetTitle: text("target_title"), // Denormalized title for display
  targetExcerpt: text("target_excerpt"), // Relevant excerpt from the linked evidence
  notes: text("notes"), // Why this evidence is linked
  createdBy: varchar("created_by")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  findingIdIdx: index("finding_evidence_links_finding_id_idx").on(table.findingId),
  targetTypeIdx: index("finding_evidence_links_target_type_idx").on(table.targetType),
  targetIdIdx: index("finding_evidence_links_target_id_idx").on(table.targetId),
}));

// Finding Versions - Track all versions of finding content
export const findingVersions = pgTable("finding_versions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  findingId: varchar("finding_id")
    .notNull()
    .references(() => findings.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  versionType: findingVersionTypeEnum("version_type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  aiTaskId: varchar("ai_task_id"), // If this version was AI-generated
  createdBy: varchar("created_by")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  findingIdIdx: index("finding_versions_finding_id_idx").on(table.findingId),
  versionNumberIdx: index("finding_versions_version_number_idx").on(table.versionNumber),
}));

// Finding AI Tasks - Track AI operations on findings
export const findingAiTasks = pgTable("finding_ai_tasks", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  findingId: varchar("finding_id")
    .references(() => findings.id, { onDelete: "cascade" }),
  caseId: varchar("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  actionType: findingAiActionTypeEnum("action_type").notNull(),
  status: findingAiTaskStatusEnum("status").default("pending").notNull(),
  payload: jsonb("payload").notNull(), // Input data (interviewIds, documentIds, lawReference, etc.)
  result: text("result"), // AI-generated output
  resultSummary: text("result_summary"), // Brief summary of results
  error: text("error"), // Error message if failed
  createdBy: varchar("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  findingIdIdx: index("finding_ai_tasks_finding_id_idx").on(table.findingId),
  caseIdIdx: index("finding_ai_tasks_case_id_idx").on(table.caseId),
  statusIdx: index("finding_ai_tasks_status_idx").on(table.status),
}));

// User Bookmarks - for quick access to important content
export const bookmarks = pgTable("bookmarks", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  caseId: varchar("case_id")
    .references(() => cases.id, { onDelete: "cascade" }),
  bookmarkType: bookmarkTypeEnum("bookmark_type").notNull(),
  // Reference to content
  communicationId: varchar("communication_id")
    .references(() => communications.id, { onDelete: "cascade" }),
  chatMessageId: varchar("chat_message_id"), // For chat message bookmarks
  // Location within content
  pageNumber: integer("page_number"),
  paragraphIndex: integer("paragraph_index"),
  startOffset: integer("start_offset"), // Character offset for quotes
  endOffset: integer("end_offset"),
  timestamp: integer("timestamp"), // Seconds for audio/video
  // Bookmark details
  title: text("title").notNull(),
  excerpt: text("excerpt"), // Preview text or quote
  notes: text("notes"), // User notes about why it matters
  color: varchar("color").default("blue"), // Visual coding
  // Organization
  folder: varchar("folder"), // For grouping bookmarks
  tags: jsonb("tags"), // Array of tags
  isPinned: boolean("is_pinned").default(false),
  sortOrder: integer("sort_order").default(0),
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("bookmarks_user_id_idx").on(table.userId),
  caseIdIdx: index("bookmarks_case_id_idx").on(table.caseId),
  typeIdx: index("bookmarks_type_idx").on(table.bookmarkType),
  communicationIdIdx: index("bookmarks_communication_id_idx").on(table.communicationId),
}));

// User Activity Tracking - for "Continue Where You Left Off"
export const userActivityTypeEnum = pgEnum("user_activity_type", [
  "document_view",
  "chat_view",
  "search",
  "case_view",
  "interview_view",
  "report_view",
  "conversation",
]);

export const userActivity = pgTable("user_activity", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  activityType: userActivityTypeEnum("activity_type").notNull(),
  // Reference to content
  caseId: varchar("case_id")
    .references(() => cases.id, { onDelete: "cascade" }),
  communicationId: varchar("communication_id")
    .references(() => communications.id, { onDelete: "cascade" }),
  chatMessageId: varchar("chat_message_id"),
  interviewId: varchar("interview_id"),
  // Context for resuming
  url: text("url").notNull(), // Full URL to resume
  title: text("title").notNull(), // Display title
  subtitle: text("subtitle"), // Additional context
  // For document views - track position
  pageNumber: integer("page_number"),
  scrollPosition: integer("scroll_position"),
  // For searches
  searchQuery: text("search_query"),
  searchFilters: jsonb("search_filters"),
  // Timing
  accessedAt: timestamp("accessed_at").notNull().defaultNow(),
  duration: integer("duration"), // Seconds spent
}, (table) => ({
  userIdIdx: index("user_activity_user_id_idx").on(table.userId),
  activityTypeIdx: index("user_activity_type_idx").on(table.activityType),
  accessedAtIdx: index("user_activity_accessed_at_idx").on(table.accessedAt),
}));

// Bookmark Types
export type Bookmark = typeof bookmarks.$inferSelect;
export const insertBookmarkSchema = createInsertSchema(bookmarks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;

// User Activity Types
export type UserActivity = typeof userActivity.$inferSelect;
export const insertUserActivitySchema = createInsertSchema(userActivity).omit({
  id: true,
  accessedAt: true,
});
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;

// ===== FINDINGS MODULE TYPES =====

// Findings Types
export type Finding = typeof findings.$inferSelect;
export const insertFindingSchema = createInsertSchema(findings).omit({
  id: true,
  versionCount: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFinding = z.infer<typeof insertFindingSchema>;

// Finding Tags Types
export type FindingTag = typeof findingTags.$inferSelect;
export const insertFindingTagSchema = createInsertSchema(findingTags).omit({
  id: true,
  createdAt: true,
});
export type InsertFindingTag = z.infer<typeof insertFindingTagSchema>;

// Finding Evidence Links Types
export type FindingEvidenceLink = typeof findingEvidenceLinks.$inferSelect;
export const insertFindingEvidenceLinkSchema = createInsertSchema(findingEvidenceLinks).omit({
  id: true,
  createdAt: true,
});
export type InsertFindingEvidenceLink = z.infer<typeof insertFindingEvidenceLinkSchema>;

// Finding Versions Types
export type FindingVersion = typeof findingVersions.$inferSelect;
export const insertFindingVersionSchema = createInsertSchema(findingVersions).omit({
  id: true,
  createdAt: true,
});
export type InsertFindingVersion = z.infer<typeof insertFindingVersionSchema>;

// Finding AI Tasks Types
export type FindingAiTask = typeof findingAiTasks.$inferSelect;
export const insertFindingAiTaskSchema = createInsertSchema(findingAiTasks).omit({
  id: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
});
export type InsertFindingAiTask = z.infer<typeof insertFindingAiTaskSchema>;

// ===== CASE INVESTIGATION AI TYPES =====

// Evidence source types for "Ask About Case" feature
export const evidenceSourceTypeSchema = z.enum([
  "document",
  "interview",
  "chat_message",
  "finding",
  "transcript_segment",
]);
export type EvidenceSourceType = z.infer<typeof evidenceSourceTypeSchema>;

// Individual evidence item returned from case investigation
export const caseEvidenceItemSchema = z.object({
  sourceType: evidenceSourceTypeSchema,
  sourceId: z.string(),
  title: z.string(),
  excerpt: z.string(),
  timestamp: z.string().optional(),
  relevanceScore: z.number().min(0).max(100),
  metadata: z.object({
    sender: z.string().optional(),
    recipient: z.string().optional(),
    speaker: z.string().optional(),
    interviewSubject: z.string().optional(),
    segmentTimestamp: z.string().optional(),
    findingType: z.string().optional(),
  }).optional(),
});
export type CaseEvidenceItem = z.infer<typeof caseEvidenceItemSchema>;

// Request schema for asking about a case
export const askCaseRequestSchema = z.object({
  question: z.string().min(5, "Question must be at least 5 characters").max(2000, "Question must be less than 2000 characters"),
  filters: z.object({
    sourceTypes: z.array(evidenceSourceTypeSchema).optional(),
    dateRange: z.object({
      start: z.string().optional(),
      end: z.string().optional(),
    }).optional(),
    participants: z.array(z.string()).optional(),
  }).optional(),
});
export type AskCaseRequest = z.infer<typeof askCaseRequestSchema>;

// Response schema for case investigation
export const askCaseResponseSchema = z.object({
  answer: z.string(),
  confidence: z.number().min(0).max(100),
  evidenceItems: z.array(caseEvidenceItemSchema),
  searchedSources: z.object({
    documents: z.number(),
    interviews: z.number(),
    chatMessages: z.number(),
    findings: z.number(),
  }),
  processingTimeMs: z.number(),
});
export type AskCaseResponse = z.infer<typeof askCaseResponseSchema>;

// ===== BUSINESS TRANSACTIONS MODULE =====

// Deal Type Enum
export const dealTypeEnum = pgEnum("deal_type", [
  "ma_asset",
  "ma_stock",
  "merger",
  "investment",
  "debt",
  "jv",
  "real_estate",
  "franchise",
  "other",
]);

// Deal Status Enum
export const dealStatusEnum = pgEnum("deal_status", [
  "pipeline",
  "active",
  "on_hold",
  "closed",
  "terminated",
]);

// Deal Priority Enum
export const dealPriorityEnum = pgEnum("deal_priority", [
  "critical",
  "high",
  "medium",
  "low",
]);

// Deal Participant Role Enum
export const dealParticipantRoleEnum = pgEnum("deal_participant_role", [
  "lead",
  "reviewer",
  "advisor",
  "observer",
  "counterparty",
]);

// Deal Participant Team Enum
export const dealParticipantTeamEnum = pgEnum("deal_participant_team", [
  "buyer",
  "seller",
  "lender",
  "external_counsel",
  "cro",
  "risk_manager",
  "internal",
]);

// Deal Milestone Type Enum
export const dealMilestoneTypeEnum = pgEnum("deal_milestone_type", [
  "signing",
  "closing",
  "regulatory",
  "financing",
  "due_diligence",
  "custom",
]);

// Deal Milestone Status Enum
export const dealMilestoneStatusEnum = pgEnum("deal_milestone_status", [
  "pending",
  "in_progress",
  "completed",
  "delayed",
  "cancelled",
]);

// Deals Table
export const deals = pgTable("deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealNumber: varchar("deal_number", { length: 50 }).unique().notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  dealType: dealTypeEnum("deal_type").notNull(),
  subType: varchar("sub_type", { length: 100 }),
  status: dealStatusEnum("status").default("active"),
  priority: dealPriorityEnum("priority").default("medium"),
  dealValue: text("deal_value"),
  dealCurrency: varchar("deal_currency", { length: 10 }).default("USD"),
  dealStructure: text("deal_structure"),
  description: text("description"),
  loiDate: timestamp("loi_date"),
  signingTargetDate: timestamp("signing_target_date"),
  closingTargetDate: timestamp("closing_target_date"),
  actualSigningDate: timestamp("actual_signing_date"),
  actualClosingDate: timestamp("actual_closing_date"),
  exclusivityExpiration: timestamp("exclusivity_expiration"),
  buyerParties: jsonb("buyer_parties").default([]),
  sellerParties: jsonb("seller_parties").default([]),
  targetEntities: jsonb("target_entities").default([]),
  advisors: jsonb("advisors").default([]),
  caseId: varchar("case_id").references(() => cases.id),
  overallRiskScore: integer("overall_risk_score"),
  riskSummary: jsonb("risk_summary").default({}),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  closedAt: timestamp("closed_at"),
  settings: jsonb("settings").default({}),
}, (table) => ({
  statusIdx: index("idx_deals_status").on(table.status),
  typeIdx: index("idx_deals_type").on(table.dealType),
  createdIdx: index("idx_deals_created").on(table.createdAt),
}));

// Deal Participants Table
export const dealParticipants = pgTable("deal_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").references(() => deals.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id),
  role: dealParticipantRoleEnum("role").notNull(),
  team: dealParticipantTeamEnum("team"),
  permissions: jsonb("permissions").default({}),
  workstreams: text("workstreams").array(),
  addedAt: timestamp("added_at").defaultNow(),
  addedBy: varchar("added_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
}, (table) => ({
  dealIdx: index("idx_deal_participants_deal").on(table.dealId),
  userIdx: index("idx_deal_participants_user").on(table.userId),
}));

// Deal Milestones Table
export const dealMilestones = pgTable("deal_milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").references(() => deals.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  milestoneType: dealMilestoneTypeEnum("milestone_type"),
  targetDate: timestamp("target_date"),
  actualDate: timestamp("actual_date"),
  status: dealMilestoneStatusEnum("status").default("pending"),
  dependencies: text("dependencies").array(),
  assigneeId: varchar("assignee_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  dealIdx: index("idx_deal_milestones_deal").on(table.dealId),
}));

// Deal Relations
export const dealsRelations = relations(deals, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [deals.createdBy],
    references: [users.id],
  }),
  linkedCase: one(cases, {
    fields: [deals.caseId],
    references: [cases.id],
  }),
  participants: many(dealParticipants),
  milestones: many(dealMilestones),
}));

export const dealParticipantsRelations = relations(dealParticipants, ({ one }) => ({
  deal: one(deals, {
    fields: [dealParticipants.dealId],
    references: [deals.id],
  }),
  user: one(users, {
    fields: [dealParticipants.userId],
    references: [users.id],
  }),
  addedByUser: one(users, {
    fields: [dealParticipants.addedBy],
    references: [users.id],
  }),
}));

export const dealMilestonesRelations = relations(dealMilestones, ({ one }) => ({
  deal: one(deals, {
    fields: [dealMilestones.dealId],
    references: [deals.id],
  }),
  assignee: one(users, {
    fields: [dealMilestones.assigneeId],
    references: [users.id],
  }),
}));

// Deal Types
export type Deal = typeof deals.$inferSelect;
export const insertDealSchema = createInsertSchema(deals).omit({
  id: true,
  dealNumber: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
  assessmentNumber: true,
  assessor: true,
  createdBy: true,
}).extend({
  loiDate: z.coerce.date().optional().nullable(),
  signingTargetDate: z.coerce.date().optional().nullable(),
  closingTargetDate: z.coerce.date().optional().nullable(),
  actualSigningDate: z.coerce.date().optional().nullable(),
  actualClosingDate: z.coerce.date().optional().nullable(),
  exclusivityExpiration: z.coerce.date().optional().nullable(),
});
export type InsertDeal = z.infer<typeof insertDealSchema>;

// Deal Participant Types
export type DealParticipant = typeof dealParticipants.$inferSelect;
export const insertDealParticipantSchema = createInsertSchema(dealParticipants).omit({
  id: true,
  addedAt: true,
  addedBy: true,
});
export type InsertDealParticipant = z.infer<typeof insertDealParticipantSchema>;

// Deal Milestone Types
export type DealMilestone = typeof dealMilestones.$inferSelect;
export const insertDealMilestoneSchema = createInsertSchema(dealMilestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
}).extend({
  targetDate: z.coerce.date().optional().nullable(),
  actualDate: z.coerce.date().optional().nullable(),
});
export type InsertDealMilestone = z.infer<typeof insertDealMilestoneSchema>;

// ============================================
// PHASE 2: Due Diligence Module Tables
// ============================================

// Request Item Status Enum
export const requestItemStatusEnum = pgEnum("request_item_status", [
  "pending",
  "in_progress", 
  "received",
  "reviewed",
  "not_applicable",
  "follow_up",
]);

// Request Item Priority Enum
export const requestItemPriorityEnum = pgEnum("request_item_priority", [
  "low",
  "medium",
  "high",
  "critical",
]);

// Data Room Access Level Enum
export const dataRoomAccessEnum = pgEnum("data_room_access", [
  "view",
  "download",
  "upload",
  "admin",
]);

// Checklist Item Status Enum
export const checklistItemStatusEnum = pgEnum("checklist_item_status", [
  "not_started",
  "in_progress",
  "completed",
  "blocked",
  "not_applicable",
]);

// Request Lists Table (Document Request Lists for Due Diligence)
export const requestLists = pgTable("request_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").references(() => deals.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  version: integer("version").default(1),
  requestingParty: varchar("requesting_party", { length: 255 }),
  respondingParty: varchar("responding_party", { length: 255 }),
  dueDate: timestamp("due_date"),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  dealIdx: index("idx_request_lists_deal").on(table.dealId),
}));

// Request Items Table (Individual items in a request list)
export const requestItems = pgTable("request_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestListId: varchar("request_list_id").references(() => requestLists.id, { onDelete: "cascade" }).notNull(),
  itemNumber: varchar("item_number", { length: 50 }),
  category: varchar("category", { length: 100 }),
  subcategory: varchar("subcategory", { length: 100 }),
  description: text("description").notNull(),
  notes: text("notes"),
  status: requestItemStatusEnum("status").default("pending"),
  priority: requestItemPriorityEnum("priority").default("medium"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  dueDate: timestamp("due_date"),
  receivedDate: timestamp("received_date"),
  reviewedDate: timestamp("reviewed_date"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  documentLinks: jsonb("document_links").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  listIdx: index("idx_request_items_list").on(table.requestListId),
  statusIdx: index("idx_request_items_status").on(table.status),
}));

// Data Rooms Table
export const dataRooms = pgTable("data_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").references(() => deals.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  settings: jsonb("settings").default({}),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  dealIdx: index("idx_data_rooms_deal").on(table.dealId),
}));

// Data Room Folders Table
export const dataRoomFolders = pgTable("data_room_folders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dataRoomId: varchar("data_room_id").references(() => dataRooms.id, { onDelete: "cascade" }).notNull(),
  parentFolderId: varchar("parent_folder_id"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  indexNumber: varchar("index_number", { length: 50 }),
  autoIndex: boolean("auto_index").default(true),
  isLocked: boolean("is_locked").default(false),
  lockedBy: varchar("locked_by").references(() => users.id),
  lockedAt: timestamp("locked_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  roomIdx: index("idx_data_room_folders_room").on(table.dataRoomId),
  parentIdx: index("idx_data_room_folders_parent").on(table.parentFolderId),
}));

// Data Room Templates Table
export const dataRoomTemplates = pgTable("data_room_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  dealType: varchar("deal_type", { length: 100 }),
  folderStructure: jsonb("folder_structure"),
  isDefault: boolean("is_default").default(false),
  isGlobal: boolean("is_global").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// OCR status enum for document processing
export const ocrStatusEnum = pgEnum("ocr_status", ["pending", "processing", "completed", "failed", "not_applicable"]);

// Data Room Documents Table
export const dataRoomDocuments = pgTable("data_room_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dataRoomId: varchar("data_room_id").references(() => dataRooms.id, { onDelete: "cascade" }).notNull(),
  folderId: varchar("folder_id").references(() => dataRoomFolders.id),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileSize: integer("file_size"),
  fileType: varchar("file_type", { length: 100 }),
  storagePath: text("storage_path"),
  documentNumber: varchar("document_number", { length: 50 }),
  description: text("description"),
  tags: text("tags").array(),
  documentCategory: varchar("document_category", { length: 100 }),
  geminiFileId: text("gemini_file_id"),
  indexStatus: documentIndexStatusEnum("index_status").default("pending"),
  indexedAt: timestamp("indexed_at"),
  contentHash: text("content_hash"),
  extractedText: text("extracted_text"),
  // AI-generated summary of document content
  aiSummary: text("ai_summary"),
  // Comprehensive AI summary covering ALL document pages (from hierarchical summarization)
  comprehensiveSummary: text("comprehensive_summary"),
  // Number of chunks processed for comprehensive summary
  chunksProcessed: integer("chunks_processed"),
  // Total character count of source document
  totalCharacters: integer("total_characters"),
  // OCR processing fields
  ocrStatus: ocrStatusEnum("ocr_status").default("pending"),
  ocrProcessedAt: timestamp("ocr_processed_at"),
  ocrError: text("ocr_error"),
  // Document date extracted from content or metadata
  documentDate: timestamp("document_date"),
  documentDateSource: varchar("document_date_source", { length: 50 }), // 'content', 'filename', 'metadata', 'upload'
  // User-defined sort order for manual ordering
  sortOrder: integer("sort_order"),
  metadata: jsonb("metadata").default({}),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  roomIdx: index("idx_data_room_docs_room").on(table.dataRoomId),
  folderIdx: index("idx_data_room_docs_folder").on(table.folderId),
  indexStatusIdx: index("idx_data_room_docs_index_status").on(table.indexStatus),
  ocrStatusIdx: index("idx_data_room_docs_ocr_status").on(table.ocrStatus),
  docDateIdx: index("idx_data_room_docs_date").on(table.documentDate),
}));

// ============================================
// Data Room Access Control & Permissions
// ============================================

// External users who can access data rooms (not full platform users)
export const dataRoomGuests = pgTable("data_room_guests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  company: varchar("company", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  
  // Authentication
  inviteToken: varchar("invite_token", { length: 100 }).unique(),
  inviteTokenExpires: timestamp("invite_token_expires"),
  passwordHash: varchar("password_hash", { length: 255 }),
  isActivated: boolean("is_activated").default(false),
  
  // Security
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaSecret: varchar("mfa_secret", { length: 100 }),
  lastLoginAt: timestamp("last_login_at"),
  loginCount: integer("login_count").default(0),
  
  // Status: pending, active, suspended, revoked
  status: varchar("status", { length: 50 }).default("pending"),
  
  // Metadata
  invitedBy: varchar("invited_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  emailIdx: index("idx_data_room_guests_email").on(table.email),
  statusIdx: index("idx_data_room_guests_status").on(table.status),
}));

// Permission groups for organizing access
export const dataRoomGroups = pgTable("data_room_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dataRoomId: varchar("data_room_id").references(() => dataRooms.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 20 }).default("#6366f1"),
  
  // Default permissions for group (can be overridden at folder level)
  canView: boolean("can_view").default(true),
  canDownload: boolean("can_download").default(false),
  canUpload: boolean("can_upload").default(false),
  canDelete: boolean("can_delete").default(false),
  canManageAccess: boolean("can_manage_access").default(false),
  
  // Download restrictions
  enableWatermark: boolean("enable_watermark").default(true),
  enablePrintBlock: boolean("enable_print_block").default(false),
  downloadFormat: varchar("download_format", { length: 20 }).default("original"), // original, pdf_only, view_only
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  roomIdx: index("idx_data_room_groups_room").on(table.dataRoomId),
}));

// Data room access - links users/guests to data rooms
export const dataRoomAccess = pgTable("data_room_access_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dataRoomId: varchar("data_room_id").references(() => dataRooms.id, { onDelete: "cascade" }).notNull(),
  
  // Either internal user OR external guest (one must be null)
  userId: varchar("user_id").references(() => users.id),
  guestId: varchar("guest_id").references(() => dataRoomGuests.id),
  
  // Group membership (optional)
  groupId: varchar("group_id").references(() => dataRoomGroups.id),
  
  // Role in this data room: admin, manager, contributor, viewer
  role: varchar("role", { length: 50 }).default("viewer"),
  
  // Access window
  accessGrantedAt: timestamp("access_granted_at").defaultNow(),
  accessExpiresAt: timestamp("access_expires_at"),
  
  // Status: active, suspended, expired, revoked
  status: varchar("status", { length: 50 }).default("active"),
  
  // Invitation tracking
  invitedBy: varchar("invited_by").references(() => users.id),
  inviteSentAt: timestamp("invite_sent_at"),
  inviteAcceptedAt: timestamp("invite_accepted_at"),
  
  // Notes
  accessNotes: text("access_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  roomIdx: index("idx_data_room_access_room").on(table.dataRoomId),
  userIdx: index("idx_data_room_access_user").on(table.userId),
  guestIdx: index("idx_data_room_access_guest").on(table.guestId),
  statusIdx: index("idx_data_room_access_status").on(table.status),
}));

// Folder-level permissions (overrides group/access defaults)
export const dataRoomFolderPermissions = pgTable("data_room_folder_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  folderId: varchar("folder_id").references(() => dataRoomFolders.id, { onDelete: "cascade" }).notNull(),
  
  // Permission target (one of these must be set)
  groupId: varchar("group_id").references(() => dataRoomGroups.id),
  accessId: varchar("access_id").references(() => dataRoomAccess.id),
  
  // Visibility
  isVisible: boolean("is_visible").default(true),
  
  // Granular permissions (null = inherit from group/access default)
  canView: boolean("can_view"),
  canDownload: boolean("can_download"),
  canUpload: boolean("can_upload"),
  canDelete: boolean("can_delete"),
  
  // Inheritance
  applyToSubfolders: boolean("apply_to_subfolders").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  folderIdx: index("idx_data_room_folder_perms_folder").on(table.folderId),
  groupIdx: index("idx_data_room_folder_perms_group").on(table.groupId),
  accessIdx: index("idx_data_room_folder_perms_access").on(table.accessId),
}));

// File-level permissions (for specific file overrides)
export const dataRoomFilePermissions = pgTable("data_room_file_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => dataRoomDocuments.id, { onDelete: "cascade" }).notNull(),
  
  // Permission target
  groupId: varchar("group_id").references(() => dataRoomGroups.id),
  accessId: varchar("access_id").references(() => dataRoomAccess.id),
  
  // Visibility
  isVisible: boolean("is_visible").default(true),
  
  // Granular permissions
  canView: boolean("can_view"),
  canDownload: boolean("can_download"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  documentIdx: index("idx_data_room_file_perms_doc").on(table.documentId),
  groupIdx: index("idx_data_room_file_perms_group").on(table.groupId),
  accessIdx: index("idx_data_room_file_perms_access").on(table.accessId),
}));

// Audit log for all data room activity
export const dataRoomAuditLog = pgTable("data_room_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dataRoomId: varchar("data_room_id").references(() => dataRooms.id, { onDelete: "cascade" }).notNull(),
  
  // Who performed the action
  userId: varchar("user_id").references(() => users.id),
  guestId: varchar("guest_id").references(() => dataRoomGuests.id),
  
  // What happened: view, download, upload, delete, print, invite_sent, invite_accepted, 
  // access_granted, access_revoked, permission_changed, folder_created, file_uploaded
  action: varchar("action", { length: 50 }).notNull(),
  
  // What was affected: folder, file, user, group
  resourceType: varchar("resource_type", { length: 50 }),
  resourceId: varchar("resource_id"),
  resourceName: varchar("resource_name", { length: 500 }),
  
  // Additional context
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  roomIdx: index("idx_data_room_audit_room").on(table.dataRoomId),
  actionIdx: index("idx_data_room_audit_action").on(table.action),
  createdAtIdx: index("idx_data_room_audit_created").on(table.createdAt),
}));

// Q&A for data rooms (common in M&A)
export const dataRoomQuestions = pgTable("data_room_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dataRoomId: varchar("data_room_id").references(() => dataRooms.id, { onDelete: "cascade" }).notNull(),
  
  // Related to specific folder/file (optional)
  folderId: varchar("folder_id").references(() => dataRoomFolders.id, { onDelete: "set null" }),
  documentId: varchar("document_id").references(() => dataRoomDocuments.id, { onDelete: "set null" }),
  
  // Question details
  questionNumber: varchar("question_number", { length: 20 }),
  subject: varchar("subject", { length: 255 }).notNull(),
  question: text("question").notNull(),
  
  // Asker
  askedByUserId: varchar("asked_by_user_id").references(() => users.id),
  askedByGuestId: varchar("asked_by_guest_id").references(() => dataRoomGuests.id),
  askedAt: timestamp("asked_at").defaultNow(),
  
  // Assignment & Status
  assignedTo: varchar("assigned_to").references(() => users.id),
  status: varchar("status", { length: 50 }).default("open"), // open, in_progress, answered, closed
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, urgent
  dueDate: timestamp("due_date"),
  
  // Response
  answer: text("answer"),
  answeredByUserId: varchar("answered_by_user_id").references(() => users.id),
  answeredAt: timestamp("answered_at"),
  
  // Visibility
  isPrivate: boolean("is_private").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  roomIdx: index("idx_data_room_questions_room").on(table.dataRoomId),
  statusIdx: index("idx_data_room_questions_status").on(table.status),
}));

// Due Diligence Checklists Table
export const ddChecklists = pgTable("dd_checklists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").references(() => deals.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  checklistType: varchar("checklist_type", { length: 100 }),
  isTemplate: boolean("is_template").default(false),
  templateId: varchar("template_id"),
  completionPercentage: integer("completion_percentage").default(0),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  dealIdx: index("idx_dd_checklists_deal").on(table.dealId),
}));

// Due Diligence Checklist Items Table
export const ddChecklistItems = pgTable("dd_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  checklistId: varchar("checklist_id").references(() => ddChecklists.id, { onDelete: "cascade" }).notNull(),
  parentItemId: varchar("parent_item_id"),
  itemNumber: varchar("item_number", { length: 50 }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  priority: varchar("priority", { length: 20 }).default("medium"), // critical, high, medium, low
  status: checklistItemStatusEnum("status").default("not_started"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  completedBy: varchar("completed_by").references(() => users.id),
  notes: text("notes"),
  documentLinks: jsonb("document_links").default([]),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  checklistIdx: index("idx_dd_checklist_items_checklist").on(table.checklistId),
  statusIdx: index("idx_dd_checklist_items_status").on(table.status),
}));

// ============================================
// Phase 2 Relations
// ============================================

export const requestListsRelations = relations(requestLists, ({ one, many }) => ({
  deal: one(deals, {
    fields: [requestLists.dealId],
    references: [deals.id],
  }),
  createdByUser: one(users, {
    fields: [requestLists.createdBy],
    references: [users.id],
  }),
  items: many(requestItems),
}));

export const requestItemsRelations = relations(requestItems, ({ one }) => ({
  requestList: one(requestLists, {
    fields: [requestItems.requestListId],
    references: [requestLists.id],
  }),
  assignedToUser: one(users, {
    fields: [requestItems.assignedTo],
    references: [users.id],
  }),
  reviewedByUser: one(users, {
    fields: [requestItems.reviewedBy],
    references: [users.id],
  }),
}));

export const dataRoomsRelations = relations(dataRooms, ({ one, many }) => ({
  deal: one(deals, {
    fields: [dataRooms.dealId],
    references: [deals.id],
  }),
  createdByUser: one(users, {
    fields: [dataRooms.createdBy],
    references: [users.id],
  }),
  folders: many(dataRoomFolders),
  documents: many(dataRoomDocuments),
}));

export const dataRoomFoldersRelations = relations(dataRoomFolders, ({ one, many }) => ({
  dataRoom: one(dataRooms, {
    fields: [dataRoomFolders.dataRoomId],
    references: [dataRooms.id],
  }),
  documents: many(dataRoomDocuments),
}));

export const dataRoomDocumentsRelations = relations(dataRoomDocuments, ({ one }) => ({
  dataRoom: one(dataRooms, {
    fields: [dataRoomDocuments.dataRoomId],
    references: [dataRooms.id],
  }),
  folder: one(dataRoomFolders, {
    fields: [dataRoomDocuments.folderId],
    references: [dataRoomFolders.id],
  }),
  uploadedByUser: one(users, {
    fields: [dataRoomDocuments.uploadedBy],
    references: [users.id],
  }),
}));

export const ddChecklistsRelations = relations(ddChecklists, ({ one, many }) => ({
  deal: one(deals, {
    fields: [ddChecklists.dealId],
    references: [deals.id],
  }),
  createdByUser: one(users, {
    fields: [ddChecklists.createdBy],
    references: [users.id],
  }),
  items: many(ddChecklistItems),
}));

export const ddChecklistItemsRelations = relations(ddChecklistItems, ({ one }) => ({
  checklist: one(ddChecklists, {
    fields: [ddChecklistItems.checklistId],
    references: [ddChecklists.id],
  }),
  assignedToUser: one(users, {
    fields: [ddChecklistItems.assignedTo],
    references: [users.id],
  }),
  completedByUser: one(users, {
    fields: [ddChecklistItems.completedBy],
    references: [users.id],
  }),
}));

// ============================================
// Phase 2 Types
// ============================================

// Request List Types
export type RequestList = typeof requestLists.$inferSelect;
export const insertRequestListSchema = createInsertSchema(requestLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  assessmentNumber: true,
  assessor: true,
  createdBy: true,
}).extend({
  dueDate: z.coerce.date().optional().nullable(),
});
export type InsertRequestList = z.infer<typeof insertRequestListSchema>;

// Request Item Types
export type RequestItem = typeof requestItems.$inferSelect;
export const insertRequestItemSchema = createInsertSchema(requestItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dueDate: z.coerce.date().optional().nullable(),
  receivedDate: z.coerce.date().optional().nullable(),
  reviewedDate: z.coerce.date().optional().nullable(),
});
export type InsertRequestItem = z.infer<typeof insertRequestItemSchema>;

// Data Room Types
export type DataRoom = typeof dataRooms.$inferSelect;
export const insertDataRoomSchema = createInsertSchema(dataRooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  assessmentNumber: true,
  assessor: true,
  createdBy: true,
}).extend({
  dealId: z.string().uuid().optional().nullable(),
});
export type InsertDataRoom = z.infer<typeof insertDataRoomSchema>;

// Data Room Folder Types
export type DataRoomFolder = typeof dataRoomFolders.$inferSelect;
export const insertDataRoomFolderSchema = createInsertSchema(dataRoomFolders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lockedAt: true,
});
export type InsertDataRoomFolder = z.infer<typeof insertDataRoomFolderSchema>;

// Data Room Template Types
export type DataRoomTemplate = typeof dataRoomTemplates.$inferSelect;
export const insertDataRoomTemplateSchema = createInsertSchema(dataRoomTemplates).omit({
  id: true,
  createdAt: true,
});
export type InsertDataRoomTemplate = z.infer<typeof insertDataRoomTemplateSchema>;

// Data Room Document Types
export type DataRoomDocument = typeof dataRoomDocuments.$inferSelect;
export const insertDataRoomDocumentSchema = createInsertSchema(dataRoomDocuments).omit({
  id: true,
  uploadedAt: true,
  updatedAt: true,
  uploadedBy: true,
});
export type InsertDataRoomDocument = z.infer<typeof insertDataRoomDocumentSchema>;

// Data Room Guest Types
export type DataRoomGuest = typeof dataRoomGuests.$inferSelect;
export const insertDataRoomGuestSchema = createInsertSchema(dataRoomGuests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  invitedBy: true,
  isActivated: true,
  loginCount: true,
  lastLoginAt: true,
});
export type InsertDataRoomGuest = z.infer<typeof insertDataRoomGuestSchema>;

// Data Room Group Types
export type DataRoomGroup = typeof dataRoomGroups.$inferSelect;
export const insertDataRoomGroupSchema = createInsertSchema(dataRoomGroups).omit({
  id: true,
  createdAt: true,
});
export type InsertDataRoomGroup = z.infer<typeof insertDataRoomGroupSchema>;

// Data Room Access Types
export type DataRoomAccess = typeof dataRoomAccess.$inferSelect;
export const insertDataRoomAccessSchema = createInsertSchema(dataRoomAccess).omit({
  id: true,
  createdAt: true,
  accessGrantedAt: true,
  invitedBy: true,
});
export type InsertDataRoomAccess = z.infer<typeof insertDataRoomAccessSchema>;

// Data Room Folder Permission Types
export type DataRoomFolderPermission = typeof dataRoomFolderPermissions.$inferSelect;
export const insertDataRoomFolderPermissionSchema = createInsertSchema(dataRoomFolderPermissions).omit({
  id: true,
  createdAt: true,
});
export type InsertDataRoomFolderPermission = z.infer<typeof insertDataRoomFolderPermissionSchema>;

// Data Room File Permission Types
export type DataRoomFilePermission = typeof dataRoomFilePermissions.$inferSelect;
export const insertDataRoomFilePermissionSchema = createInsertSchema(dataRoomFilePermissions).omit({
  id: true,
  createdAt: true,
});
export type InsertDataRoomFilePermission = z.infer<typeof insertDataRoomFilePermissionSchema>;

// Data Room Audit Log Types
export type DataRoomAuditLogEntry = typeof dataRoomAuditLog.$inferSelect;
export const insertDataRoomAuditLogSchema = createInsertSchema(dataRoomAuditLog).omit({
  id: true,
  createdAt: true,
});
export type InsertDataRoomAuditLog = z.infer<typeof insertDataRoomAuditLogSchema>;

// Data Room Question Types
export type DataRoomQuestion = typeof dataRoomQuestions.$inferSelect;
export const insertDataRoomQuestionSchema = createInsertSchema(dataRoomQuestions).omit({
  id: true,
  createdAt: true,
  askedAt: true,
  answeredAt: true,
});
export type InsertDataRoomQuestion = z.infer<typeof insertDataRoomQuestionSchema>;

// DD Checklist Types
export type DDChecklist = typeof ddChecklists.$inferSelect;
export const insertDDChecklistSchema = createInsertSchema(ddChecklists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  assessmentNumber: true,
  assessor: true,
  createdBy: true,
  completionPercentage: true,
});
export type InsertDDChecklist = z.infer<typeof insertDDChecklistSchema>;

// DD Checklist Item Types
export type DDChecklistItem = typeof ddChecklistItems.$inferSelect;
export const insertDDChecklistItemSchema = createInsertSchema(ddChecklistItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedDate: true,
  completedBy: true,
}).extend({
  dueDate: z.coerce.date().optional().nullable(),
});
export type InsertDDChecklistItem = z.infer<typeof insertDDChecklistItemSchema>;

// ============================================
// E-Discovery Phase 1: Document Processing & De-duplication
// ============================================

// Processing job status enum
export const processingJobStatusEnum = pgEnum("processing_job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

// Processing exception type enum
export const processingExceptionTypeEnum = pgEnum("processing_exception_type", [
  "password_protected",
  "corrupted",
  "unsupported_format",
  "ocr_failed",
  "extraction_failed",
  "encoding_error",
  "timeout",
  "size_limit_exceeded",
  "other",
]);

// Document hashes for exact deduplication
export const documentHashes = pgTable("document_hashes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  communicationId: varchar("communication_id").references(() => communications.id, { onDelete: "cascade" }),
  md5Hash: varchar("md5_hash", { length: 32 }).notNull(),
  sha1Hash: varchar("sha1_hash", { length: 40 }).notNull(),
  sha256Hash: varchar("sha256_hash", { length: 64 }).notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
  isDuplicate: boolean("is_duplicate").default(false).notNull(),
  masterDocumentId: varchar("master_document_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  md5Idx: index("document_hashes_md5_idx").on(table.md5Hash),
  sha256Idx: index("document_hashes_sha256_idx").on(table.sha256Hash),
  communicationIdx: index("document_hashes_communication_idx").on(table.communicationId),
}));

// Near-duplicate clusters for fuzzy matching
export const nearDuplicateClusters = pgTable("near_duplicate_clusters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id, { onDelete: "cascade" }),
  clusterName: varchar("cluster_name", { length: 255 }),
  similarityThreshold: integer("similarity_threshold").default(85).notNull(), // Stored as percentage 0-100
  documentCount: integer("document_count").default(0).notNull(),
  primaryDocumentId: varchar("primary_document_id"),
  representativeText: text("representative_text"), // Sample text for cluster identification
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  caseIdx: index("near_duplicate_clusters_case_idx").on(table.caseId),
}));

// Near-duplicate cluster members
export const nearDuplicateMembers = pgTable("near_duplicate_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clusterId: varchar("cluster_id").references(() => nearDuplicateClusters.id, { onDelete: "cascade" }).notNull(),
  communicationId: varchar("communication_id").references(() => communications.id, { onDelete: "cascade" }).notNull(),
  similarityScore: integer("similarity_score").notNull(), // Stored as percentage 0-100
  isPrimary: boolean("is_primary").default(false).notNull(),
  minHashSignature: text("min_hash_signature"), // Stored signature for re-clustering
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  clusterIdx: index("near_duplicate_members_cluster_idx").on(table.clusterId),
  communicationIdx: index("near_duplicate_members_communication_idx").on(table.communicationId),
}));

// Email threads for conversation grouping
export const emailThreads = pgTable("email_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id, { onDelete: "cascade" }),
  threadId: varchar("thread_id", { length: 255 }).notNull(), // Derived from References/In-Reply-To or subject
  normalizedSubject: text("normalized_subject"), // Subject without Re:/Fwd: prefixes
  originalSubject: text("original_subject"),
  participantCount: integer("participant_count").default(0).notNull(),
  messageCount: integer("message_count").default(0).notNull(),
  dateStart: timestamp("date_start"),
  dateEnd: timestamp("date_end"),
  inclusiveMessageId: varchar("inclusive_message_id"), // The final email containing all prior content
  participants: jsonb("participants"), // Array of unique participant emails
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  caseIdx: index("email_threads_case_idx").on(table.caseId),
  threadIdIdx: index("email_threads_thread_id_idx").on(table.threadId),
}));

// Email thread members (individual emails in a thread)
export const emailThreadMembers = pgTable("email_thread_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").references(() => emailThreads.id, { onDelete: "cascade" }).notNull(),
  communicationId: varchar("communication_id").references(() => communications.id, { onDelete: "cascade" }).notNull(),
  isInclusive: boolean("is_inclusive").default(false).notNull(), // Only need to review inclusive emails
  threadPosition: integer("thread_position").notNull(), // Order in conversation (1, 2, 3...)
  hasUniqueContent: boolean("has_unique_content").default(true).notNull(), // Does this add new content?
  referencesHeader: text("references_header"), // Original References header
  inReplyToHeader: text("in_reply_to_header"), // Original In-Reply-To header
  messageIdHeader: text("message_id_header"), // Message-ID for this email
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  threadIdx: index("email_thread_members_thread_idx").on(table.threadId),
  communicationIdx: index("email_thread_members_communication_idx").on(table.communicationId),
}));

// Document family relationship type enum
export const documentRelationshipEnum = pgEnum("document_relationship", [
  "parent",
  "attachment",
  "embedded",
  "linked",
]);

// Document family members
export const documentFamilyMembers = pgTable("document_family_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").references(() => documentFamilies.id, { onDelete: "cascade" }).notNull(),
  communicationId: varchar("communication_id").references(() => communications.id, { onDelete: "cascade" }).notNull(),
  relationship: documentRelationshipEnum("relationship").notNull(),
  attachmentIndex: integer("attachment_index"), // Order of attachment (1, 2, 3...)
  attachmentName: text("attachment_name"), // Original filename
  attachmentSize: bigint("attachment_size", { mode: "number" }),
  attachmentType: varchar("attachment_type", { length: 100 }), // MIME type
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  familyIdx: index("document_family_members_family_idx").on(table.familyId),
  communicationIdx: index("document_family_members_communication_idx").on(table.communicationId),
}));

// Processing jobs for document ingestion
export const processingJobs = pgTable("processing_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id, { onDelete: "cascade" }),
  jobName: varchar("job_name", { length: 255 }),
  status: processingJobStatusEnum("status").default("pending").notNull(),
  totalFiles: integer("total_files").default(0).notNull(),
  processedFiles: integer("processed_files").default(0).notNull(),
  failedFiles: integer("failed_files").default(0).notNull(),
  skippedFiles: integer("skipped_files").default(0).notNull(),
  totalSizeBytes: bigint("total_size_bytes", { mode: "number" }).default(0),
  processedSizeBytes: bigint("processed_size_bytes", { mode: "number" }).default(0),
  createdBy: varchar("created_by").references(() => users.id),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"), // Additional job metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  caseIdx: index("processing_jobs_case_idx").on(table.caseId),
  statusIdx: index("processing_jobs_status_idx").on(table.status),
}));

// Processing exceptions for failed files
export const processingExceptions = pgTable("processing_exceptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").references(() => processingJobs.id, { onDelete: "cascade" }).notNull(),
  communicationId: varchar("communication_id").references(() => communications.id, { onDelete: "set null" }),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  filePath: text("file_path"),
  fileSize: bigint("file_size", { mode: "number" }),
  exceptionType: processingExceptionTypeEnum("exception_type").notNull(),
  exceptionMessage: text("exception_message"),
  stackTrace: text("stack_trace"),
  resolved: boolean("resolved").default(false).notNull(),
  resolution: text("resolution"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  retryCount: integer("retry_count").default(0).notNull(),
  lastRetryAt: timestamp("last_retry_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  jobIdx: index("processing_exceptions_job_idx").on(table.jobId),
  exceptionTypeIdx: index("processing_exceptions_type_idx").on(table.exceptionType),
  resolvedIdx: index("processing_exceptions_resolved_idx").on(table.resolved),
}));

// OCR results for scanned/image documents
export const ocrResults = pgTable("ocr_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  communicationId: varchar("communication_id").references(() => communications.id, { onDelete: "cascade" }).notNull(),
  pageNumber: integer("page_number").default(1).notNull(),
  extractedText: text("extracted_text"),
  confidenceScore: integer("confidence_score"), // 0-100 percentage
  language: varchar("language", { length: 10 }),
  ocrEngine: varchar("ocr_engine", { length: 50 }).default("tesseract"),
  processingTimeMs: integer("processing_time_ms"),
  wordCount: integer("word_count"),
  characterCount: integer("character_count"),
  needsReview: boolean("needs_review").default(false).notNull(), // Low confidence flagging
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  communicationIdx: index("ocr_results_communication_idx").on(table.communicationId),
  confidenceIdx: index("ocr_results_confidence_idx").on(table.confidenceScore),
}));

// ============================================
// E-Discovery Phase 1 Types
// ============================================

// Document Hashes Types
export type DocumentHash = typeof documentHashes.$inferSelect;
export const insertDocumentHashSchema = createInsertSchema(documentHashes).omit({
  id: true,
  createdAt: true,
});
export type InsertDocumentHash = z.infer<typeof insertDocumentHashSchema>;

// Near Duplicate Clusters Types
export type NearDuplicateCluster = typeof nearDuplicateClusters.$inferSelect;
export const insertNearDuplicateClusterSchema = createInsertSchema(nearDuplicateClusters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertNearDuplicateCluster = z.infer<typeof insertNearDuplicateClusterSchema>;

// Near Duplicate Members Types
export type NearDuplicateMember = typeof nearDuplicateMembers.$inferSelect;
export const insertNearDuplicateMemberSchema = createInsertSchema(nearDuplicateMembers).omit({
  id: true,
  createdAt: true,
});
export type InsertNearDuplicateMember = z.infer<typeof insertNearDuplicateMemberSchema>;

// Email Threads Types
export type EmailThread = typeof emailThreads.$inferSelect;
export const insertEmailThreadSchema = createInsertSchema(emailThreads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dateStart: z.coerce.date().optional().nullable(),
  dateEnd: z.coerce.date().optional().nullable(),
});
export type InsertEmailThread = z.infer<typeof insertEmailThreadSchema>;

// Email Thread Members Types
export type EmailThreadMember = typeof emailThreadMembers.$inferSelect;
export const insertEmailThreadMemberSchema = createInsertSchema(emailThreadMembers).omit({
  id: true,
  createdAt: true,
});
export type InsertEmailThreadMember = z.infer<typeof insertEmailThreadMemberSchema>;

// Document Family Members Types
export type DocumentFamilyMember = typeof documentFamilyMembers.$inferSelect;
export const insertDocumentFamilyMemberSchema = createInsertSchema(documentFamilyMembers).omit({
  id: true,
  createdAt: true,
});
export type InsertDocumentFamilyMember = z.infer<typeof insertDocumentFamilyMemberSchema>;

// Processing Jobs Types
export type ProcessingJob = typeof processingJobs.$inferSelect;
export const insertProcessingJobSchema = createInsertSchema(processingJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  assessmentNumber: true,
  assessor: true,
  createdBy: true,
}).extend({
  startedAt: z.coerce.date().optional().nullable(),
  completedAt: z.coerce.date().optional().nullable(),
});
export type InsertProcessingJob = z.infer<typeof insertProcessingJobSchema>;

// Processing Exceptions Types
export type ProcessingException = typeof processingExceptions.$inferSelect;
export const insertProcessingExceptionSchema = createInsertSchema(processingExceptions).omit({
  id: true,
  createdAt: true,
  resolvedBy: true,
  resolvedAt: true,
});
export type InsertProcessingException = z.infer<typeof insertProcessingExceptionSchema>;

// OCR Results Types
export type OcrResult = typeof ocrResults.$inferSelect;
export const insertOcrResultSchema = createInsertSchema(ocrResults).omit({
  id: true,
  createdAt: true,
});
export type InsertOcrResult = z.infer<typeof insertOcrResultSchema>;

// ============================================
// E-Discovery Phase 1 Relations
// ============================================

export const documentHashesRelations = relations(documentHashes, ({ one }) => ({
  communication: one(communications, {
    fields: [documentHashes.communicationId],
    references: [communications.id],
  }),
}));

export const nearDuplicateClustersRelations = relations(nearDuplicateClusters, ({ one, many }) => ({
  case: one(cases, {
    fields: [nearDuplicateClusters.caseId],
    references: [cases.id],
  }),
  members: many(nearDuplicateMembers),
}));

export const nearDuplicateMembersRelations = relations(nearDuplicateMembers, ({ one }) => ({
  cluster: one(nearDuplicateClusters, {
    fields: [nearDuplicateMembers.clusterId],
    references: [nearDuplicateClusters.id],
  }),
  communication: one(communications, {
    fields: [nearDuplicateMembers.communicationId],
    references: [communications.id],
  }),
}));

export const emailThreadsRelations = relations(emailThreads, ({ one, many }) => ({
  case: one(cases, {
    fields: [emailThreads.caseId],
    references: [cases.id],
  }),
  members: many(emailThreadMembers),
}));

export const emailThreadMembersRelations = relations(emailThreadMembers, ({ one }) => ({
  thread: one(emailThreads, {
    fields: [emailThreadMembers.threadId],
    references: [emailThreads.id],
  }),
  communication: one(communications, {
    fields: [emailThreadMembers.communicationId],
    references: [communications.id],
  }),
}));

export const documentFamiliesRelations = relations(documentFamilies, ({ one, many }) => ({
  case: one(cases, {
    fields: [documentFamilies.caseId],
    references: [cases.id],
  }),
  members: many(documentFamilyMembers),
}));

export const documentFamilyMembersRelations = relations(documentFamilyMembers, ({ one }) => ({
  family: one(documentFamilies, {
    fields: [documentFamilyMembers.familyId],
    references: [documentFamilies.id],
  }),
  communication: one(communications, {
    fields: [documentFamilyMembers.communicationId],
    references: [communications.id],
  }),
}));

export const processingJobsRelations = relations(processingJobs, ({ one, many }) => ({
  case: one(cases, {
    fields: [processingJobs.caseId],
    references: [cases.id],
  }),
  createdByUser: one(users, {
    fields: [processingJobs.createdBy],
    references: [users.id],
  }),
  exceptions: many(processingExceptions),
}));

export const processingExceptionsRelations = relations(processingExceptions, ({ one }) => ({
  job: one(processingJobs, {
    fields: [processingExceptions.jobId],
    references: [processingJobs.id],
  }),
  communication: one(communications, {
    fields: [processingExceptions.communicationId],
    references: [communications.id],
  }),
  resolvedByUser: one(users, {
    fields: [processingExceptions.resolvedBy],
    references: [users.id],
  }),
}));

export const ocrResultsRelations = relations(ocrResults, ({ one }) => ({
  communication: one(communications, {
    fields: [ocrResults.communicationId],
    references: [communications.id],
  }),
}));

// ==========================================
// Phase 2: TAR / Predictive Coding Tables
// ==========================================

// Enum for model status
export const predictionModelStatusEnum = pgEnum("prediction_model_status", [
  "pending",
  "training",
  "ready",
  "failed",
  "retired",
]);
export type PredictionModelStatusType = (typeof predictionModelStatusEnum.enumValues)[number];

// Enum for prediction category
export const predictionCategoryEnum = pgEnum("prediction_category", [
  "responsive",
  "non_responsive",
  "privileged",
  "hot",
  "needs_review",
]);
export type PredictionCategoryType = (typeof predictionCategoryEnum.enumValues)[number];

// Prediction Models - One per case, stores model configuration and metrics
export const predictionModels = pgTable("prediction_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: predictionModelStatusEnum("status").default("pending").notNull(),
  modelType: varchar("model_type", { length: 100 }).default("keyword_similarity").notNull(),
  trainingSize: integer("training_size").default(0).notNull(),
  accuracy: real("accuracy"),
  precision: real("precision"),
  recall: real("recall"),
  f1Score: real("f1_score"),
  positiveKeywords: jsonb("positive_keywords"), // Keywords associated with responsive docs
  negativeKeywords: jsonb("negative_keywords"), // Keywords associated with non-responsive docs
  modelConfig: jsonb("model_config"), // Additional model configuration
  trainedAt: timestamp("trained_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  caseIdx: index("prediction_models_case_idx").on(table.caseId),
  statusIdx: index("prediction_models_status_idx").on(table.status),
}));

export type PredictionModel = typeof predictionModels.$inferSelect;
export const insertPredictionModelSchema = createInsertSchema(predictionModels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPredictionModel = z.infer<typeof insertPredictionModelSchema>;

// Training Samples - Reviewer decisions used to train the model
export const trainingSamples = pgTable("training_samples", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  modelId: varchar("model_id").references(() => predictionModels.id, { onDelete: "cascade" }),
  communicationId: varchar("communication_id").references(() => communications.id, { onDelete: "cascade" }),
  category: predictionCategoryEnum("category").notNull(),
  confidence: real("confidence").default(1.0).notNull(), // Reviewer's confidence in the decision
  reviewerId: varchar("reviewer_id").references(() => users.id),
  reviewNotes: text("review_notes"),
  documentText: text("document_text"), // Cached text for training
  extractedKeywords: jsonb("extracted_keywords"), // Keywords extracted from this document
  isValidated: boolean("is_validated").default(false).notNull(), // Senior reviewer validation
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  modelIdx: index("training_samples_model_idx").on(table.modelId),
  communicationIdx: index("training_samples_communication_idx").on(table.communicationId),
  categoryIdx: index("training_samples_category_idx").on(table.category),
}));

export type TrainingSample = typeof trainingSamples.$inferSelect;
export const insertTrainingSampleSchema = createInsertSchema(trainingSamples).omit({
  id: true,
  createdAt: true,
});
export type InsertTrainingSample = z.infer<typeof insertTrainingSampleSchema>;

// Document Predictions - Predicted relevance scores for each document
export const documentPredictions = pgTable("document_predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  modelId: varchar("model_id").references(() => predictionModels.id, { onDelete: "cascade" }),
  communicationId: varchar("communication_id").references(() => communications.id, { onDelete: "cascade" }),
  predictedCategory: predictionCategoryEnum("predicted_category").notNull(),
  confidenceScore: real("confidence_score").notNull(), // 0.0 to 1.0
  responsiveScore: real("responsive_score"), // Raw score for responsive
  nonResponsiveScore: real("non_responsive_score"), // Raw score for non-responsive
  privilegedScore: real("privileged_score"), // Raw score for privileged
  hotScore: real("hot_score"), // Raw score for hot document
  rankOrder: integer("rank_order"), // Rank for active learning prioritization
  matchedKeywords: jsonb("matched_keywords"), // Keywords that triggered the prediction
  explanationText: text("explanation_text"), // Human-readable explanation
  isReviewed: boolean("is_reviewed").default(false).notNull(), // Has been reviewed by human
  reviewerAgreed: boolean("reviewer_agreed"), // Did reviewer agree with prediction
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  modelIdx: index("document_predictions_model_idx").on(table.modelId),
  communicationIdx: index("document_predictions_communication_idx").on(table.communicationId),
  confidenceIdx: index("document_predictions_confidence_idx").on(table.confidenceScore),
  rankIdx: index("document_predictions_rank_idx").on(table.rankOrder),
}));

export type DocumentPrediction = typeof documentPredictions.$inferSelect;
export const insertDocumentPredictionSchema = createInsertSchema(documentPredictions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDocumentPrediction = z.infer<typeof insertDocumentPredictionSchema>;

// Relations for Phase 2 tables
export const predictionModelsRelations = relations(predictionModels, ({ one, many }) => ({
  case: one(cases, {
    fields: [predictionModels.caseId],
    references: [cases.id],
  }),
  createdByUser: one(users, {
    fields: [predictionModels.createdBy],
    references: [users.id],
  }),
  trainingSamples: many(trainingSamples),
  predictions: many(documentPredictions),
}));

export const trainingSamplesRelations = relations(trainingSamples, ({ one }) => ({
  model: one(predictionModels, {
    fields: [trainingSamples.modelId],
    references: [predictionModels.id],
  }),
  communication: one(communications, {
    fields: [trainingSamples.communicationId],
    references: [communications.id],
  }),
  reviewer: one(users, {
    fields: [trainingSamples.reviewerId],
    references: [users.id],
  }),
}));

export const documentPredictionsRelations = relations(documentPredictions, ({ one }) => ({
  model: one(predictionModels, {
    fields: [documentPredictions.modelId],
    references: [predictionModels.id],
  }),
  communication: one(communications, {
    fields: [documentPredictions.communicationId],
    references: [communications.id],
  }),
}));

// ============================================================================
// Background Research - AI-Powered Preliminary Due Diligence
// ============================================================================

export const researchStatusEnum = pgEnum("research_status", [
  "draft",
  "processing",
  "completed",
  "failed",
]);

export const researchTypeEnum = pgEnum("research_type", [
  "full",
  "quick",
  "custom",
  "comprehensive",
]);

export const findingSeverityEnum = pgEnum("finding_severity", [
  "info",
  "low",
  "medium",
  "high",
  "critical",
]);

export const researchRiskLevelEnum = pgEnum("research_risk_level", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const documentCategoryEnum = pgEnum("document_category", [
  "financial_statement",
  "contract",
  "email",
  "presentation",
  "legal_filing",
  "internal_memo",
  "marketing",
  "other",
]);

export const entityTypeEnum = pgEnum("entity_type", [
  "person",
  "company",
  "amount",
  "date",
  "location",
]);

export const searchTypeEnum = pgEnum("search_type", [
  "company_info",
  "news",
  "litigation",
  "regulatory",
  "competitors",
]);

// Main Background Research table
export const backgroundResearch = pgTable("background_research", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").references(() => deals.id, { onDelete: "set null" }),
  caseId: varchar("case_id").references(() => cases.id, { onDelete: "set null" }),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }),
  targetName: varchar("target_name", { length: 255 }).notNull(),
  targetWebsite: varchar("target_website", { length: 500 }),
  targetIndustry: varchar("target_industry", { length: 100 }),
  targetDescription: text("target_description"),
  researchType: researchTypeEnum("research_type").default("full"),
  enabledModules: jsonb("enabled_modules").default([]),
  status: researchStatusEnum("status").default("draft"),
  progress: integer("progress").default(0),
  currentStep: varchar("current_step", { length: 100 }),
  executiveSummary: text("executive_summary"),
  riskScore: integer("risk_score"),
  riskLevel: researchRiskLevelEnum("risk_level"),
  keyFindings: jsonb("key_findings").default([]),
  documentCount: integer("document_count").default(0),
  pageCount: integer("page_count").default(0),
  processingTimeSeconds: integer("processing_time_seconds"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  dealIdx: index("background_research_deal_idx").on(table.dealId),
  caseIdx: index("background_research_case_idx").on(table.caseId),
  statusIdx: index("background_research_status_idx").on(table.status),
  createdByIdx: index("background_research_created_by_idx").on(table.createdBy),
}));

export type BackgroundResearch = typeof backgroundResearch.$inferSelect;
export const insertBackgroundResearchSchema = createInsertSchema(backgroundResearch).omit({
  id: true,
  createdAt: true,
});
export type InsertBackgroundResearch = z.infer<typeof insertBackgroundResearchSchema>;

// Documents uploaded for research
export const researchDocuments = pgTable("research_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  researchId: varchar("research_id").references(() => backgroundResearch.id, { onDelete: "cascade" }).notNull(),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 50 }),
  fileSize: bigint("file_size", { mode: "number" }),
  filePath: text("file_path"),
  documentCategory: documentCategoryEnum("document_category").default("other"),
  documentDate: timestamp("document_date"),
  extractedText: text("extracted_text"),
  pageCount: integer("page_count"),
  processingStatus: varchar("processing_status", { length: 50 }).default("pending"),
  aiSummary: text("ai_summary"),
  extractedEntities: jsonb("extracted_entities").default([]),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  researchIdx: index("research_documents_research_idx").on(table.researchId),
}));

export type ResearchDocument = typeof researchDocuments.$inferSelect;
export const insertResearchDocumentSchema = createInsertSchema(researchDocuments).omit({
  id: true,
  createdAt: true,
});
export type InsertResearchDocument = z.infer<typeof insertResearchDocumentSchema>;

// Individual findings from the research
export const researchFindings = pgTable("research_findings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  researchId: varchar("research_id").references(() => backgroundResearch.id, { onDelete: "cascade" }).notNull(),
  module: varchar("module", { length: 50 }).notNull(),
  category: varchar("category", { length: 100 }),
  subcategory: varchar("subcategory", { length: 100 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  details: jsonb("details"),
  severity: findingSeverityEnum("severity").default("info"),
  isKeyFinding: boolean("is_key_finding").default(false),
  requiresFollowUp: boolean("requires_follow_up").default(false),
  sourceType: varchar("source_type", { length: 50 }),
  sourceDocumentId: varchar("source_document_id").references(() => researchDocuments.id, { onDelete: "set null" }),
  sourceUrl: text("source_url"),
  sourceExcerpt: text("source_excerpt"),
  sourcePage: integer("source_page"),
  contradictsFindingId: varchar("contradicts_finding_id"),
  confidenceScore: real("confidence_score"),
  isVerified: boolean("is_verified").default(false),
  verifiedBy: varchar("verified_by").references(() => users.id),
  userNotes: text("user_notes"),
  isDismissed: boolean("is_dismissed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  researchIdx: index("research_findings_research_idx").on(table.researchId),
  moduleIdx: index("research_findings_module_idx").on(table.module),
  severityIdx: index("research_findings_severity_idx").on(table.severity),
  keyFindingIdx: index("research_findings_key_finding_idx").on(table.isKeyFinding),
}));

export type ResearchFinding = typeof researchFindings.$inferSelect;
export const insertResearchFindingSchema = createInsertSchema(researchFindings).omit({
  id: true,
  createdAt: true,
});
export type InsertResearchFinding = z.infer<typeof insertResearchFindingSchema>;

// Extracted entities (people, companies, etc.)
export const researchEntities = pgTable("research_entities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  researchId: varchar("research_id").references(() => backgroundResearch.id, { onDelete: "cascade" }).notNull(),
  entityType: entityTypeEnum("entity_type").notNull(),
  entityName: varchar("entity_name", { length: 255 }).notNull(),
  normalizedName: varchar("normalized_name", { length: 255 }),
  title: varchar("title", { length: 255 }),
  role: varchar("role", { length: 100 }),
  email: varchar("email", { length: 255 }),
  linkedinUrl: varchar("linkedin_url", { length: 500 }),
  relationship: varchar("relationship", { length: 100 }),
  website: varchar("website", { length: 500 }),
  amount: text("amount"),
  currency: varchar("currency", { length: 10 }),
  context: varchar("context", { length: 255 }),
  mentionCount: integer("mention_count").default(1),
  firstMentionDocId: varchar("first_mention_doc_id").references(() => researchDocuments.id, { onDelete: "set null" }),
  webResearchComplete: boolean("web_research_complete").default(false),
  webResearchResults: jsonb("web_research_results"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  researchIdx: index("research_entities_research_idx").on(table.researchId),
  entityTypeIdx: index("research_entities_type_idx").on(table.entityType),
}));

export type ResearchEntity = typeof researchEntities.$inferSelect;
export const insertResearchEntitySchema = createInsertSchema(researchEntities).omit({
  id: true,
  createdAt: true,
});
export type InsertResearchEntity = z.infer<typeof insertResearchEntitySchema>;

// Web search results
export const researchWebSearches = pgTable("research_web_searches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  researchId: varchar("research_id").references(() => backgroundResearch.id, { onDelete: "cascade" }).notNull(),
  query: text("query").notNull(),
  searchType: searchTypeEnum("search_type"),
  results: jsonb("results").default([]),
  resultCount: integer("result_count").default(0),
  searchedAt: timestamp("searched_at").defaultNow(),
}, (table) => ({
  researchIdx: index("research_web_searches_research_idx").on(table.researchId),
}));

export type ResearchWebSearch = typeof researchWebSearches.$inferSelect;
export const insertResearchWebSearchSchema = createInsertSchema(researchWebSearches).omit({
  id: true,
  searchedAt: true,
});
export type InsertResearchWebSearch = z.infer<typeof insertResearchWebSearchSchema>;

// Follow-up questions generated by AI
export const researchFollowUpQuestions = pgTable("research_follow_up_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  researchId: varchar("research_id").references(() => backgroundResearch.id, { onDelete: "cascade" }).notNull(),
  findingId: varchar("finding_id").references(() => researchFindings.id, { onDelete: "set null" }),
  question: text("question").notNull(),
  context: text("context"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  category: varchar("category", { length: 100 }),
  isAnswered: boolean("is_answered").default(false),
  answer: text("answer"),
  answeredBy: varchar("answered_by").references(() => users.id),
  answeredAt: timestamp("answered_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  researchIdx: index("research_followup_questions_research_idx").on(table.researchId),
  findingIdx: index("research_followup_questions_finding_idx").on(table.findingId),
  isAnsweredIdx: index("research_followup_questions_answered_idx").on(table.isAnswered),
}));

export type ResearchFollowUpQuestion = typeof researchFollowUpQuestions.$inferSelect;
export const insertResearchFollowUpQuestionSchema = createInsertSchema(researchFollowUpQuestions).omit({
  id: true,
  createdAt: true,
});
export type InsertResearchFollowUpQuestion = z.infer<typeof insertResearchFollowUpQuestionSchema>;

// Relations for Background Research tables
export const backgroundResearchRelations = relations(backgroundResearch, ({ one, many }) => ({
  deal: one(deals, {
    fields: [backgroundResearch.dealId],
    references: [deals.id],
  }),
  case: one(cases, {
    fields: [backgroundResearch.caseId],
    references: [cases.id],
  }),
  createdByUser: one(users, {
    fields: [backgroundResearch.createdBy],
    references: [users.id],
  }),
  documents: many(researchDocuments),
  findings: many(researchFindings),
  entities: many(researchEntities),
  webSearches: many(researchWebSearches),
  followUpQuestions: many(researchFollowUpQuestions),
}));

export const researchDocumentsRelations = relations(researchDocuments, ({ one }) => ({
  research: one(backgroundResearch, {
    fields: [researchDocuments.researchId],
    references: [backgroundResearch.id],
  }),
}));

export const researchFindingsRelations = relations(researchFindings, ({ one }) => ({
  research: one(backgroundResearch, {
    fields: [researchFindings.researchId],
    references: [backgroundResearch.id],
  }),
  sourceDocument: one(researchDocuments, {
    fields: [researchFindings.sourceDocumentId],
    references: [researchDocuments.id],
  }),
  verifiedByUser: one(users, {
    fields: [researchFindings.verifiedBy],
    references: [users.id],
  }),
}));

export const researchEntitiesRelations = relations(researchEntities, ({ one }) => ({
  research: one(backgroundResearch, {
    fields: [researchEntities.researchId],
    references: [backgroundResearch.id],
  }),
  firstMentionDocument: one(researchDocuments, {
    fields: [researchEntities.firstMentionDocId],
    references: [researchDocuments.id],
  }),
}));

export const researchWebSearchesRelations = relations(researchWebSearches, ({ one }) => ({
  research: one(backgroundResearch, {
    fields: [researchWebSearches.researchId],
    references: [backgroundResearch.id],
  }),
}));

export const researchFollowUpQuestionsRelations = relations(researchFollowUpQuestions, ({ one }) => ({
  research: one(backgroundResearch, {
    fields: [researchFollowUpQuestions.researchId],
    references: [backgroundResearch.id],
  }),
  finding: one(researchFindings, {
    fields: [researchFollowUpQuestions.findingId],
    references: [researchFindings.id],
  }),
  answeredByUser: one(users, {
    fields: [researchFollowUpQuestions.answeredBy],
    references: [users.id],
  }),
}));

// ============================================
// DEAL TEMPLATES SYSTEM
// ============================================

// Enums for Deal Templates
export const templateItemTypeEnum = pgEnum("template_item_type", [
  "checklist",
  "document",
  "document_set",
  "approval",
  "date",
  "text",
]);

export const dealChecklistItemStatusEnum = pgEnum("deal_checklist_item_status", [
  "pending",
  "in_progress",
  "waiting",
  "complete",
  "na",
  "waived",
]);

export const satisfactionMethodEnum = pgEnum("satisfaction_method", [
  "manual",
  "document",
  "auto",
  "waived",
]);

export const checklistDocumentStatusEnum = pgEnum("checklist_document_status", [
  "uploaded",
  "under_review",
  "approved",
  "rejected",
  "superseded",
]);

export const checklistCommentTypeEnum = pgEnum("checklist_comment_type", [
  "comment",
  "status_change",
  "assignment",
  "document_upload",
  "system",
]);

// Master template definitions
export const dealTemplates = pgTable("deal_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  transactionType: varchar("transaction_type", { length: 100 }).notNull(),
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  isSystemTemplate: boolean("is_system_template").default(false),
  createdBy: varchar("created_by").references(() => users.id),
  organizationId: varchar("organization_id"),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  slugIdx: index("deal_templates_slug_idx").on(table.slug),
  transactionTypeIdx: index("deal_templates_transaction_type_idx").on(table.transactionType),
}));

export type DealTemplate = typeof dealTemplates.$inferSelect;
export const insertDealTemplateSchema = createInsertSchema(dealTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDealTemplate = z.infer<typeof insertDealTemplateSchema>;

// Template categories (sections of the checklist)
export const templateCategories = pgTable("template_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => dealTemplates.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 20 }),
  isCollapsible: boolean("is_collapsible").default(true),
  defaultExpanded: boolean("default_expanded").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  templateIdx: index("template_categories_template_idx").on(table.templateId),
  sortOrderIdx: index("template_categories_sort_order_idx").on(table.sortOrder),
}));

export type TemplateCategory = typeof templateCategories.$inferSelect;
export const insertTemplateCategorySchema = createInsertSchema(templateCategories).omit({
  id: true,
  createdAt: true,
});
export type InsertTemplateCategory = z.infer<typeof insertTemplateCategorySchema>;

// Individual checklist items within categories
export const templateItems = pgTable("template_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => templateCategories.id, { onDelete: "cascade" }).notNull(),
  templateId: varchar("template_id").references(() => dealTemplates.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  guidance: text("guidance"),
  sortOrder: integer("sort_order").default(0),
  itemType: templateItemTypeEnum("item_type").default("checklist"),
  documentKeywords: jsonb("document_keywords"),
  documentTypes: jsonb("document_types"),
  requiredDocumentCount: integer("required_document_count").default(1),
  isRequired: boolean("is_required").default(false),
  isCritical: boolean("is_critical").default(false),
  dependsOnItemId: varchar("depends_on_item_id"),
  defaultAssigneeRole: varchar("default_assignee_role", { length: 100 }),
  typicalDaysFromStart: integer("typical_days_from_start"),
  typicalDaysBeforeClose: integer("typical_days_before_close"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  categoryIdx: index("template_items_category_idx").on(table.categoryId),
  templateIdx: index("template_items_template_idx").on(table.templateId),
  sortOrderIdx: index("template_items_sort_order_idx").on(table.sortOrder),
}));

export type TemplateItem = typeof templateItems.$inferSelect;
export const insertTemplateItemSchema = createInsertSchema(templateItems).omit({
  id: true,
  createdAt: true,
});
export type InsertTemplateItem = z.infer<typeof insertTemplateItemSchema>;

// When a template is applied to a deal, create instance records
export const dealChecklists = pgTable("deal_checklists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").references(() => deals.id, { onDelete: "cascade" }).notNull(),
  templateId: varchar("template_id").references(() => dealTemplates.id).notNull(),
  totalItems: integer("total_items").default(0),
  completedItems: integer("completed_items").default(0),
  percentComplete: real("percent_complete").default(0),
  effectiveDate: timestamp("effective_date"),
  targetCloseDate: timestamp("target_close_date"),
  appliedBy: varchar("applied_by").references(() => users.id),
  appliedAt: timestamp("applied_at").defaultNow(),
}, (table) => ({
  dealIdx: index("deal_checklists_deal_idx").on(table.dealId),
  templateIdx: index("deal_checklists_template_idx").on(table.templateId),
}));

export type DealChecklist = typeof dealChecklists.$inferSelect;
export const insertDealChecklistSchema = createInsertSchema(dealChecklists).omit({
  id: true,
  appliedAt: true,
});
export type InsertDealChecklist = z.infer<typeof insertDealChecklistSchema>;

// Individual checklist item instances for a deal
export const dealChecklistItems = pgTable("deal_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealChecklistId: varchar("deal_checklist_id").references(() => dealChecklists.id, { onDelete: "cascade" }).notNull(),
  templateItemId: varchar("template_item_id").references(() => templateItems.id).notNull(),
  dealId: varchar("deal_id").references(() => deals.id, { onDelete: "cascade" }).notNull(),
  customName: varchar("custom_name", { length: 500 }),
  customDescription: text("custom_description"),
  status: dealChecklistItemStatusEnum("status").default("pending"),
  satisfactionMethod: satisfactionMethodEnum("satisfaction_method"),
  satisfiedAt: timestamp("satisfied_at"),
  satisfiedBy: varchar("satisfied_by").references(() => users.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  assignedRole: varchar("assigned_role", { length: 100 }),
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  dateValue: timestamp("date_value"),
  textValue: text("text_value"),
  isBlocked: boolean("is_blocked").default(false),
  blockedReason: text("blocked_reason"),
  needsAttention: boolean("needs_attention").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  dealChecklistIdx: index("deal_checklist_items_checklist_idx").on(table.dealChecklistId),
  templateItemIdx: index("deal_checklist_items_template_item_idx").on(table.templateItemId),
  dealIdx: index("deal_checklist_items_deal_idx").on(table.dealId),
  statusIdx: index("deal_checklist_items_status_idx").on(table.status),
}));

export type DealChecklistItem = typeof dealChecklistItems.$inferSelect;
export const insertDealChecklistItemSchema = createInsertSchema(dealChecklistItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDealChecklistItem = z.infer<typeof insertDealChecklistItemSchema>;

// Documents linked to checklist items
export const checklistItemDocuments = pgTable("checklist_item_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  checklistItemId: varchar("checklist_item_id").references(() => dealChecklistItems.id, { onDelete: "cascade" }).notNull(),
  documentId: varchar("document_id").references(() => dataRoomDocuments.id, { onDelete: "set null" }),
  externalUrl: text("external_url"),
  externalName: varchar("external_name", { length: 255 }),
  documentStatus: checklistDocumentStatusEnum("document_status").default("uploaded"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  versionNumber: integer("version_number").default(1),
  isCurrentVersion: boolean("is_current_version").default(true),
  matchedKeywords: jsonb("matched_keywords"),
  confidence: real("confidence"),
  autoMatched: boolean("auto_matched").default(false),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
}, (table) => ({
  checklistItemIdx: index("checklist_item_documents_item_idx").on(table.checklistItemId),
  documentIdx: index("checklist_item_documents_doc_idx").on(table.documentId),
}));

export type ChecklistItemDocument = typeof checklistItemDocuments.$inferSelect;
export const insertChecklistItemDocumentSchema = createInsertSchema(checklistItemDocuments).omit({
  id: true,
  uploadedAt: true,
});
export type InsertChecklistItemDocument = z.infer<typeof insertChecklistItemDocumentSchema>;

// Comments/activity on checklist items
export const checklistItemComments = pgTable("checklist_item_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  checklistItemId: varchar("checklist_item_id").references(() => dealChecklistItems.id, { onDelete: "cascade" }).notNull(),
  commentText: text("comment_text").notNull(),
  commentType: checklistCommentTypeEnum("comment_type").default("comment"),
  isInternal: boolean("is_internal").default(false),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  checklistItemIdx: index("checklist_item_comments_item_idx").on(table.checklistItemId),
  typeIdx: index("checklist_item_comments_type_idx").on(table.commentType),
}));

export type ChecklistItemComment = typeof checklistItemComments.$inferSelect;
export const insertChecklistItemCommentSchema = createInsertSchema(checklistItemComments).omit({
  id: true,
  createdAt: true,
});
export type InsertChecklistItemComment = z.infer<typeof insertChecklistItemCommentSchema>;

// Relations for Deal Templates tables
export const dealTemplatesRelations = relations(dealTemplates, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [dealTemplates.createdBy],
    references: [users.id],
  }),
  categories: many(templateCategories),
  items: many(templateItems),
  checklists: many(dealChecklists),
}));

export const templateCategoriesRelations = relations(templateCategories, ({ one, many }) => ({
  template: one(dealTemplates, {
    fields: [templateCategories.templateId],
    references: [dealTemplates.id],
  }),
  items: many(templateItems),
}));

export const templateItemsRelations = relations(templateItems, ({ one }) => ({
  category: one(templateCategories, {
    fields: [templateItems.categoryId],
    references: [templateCategories.id],
  }),
  template: one(dealTemplates, {
    fields: [templateItems.templateId],
    references: [dealTemplates.id],
  }),
}));

export const dealChecklistsRelations = relations(dealChecklists, ({ one, many }) => ({
  deal: one(deals, {
    fields: [dealChecklists.dealId],
    references: [deals.id],
  }),
  template: one(dealTemplates, {
    fields: [dealChecklists.templateId],
    references: [dealTemplates.id],
  }),
  appliedByUser: one(users, {
    fields: [dealChecklists.appliedBy],
    references: [users.id],
  }),
  items: many(dealChecklistItems),
}));

export const dealChecklistItemsRelations = relations(dealChecklistItems, ({ one, many }) => ({
  checklist: one(dealChecklists, {
    fields: [dealChecklistItems.dealChecklistId],
    references: [dealChecklists.id],
  }),
  templateItem: one(templateItems, {
    fields: [dealChecklistItems.templateItemId],
    references: [templateItems.id],
  }),
  deal: one(deals, {
    fields: [dealChecklistItems.dealId],
    references: [deals.id],
  }),
  satisfiedByUser: one(users, {
    fields: [dealChecklistItems.satisfiedBy],
    references: [users.id],
  }),
  assignedToUser: one(users, {
    fields: [dealChecklistItems.assignedTo],
    references: [users.id],
  }),
  documents: many(checklistItemDocuments),
  comments: many(checklistItemComments),
}));

export const checklistItemDocumentsRelations = relations(checklistItemDocuments, ({ one }) => ({
  checklistItem: one(dealChecklistItems, {
    fields: [checklistItemDocuments.checklistItemId],
    references: [dealChecklistItems.id],
  }),
  document: one(dataRoomDocuments, {
    fields: [checklistItemDocuments.documentId],
    references: [dataRoomDocuments.id],
  }),
  reviewedByUser: one(users, {
    fields: [checklistItemDocuments.reviewedBy],
    references: [users.id],
  }),
  uploadedByUser: one(users, {
    fields: [checklistItemDocuments.uploadedBy],
    references: [users.id],
  }),
}));

export const checklistItemCommentsRelations = relations(checklistItemComments, ({ one }) => ({
  checklistItem: one(dealChecklistItems, {
    fields: [checklistItemComments.checklistItemId],
    references: [dealChecklistItems.id],
  }),
  createdByUser: one(users, {
    fields: [checklistItemComments.createdBy],
    references: [users.id],
  }),
}));

// ============================================
// DOCUMENT CLASSIFICATION & INTELLIGENT PROCESSING
// ============================================

// Document type definitions for classification
export const documentTypeDefinitions = pgTable("document_type_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Type identification
  typeCode: varchar("type_code", { length: 100 }).notNull().unique(),
  typeName: varchar("type_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }), // 'contract', 'disclosure', 'title', 'financial', etc.
  transactionType: varchar("transaction_type", { length: 100 }), // 'real_estate', 'acquisition', 'loan', 'all'
  
  // Classification hints
  keywords: jsonb("keywords"), // Array of keywords that indicate this doc type
  filenamePatterns: jsonb("filename_patterns"), // Regex patterns for filenames
  contentPatterns: jsonb("content_patterns"), // Text patterns in document content
  requiredElements: jsonb("required_elements"), // Elements that MUST be present
  
  // Extraction rules
  extractionSchema: jsonb("extraction_schema"), // What data to extract from this doc type
  
  // Related checklist items (for matching)
  defaultChecklistItemSlugs: jsonb("default_checklist_item_slugs"),
  
  // Learning
  exampleDocumentIds: jsonb("example_document_ids"), // IDs of confirmed examples
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type DocumentTypeDefinition = typeof documentTypeDefinitions.$inferSelect;
export const insertDocumentTypeDefinitionSchema = createInsertSchema(documentTypeDefinitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDocumentTypeDefinition = z.infer<typeof insertDocumentTypeDefinitionSchema>;

// Document classification results
export const documentClassifications = pgTable("document_classifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => dataRoomDocuments.id, { onDelete: "cascade" }).notNull(),
  dealId: varchar("deal_id").references(() => deals.id, { onDelete: "cascade" }).notNull(),
  
  // Classification results
  primaryClassification: varchar("primary_classification", { length: 100 }),
  secondaryClassifications: jsonb("secondary_classifications"), // Array of possible matches
  confidence: real("confidence"), // 0-1 confidence score
  
  // Matched checklist item
  matchedChecklistItemId: varchar("matched_checklist_item_id").references(() => dealChecklistItems.id),
  matchConfidence: real("match_confidence"),
  matchMethod: varchar("match_method", { length: 50 }), // 'ai_classification', 'keyword', 'filename', 'manual'
  
  // Extraction results
  extractedMetadata: jsonb("extracted_metadata"), // Key data points extracted from doc
  extractedParties: jsonb("extracted_parties"), // Parties identified in document
  extractedDates: jsonb("extracted_dates"), // Important dates found
  extractedAmounts: jsonb("extracted_amounts"), // Dollar amounts found
  
  // Verification
  isVerified: boolean("is_verified").default(false),
  verifiedBy: varchar("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  verificationNotes: text("verification_notes"),
  
  // If classification was wrong
  wasReclassified: boolean("was_reclassified").default(false),
  originalClassification: varchar("original_classification", { length: 100 }),
  reclassifiedBy: varchar("reclassified_by").references(() => users.id),
  
  classifiedAt: timestamp("classified_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  docIdx: index("idx_doc_classifications_doc").on(table.documentId),
  dealIdx: index("idx_doc_classifications_deal").on(table.dealId),
}));

export type DocumentClassification = typeof documentClassifications.$inferSelect;
export const insertDocumentClassificationSchema = createInsertSchema(documentClassifications).omit({
  id: true,
  classifiedAt: true,
  createdAt: true,
});
export type InsertDocumentClassification = z.infer<typeof insertDocumentClassificationSchema>;

// Classification learning/feedback
export const classificationFeedback = pgTable("classification_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => dataRoomDocuments.id, { onDelete: "cascade" }).notNull(),
  
  aiClassification: varchar("ai_classification", { length: 100 }),
  correctClassification: varchar("correct_classification", { length: 100 }),
  wasCorrect: boolean("was_correct"),
  
  feedbackBy: varchar("feedback_by").references(() => users.id),
  feedbackAt: timestamp("feedback_at").defaultNow(),
  notes: text("notes"),
});

export type ClassificationFeedback = typeof classificationFeedback.$inferSelect;
export const insertClassificationFeedbackSchema = createInsertSchema(classificationFeedback).omit({
  id: true,
  feedbackAt: true,
});
export type InsertClassificationFeedback = z.infer<typeof insertClassificationFeedbackSchema>;

// ============================================
// DEAL TERMS & DOCUMENT GENERATION
// ============================================

// Deal terms extraction
export const dealTerms = pgTable("deal_terms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").references(() => deals.id, { onDelete: "cascade" }).notNull(),
  
  // Source of terms
  sourceType: varchar("source_type", { length: 50 }), // 'loi', 'term_sheet', 'manual_entry', 'psa_extraction'
  sourceDocumentId: varchar("source_document_id").references(() => dataRoomDocuments.id, { onDelete: "set null" }),
  
  // Property Information
  propertyName: varchar("property_name", { length: 255 }),
  propertyAddress: text("property_address"),
  propertyCity: varchar("property_city", { length: 100 }),
  propertyState: varchar("property_state", { length: 50 }),
  propertyZip: varchar("property_zip", { length: 20 }),
  propertyCounty: varchar("property_county", { length: 100 }),
  legalDescription: text("legal_description"),
  parcelId: varchar("parcel_id", { length: 100 }),
  propertyType: varchar("property_type", { length: 100 }), // 'office', 'retail', 'industrial', 'multifamily', 'mixed_use', 'land', 'hospitality'
  squareFeet: integer("square_feet"),
  acreage: text("acreage"),
  units: integer("units"), // For multifamily
  yearBuilt: integer("year_built"),
  
  // Buyer
  buyerName: varchar("buyer_name", { length: 255 }),
  buyerEntityType: varchar("buyer_entity_type", { length: 50 }), // 'llc', 'lp', 'corporation', 'individual', 'trust'
  buyerStateOfFormation: varchar("buyer_state_of_formation", { length: 50 }),
  buyerAddress: text("buyer_address"),
  buyerSignerName: varchar("buyer_signer_name", { length: 255 }),
  buyerSignerTitle: varchar("buyer_signer_title", { length: 100 }),
  
  // Seller
  sellerName: varchar("seller_name", { length: 255 }),
  sellerEntityType: varchar("seller_entity_type", { length: 50 }),
  sellerStateOfFormation: varchar("seller_state_of_formation", { length: 50 }),
  sellerAddress: text("seller_address"),
  sellerSignerName: varchar("seller_signer_name", { length: 255 }),
  sellerSignerTitle: varchar("seller_signer_title", { length: 100 }),
  
  // Escrow Agent / Title Company
  escrowAgentName: varchar("escrow_agent_name", { length: 255 }),
  escrowAgentAddress: text("escrow_agent_address"),
  escrowAgentContact: varchar("escrow_agent_contact", { length: 255 }),
  escrowAgentEmail: varchar("escrow_agent_email", { length: 255 }),
  
  // Financial Terms
  purchasePrice: text("purchase_price"),
  initialDeposit: text("initial_deposit"),
  initialDepositDays: integer("initial_deposit_days"), // Days after execution
  additionalDeposit: text("additional_deposit"),
  additionalDepositTrigger: varchar("additional_deposit_trigger", { length: 100 }), // 'dd_expiration', 'specific_date', 'contingency_waiver'
  depositHardDate: date("deposit_hard_date"), // When deposit goes hard
  
  // Key Dates & Periods
  effectiveDate: date("effective_date"),
  dueDiligencePeriodDays: integer("due_diligence_period_days"),
  dueDiligenceExpiration: date("due_diligence_expiration"),
  hasFinancingContingency: boolean("has_financing_contingency").default(false),
  financingContingencyDays: integer("financing_contingency_days"),
  financingContingencyExpiration: date("financing_contingency_expiration"),
  closingDate: date("closing_date"),
  closingExtensionDays: integer("closing_extension_days"),
  closingExtensionFee: text("closing_extension_fee"),
  
  // Title & Survey
  titleObjectionPeriodDays: integer("title_objection_period_days"),
  surveyObjectionPeriodDays: integer("survey_objection_period_days"),
  titleCurePeriodDays: integer("title_cure_period_days"),
  titleInsuranceAmount: text("title_insurance_amount"),
  
  // Representations & Warranties
  repsSurvivalMonths: integer("reps_survival_months"),
  repsCap: text("reps_cap"), // Cap on seller liability
  repsBasket: text("reps_basket"), // Deductible
  
  // Special Conditions
  specialConditions: jsonb("special_conditions"), // Array of: { condition, party, deadline }
  additionalTerms: jsonb("additional_terms"),
  
  // Status
  isComplete: boolean("is_complete").default(false),
  lastUpdatedBy: varchar("last_updated_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  dealIdx: index("idx_deal_terms_deal").on(table.dealId),
}));

export type DealTerms = typeof dealTerms.$inferSelect;
export const insertDealTermsSchema = createInsertSchema(dealTerms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDealTerms = z.infer<typeof insertDealTermsSchema>;

// Document templates (firm's past documents)
export const documentTemplates = pgTable("document_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Template identification
  name: varchar("name", { length: 255 }).notNull(),
  documentType: varchar("document_type", { length: 100 }).notNull(), // 'psa', 'amendment', 'assignment', 'deed', 'bill_of_sale', 'closing_certificate', etc.
  transactionType: varchar("transaction_type", { length: 100 }), // 'real_estate', 'acquisition', 'loan'
  propertyType: varchar("property_type", { length: 100 }), // 'office', 'retail', 'multifamily', 'industrial', 'all'
  jurisdiction: varchar("jurisdiction", { length: 50 }), // State code or 'all'
  
  // Source document
  sourceDocumentId: varchar("source_document_id").references(() => dataRoomDocuments.id, { onDelete: "set null" }),
  
  // Processed template
  templateContent: text("template_content"), // With placeholders
  templateFormat: varchar("template_format", { length: 20 }), // 'docx', 'html', 'markdown'
  
  // Variables/placeholders used in this template
  variables: jsonb("variables"), // [{ name, type, required }, ...]
  
  // Template metadata
  description: text("description"),
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  
  // Quality/usage tracking
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  rating: real("rating"), // User ratings
  
  // Learning metadata
  sourceTransactionType: varchar("source_transaction_type", { length: 100 }),
  sourceClosingDate: date("source_closing_date"),
  
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export const insertDocumentTemplateSchema = createInsertSchema(documentTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDocumentTemplate = z.infer<typeof insertDocumentTemplateSchema>;

// Generated documents
export const generatedDocuments = pgTable("generated_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").references(() => deals.id, { onDelete: "cascade" }).notNull(),
  
  documentType: varchar("document_type", { length: 100 }).notNull(),
  documentName: varchar("document_name", { length: 255 }),
  
  // Source template used
  templateId: varchar("template_id").references(() => documentTemplates.id),
  
  // Terms used for generation
  dealTermsId: varchar("deal_terms_id").references(() => dealTerms.id),
  termsSnapshotJson: jsonb("terms_snapshot_json"), // Snapshot of terms at generation
  
  // Generated content
  generatedContent: text("generated_content"), // AI-generated document text
  
  // Generated file
  generatedFileId: varchar("generated_file_id").references(() => dataRoomDocuments.id, { onDelete: "set null" }),
  
  // Version tracking
  version: integer("version").default(1),
  parentVersionId: varchar("parent_version_id"),
  
  // Status
  status: varchar("status", { length: 50 }).default("draft"), // 'draft', 'review', 'approved', 'executed', 'superseded'
  
  // Review tracking
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  
  generatedBy: varchar("generated_by").references(() => users.id),
  generatedAt: timestamp("generated_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  dealIdx: index("idx_generated_docs_deal").on(table.dealId),
}));

export type GeneratedDocument = typeof generatedDocuments.$inferSelect;
export const insertGeneratedDocumentSchema = createInsertSchema(generatedDocuments).omit({
  id: true,
  generatedAt: true,
  updatedAt: true,
});
export type InsertGeneratedDocument = z.infer<typeof insertGeneratedDocumentSchema>;

// Relations for Document Classification & Generation tables
export const documentClassificationsRelations = relations(documentClassifications, ({ one }) => ({
  document: one(dataRoomDocuments, {
    fields: [documentClassifications.documentId],
    references: [dataRoomDocuments.id],
  }),
  deal: one(deals, {
    fields: [documentClassifications.dealId],
    references: [deals.id],
  }),
  matchedChecklistItem: one(dealChecklistItems, {
    fields: [documentClassifications.matchedChecklistItemId],
    references: [dealChecklistItems.id],
  }),
  verifiedByUser: one(users, {
    fields: [documentClassifications.verifiedBy],
    references: [users.id],
  }),
  reclassifiedByUser: one(users, {
    fields: [documentClassifications.reclassifiedBy],
    references: [users.id],
  }),
}));

export const dealTermsRelations = relations(dealTerms, ({ one }) => ({
  deal: one(deals, {
    fields: [dealTerms.dealId],
    references: [deals.id],
  }),
  sourceDocument: one(dataRoomDocuments, {
    fields: [dealTerms.sourceDocumentId],
    references: [dataRoomDocuments.id],
  }),
  lastUpdatedByUser: one(users, {
    fields: [dealTerms.lastUpdatedBy],
    references: [users.id],
  }),
}));

export const documentTemplatesRelations = relations(documentTemplates, ({ one }) => ({
  sourceDocument: one(dataRoomDocuments, {
    fields: [documentTemplates.sourceDocumentId],
    references: [dataRoomDocuments.id],
  }),
  createdByUser: one(users, {
    fields: [documentTemplates.createdBy],
    references: [users.id],
  }),
}));

export const generatedDocumentsRelations = relations(generatedDocuments, ({ one }) => ({
  deal: one(deals, {
    fields: [generatedDocuments.dealId],
    references: [deals.id],
  }),
  template: one(documentTemplates, {
    fields: [generatedDocuments.templateId],
    references: [documentTemplates.id],
  }),
  dealTermsRecord: one(dealTerms, {
    fields: [generatedDocuments.dealTermsId],
    references: [dealTerms.id],
  }),
  generatedFile: one(dataRoomDocuments, {
    fields: [generatedDocuments.generatedFileId],
    references: [dataRoomDocuments.id],
  }),
  reviewedByUser: one(users, {
    fields: [generatedDocuments.reviewedBy],
    references: [users.id],
  }),
  generatedByUser: one(users, {
    fields: [generatedDocuments.generatedBy],
    references: [users.id],
  }),
}));

// ============================================
// AMBIENT INTELLIGENCE TABLES
// ============================================

// Enums for Ambient Intelligence
export const ambientSessionTypeEnum = pgEnum("ambient_session_type", [
  "interview",
  "client_call",
  "strategy_meeting",
  "witness",
  "deposition",
  "other",
]);

export const ambientSessionStatusEnum = pgEnum("ambient_session_status", [
  "active",
  "paused",
  "completed",
  "processing",
]);

export const ambientSuggestionTypeEnum = pgEnum("ambient_suggestion_type", [
  "document",
  "email",
  "person",
  "date",
  "topic",
  "discrepancy",
  "verification",
  "summary",
  "action_item",
  "key_point",
]);

export const ambientSuggestionStatusEnum = pgEnum("ambient_suggestion_status", [
  "pending",
  "viewed",
  "dismissed",
  "stale",
]);

export const ambientSuggestionConfidenceEnum = pgEnum("ambient_suggestion_confidence", [
  "high",
  "medium",
  "low",
]);

// Ambient Intelligence Sessions
export const ambientSessions = pgTable("ambient_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id, { onDelete: "set null" }),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }),
  sessionName: varchar("session_name", { length: 255 }).notNull(),
  sessionType: ambientSessionTypeEnum("session_type").default("other"),
  status: ambientSessionStatusEnum("status").default("active"),
  notes: text("notes"),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  durationSeconds: integer("duration_seconds"),
  participantNames: text("participant_names").array(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  caseIdx: index("idx_ambient_sessions_case").on(table.caseId),
  statusIdx: index("idx_ambient_sessions_status").on(table.status),
}));

export type AmbientSession = typeof ambientSessions.$inferSelect;
export const insertAmbientSessionSchema = createInsertSchema(ambientSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAmbientSession = z.infer<typeof insertAmbientSessionSchema>;

// Ambient Transcripts - stores transcript segments
export const ambientTranscripts = pgTable("ambient_transcripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => ambientSessions.id, { onDelete: "cascade" }).notNull(),
  timestampMs: bigint("timestamp_ms", { mode: "number" }).notNull(), // Milliseconds from epoch (JavaScript Date.now())
  speakerLabel: varchar("speaker_label", { length: 100 }),
  speakerId: integer("speaker_id"), // Speaker number from diarization
  content: text("content").notNull(),
  confidence: real("confidence"),
  isFinal: boolean("is_final").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  sessionIdx: index("idx_ambient_transcripts_session").on(table.sessionId),
  timestampIdx: index("idx_ambient_transcripts_timestamp").on(table.timestampMs),
}));

export type AmbientTranscript = typeof ambientTranscripts.$inferSelect;
export const insertAmbientTranscriptSchema = createInsertSchema(ambientTranscripts).omit({
  id: true,
  createdAt: true,
});
export type InsertAmbientTranscript = z.infer<typeof insertAmbientTranscriptSchema>;

// Ambient Suggestions - AI-generated suggestions during session
export const ambientSuggestions = pgTable("ambient_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => ambientSessions.id, { onDelete: "cascade" }).notNull(),
  suggestionType: ambientSuggestionTypeEnum("suggestion_type").notNull(),
  triggerQuote: text("trigger_quote"), // The transcript text that triggered this suggestion
  explanation: text("explanation"), // Why this suggestion is relevant
  userPrompt: text("user_prompt"), // The question shown to the user
  searchQuery: text("search_query"), // Query used for RAG search
  documentIds: text("document_ids").array(), // IDs of matched documents
  confidence: ambientSuggestionConfidenceEnum("confidence").default("medium"),
  status: ambientSuggestionStatusEnum("status").default("pending"),
  userAction: varchar("user_action", { length: 50 }), // 'viewed', 'dismissed', 'asked_emma'
  timestampMs: bigint("timestamp_ms", { mode: "number" }), // When in session this was generated (JavaScript Date.now())
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  sessionIdx: index("idx_ambient_suggestions_session").on(table.sessionId),
  statusIdx: index("idx_ambient_suggestions_status").on(table.status),
}));

export type AmbientSuggestion = typeof ambientSuggestions.$inferSelect;
export const insertAmbientSuggestionSchema = createInsertSchema(ambientSuggestions).omit({
  id: true,
  createdAt: true,
});
export type InsertAmbientSuggestion = z.infer<typeof insertAmbientSuggestionSchema>;

// Ambient Session Summaries - post-session AI summaries
export const ambientSessionSummaries = pgTable("ambient_session_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => ambientSessions.id, { onDelete: "cascade" }).notNull().unique(),
  summaryText: text("summary_text"),
  keyMoments: jsonb("key_moments"), // [{timestamp_ms, description, type}]
  documentsReferenced: jsonb("documents_referenced"), // [{doc_id, title, status}]
  actionItems: jsonb("action_items"), // [{description, assignee, dueDate}]
  generatedAt: timestamp("generated_at").defaultNow(),
}, (table) => ({
  sessionIdx: index("idx_ambient_summaries_session").on(table.sessionId),
}));

export type AmbientSessionSummary = typeof ambientSessionSummaries.$inferSelect;
export const insertAmbientSessionSummarySchema = createInsertSchema(ambientSessionSummaries).omit({
  id: true,
  generatedAt: true,
});
export type InsertAmbientSessionSummary = z.infer<typeof insertAmbientSessionSummarySchema>;

// Relations for Ambient Intelligence tables
export const ambientSessionsRelations = relations(ambientSessions, ({ one, many }) => ({
  case: one(cases, {
    fields: [ambientSessions.caseId],
    references: [cases.id],
  }),
  createdByUser: one(users, {
    fields: [ambientSessions.createdBy],
    references: [users.id],
  }),
  transcripts: many(ambientTranscripts),
  suggestions: many(ambientSuggestions),
  summary: one(ambientSessionSummaries),
}));

export const ambientTranscriptsRelations = relations(ambientTranscripts, ({ one }) => ({
  session: one(ambientSessions, {
    fields: [ambientTranscripts.sessionId],
    references: [ambientSessions.id],
  }),
}));

export const ambientSuggestionsRelations = relations(ambientSuggestions, ({ one }) => ({
  session: one(ambientSessions, {
    fields: [ambientSuggestions.sessionId],
    references: [ambientSessions.id],
  }),
}));

export const ambientSessionSummariesRelations = relations(ambientSessionSummaries, ({ one }) => ({
  session: one(ambientSessions, {
    fields: [ambientSessionSummaries.sessionId],
    references: [ambientSessions.id],
  }),
}));

// ============================================
// FOCUS ISSUES FOR AMBIENT INTELLIGENCE
// ============================================

// Relevance classification enum for focus issues
export const focusIssueRelevanceEnum = pgEnum("focus_issue_relevance", [
  "contradicts",  // Document conflicts with what was just said
  "supports",     // Document corroborates what was just said
  "pattern",      // Document shows recurring pattern/similar incidents
  "impeaches",    // Prior statement by same speaker that differs
  "related",      // Generally relevant but no clear support/contradiction
]);

// Focus Issues table - user-defined issues to track during sessions
export const focusIssues = pgTable("focus_issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Can be linked to ambient session OR video meeting
  sessionId: varchar("session_id").references(() => ambientSessions.id, { onDelete: "cascade" }),
  meetingId: varchar("meeting_id").references(() => videoMeetings.id, { onDelete: "cascade" }),
  caseId: varchar("case_id").references(() => cases.id, { onDelete: "set null" }),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }),
  
  // User-defined issue
  title: text("title").notNull(),
  shortName: varchar("short_name", { length: 50 }),  // Abbreviated for UI
  
  // State
  active: boolean("active").default(true),
  displayOrder: integer("display_order").default(0),
  
  // Optional: Pre-defined search terms to boost
  keywords: text("keywords").array(),
  
  // Optional: Specific documents to always check against
  pinnedDocumentIds: text("pinned_document_ids").array(),
  
  // Metadata
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  sessionIdx: index("idx_focus_issues_session").on(table.sessionId),
  meetingIdx: index("idx_focus_issues_meeting").on(table.meetingId),
  caseIdx: index("idx_focus_issues_case").on(table.caseId),
}));

export type FocusIssue = typeof focusIssues.$inferSelect;
export const insertFocusIssueSchema = createInsertSchema(focusIssues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFocusIssue = z.infer<typeof insertFocusIssueSchema>;

// Focus Issue Results - AI-generated results for focus issues
export const focusIssueResults = pgTable("focus_issue_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  focusIssueId: varchar("focus_issue_id").references(() => focusIssues.id, { onDelete: "cascade" }).notNull(),
  sessionId: varchar("session_id").references(() => ambientSessions.id, { onDelete: "cascade" }),
  meetingId: varchar("meeting_id").references(() => videoMeetings.id, { onDelete: "cascade" }),
  
  // Document info
  documentId: varchar("document_id"),  // Reference to case document
  documentType: varchar("document_type", { length: 50 }),  // 'email', 'document', 'transcript', 'message', 'sms'
  documentTitle: varchar("document_title", { length: 500 }),
  documentDate: timestamp("document_date"),
  preview: text("preview"),  // Relevant excerpt
  
  // Relevance classification
  relevance: focusIssueRelevanceEnum("relevance").default("related"),
  relevanceNote: text("relevance_note"),  // Explanation of why
  confidence: ambientSuggestionConfidenceEnum("confidence").default("medium"),
  
  // Source tracking
  triggeredByTranscript: text("triggered_by_transcript"),  // The transcript chunk that triggered this
  booleanQuery: text("boolean_query"),  // The query used to find this
  
  // User interaction
  dismissed: boolean("dismissed").default(false),
  starred: boolean("starred").default(false),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  issueIdx: index("idx_focus_issue_results_issue").on(table.focusIssueId),
  sessionIdx: index("idx_focus_issue_results_session").on(table.sessionId),
  meetingIdx: index("idx_focus_issue_results_meeting").on(table.meetingId),
}));

export type FocusIssueResult = typeof focusIssueResults.$inferSelect;
export const insertFocusIssueResultSchema = createInsertSchema(focusIssueResults).omit({
  id: true,
  createdAt: true,
});
export type InsertFocusIssueResult = z.infer<typeof insertFocusIssueResultSchema>;

// Relations for Focus Issues
export const focusIssuesRelations = relations(focusIssues, ({ one, many }) => ({
  session: one(ambientSessions, {
    fields: [focusIssues.sessionId],
    references: [ambientSessions.id],
  }),
  meeting: one(videoMeetings, {
    fields: [focusIssues.meetingId],
    references: [videoMeetings.id],
  }),
  case: one(cases, {
    fields: [focusIssues.caseId],
    references: [cases.id],
  }),
  createdByUser: one(users, {
    fields: [focusIssues.createdBy],
    references: [users.id],
  }),
  results: many(focusIssueResults),
}));

export const focusIssueResultsRelations = relations(focusIssueResults, ({ one }) => ({
  focusIssue: one(focusIssues, {
    fields: [focusIssueResults.focusIssueId],
    references: [focusIssues.id],
  }),
  session: one(ambientSessions, {
    fields: [focusIssueResults.sessionId],
    references: [ambientSessions.id],
  }),
  meeting: one(videoMeetings, {
    fields: [focusIssueResults.meetingId],
    references: [videoMeetings.id],
  }),
}));

// ============================================================================
// Court Pleadings - Legal documents uploaded for case analysis
// ============================================================================

// Pleading type enum
export const pleadingTypeEnum = pgEnum("pleading_type", [
  "complaint",
  "answer",
  "motion",
  "brief",
  "court_order",
  "discovery",
  "subpoena",
  "settlement",
  "judgment",
  "other",
]);

// Filing status enum - whether document is a court filing or draft
export const filingStatusEnum = pgEnum("filing_status", [
  "court_filing",  // Official court filing
  "draft",         // Internal draft document
]);

// Filing party enum - who filed the document
export const filingPartyEnum = pgEnum("filing_party", [
  "plaintiff",
  "defendant",
  "court",
  "third_party",
]);

export const courtPleadings = pgTable("court_pleadings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  
  // Document info
  title: varchar("title", { length: 500 }).notNull(),
  pleadingType: pleadingTypeEnum("pleading_type").default("other"),
  filingDate: timestamp("filing_date"),
  filedBy: varchar("filed_by", { length: 255 }),  // Party who filed (legacy)
  filingParty: filingPartyEnum("filing_party").default("plaintiff"),  // plaintiff, defendant, court, third_party
  filingStatus: filingStatusEnum("filing_status").default("court_filing"),  // court_filing or draft
  
  // File storage
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 100 }),  // MIME type
  fileSize: integer("file_size"),  // bytes
  storagePath: text("storage_path"),  // Object storage path
  
  // Extracted content
  extractedText: text("extracted_text"),  // For RAG indexing
  summary: text("summary"),  // AI-generated summary
  
  // Indexing status
  isIndexed: boolean("is_indexed").default(false),
  indexedAt: timestamp("indexed_at"),
  
  // Metadata
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  caseIdx: index("idx_court_pleadings_case").on(table.caseId),
  typeIdx: index("idx_court_pleadings_type").on(table.pleadingType),
}));

export type CourtPleading = typeof courtPleadings.$inferSelect;
export const insertCourtPleadingSchema = createInsertSchema(courtPleadings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCourtPleading = z.infer<typeof insertCourtPleadingSchema>;

// ============================================================================
// Privileged Research Feature - Claude-like AI chat for legal research
// ============================================================================

// Model provider enum for multi-model support
export const modelProviderEnum = pgEnum("model_provider", [
  "openai",
  "anthropic",
  "google",
]);

// Message role enum
export const privilegedMessageRoleEnum = pgEnum("privileged_message_role", [
  "user",
  "assistant",
  "system",
]);

// Retention policy enum for Privileged Research sessions
export const retentionPolicyEnum = pgEnum("retention_policy", [
  "save",        // Keep session history permanently
  "auto_delete", // Delete session when closed/completed
]);

// Privileged Research Sessions
export const privilegedSessions = pgTable("privileged_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  caseId: varchar("case_id").references(() => cases.id, { onDelete: "set null" }),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull().default("New Session"),
  modelProvider: varchar("model_provider", { length: 50 }).notNull().default("openai"),
  modelId: varchar("model_id", { length: 100 }).notNull().default("gpt-4o"),
  retentionPolicy: varchar("retention_policy", { length: 20 }).notNull().default("save"), // 'save' or 'auto_delete'
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("idx_privileged_sessions_user").on(table.userId),
  caseIdx: index("idx_privileged_sessions_case").on(table.caseId),
  clientIdx: index("idx_privileged_sessions_client").on(table.clientId),
  lastActivityIdx: index("idx_privileged_sessions_last_activity").on(table.lastActivityAt),
}));

export type PrivilegedSession = typeof privilegedSessions.$inferSelect;
export const insertPrivilegedSessionSchema = createInsertSchema(privilegedSessions).omit({
  id: true,
  createdAt: true,
  lastActivityAt: true,
});
export type InsertPrivilegedSession = z.infer<typeof insertPrivilegedSessionSchema>;

// Privileged Research Messages
export const privilegedMessages = pgTable("privileged_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => privilegedSessions.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 20 }).notNull(), // 'user', 'assistant', 'system'
  content: text("content").notNull(),
  referencedDocuments: jsonb("referenced_documents").$type<string[]>().default([]),
  tokenCount: integer("token_count"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index("idx_privileged_messages_session").on(table.sessionId),
  createdAtIdx: index("idx_privileged_messages_created").on(table.createdAt),
}));

export type PrivilegedMessage = typeof privilegedMessages.$inferSelect;
export const insertPrivilegedMessageSchema = createInsertSchema(privilegedMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertPrivilegedMessage = z.infer<typeof insertPrivilegedMessageSchema>;

// Relations for Privileged Research tables
export const privilegedSessionsRelations = relations(privilegedSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [privilegedSessions.userId],
    references: [users.id],
  }),
  case: one(cases, {
    fields: [privilegedSessions.caseId],
    references: [cases.id],
  }),
  messages: many(privilegedMessages),
}));

export const privilegedMessagesRelations = relations(privilegedMessages, ({ one }) => ({
  session: one(privilegedSessions, {
    fields: [privilegedMessages.sessionId],
    references: [privilegedSessions.id],
  }),
}));

// =============================================================================
// RECORDED STATEMENTS - Upload system for depositions, interviews, and recordings
// =============================================================================

// Statement type enum
export const recordedStatementTypeEnum = pgEnum("recorded_statement_type", [
  "deposition",
  "interview",
  "witness_statement",
  "testimony",
  "hearing",
  "conference",
  "other",
]);

// Credibility analysis status enum
export const credibilityStatusEnum = pgEnum("credibility_status", [
  "pending",
  "analyzing",
  "completed",
  "failed",
]);

// Recorded Statements (uploaded videos, audio, transcripts)
export const recordedStatements = pgTable("recorded_statements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id, { onDelete: "cascade" }).notNull(),
  
  // Basic metadata
  title: text("title").notNull(),
  statementType: varchar("statement_type", { length: 50 }).notNull().default("interview"),
  otherTypeDetail: text("other_type_detail"), // Custom type description when statementType is "other"
  description: text("description"),
  statementDate: timestamp("statement_date"), // When the statement was originally given
  location: text("location"), // Where it was recorded
  
  // People involved
  speakerName: text("speaker_name").notNull(), // Primary speaker/witness
  speakerRole: text("speaker_role"), // e.g., "Witness", "Deponent", "Defendant"
  speakerPartyId: varchar("speaker_party_id").references(() => caseParties.id), // Link to case party
  interviewerName: text("interviewer_name"), // Attorney/investigator name
  additionalParticipants: jsonb("additional_participants").$type<string[]>(), // Other attendees
  
  // Uploaded files
  videoUrl: text("video_url"), // Object storage URL for video
  audioUrl: text("audio_url"), // Object storage URL for audio
  transcriptUrl: text("transcript_url"), // Object storage URL for original transcript file
  thumbnailUrl: text("thumbnail_url"), // Video thumbnail
  
  // File metadata
  fileType: varchar("file_type", { length: 50 }), // 'video', 'audio', 'transcript'
  fileName: text("file_name"),
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
  durationSeconds: integer("duration_seconds"),
  mimeType: text("mime_type"),
  
  // Transcription
  transcriptText: text("transcript_text"), // Full transcript text
  transcriptSegments: jsonb("transcript_segments"), // Timestamped segments with speaker tags
  transcriptionStatus: varchar("transcription_status", { length: 20 }).default("pending"),
  transcriptionMetadata: jsonb("transcription_metadata"), // Language, confidence, model used
  
  // AI Analysis
  aiSummary: text("ai_summary"), // AI-generated summary
  keyMoments: jsonb("key_moments"), // Array of {timestamp, description, importance}
  contradictions: jsonb("contradictions"), // Detected inconsistencies with other statements
  
  // Credibility Analysis
  credibilityStatus: varchar("credibility_status", { length: 20 }).default("pending"),
  credibilityScore: real("credibility_score"), // 0-100 score
  credibilityAnalysis: jsonb("credibility_analysis"), // Detailed analysis breakdown
  redFlags: jsonb("red_flags"), // Array of potential concerns
  
  // RAG Integration
  isIndexed: boolean("is_indexed").default(false), // Has been indexed for search
  indexedAt: timestamp("indexed_at"),
  embeddingVector: text("embedding_vector"), // For semantic search (stored as JSON string)
  
  // Privilege protection
  privilegeStatus: privilegeStatusEnum("privilege_status").default("none"),
  isPrivileged: boolean("is_privileged").default(false),
  privilegeNotes: text("privilege_notes"),
  
  // Tags and organization
  tags: jsonb("tags").$type<string[]>(),
  
  // Audit fields
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  caseIdx: index("idx_recorded_statements_case").on(table.caseId),
  speakerIdx: index("idx_recorded_statements_speaker").on(table.speakerName),
  typeIdx: index("idx_recorded_statements_type").on(table.statementType),
  dateIdx: index("idx_recorded_statements_date").on(table.statementDate),
}));

export type RecordedStatement = typeof recordedStatements.$inferSelect;
export const insertRecordedStatementSchema = createInsertSchema(recordedStatements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  indexedAt: true,
});
export type InsertRecordedStatement = z.infer<typeof insertRecordedStatementSchema>;

// Recorded Statement Annotations (timestamps with notes)
export const recordedStatementAnnotations = pgTable("recorded_statement_annotations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  statementId: varchar("statement_id").references(() => recordedStatements.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  timestampSeconds: integer("timestamp_seconds").notNull(), // Where in the recording
  endTimestampSeconds: integer("end_timestamp_seconds"), // End of range (optional)
  
  annotationType: varchar("annotation_type", { length: 50 }).notNull().default("note"), // note, bookmark, issue, follow_up
  content: text("content").notNull(),
  tags: jsonb("tags").$type<string[]>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  statementIdx: index("idx_statement_annotations_statement").on(table.statementId),
  timestampIdx: index("idx_statement_annotations_timestamp").on(table.timestampSeconds),
}));

export type RecordedStatementAnnotation = typeof recordedStatementAnnotations.$inferSelect;
export const insertRecordedStatementAnnotationSchema = createInsertSchema(recordedStatementAnnotations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRecordedStatementAnnotation = z.infer<typeof insertRecordedStatementAnnotationSchema>;

// Relations for recorded statements
export const recordedStatementsRelations = relations(recordedStatements, ({ one, many }) => ({
  case: one(cases, {
    fields: [recordedStatements.caseId],
    references: [cases.id],
  }),
  speakerParty: one(caseParties, {
    fields: [recordedStatements.speakerPartyId],
    references: [caseParties.id],
  }),
  uploadedByUser: one(users, {
    fields: [recordedStatements.uploadedBy],
    references: [users.id],
  }),
  annotations: many(recordedStatementAnnotations),
}));

export const recordedStatementAnnotationsRelations = relations(recordedStatementAnnotations, ({ one }) => ({
  statement: one(recordedStatements, {
    fields: [recordedStatementAnnotations.statementId],
    references: [recordedStatements.id],
  }),
  user: one(users, {
    fields: [recordedStatementAnnotations.userId],
    references: [users.id],
  }),
}));

// ============================================
// EMAIL INTEGRATION TABLES
// ============================================

// Connected email accounts (M365, Gmail)
export const emailAccounts = pgTable("email_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Owner
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Provider info
  provider: varchar("provider", { length: 20 }).notNull(), // 'microsoft' | 'google'
  email: varchar("email").notNull(),
  displayName: varchar("display_name"),
  
  // OAuth tokens (encrypted at rest)
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  
  // Sync state
  syncEnabled: boolean("sync_enabled").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  syncCursor: text("sync_cursor"), // For delta sync (Microsoft deltaLink, Gmail historyId)
  syncStatus: varchar("sync_status", { length: 20 }).default("idle"), // 'idle' | 'syncing' | 'error'
  syncError: text("sync_error"),
  
  // Settings
  syncFolders: jsonb("sync_folders").$type<string[]>().default(["inbox", "sent"]),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type EmailAccount = typeof emailAccounts.$inferSelect;
export const insertEmailAccountSchema = createInsertSchema(emailAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEmailAccount = z.infer<typeof insertEmailAccountSchema>;

// Synced emails
export const syncedEmails = pgTable("synced_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Source
  accountId: varchar("account_id").notNull().references(() => emailAccounts.id, { onDelete: "cascade" }),
  externalId: text("external_id").notNull(), // Provider's message ID
  threadId: text("thread_id"), // For threading
  conversationId: text("conversation_id"), // Microsoft conversation ID
  
  // Email data
  subject: text("subject"),
  snippet: text("snippet"), // Preview text
  bodyHtml: text("body_html"),
  bodyText: text("body_text"),
  
  // Participants (stored as JSON for flexibility)
  fromAddress: text("from_address"),
  fromName: text("from_name"),
  toRecipients: jsonb("to_recipients").$type<{email: string; name?: string}[]>().default([]),
  ccRecipients: jsonb("cc_recipients").$type<{email: string; name?: string}[]>().default([]),
  bccRecipients: jsonb("bcc_recipients").$type<{email: string; name?: string}[]>().default([]),
  
  // Metadata
  sentAt: timestamp("sent_at"),
  receivedAt: timestamp("received_at"),
  isRead: boolean("is_read").default(false),
  isStarred: boolean("is_starred").default(false),
  isDraft: boolean("is_draft").default(false),
  folder: varchar("folder", { length: 20 }).default("inbox"), // 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash'
  importance: varchar("importance", { length: 10 }).default("normal"), // 'low' | 'normal' | 'high'
  
  // Legal tagging (Sentinel-specific)
  matterId: varchar("matter_id").references(() => cases.id),
  privilegeStatus: varchar("privilege_status", { length: 30 }), // 'attorney_client' | 'work_product' | 'standard' | null
  autoTaggedMatter: boolean("auto_tagged_matter").default(false), // AI suggested vs manual
  autoTagConfidence: real("auto_tag_confidence"), // 0-1 confidence score
  
  // Stamps applied
  stampApplied: boolean("stamp_applied").default(false),
  stampTemplateId: varchar("stamp_template_id"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  accountExternalIdx: uniqueIndex("email_account_external_idx").on(table.accountId, table.externalId),
  threadIdx: index("email_thread_idx").on(table.threadId),
  matterIdx: index("email_matter_idx").on(table.matterId),
  receivedIdx: index("email_received_idx").on(table.receivedAt),
}));

export type SyncedEmail = typeof syncedEmails.$inferSelect;
export const insertSyncedEmailSchema = createInsertSchema(syncedEmails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSyncedEmail = z.infer<typeof insertSyncedEmailSchema>;

// Email attachments
export const emailAttachmentsTable = pgTable("email_attachments_table", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  emailId: varchar("email_id").notNull().references(() => syncedEmails.id, { onDelete: "cascade" }),
  
  externalId: text("external_id"), // Provider's attachment ID
  filename: text("filename").notNull(),
  mimeType: text("mime_type"),
  size: integer("size"), // bytes
  
  // Storage - can be fetched on-demand or stored locally
  storedLocally: boolean("stored_locally").default(false),
  localPath: text("local_path"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EmailAttachmentRow = typeof emailAttachmentsTable.$inferSelect;
export const insertEmailAttachmentSchema = createInsertSchema(emailAttachmentsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertEmailAttachment = z.infer<typeof insertEmailAttachmentSchema>;

// Auto-CC rules
export const emailAutoCcRules = pgTable("email_auto_cc_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  userId: varchar("user_id").references(() => users.id), // If user-specific
  
  // Scope
  scope: varchar("scope", { length: 20 }).notNull(), // 'firm_wide' | 'client' | 'matter'
  clientId: varchar("client_id"), // If scope = 'client'
  matterId: varchar("matter_id").references(() => cases.id), // If scope = 'matter'
  
  // Rule
  name: text("name").notNull(),
  description: text("description"),
  ccEmails: jsonb("cc_emails").$type<{email: string; name?: string; role?: string}[]>().notNull(),
  bccEmails: jsonb("bcc_emails").$type<{email: string; name?: string}[]>().default([]),
  
  // Conditions
  conditions: jsonb("conditions").$type<{recipientDomains?: string[]; subjectContains?: string[]}>().default({}),
  
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(0), // Higher = applied first
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type EmailAutoCcRule = typeof emailAutoCcRules.$inferSelect;
export const insertEmailAutoCcRuleSchema = createInsertSchema(emailAutoCcRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEmailAutoCcRule = z.infer<typeof insertEmailAutoCcRuleSchema>;

// Email stamp templates
export const emailStampTemplates = pgTable("email_stamp_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  name: text("name").notNull(), // "Privilege Notice", "Confidentiality Standard"
  type: varchar("type", { length: 30 }).notNull(), // 'privilege' | 'confidentiality' | 'matter_ref' | 'custom'
  
  // Template content
  htmlContent: text("html_content").notNull(),
  plainTextContent: text("plain_text_content").notNull(),
  
  // When to apply
  isDefault: boolean("is_default").default(false),
  applyToPrivileged: boolean("apply_to_privileged").default(true),
  applyToExternal: boolean("apply_to_external").default(true),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type EmailStampTemplate = typeof emailStampTemplates.$inferSelect;
export const insertEmailStampTemplateSchema = createInsertSchema(emailStampTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEmailStampTemplate = z.infer<typeof insertEmailStampTemplateSchema>;

// Email drafts (for compose functionality)
export const emailDrafts = pgTable("email_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  accountId: varchar("account_id").notNull().references(() => emailAccounts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Draft content
  toRecipients: jsonb("to_recipients").$type<{email: string; name?: string}[]>().default([]),
  ccRecipients: jsonb("cc_recipients").$type<{email: string; name?: string}[]>().default([]),
  bccRecipients: jsonb("bcc_recipients").$type<{email: string; name?: string}[]>().default([]),
  subject: text("subject"),
  bodyHtml: text("body_html"),
  bodyText: text("body_text"),
  
  // Reply/forward context
  replyToEmailId: varchar("reply_to_email_id").references(() => syncedEmails.id),
  forwardFromEmailId: varchar("forward_from_email_id").references(() => syncedEmails.id),
  
  // Legal context
  matterId: varchar("matter_id").references(() => cases.id),
  privilegeStatus: varchar("privilege_status", { length: 30 }),
  stampTemplateId: varchar("stamp_template_id").references(() => emailStampTemplates.id),
  
  // Auto-applied CCs (for preview)
  autoCcApplied: jsonb("auto_cc_applied").$type<{email: string; name?: string}[]>().default([]),
  
  // Sync with provider
  externalDraftId: text("external_draft_id"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type EmailDraft = typeof emailDrafts.$inferSelect;
export const insertEmailDraftSchema = createInsertSchema(emailDrafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEmailDraft = z.infer<typeof insertEmailDraftSchema>;

// Email relations
export const emailAccountsRelations = relations(emailAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [emailAccounts.userId],
    references: [users.id],
  }),
  emails: many(syncedEmails),
  drafts: many(emailDrafts),
}));

export const syncedEmailsRelations = relations(syncedEmails, ({ one, many }) => ({
  account: one(emailAccounts, {
    fields: [syncedEmails.accountId],
    references: [emailAccounts.id],
  }),
  matter: one(cases, {
    fields: [syncedEmails.matterId],
    references: [cases.id],
  }),
  attachments: many(emailAttachmentsTable),
}));

export const emailAttachmentsRelations = relations(emailAttachmentsTable, ({ one }) => ({
  email: one(syncedEmails, {
    fields: [emailAttachmentsTable.emailId],
    references: [syncedEmails.id],
  }),
}));

export const emailDraftsRelations = relations(emailDrafts, ({ one }) => ({
  account: one(emailAccounts, {
    fields: [emailDrafts.accountId],
    references: [emailAccounts.id],
  }),
  user: one(users, {
    fields: [emailDrafts.userId],
    references: [users.id],
  }),
  matter: one(cases, {
    fields: [emailDrafts.matterId],
    references: [cases.id],
  }),
  replyToEmail: one(syncedEmails, {
    fields: [emailDrafts.replyToEmailId],
    references: [syncedEmails.id],
  }),
  stampTemplate: one(emailStampTemplates, {
    fields: [emailDrafts.stampTemplateId],
    references: [emailStampTemplates.id],
  }),
}));

export const emailAutoCcRulesRelations = relations(emailAutoCcRules, ({ one }) => ({
  user: one(users, {
    fields: [emailAutoCcRules.userId],
    references: [users.id],
  }),
  matter: one(cases, {
    fields: [emailAutoCcRules.matterId],
    references: [cases.id],
  }),
}));

// ============================================================================
// DOCUMENT PRODUCTION SYSTEM
// ============================================================================

export const productionStatusEnum = pgEnum("production_status", [
  "draft",
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const productionExportFormatEnum = pgEnum("production_export_format", [
  "pdf",
  "native",
  "tiff",
  "load_file",
]);

// Bates number sequences per case
export const batesSequences = pgTable("bates_sequences", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull(),
  prefix: varchar("prefix", { length: 50 }).notNull(),
  nextNumber: integer("next_number").default(1).notNull(),
  padding: integer("padding").default(6).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BatesSequence = typeof batesSequences.$inferSelect;
export const insertBatesSequenceSchema = createInsertSchema(batesSequences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBatesSequence = z.infer<typeof insertBatesSequenceSchema>;

// Production batches - main production job
export const productionBatches = pgTable("production_batches", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: productionStatusEnum("status").default("draft").notNull(),
  requestedBy: varchar("requested_by")
    .references(() => users.id)
    .notNull(),
  selectedTagIds: jsonb("selected_tag_ids").$type<string[]>().default([]).notNull(),
  exclusionTagIds: jsonb("exclusion_tag_ids").$type<string[]>().default([]).notNull(),
  exportFormat: productionExportFormatEnum("export_format").default("pdf").notNull(),
  batesPrefix: varchar("bates_prefix", { length: 50 }).notNull(),
  batesPadding: integer("bates_padding").default(6).notNull(),
  batesStartNumber: integer("bates_start_number").default(1).notNull(),
  batesEndNumber: integer("bates_end_number"),
  totalDocuments: integer("total_documents").default(0).notNull(),
  excludedDocuments: integer("excluded_documents").default(0).notNull(),
  producedDocuments: integer("produced_documents").default(0).notNull(),
  storagePath: text("storage_path"),
  downloadUrl: text("download_url"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ProductionBatch = typeof productionBatches.$inferSelect;
export const insertProductionBatchSchema = createInsertSchema(productionBatches).omit({
  id: true,
  batesEndNumber: true,
  totalDocuments: true,
  excludedDocuments: true,
  producedDocuments: true,
  storagePath: true,
  downloadUrl: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProductionBatch = z.infer<typeof insertProductionBatchSchema>;

// Production batch documents - individual documents in a production
export const productionBatchDocuments = pgTable("production_batch_documents", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id")
    .references(() => productionBatches.id, { onDelete: "cascade" })
    .notNull(),
  documentId: varchar("document_id").notNull(),
  documentType: varchar("document_type", { length: 50 }).notNull(),
  inclusionTagId: varchar("inclusion_tag_id")
    .references(() => tags.id),
  excluded: boolean("excluded").default(false).notNull(),
  exclusionReason: text("exclusion_reason"),
  exclusionTagId: varchar("exclusion_tag_id")
    .references(() => tags.id),
  batesStart: varchar("bates_start", { length: 100 }),
  batesEnd: varchar("bates_end", { length: 100 }),
  pageCount: integer("page_count").default(1),
  exportPath: text("export_path"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProductionBatchDocument = typeof productionBatchDocuments.$inferSelect;
export const insertProductionBatchDocumentSchema = createInsertSchema(productionBatchDocuments).omit({
  id: true,
  createdAt: true,
});
export type InsertProductionBatchDocument = z.infer<typeof insertProductionBatchDocumentSchema>;

// Production batch events - audit log for production
export const productionBatchEvents = pgTable("production_batch_events", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id")
    .references(() => productionBatches.id, { onDelete: "cascade" })
    .notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProductionBatchEvent = typeof productionBatchEvents.$inferSelect;
export const insertProductionBatchEventSchema = createInsertSchema(productionBatchEvents).omit({
  id: true,
  createdAt: true,
});
export type InsertProductionBatchEvent = z.infer<typeof insertProductionBatchEventSchema>;

// Production relations
export const productionBatchesRelations = relations(productionBatches, ({ one, many }) => ({
  case: one(cases, {
    fields: [productionBatches.caseId],
    references: [cases.id],
  }),
  requestedByUser: one(users, {
    fields: [productionBatches.requestedBy],
    references: [users.id],
  }),
  documents: many(productionBatchDocuments),
  events: many(productionBatchEvents),
}));

export const productionBatchDocumentsRelations = relations(productionBatchDocuments, ({ one }) => ({
  batch: one(productionBatches, {
    fields: [productionBatchDocuments.batchId],
    references: [productionBatches.id],
  }),
  inclusionTag: one(tags, {
    fields: [productionBatchDocuments.inclusionTagId],
    references: [tags.id],
  }),
  exclusionTag: one(tags, {
    fields: [productionBatchDocuments.exclusionTagId],
    references: [tags.id],
  }),
}));

export const productionBatchEventsRelations = relations(productionBatchEvents, ({ one }) => ({
  batch: one(productionBatches, {
    fields: [productionBatchEvents.batchId],
    references: [productionBatches.id],
  }),
  user: one(users, {
    fields: [productionBatchEvents.userId],
    references: [users.id],
  }),
}));

export const batesSequencesRelations = relations(batesSequences, ({ one }) => ({
  case: one(cases, {
    fields: [batesSequences.caseId],
    references: [cases.id],
  }),
}));

// ============ PE DUE DILIGENCE MODULE ============

// PE Firm management for multi-tenancy
export const peFirms = pgTable("pe_firms", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PEFirm = typeof peFirms.$inferSelect;
export const insertPEFirmSchema = createInsertSchema(peFirms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPEFirm = z.infer<typeof insertPEFirmSchema>;

// PE Firm Settings
export const peFirmSettings = pgTable("pe_firm_settings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  firmId: varchar("firm_id")
    .references(() => peFirms.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  defaultWorkstreams: jsonb("default_workstreams").$type<any[]>().default([]),
  riskCategories: jsonb("risk_categories").$type<any[]>().default([]),
  integrations: jsonb("integrations").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PEFirmSettings = typeof peFirmSettings.$inferSelect;

// Deal Status Enum
export const peDealStatusEnum = pgEnum("pe_deal_status", [
  "pipeline",
  "preliminary_review",
  "management_meeting",
  "loi_submitted",
  "loi_signed",
  "diligence",
  "exclusivity",
  "definitive_docs",
  "closed",
  "passed",
  "lost",
]);

// Deal Type Enum
export const peDealTypeEnum = pgEnum("pe_deal_type", [
  "platform",
  "add_on",
  "carve_out",
  "growth_equity",
  "recap",
  "secondary",
]);

// Data Room Type Enum
export const dataRoomTypeEnum = pgEnum("data_room_type", [
  "intralinks",
  "datasite",
  "box",
  "google_drive",
  "sharepoint",
  "other",
]);

// PE Deals
export const peDeals = pgTable("pe_deals", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  firmId: varchar("firm_id").references(() => peFirms.id),
  name: varchar("name", { length: 255 }).notNull(),
  codeName: varchar("code_name", { length: 100 }),
  status: peDealStatusEnum("status").default("pipeline").notNull(),
  dealType: peDealTypeEnum("deal_type").notNull(),
  sector: varchar("sector", { length: 100 }).notNull(),
  subsector: varchar("subsector", { length: 100 }),
  geography: varchar("geography", { length: 100 }).notNull(),
  targetDescription: text("target_description"),
  
  // Financials (stored as strings to avoid decimal issues)
  enterpriseValue: varchar("enterprise_value", { length: 50 }),
  revenue: varchar("revenue", { length: 50 }),
  ebitda: varchar("ebitda", { length: 50 }),
  
  // Timeline
  cimReceivedDate: date("cim_received_date"),
  loiSubmittedDate: date("loi_submitted_date"),
  loiSignedDate: date("loi_signed_date"),
  exclusivityStart: date("exclusivity_start"),
  exclusivityEnd: date("exclusivity_end"),
  expectedCloseDate: date("expected_close_date"),
  actualCloseDate: date("actual_close_date"),
  
  // Data Room
  dataRoomUrl: text("data_room_url"),
  dataRoomType: dataRoomTypeEnum("data_room_type"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  firmStatusIdx: index("pe_deals_firm_status_idx").on(table.firmId, table.status),
  sectorIdx: index("pe_deals_sector_idx").on(table.sector),
}));

export type PEDeal = typeof peDeals.$inferSelect;
export const insertPEDealSchema = createInsertSchema(peDeals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPEDeal = z.infer<typeof insertPEDealSchema>;

// Deal Contact Role Enum
export const dealContactRoleEnum = pgEnum("deal_contact_role", [
  "target_management",
  "target_board",
  "sell_side_banker",
  "sell_side_lawyer",
  "sell_side_accountant",
  "lender",
  "consultant",
  "other",
]);

// Deal Contacts
export const dealContacts = pgTable("deal_contacts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id")
    .references(() => peDeals.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  role: dealContactRoleEnum("role").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DealContact = typeof dealContacts.$inferSelect;
export const insertDealContactSchema = createInsertSchema(dealContacts).omit({
  id: true,
  createdAt: true,
});
export type InsertDealContact = z.infer<typeof insertDealContactSchema>;

// Workstream Status Enum
export const workstreamStatusEnum = pgEnum("workstream_status", [
  "not_started",
  "in_progress",
  "blocked",
  "completed",
]);

// Workstreams
export const workstreams = pgTable("workstreams", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id")
    .references(() => peDeals.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  ownerId: varchar("owner_id").references(() => users.id),
  status: workstreamStatusEnum("status").default("not_started").notNull(),
  progress: integer("progress").default(0).notNull(),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  dealNameUnique: unique("workstream_deal_name_unique").on(table.dealId, table.name),
}));

export type Workstream = typeof workstreams.$inferSelect;
export const insertWorkstreamSchema = createInsertSchema(workstreams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWorkstream = z.infer<typeof insertWorkstreamSchema>;

// Diligence Question Status Enum
export const diligenceQuestionStatusEnum = pgEnum("diligence_question_status", [
  "open",
  "pending_response",
  "answered",
  "closed",
  "na",
]);

// Diligence Question Priority Enum
export const diligenceQuestionPriorityEnum = pgEnum("diligence_question_priority", [
  "critical",
  "high",
  "medium",
  "low",
]);

// Diligence Questions
export const diligenceQuestions = pgTable("diligence_questions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id")
    .references(() => peDeals.id, { onDelete: "cascade" })
    .notNull(),
  workstreamId: varchar("workstream_id")
    .references(() => workstreams.id, { onDelete: "set null" }),
  question: text("question").notNull(),
  status: diligenceQuestionStatusEnum("status").default("open").notNull(),
  priority: diligenceQuestionPriorityEnum("priority").default("medium").notNull(),
  
  // Answer tracking
  answer: text("answer"),
  answeredAt: timestamp("answered_at"),
  source: varchar("source", { length: 255 }),
  
  // Follow-up
  followUpNeeded: boolean("follow_up_needed").default(false).notNull(),
  followUpNote: text("follow_up_note"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  dealStatusIdx: index("diligence_questions_deal_status_idx").on(table.dealId, table.status),
}));

export type DiligenceQuestion = typeof diligenceQuestions.$inferSelect;
export const insertDiligenceQuestionSchema = createInsertSchema(diligenceQuestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDiligenceQuestion = z.infer<typeof insertDiligenceQuestionSchema>;

// Question to Document Links
export const questionDocumentLinks = pgTable("question_document_links", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  questionId: varchar("question_id")
    .references(() => diligenceQuestions.id, { onDelete: "cascade" })
    .notNull(),
  documentId: varchar("document_id").notNull(),
  relevanceNote: text("relevance_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  questionDocUnique: unique("question_document_unique").on(table.questionId, table.documentId),
}));

export type QuestionDocumentLink = typeof questionDocumentLinks.$inferSelect;

// PE Call Type Enum
export const peCallTypeEnum = pgEnum("pe_call_type", [
  "management_presentation",
  "expert_call",
  "site_visit",
  "customer_call",
  "employee_interview",
  "advisor_call",
  "ic_meeting",
  "other",
]);

// PE Calls
export const peCalls = pgTable("pe_calls", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id")
    .references(() => peDeals.id, { onDelete: "cascade" })
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  callType: peCallTypeEnum("call_type").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"),
  
  // Recording & Transcription
  recordingUrl: text("recording_url"),
  transcriptRaw: text("transcript_raw"),
  transcriptProcessed: jsonb("transcript_processed").$type<any[]>(),
  summary: text("summary"),
  keyPoints: jsonb("key_points").$type<string[]>(),
  
  // Pre-call prep
  suggestedQuestions: jsonb("suggested_questions").$type<string[]>(),
  briefingDoc: text("briefing_doc"),
  
  // Post-call
  followUps: jsonb("follow_ups").$type<any[]>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  dealScheduledIdx: index("pe_calls_deal_scheduled_idx").on(table.dealId, table.scheduledAt),
}));

export type PECall = typeof peCalls.$inferSelect;
export const insertPECallSchema = createInsertSchema(peCalls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPECall = z.infer<typeof insertPECallSchema>;

// PE Call Participants
export const peCallParticipants = pgTable("pe_call_participants", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  callId: varchar("call_id")
    .references(() => peCalls.id, { onDelete: "cascade" })
    .notNull(),
  userId: varchar("user_id").references(() => users.id),
  externalName: varchar("external_name", { length: 255 }),
  externalTitle: varchar("external_title", { length: 255 }),
  externalCompany: varchar("external_company", { length: 255 }),
  role: varchar("role", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PECallParticipant = typeof peCallParticipants.$inferSelect;

// Call Document References
export const callDocumentReferences = pgTable("call_document_references", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  callId: varchar("call_id")
    .references(() => peCalls.id, { onDelete: "cascade" })
    .notNull(),
  documentId: varchar("document_id").notNull(),
  timestamp: integer("timestamp"),
  context: text("context"),
  surfacedBy: varchar("surfaced_by", { length: 20 }).default("manual").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CallDocumentReference = typeof callDocumentReferences.$inferSelect;

// Call Question References
export const callQuestionReferences = pgTable("call_question_references", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  callId: varchar("call_id")
    .references(() => peCalls.id, { onDelete: "cascade" })
    .notNull(),
  questionId: varchar("question_id")
    .references(() => diligenceQuestions.id, { onDelete: "cascade" })
    .notNull(),
  timestamp: integer("timestamp"),
  discussed: boolean("discussed").default(false).notNull(),
  answered: boolean("answered").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CallQuestionReference = typeof callQuestionReferences.$inferSelect;

// PE Risk Severity Enum
export const peRiskSeverityEnum = pgEnum("pe_risk_severity", [
  "deal_breaker",
  "price_chip",
  "integration_issue",
  "watch_item",
  "acceptable",
]);

// PE Risk Category Enum
export const peRiskCategoryEnum = pgEnum("pe_risk_category", [
  "financial",
  "legal",
  "commercial",
  "operational",
  "regulatory",
  "environmental",
  "hr_employment",
  "it_cyber",
  "integration",
  "other",
]);

// PE Risk Status Enum
export const peRiskStatusEnum = pgEnum("pe_risk_status", [
  "open",
  "investigating",
  "mitigated",
  "accepted",
  "resolved",
]);

// PE Risk Flags
export const peRiskFlags = pgTable("pe_risk_flags", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id")
    .references(() => peDeals.id, { onDelete: "cascade" })
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: peRiskCategoryEnum("category").notNull(),
  severity: peRiskSeverityEnum("severity").notNull(),
  status: peRiskStatusEnum("status").default("open").notNull(),
  
  // Source tracking
  sourceType: varchar("source_type", { length: 50 }).notNull(),
  sourceId: varchar("source_id"),
  sourceContext: text("source_context"),
  
  // Resolution
  mitigation: text("mitigation"),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  
  // Ownership
  flaggedById: varchar("flagged_by_id").references(() => users.id),
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  dealStatusIdx: index("pe_risk_flags_deal_status_idx").on(table.dealId, table.status),
  severityIdx: index("pe_risk_flags_severity_idx").on(table.severity),
}));

export type PERiskFlag = typeof peRiskFlags.$inferSelect;
export const insertPERiskFlagSchema = createInsertSchema(peRiskFlags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPERiskFlag = z.infer<typeof insertPERiskFlagSchema>;

// Pattern Match Type Enum
export const patternMatchTypeEnum = pgEnum("pattern_match_type", [
  "customer_concentration",
  "key_person_risk",
  "contract_terms",
  "margin_trend",
  "working_capital",
  "integration_complexity",
  "regulatory_issue",
  "litigation_pattern",
  "sector_specific",
  "other",
]);

// Pattern Matches (Institutional Memory)
export const patternMatches = pgTable("pattern_matches", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id")
    .references(() => peDeals.id, { onDelete: "cascade" })
    .notNull(),
  matchType: patternMatchTypeEnum("match_type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  confidence: real("confidence").notNull(),
  
  // Historical reference
  historicalDealId: varchar("historical_deal_id"),
  historicalContext: text("historical_context"),
  outcome: text("outcome"),
  
  // Learning
  lesson: text("lesson"),
  recommendation: text("recommendation"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  dismissed: boolean("dismissed").default(false).notNull(),
}, (table) => ({
  dealIdx: index("pattern_matches_deal_idx").on(table.dealId),
}));

export type PatternMatch = typeof patternMatches.$inferSelect;
export const insertPatternMatchSchema = createInsertSchema(patternMatches).omit({
  id: true,
  createdAt: true,
});
export type InsertPatternMatch = z.infer<typeof insertPatternMatchSchema>;

// Portfolio Status Enum
export const portfolioStatusEnum = pgEnum("portfolio_status", [
  "active",
  "exited",
  "written_off",
]);

// Portfolio Companies
export const portfolioCompanies = pgTable("portfolio_companies", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  firmId: varchar("firm_id").references(() => peFirms.id),
  name: varchar("name", { length: 255 }).notNull(),
  sector: varchar("sector", { length: 100 }).notNull(),
  subsector: varchar("subsector", { length: 100 }),
  acquisitionDate: date("acquisition_date").notNull(),
  acquisitionEV: varchar("acquisition_ev", { length: 50 }),
  currentStatus: portfolioStatusEnum("current_status").default("active").notNull(),
  exitDate: date("exit_date"),
  exitValue: varchar("exit_value", { length: 50 }),
  
  // For pattern matching
  diligenceFindings: jsonb("diligence_findings").$type<Record<string, any>>(),
  integrationLessons: jsonb("integration_lessons").$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PortfolioCompany = typeof portfolioCompanies.$inferSelect;
export const insertPortfolioCompanySchema = createInsertSchema(portfolioCompanies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPortfolioCompany = z.infer<typeof insertPortfolioCompanySchema>;

// Diligence Templates
export const diligenceTemplates = pgTable("diligence_templates", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  firmId: varchar("firm_id").references(() => peFirms.id),
  name: varchar("name", { length: 255 }).notNull(),
  dealType: peDealTypeEnum("deal_type"),
  sector: varchar("sector", { length: 100 }),
  workstreams: jsonb("workstreams").$type<any[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type DiligenceTemplate = typeof diligenceTemplates.$inferSelect;
export const insertDiligenceTemplateSchema = createInsertSchema(diligenceTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDiligenceTemplate = z.infer<typeof insertDiligenceTemplateSchema>;

// Deal Documents (links deals to documents with PE-specific categories)
export const peDealDocumentCategoryEnum = pgEnum("pe_deal_document_category", [
  "financial_statements",
  "tax_returns",
  "quality_of_earnings",
  "contracts_customer",
  "contracts_vendor",
  "contracts_employment",
  "contracts_other",
  "corporate_docs",
  "ip_documents",
  "real_estate",
  "environmental",
  "insurance",
  "litigation",
  "regulatory",
  "hr_benefits",
  "it_systems",
  "management_presentation",
  "cim",
  "model",
  "other",
]);

export const peDealDocuments = pgTable("pe_deal_documents", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id")
    .references(() => peDeals.id, { onDelete: "cascade" })
    .notNull(),
  filename: varchar("filename", { length: 500 }).notNull(),
  originalPath: text("original_path"),
  storagePath: text("storage_path"),
  mimeType: varchar("mime_type", { length: 100 }),
  sizeBytes: integer("size_bytes"),
  category: peDealDocumentCategoryEnum("category").default("other").notNull(),
  subcategory: varchar("subcategory", { length: 100 }),
  
  // Processing
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  extractedText: text("extracted_text"),
  summary: text("summary"),
  keyEntities: jsonb("key_entities").$type<Record<string, any>>(),
  
  // Review
  documentDate: date("document_date"),
  reviewedById: varchar("reviewed_by_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
}, (table) => ({
  dealCategoryIdx: index("pe_deal_documents_deal_category_idx").on(table.dealId, table.category),
  statusIdx: index("pe_deal_documents_status_idx").on(table.status),
}));

export type PEDealDocument = typeof peDealDocuments.$inferSelect;
export const insertPEDealDocumentSchema = createInsertSchema(peDealDocuments).omit({
  id: true,
  uploadedAt: true,
});
export type InsertPEDealDocument = z.infer<typeof insertPEDealDocumentSchema>;

// Deal Timeline Events
export const dealTimelineEvents = pgTable("deal_timeline_events", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id")
    .references(() => peDeals.id, { onDelete: "cascade" })
    .notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  occurredAt: timestamp("occurred_at").notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  dealOccurredIdx: index("deal_timeline_events_deal_occurred_idx").on(table.dealId, table.occurredAt),
}));

export type DealTimelineEvent = typeof dealTimelineEvents.$inferSelect;
export const insertDealTimelineEventSchema = createInsertSchema(dealTimelineEvents).omit({
  id: true,
  createdAt: true,
});
export type InsertDealTimelineEvent = z.infer<typeof insertDealTimelineEventSchema>;

// Source Type Enum for Deal Intelligence Reports
export const dealIntelligenceSourceTypeEnum = pgEnum("deal_intelligence_source_type", ["pe_deal", "transaction", "data_room"]);

// PE Deal Intelligence Reports - AI-generated due diligence reports
export const peDealIntelligenceReports = pgTable("pe_deal_intelligence_reports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull(),
  sourceType: dealIntelligenceSourceTypeEnum("source_type").default("pe_deal").notNull(),
  dealName: varchar("deal_name").notNull(),
  generatedBy: varchar("generated_by")
    .notNull()
    .references(() => users.id),
  fileName: varchar("file_name").notNull(),
  fileSize: integer("file_size"),
  pdfData: text("pdf_data"), // Base64 encoded PDF or object storage URL
  reportJson: jsonb("report_json"), // Full report JSON for reference
  sectionsCompleted: integer("sections_completed"),
  overallScore: integer("overall_score"), // Risk score (0-100)
  enabledWebResearch: boolean("enabled_web_research").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  dealIdx: index("pe_deal_intelligence_reports_deal_idx").on(table.dealId),
  sourceTypeIdx: index("pe_deal_intelligence_reports_source_type_idx").on(table.sourceType),
}));

export type PEDealIntelligenceReport = typeof peDealIntelligenceReports.$inferSelect;
export const insertPEDealIntelligenceReportSchema = createInsertSchema(peDealIntelligenceReports).omit({
  id: true,
  createdAt: true,
});
export type InsertPEDealIntelligenceReport = z.infer<typeof insertPEDealIntelligenceReportSchema>;

// ============================================================
// DUE DILIGENCE CUSTOMIZATION SYSTEM
// ============================================================

// Transaction Types (equity, debt, hybrid, asset)
export const ddTransactionTypes = pgTable("dd_transaction_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // 'equity', 'debt', 'hybrid', 'asset'
  subcategory: varchar("subcategory", { length: 100 }),
  description: text("description"),
  parentTypeId: varchar("parent_type_id").references(() => ddTransactionTypes.id),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type DDTransactionType = typeof ddTransactionTypes.$inferSelect;
export const insertDDTransactionTypeSchema = createInsertSchema(ddTransactionTypes).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDDTransactionType = z.infer<typeof insertDDTransactionTypeSchema>;

// Industry Sectors
export const ddIndustrySectors = pgTable("dd_industry_sectors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  description: text("description"),
  parentSectorId: varchar("parent_sector_id").references(() => ddIndustrySectors.id),
  icon: varchar("icon", { length: 50 }),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type DDIndustrySector = typeof ddIndustrySectors.$inferSelect;
export const insertDDIndustrySectorSchema = createInsertSchema(ddIndustrySectors).omit({ id: true, createdAt: true });
export type InsertDDIndustrySector = z.infer<typeof insertDDIndustrySectorSchema>;

// Checklist Sections (the 23+ sections)
export const ddChecklistSections = pgTable("dd_checklist_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  displayOrder: integer("display_order"),
  icon: varchar("icon", { length: 50 }),
  isLiveSearch: boolean("is_live_search").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type DDChecklistSection = typeof ddChecklistSections.$inferSelect;
export const insertDDChecklistSectionSchema = createInsertSchema(ddChecklistSections).omit({ id: true, createdAt: true });
export type InsertDDChecklistSection = z.infer<typeof insertDDChecklistSectionSchema>;

// Master Checklist Items Library
export const ddChecklistItemsMaster = pgTable("dd_checklist_items_master", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectionId: varchar("section_id").notNull().references(() => ddChecklistSections.id),
  itemText: text("item_text").notNull(),
  itemDescription: text("item_description"),
  priority: varchar("priority", { length: 20 }).default("standard"), // 'critical', 'standard', 'optional'
  isDefault: boolean("is_default").default(true),
  source: varchar("source", { length: 100 }).default("system"), // 'system', 'industry', 'custom'
  createdAt: timestamp("created_at").defaultNow(),
});

export type DDChecklistItemMaster = typeof ddChecklistItemsMaster.$inferSelect;
export const insertDDChecklistItemMasterSchema = createInsertSchema(ddChecklistItemsMaster).omit({ id: true, createdAt: true });
export type InsertDDChecklistItemMaster = z.infer<typeof insertDDChecklistItemMasterSchema>;

// Transaction Type <-> Checklist Item Mapping
export const ddTransactionTypeChecklistItems = pgTable("dd_transaction_type_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionTypeId: varchar("transaction_type_id").notNull().references(() => ddTransactionTypes.id),
  checklistItemId: varchar("checklist_item_id").notNull().references(() => ddChecklistItemsMaster.id),
  isRequired: boolean("is_required").default(false),
  isRecommended: boolean("is_recommended").default(true),
  relevanceScore: numeric("relevance_score", { precision: 3, scale: 2 }).default("1.00"),
  notes: text("notes"),
});

export type DDTransactionTypeChecklistItem = typeof ddTransactionTypeChecklistItems.$inferSelect;
export const insertDDTransactionTypeChecklistItemSchema = createInsertSchema(ddTransactionTypeChecklistItems).omit({ id: true });
export type InsertDDTransactionTypeChecklistItem = z.infer<typeof insertDDTransactionTypeChecklistItemSchema>;

// Industry <-> Checklist Item Mapping
export const ddIndustryChecklistItems = pgTable("dd_industry_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  industrySectorId: varchar("industry_sector_id").notNull().references(() => ddIndustrySectors.id),
  checklistItemId: varchar("checklist_item_id").notNull().references(() => ddChecklistItemsMaster.id),
  isRequired: boolean("is_required").default(false),
  isRecommended: boolean("is_recommended").default(true),
  relevanceScore: numeric("relevance_score", { precision: 3, scale: 2 }).default("1.00"),
  notes: text("notes"),
});

export type DDIndustryChecklistItem = typeof ddIndustryChecklistItems.$inferSelect;
export const insertDDIndustryChecklistItemSchema = createInsertSchema(ddIndustryChecklistItems).omit({ id: true });
export type InsertDDIndustryChecklistItem = z.infer<typeof insertDDIndustryChecklistItemSchema>;

// User-Created Checklist Templates
export const ddChecklistTemplates = pgTable("dd_checklist_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id"),
  createdBy: varchar("created_by").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  transactionTypeId: varchar("transaction_type_id").references(() => ddTransactionTypes.id),
  industrySectorId: varchar("industry_sector_id").references(() => ddIndustrySectors.id),
  isShared: boolean("is_shared").default(false),
  isDefault: boolean("is_default").default(false),
  baseTemplateId: varchar("base_template_id").references(() => ddChecklistTemplates.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type DDChecklistTemplate = typeof ddChecklistTemplates.$inferSelect;
export const insertDDChecklistTemplateSchema = createInsertSchema(ddChecklistTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDDChecklistTemplate = z.infer<typeof insertDDChecklistTemplateSchema>;

// Template Items
export const ddChecklistTemplateItems = pgTable("dd_checklist_template_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => ddChecklistTemplates.id),
  sectionId: varchar("section_id").notNull().references(() => ddChecklistSections.id),
  masterItemId: varchar("master_item_id").references(() => ddChecklistItemsMaster.id),
  customItemText: text("custom_item_text"),
  customItemDescription: text("custom_item_description"),
  isIncluded: boolean("is_included").default(true),
  isRequired: boolean("is_required").default(false),
  displayOrder: integer("display_order"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type DDChecklistTemplateItem = typeof ddChecklistTemplateItems.$inferSelect;
export const insertDDChecklistTemplateItemSchema = createInsertSchema(ddChecklistTemplateItems).omit({ id: true, createdAt: true });
export type InsertDDChecklistTemplateItem = z.infer<typeof insertDDChecklistTemplateItemSchema>;

// Deal Checklist Instance
export const ddDealChecklists = pgTable("dd_deal_checklists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull(),
  sourceType: dealIntelligenceSourceTypeEnum("source_type").default("pe_deal"),
  templateId: varchar("template_id").references(() => ddChecklistTemplates.id),
  transactionTypeId: varchar("transaction_type_id").references(() => ddTransactionTypes.id),
  industrySectorId: varchar("industry_sector_id").references(() => ddIndustrySectors.id),
  name: varchar("name", { length: 255 }),
  status: varchar("status", { length: 50 }).default("draft"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type DDDealChecklist = typeof ddDealChecklists.$inferSelect;
export const insertDDDealChecklistSchema = createInsertSchema(ddDealChecklists).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDDDealChecklist = z.infer<typeof insertDDDealChecklistSchema>;

// Deal Checklist Items (actual tracking)
export const ddDealChecklistItems = pgTable("dd_deal_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealChecklistId: varchar("deal_checklist_id").notNull().references(() => ddDealChecklists.id),
  sectionId: varchar("section_id").notNull().references(() => ddChecklistSections.id),
  masterItemId: varchar("master_item_id").references(() => ddChecklistItemsMaster.id),
  itemText: text("item_text").notNull(),
  itemDescription: text("item_description"),
  status: varchar("status", { length: 50 }).default("pending"),
  priority: varchar("priority", { length: 20 }).default("standard"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  dueDate: timestamp("due_date"),
  completionDate: timestamp("completion_date"),
  notes: text("notes"),
  riskFlag: varchar("risk_flag", { length: 20 }).default("none"),
  riskNotes: text("risk_notes"),
  documentIds: jsonb("document_ids"),
  displayOrder: integer("display_order"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type DDDealChecklistItem = typeof ddDealChecklistItems.$inferSelect;
export const insertDDDealChecklistItemSchema = createInsertSchema(ddDealChecklistItems).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDDDealChecklistItem = z.infer<typeof insertDDDealChecklistItemSchema>;

// Document Bullet Summaries - cached bullet-point summaries for quick display
export const documentBulletSummariesSourceTypeEnum = pgEnum("document_bullet_summaries_source_type", [
  "communication",
  "data_room_document",
  "court_pleading",
  "case_document",
]);

export const documentBulletSummaries = pgTable("document_bullet_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceType: documentBulletSummariesSourceTypeEnum("source_type").notNull(),
  sourceId: varchar("source_id", { length: 255 }).notNull(),
  bullets: jsonb("bullets").notNull().$type<{
    text: string;
    category?: string;
  }[]>(),
  contentHash: varchar("content_hash", { length: 64 }),
  generatedAt: timestamp("generated_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  sourceIdx: index("idx_document_bullet_summaries_source").on(table.sourceType, table.sourceId),
}));

export type DocumentBulletSummary = typeof documentBulletSummaries.$inferSelect;
export const insertDocumentBulletSummarySchema = createInsertSchema(documentBulletSummaries).omit({ id: true, createdAt: true });
export type InsertDocumentBulletSummary = z.infer<typeof insertDocumentBulletSummarySchema>;

// ============================================================
// DD BOOLEAN QUERY SYSTEM - Two-Stage Retrieval Pipeline
// ============================================================

// Enum for boolean query types
export const ddQueryTypeEnum = pgEnum("dd_query_type", [
  "primary",
  "secondary",
  "risk_indicator",
]);

// Enum for document match types
export const ddDocumentMatchTypeEnum = pgEnum("dd_document_match_type", [
  "boolean_hit",
  "ai_cited",
  "user_tagged",
]);

// Enum for document source in DD context
export const ddDocumentSourceEnum = pgEnum("dd_document_source", [
  "data_room",
  "case_evidence",
  "transaction_folder",
  "court_pleading",
  "communication",
]);

// Master Boolean Queries Library - standard queries per section
export const ddBooleanQueries = pgTable("dd_boolean_queries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectionId: varchar("section_id").notNull().references(() => ddChecklistSections.id),
  queryType: ddQueryTypeEnum("query_type").notNull(),
  queryText: text("query_text").notNull(),
  description: text("description"),
  synonymExpansion: text("synonym_expansion"),
  expectedDocTypes: text("expected_doc_types"),
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  sectionQueryIdx: index("idx_dd_boolean_queries_section").on(table.sectionId, table.queryType),
}));

export type DDBooleanQuery = typeof ddBooleanQueries.$inferSelect;
export const insertDDBooleanQuerySchema = createInsertSchema(ddBooleanQueries).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDDBooleanQuery = z.infer<typeof insertDDBooleanQuerySchema>;

// Per-Deal Customized Queries - editable copies of master queries
export const ddDealQueries = pgTable("dd_deal_queries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull(),
  sourceType: dealIntelligenceSourceTypeEnum("source_type").default("pe_deal"),
  sectionId: varchar("section_id").notNull().references(() => ddChecklistSections.id),
  sourceQueryId: varchar("source_query_id").references(() => ddBooleanQueries.id),
  queryType: ddQueryTypeEnum("query_type").notNull(),
  queryText: text("query_text").notNull(),
  isCustomized: boolean("is_customized").default(false),
  lastEditedBy: varchar("last_edited_by").references(() => users.id),
  lastEditedAt: timestamp("last_edited_at"),
  isActive: boolean("is_active").default(true),
  version: integer("version").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  dealSectionIdx: index("idx_dd_deal_queries_deal_section").on(table.dealId, table.sectionId, table.queryType),
  uniqueDealQuery: unique("uq_dd_deal_queries").on(table.dealId, table.sourceType, table.sectionId, table.queryType),
}));

export type DDDealQuery = typeof ddDealQueries.$inferSelect;
export const insertDDDealQuerySchema = createInsertSchema(ddDealQueries).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDDDealQuery = z.infer<typeof insertDDDealQuerySchema>;

// Analysis Runs - track when analysis was executed
export const ddAnalysisRuns = pgTable("dd_analysis_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull(),
  sourceType: dealIntelligenceSourceTypeEnum("source_type").default("pe_deal"),
  initiatedBy: varchar("initiated_by").references(() => users.id),
  initiatedAt: timestamp("initiated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  status: analysisStatusEnum("status").default("pending"),
  totalDocumentsSearched: integer("total_documents_searched").default(0),
  totalDocumentsMatched: integer("total_documents_matched").default(0),
  inputSummary: jsonb("input_summary").$type<{
    sectionsAnalyzed: number;
    queriesExecuted: number;
    documentSources: string[];
    targetCompanyName?: string;
    industryId?: string;
  }>(),
  outputSummary: jsonb("output_summary").$type<{
    riskFlagsCount: number;
    sectionsWithFindings: number;
    totalFindings: number;
    overallRiskLevel?: string;
  }>(),
  aiModel: varchar("ai_model", { length: 100 }),
  notes: text("notes"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  dealIdx: index("idx_dd_analysis_runs_deal").on(table.dealId, table.sourceType),
}));

export type DDAnalysisRun = typeof ddAnalysisRuns.$inferSelect;
export const insertDDAnalysisRunSchema = createInsertSchema(ddAnalysisRuns).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDDAnalysisRun = z.infer<typeof insertDDAnalysisRunSchema>;

// Section Results - AI analysis findings per section per run
export const ddSectionResults = pgTable("dd_section_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  analysisRunId: varchar("analysis_run_id").notNull().references(() => ddAnalysisRuns.id, { onDelete: "cascade" }),
  sectionId: varchar("section_id").notNull().references(() => ddChecklistSections.id),
  documentsMatched: integer("documents_matched").default(0),
  documentsAnalyzed: integer("documents_analyzed").default(0),
  confidence: numeric("confidence", { precision: 5, scale: 4 }),
  riskLevel: riskLevelEnum("risk_level").default("low"),
  summary: text("summary"),
  keyFindings: jsonb("key_findings").$type<{
    finding: string;
    severity: string;
    documentRefs: string[];
    pageRefs?: string[];
  }[]>(),
  riskFlags: jsonb("risk_flags").$type<{
    flag: string;
    severity: string;
    evidence: string;
    documentRef?: string;
  }[]>(),
  recommendations: jsonb("recommendations").$type<{
    recommendation: string;
    priority: string;
    rationale?: string;
  }[]>(),
  aiFindings: jsonb("ai_findings"),
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  runSectionIdx: index("idx_dd_section_results_run").on(table.analysisRunId, table.sectionId),
  uniqueRunSection: unique("uq_dd_section_results").on(table.analysisRunId, table.sectionId),
}));

export type DDSectionResult = typeof ddSectionResults.$inferSelect;
export const insertDDSectionResultSchema = createInsertSchema(ddSectionResults).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDDSectionResult = z.infer<typeof insertDDSectionResultSchema>;

// Document Matches - many-to-many linking documents to sections with match metadata
export const ddDocumentMatches = pgTable("dd_document_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  analysisRunId: varchar("analysis_run_id").notNull().references(() => ddAnalysisRuns.id, { onDelete: "cascade" }),
  sectionId: varchar("section_id").notNull().references(() => ddChecklistSections.id),
  documentId: varchar("document_id").notNull(),
  documentSource: ddDocumentSourceEnum("document_source").notNull(),
  documentTitle: text("document_title"),
  documentPath: text("document_path"),
  matchType: ddDocumentMatchTypeEnum("match_type").notNull(),
  relevanceScore: numeric("relevance_score", { precision: 5, scale: 4 }),
  matchedTerms: jsonb("matched_terms").$type<string[]>(),
  matchedExcerpts: jsonb("matched_excerpts").$type<{
    text: string;
    page?: number;
    location?: string;
  }[]>(),
  aiAnalysis: text("ai_analysis"),
  aiCitations: jsonb("ai_citations").$type<{
    citation: string;
    page?: number;
    significance: string;
  }[]>(),
  userTags: jsonb("user_tags").$type<string[]>(),
  userNotes: text("user_notes"),
  isReviewed: boolean("is_reviewed").default(false),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  runSectionIdx: index("idx_dd_document_matches_run_section").on(table.analysisRunId, table.sectionId),
  documentIdx: index("idx_dd_document_matches_document").on(table.documentId, table.documentSource),
  uniqueMatch: unique("uq_dd_document_matches").on(table.analysisRunId, table.sectionId, table.documentId, table.matchType),
}));

export type DDDocumentMatch = typeof ddDocumentMatches.$inferSelect;
export const insertDDDocumentMatchSchema = createInsertSchema(ddDocumentMatches).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDDDocumentMatch = z.infer<typeof insertDDDocumentMatchSchema>;

// Due Diligence Relations
export const ddTransactionTypesRelations = relations(ddTransactionTypes, ({ one, many }) => ({
  parent: one(ddTransactionTypes, {
    fields: [ddTransactionTypes.parentTypeId],
    references: [ddTransactionTypes.id],
    relationName: "transactionTypeParent",
  }),
  children: many(ddTransactionTypes, { relationName: "transactionTypeParent" }),
  checklistItems: many(ddTransactionTypeChecklistItems),
}));

export const ddIndustrySectorsRelations = relations(ddIndustrySectors, ({ one, many }) => ({
  parent: one(ddIndustrySectors, {
    fields: [ddIndustrySectors.parentSectorId],
    references: [ddIndustrySectors.id],
    relationName: "industrySectorParent",
  }),
  children: many(ddIndustrySectors, { relationName: "industrySectorParent" }),
  checklistItems: many(ddIndustryChecklistItems),
}));

export const ddChecklistSectionsRelations = relations(ddChecklistSections, ({ many }) => ({
  items: many(ddChecklistItemsMaster),
  booleanQueries: many(ddBooleanQueries),
  dealQueries: many(ddDealQueries),
  sectionResults: many(ddSectionResults),
  documentMatches: many(ddDocumentMatches),
}));

// DD Boolean Query Relations
export const ddBooleanQueriesRelations = relations(ddBooleanQueries, ({ one, many }) => ({
  section: one(ddChecklistSections, {
    fields: [ddBooleanQueries.sectionId],
    references: [ddChecklistSections.id],
  }),
  dealQueries: many(ddDealQueries),
}));

export const ddDealQueriesRelations = relations(ddDealQueries, ({ one }) => ({
  section: one(ddChecklistSections, {
    fields: [ddDealQueries.sectionId],
    references: [ddChecklistSections.id],
  }),
  sourceQuery: one(ddBooleanQueries, {
    fields: [ddDealQueries.sourceQueryId],
    references: [ddBooleanQueries.id],
  }),
  lastEditedByUser: one(users, {
    fields: [ddDealQueries.lastEditedBy],
    references: [users.id],
  }),
}));

export const ddAnalysisRunsRelations = relations(ddAnalysisRuns, ({ one, many }) => ({
  initiatedByUser: one(users, {
    fields: [ddAnalysisRuns.initiatedBy],
    references: [users.id],
  }),
  sectionResults: many(ddSectionResults),
  documentMatches: many(ddDocumentMatches),
}));

export const ddSectionResultsRelations = relations(ddSectionResults, ({ one }) => ({
  analysisRun: one(ddAnalysisRuns, {
    fields: [ddSectionResults.analysisRunId],
    references: [ddAnalysisRuns.id],
  }),
  section: one(ddChecklistSections, {
    fields: [ddSectionResults.sectionId],
    references: [ddChecklistSections.id],
  }),
}));

export const ddDocumentMatchesRelations = relations(ddDocumentMatches, ({ one }) => ({
  analysisRun: one(ddAnalysisRuns, {
    fields: [ddDocumentMatches.analysisRunId],
    references: [ddAnalysisRuns.id],
  }),
  section: one(ddChecklistSections, {
    fields: [ddDocumentMatches.sectionId],
    references: [ddChecklistSections.id],
  }),
  reviewedByUser: one(users, {
    fields: [ddDocumentMatches.reviewedBy],
    references: [users.id],
  }),
}));

export const ddChecklistItemsMasterRelations = relations(ddChecklistItemsMaster, ({ one }) => ({
  section: one(ddChecklistSections, {
    fields: [ddChecklistItemsMaster.sectionId],
    references: [ddChecklistSections.id],
  }),
}));

export const ddTransactionTypeChecklistItemsRelations = relations(ddTransactionTypeChecklistItems, ({ one }) => ({
  transactionType: one(ddTransactionTypes, {
    fields: [ddTransactionTypeChecklistItems.transactionTypeId],
    references: [ddTransactionTypes.id],
  }),
  checklistItem: one(ddChecklistItemsMaster, {
    fields: [ddTransactionTypeChecklistItems.checklistItemId],
    references: [ddChecklistItemsMaster.id],
  }),
}));

export const ddIndustryChecklistItemsRelations = relations(ddIndustryChecklistItems, ({ one }) => ({
  industrySector: one(ddIndustrySectors, {
    fields: [ddIndustryChecklistItems.industrySectorId],
    references: [ddIndustrySectors.id],
  }),
  checklistItem: one(ddChecklistItemsMaster, {
    fields: [ddIndustryChecklistItems.checklistItemId],
    references: [ddChecklistItemsMaster.id],
  }),
}));

export const ddChecklistTemplatesRelations = relations(ddChecklistTemplates, ({ one, many }) => ({
  transactionType: one(ddTransactionTypes, {
    fields: [ddChecklistTemplates.transactionTypeId],
    references: [ddTransactionTypes.id],
  }),
  industrySector: one(ddIndustrySectors, {
    fields: [ddChecklistTemplates.industrySectorId],
    references: [ddIndustrySectors.id],
  }),
  createdByUser: one(users, {
    fields: [ddChecklistTemplates.createdBy],
    references: [users.id],
  }),
  baseTemplate: one(ddChecklistTemplates, {
    fields: [ddChecklistTemplates.baseTemplateId],
    references: [ddChecklistTemplates.id],
    relationName: "templateBase",
  }),
  derivedTemplates: many(ddChecklistTemplates, { relationName: "templateBase" }),
  items: many(ddChecklistTemplateItems),
}));

export const ddChecklistTemplateItemsRelations = relations(ddChecklistTemplateItems, ({ one }) => ({
  template: one(ddChecklistTemplates, {
    fields: [ddChecklistTemplateItems.templateId],
    references: [ddChecklistTemplates.id],
  }),
  section: one(ddChecklistSections, {
    fields: [ddChecklistTemplateItems.sectionId],
    references: [ddChecklistSections.id],
  }),
  masterItem: one(ddChecklistItemsMaster, {
    fields: [ddChecklistTemplateItems.masterItemId],
    references: [ddChecklistItemsMaster.id],
  }),
}));

export const ddDealChecklistsRelations = relations(ddDealChecklists, ({ one, many }) => ({
  template: one(ddChecklistTemplates, {
    fields: [ddDealChecklists.templateId],
    references: [ddChecklistTemplates.id],
  }),
  transactionType: one(ddTransactionTypes, {
    fields: [ddDealChecklists.transactionTypeId],
    references: [ddTransactionTypes.id],
  }),
  industrySector: one(ddIndustrySectors, {
    fields: [ddDealChecklists.industrySectorId],
    references: [ddIndustrySectors.id],
  }),
  createdByUser: one(users, {
    fields: [ddDealChecklists.createdBy],
    references: [users.id],
  }),
  items: many(ddDealChecklistItems),
}));

export const ddDealChecklistItemsRelations = relations(ddDealChecklistItems, ({ one }) => ({
  dealChecklist: one(ddDealChecklists, {
    fields: [ddDealChecklistItems.dealChecklistId],
    references: [ddDealChecklists.id],
  }),
  section: one(ddChecklistSections, {
    fields: [ddDealChecklistItems.sectionId],
    references: [ddChecklistSections.id],
  }),
  masterItem: one(ddChecklistItemsMaster, {
    fields: [ddDealChecklistItems.masterItemId],
    references: [ddChecklistItemsMaster.id],
  }),
  assignedToUser: one(users, {
    fields: [ddDealChecklistItems.assignedTo],
    references: [users.id],
  }),
}));

// PE Deal Relations
export const peDealsRelations = relations(peDeals, ({ one, many }) => ({
  firm: one(peFirms, {
    fields: [peDeals.firmId],
    references: [peFirms.id],
  }),
  contacts: many(dealContacts),
  workstreams: many(workstreams),
  questions: many(diligenceQuestions),
  calls: many(peCalls),
  riskFlags: many(peRiskFlags),
  patternMatches: many(patternMatches),
  documents: many(peDealDocuments),
  timelineEvents: many(dealTimelineEvents),
}));

export const peFirmsRelations = relations(peFirms, ({ one, many }) => ({
  settings: one(peFirmSettings),
  deals: many(peDeals),
  portfolioCompanies: many(portfolioCompanies),
  templates: many(diligenceTemplates),
}));

export const workstreamsRelations = relations(workstreams, ({ one, many }) => ({
  deal: one(peDeals, {
    fields: [workstreams.dealId],
    references: [peDeals.id],
  }),
  owner: one(users, {
    fields: [workstreams.ownerId],
    references: [users.id],
  }),
  questions: many(diligenceQuestions),
}));

export const diligenceQuestionsRelations = relations(diligenceQuestions, ({ one, many }) => ({
  deal: one(peDeals, {
    fields: [diligenceQuestions.dealId],
    references: [peDeals.id],
  }),
  workstream: one(workstreams, {
    fields: [diligenceQuestions.workstreamId],
    references: [workstreams.id],
  }),
  documentLinks: many(questionDocumentLinks),
  callReferences: many(callQuestionReferences),
}));

export const peCallsRelations = relations(peCalls, ({ one, many }) => ({
  deal: one(peDeals, {
    fields: [peCalls.dealId],
    references: [peDeals.id],
  }),
  participants: many(peCallParticipants),
  documentRefs: many(callDocumentReferences),
  questionRefs: many(callQuestionReferences),
}));

export const peRiskFlagsRelations = relations(peRiskFlags, ({ one }) => ({
  deal: one(peDeals, {
    fields: [peRiskFlags.dealId],
    references: [peDeals.id],
  }),
  flaggedBy: one(users, {
    fields: [peRiskFlags.flaggedById],
    references: [users.id],
  }),
  assignedTo: one(users, {
    fields: [peRiskFlags.assignedToId],
    references: [users.id],
  }),
}));

export const patternMatchesRelations = relations(patternMatches, ({ one }) => ({
  deal: one(peDeals, {
    fields: [patternMatches.dealId],
    references: [peDeals.id],
  }),
}));

export const portfolioCompaniesRelations = relations(portfolioCompanies, ({ one }) => ({
  firm: one(peFirms, {
    fields: [portfolioCompanies.firmId],
    references: [peFirms.id],
  }),
}));

export const peDealDocumentsRelations = relations(peDealDocuments, ({ one }) => ({
  deal: one(peDeals, {
    fields: [peDealDocuments.dealId],
    references: [peDeals.id],
  }),
  reviewedBy: one(users, {
    fields: [peDealDocuments.reviewedById],
    references: [users.id],
  }),
}));

// =============================================
// AUTO SEARCH TERM GENERATION FEATURE
// =============================================

// Enums for search term generation
export const searchTermSourceTypeEnum = pgEnum("search_term_source_type", [
  "rfp",
  "complaint",
  "subpoena",
  "interrogatory",
  "manual",
  "custom",
  "opposing_counsel"
]);

export const searchTermItemTypeEnum = pgEnum("search_term_item_type", [
  "rfp_request",
  "complaint_claim",
  "privilege_category",
  "custom",
  "custom_search",
  "reference_search",
  "opposing_counsel_term"
]);

export const searchTermGenerationStatusEnum = pgEnum("search_term_generation_status", [
  "pending",
  "processing",
  "completed",
  "failed"
]);

export const searchTermExecutionStatusEnum = pgEnum("search_term_execution_status", [
  "pending",
  "running",
  "completed",
  "failed"
]);

export const documentTagSourceEnum = pgEnum("document_tag_source", [
  "search_term",
  "ai_review",
  "manual",
  "privilege_scan",
  "opposing_counsel"
]);

export const documentTagReviewStatusEnum = pgEnum("document_tag_review_status", [
  "pending",
  "confirmed",
  "rejected",
  "needs_review"
]);

export const privilegeLogTypeEnum = pgEnum("privilege_log_type", [
  "attorney_client",
  "work_product",
  "work_product_opinion",
  "common_interest",
  "joint_defense",
  "deliberative_process",
  "other"
]);

export const privilegeLogStatusEnum = pgEnum("privilege_log_status", [
  "draft",
  "reviewed",
  "final",
  "challenged"
]);

// Search Term Sets - Parent container for a set of generated terms
export const searchTermSets = pgTable("search_term_sets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull(),
  sourceType: searchTermSourceTypeEnum("source_type").notNull(),
  sourceDocumentId: varchar("source_document_id")
    .references(() => courtPleadings.id),
  sourceDocumentName: text("source_document_name"),
  name: text("name").notNull(),
  description: text("description"),
  generationStatus: searchTermGenerationStatusEnum("generation_status").default("pending"),
  generationProgress: integer("generation_progress").default(0),
  generationError: text("generation_error"),
  totalRequests: integer("total_requests").default(0),
  lastExecutedAt: timestamp("last_executed_at"),
  documentsSearched: integer("documents_searched").default(0),
  documentsTagged: integer("documents_tagged").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
});

// Search Term Items - Individual RFP requests or complaint claims with their search terms
export const searchTermItems = pgTable("search_term_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  searchTermSetId: varchar("search_term_set_id")
    .references(() => searchTermSets.id, { onDelete: "cascade" })
    .notNull(),
  itemNumber: integer("item_number").notNull(),
  itemType: searchTermItemTypeEnum("item_type").notNull(),
  fullText: text("full_text").notNull(),
  summary: text("summary"),
  causeOfAction: text("cause_of_action"),
  legalElements: jsonb("legal_elements"),
  searchTerms: jsonb("search_terms").notNull().default([]),
  combinedBooleanString: text("combined_boolean_string"),
  executionStatus: searchTermExecutionStatusEnum("execution_status").default("pending"),
  lastExecutedAt: timestamp("last_executed_at"),
  documentsMatched: integer("documents_matched").default(0),
  isPrivilegeCategory: boolean("is_privilege_category").default(false),
  tagName: text("tag_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document Search Tags - Results of search execution (tagged documents)
export const documentSearchTags = pgTable("document_search_tags", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull(),
  documentId: varchar("document_id").notNull(),
  searchTermItemId: varchar("search_term_item_id")
    .references(() => searchTermItems.id, { onDelete: "set null" }),
  tagSource: documentTagSourceEnum("tag_source").notNull(),
  tagName: text("tag_name").notNull(),
  tagCategory: varchar("tag_category", { length: 50 }),
  tagColor: varchar("tag_color", { length: 7 }).default("#6B7280"),
  matchedTerms: text("matched_terms").array(),
  matchSnippets: jsonb("match_snippets"),
  confidenceScore: integer("confidence_score"),
  reviewStatus: documentTagReviewStatusEnum("review_status").default("pending"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Privilege Log Entries
export const privilegeLogEntries = pgTable("privilege_log_entries", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull(),
  documentId: varchar("document_id").notNull(),
  documentTagId: varchar("document_tag_id")
    .references(() => documentSearchTags.id),
  batesBegin: text("bates_begin"),
  batesEnd: text("bates_end"),
  documentDate: date("document_date"),
  documentType: text("document_type"),
  author: text("author"),
  authorTitle: text("author_title"),
  recipients: text("recipients").array(),
  ccRecipients: text("cc_recipients").array(),
  privilegeType: privilegeLogTypeEnum("privilege_type").notNull(),
  privilegeDescription: text("privilege_description").notNull(),
  aiPrivilegeBasis: text("ai_privilege_basis"),
  aiConfidence: integer("ai_confidence"),
  logStatus: privilegeLogStatusEnum("log_status").default("draft"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations for Search Term Sets
export const searchTermSetsRelations = relations(searchTermSets, ({ one, many }) => ({
  case: one(cases, {
    fields: [searchTermSets.caseId],
    references: [cases.id],
  }),
  sourceDocument: one(courtPleadings, {
    fields: [searchTermSets.sourceDocumentId],
    references: [courtPleadings.id],
  }),
  createdByUser: one(users, {
    fields: [searchTermSets.createdBy],
    references: [users.id],
  }),
  items: many(searchTermItems),
}));

export const searchTermItemsRelations = relations(searchTermItems, ({ one, many }) => ({
  searchTermSet: one(searchTermSets, {
    fields: [searchTermItems.searchTermSetId],
    references: [searchTermSets.id],
  }),
  documentTags: many(documentSearchTags),
}));

export const documentSearchTagsRelations = relations(documentSearchTags, ({ one }) => ({
  case: one(cases, {
    fields: [documentSearchTags.caseId],
    references: [cases.id],
  }),
  searchTermItem: one(searchTermItems, {
    fields: [documentSearchTags.searchTermItemId],
    references: [searchTermItems.id],
  }),
  reviewedByUser: one(users, {
    fields: [documentSearchTags.reviewedBy],
    references: [users.id],
  }),
}));

export const privilegeLogEntriesRelations = relations(privilegeLogEntries, ({ one }) => ({
  case: one(cases, {
    fields: [privilegeLogEntries.caseId],
    references: [cases.id],
  }),
  documentTag: one(documentSearchTags, {
    fields: [privilegeLogEntries.documentTagId],
    references: [documentSearchTags.id],
  }),
  reviewedByUser: one(users, {
    fields: [privilegeLogEntries.reviewedBy],
    references: [users.id],
  }),
}));

// Types for Search Term Generation
export type SearchTermSet = typeof searchTermSets.$inferSelect;
export type InsertSearchTermSet = typeof searchTermSets.$inferInsert;
export type SearchTermItem = typeof searchTermItems.$inferSelect;
export type InsertSearchTermItem = typeof searchTermItems.$inferInsert;
export type DocumentSearchTag = typeof documentSearchTags.$inferSelect;
export type InsertDocumentSearchTag = typeof documentSearchTags.$inferInsert;
export type PrivilegeLogEntry = typeof privilegeLogEntries.$inferSelect;
export type InsertPrivilegeLogEntry = typeof privilegeLogEntries.$inferInsert;

// Search Term interface for JSONB field
export interface SearchTerm {
  id: string;
  term: string;
  type: "boolean" | "phrase" | "proximity" | "wildcard";
  enabled: boolean;
  aiGenerated: boolean;
  rationale?: string;
}

// Legal Element interface for complaint claims
export interface LegalElement {
  element: string;
  description: string;
  searchTerms: SearchTerm[];
}

// ============================================
// CAUSE OF ACTION CHECKLIST SYSTEM
// ============================================

// Enums for Checklist
export const elementStrengthEnum = pgEnum("element_strength", [
  "not_evaluated",
  "strong",
  "moderate",
  "weak",
  "critical_gap",
]);

export const elementSourceEnum = pgEnum("element_source", [
  "template",
  "ai_generated",
  "manual",
]);

export const evidenceClassificationEnum = pgEnum("evidence_classification", [
  "supporting",
  "contradicting",
  "neutral",
]);

export const evidenceDocumentTypeEnum = pgEnum("evidence_document_type", [
  "evidence_item",
  "email",
  "court_filing",
  "deposition",
  "exhibit",
  "interview_transcript",
  "external_document",
  "communication",
  "data_room_document",
]);

// Causes of Action - Extracted from complaint analysis
export const causesOfAction = pgTable("causes_of_action", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull(),
  searchTermSetId: varchar("search_term_set_id")
    .references(() => searchTermSets.id, { onDelete: "set null" }),
  searchTermItemId: varchar("search_term_item_id")
    .references(() => searchTermItems.id, { onDelete: "set null" }),
  claimNumber: integer("claim_number").notNull(),
  claimType: text("claim_type").notNull(),
  claimName: text("claim_name").notNull(),
  jurisdiction: text("jurisdiction"),
  statutoryBasis: text("statutory_basis"),
  fullText: text("full_text"),
  overallStrength: integer("overall_strength").default(0),
  aiConfidence: real("ai_confidence"),
  isVerified: boolean("is_verified").default(false),
  verifiedBy: varchar("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: varchar("created_by").references(() => users.id),
});

// Case Elements - Legal elements required to prove each cause of action
export const caseElements = pgTable("case_elements", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  caseId: varchar("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull(),
  causeOfActionId: varchar("cause_of_action_id")
    .references(() => causesOfAction.id, { onDelete: "cascade" })
    .notNull(),
  elementNumber: integer("element_number").notNull(),
  elementName: text("element_name").notNull(),
  elementDescription: text("element_description").notNull(),
  legalStandard: text("legal_standard"),
  statutoryReference: text("statutory_reference"),
  mustProve: text("must_prove"),
  supportingFacts: text("supporting_facts"),
  gaps: text("gaps"),
  commonChallenges: jsonb("common_challenges"),
  typicalEvidence: jsonb("typical_evidence"),
  suggestedSearchTerms: jsonb("suggested_search_terms"),
  strengthAssessment: elementStrengthEnum("strength_assessment").default("not_evaluated"),
  attorneyNotes: text("attorney_notes"),
  handwrittenNotes: text("handwritten_notes"),
  showSearchTerms: boolean("show_search_terms").default(true),
  source: elementSourceEnum("source").default("ai_generated"),
  aiConfidence: real("ai_confidence"),
  isVerified: boolean("is_verified").default(false),
  verifiedBy: varchar("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Element Search Terms - Links search terms to elements
export const elementSearchTerms = pgTable("element_search_terms", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  elementId: varchar("element_id")
    .references(() => caseElements.id, { onDelete: "cascade" })
    .notNull(),
  searchTermItemId: varchar("search_term_item_id")
    .references(() => searchTermItems.id, { onDelete: "cascade" }),
  searchTermText: text("search_term_text"),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Element Evidence - Evidence linked to elements
export const elementEvidence = pgTable("element_evidence", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  elementId: varchar("element_id")
    .references(() => caseElements.id, { onDelete: "cascade" })
    .notNull(),
  documentType: evidenceDocumentTypeEnum("document_type").notNull(),
  documentId: varchar("document_id"),
  externalReference: text("external_reference"),
  documentTitle: text("document_title"),
  documentDate: timestamp("document_date"),
  evidenceClassification: evidenceClassificationEnum("evidence_classification").notNull(),
  relevanceScore: real("relevance_score"),
  excerpt: text("excerpt"),
  excerptLocation: text("excerpt_location"),
  aiSuggested: boolean("ai_suggested").default(false),
  aiConfidence: real("ai_confidence"),
  aiReasoning: text("ai_reasoning"),
  isVerified: boolean("is_verified").default(false),
  verifiedBy: varchar("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  isKeyEvidence: boolean("is_key_evidence").default(false),
  attorneyNotes: text("attorney_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: varchar("created_by").references(() => users.id),
});

// Relations for Cause of Action Checklist
export const causesOfActionRelations = relations(causesOfAction, ({ one, many }) => ({
  case: one(cases, {
    fields: [causesOfAction.caseId],
    references: [cases.id],
  }),
  searchTermSet: one(searchTermSets, {
    fields: [causesOfAction.searchTermSetId],
    references: [searchTermSets.id],
  }),
  searchTermItem: one(searchTermItems, {
    fields: [causesOfAction.searchTermItemId],
    references: [searchTermItems.id],
  }),
  createdByUser: one(users, {
    fields: [causesOfAction.createdBy],
    references: [users.id],
  }),
  verifiedByUser: one(users, {
    fields: [causesOfAction.verifiedBy],
    references: [users.id],
  }),
  elements: many(caseElements),
}));

export const caseElementsRelations = relations(caseElements, ({ one, many }) => ({
  case: one(cases, {
    fields: [caseElements.caseId],
    references: [cases.id],
  }),
  causeOfAction: one(causesOfAction, {
    fields: [caseElements.causeOfActionId],
    references: [causesOfAction.id],
  }),
  verifiedByUser: one(users, {
    fields: [caseElements.verifiedBy],
    references: [users.id],
  }),
  searchTermLinks: many(elementSearchTerms),
  evidence: many(elementEvidence),
}));

export const elementSearchTermsRelations = relations(elementSearchTerms, ({ one }) => ({
  element: one(caseElements, {
    fields: [elementSearchTerms.elementId],
    references: [caseElements.id],
  }),
  searchTermItem: one(searchTermItems, {
    fields: [elementSearchTerms.searchTermItemId],
    references: [searchTermItems.id],
  }),
}));

export const elementEvidenceRelations = relations(elementEvidence, ({ one }) => ({
  element: one(caseElements, {
    fields: [elementEvidence.elementId],
    references: [caseElements.id],
  }),
  verifiedByUser: one(users, {
    fields: [elementEvidence.verifiedBy],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [elementEvidence.createdBy],
    references: [users.id],
  }),
}));

// Types for Cause of Action Checklist
export type CauseOfAction = typeof causesOfAction.$inferSelect;
export type InsertCauseOfAction = typeof causesOfAction.$inferInsert;
export type CaseElement = typeof caseElements.$inferSelect;
export type InsertCaseElement = typeof caseElements.$inferInsert;
export type ElementSearchTerm = typeof elementSearchTerms.$inferSelect;
export type InsertElementSearchTerm = typeof elementSearchTerms.$inferInsert;
export type ElementEvidence = typeof elementEvidence.$inferSelect;
export type InsertElementEvidence = typeof elementEvidence.$inferInsert;

// Checklist view interfaces
export interface CauseOfActionChecklist {
  id: string;
  caseId: string;
  claimNumber: number;
  claimType: string;
  claimName: string;
  jurisdiction?: string;
  statutoryBasis?: string;
  overallStrength: number;
  elements: CaseElementWithEvidence[];
  elementsSatisfied: number;
  elementsTotal: number;
  criticalGaps: number;
}

export interface CaseElementWithEvidence extends CaseElement {
  searchTermLinks?: ElementSearchTerm[];
  supportingEvidence?: ElementEvidence[];
  contradictingEvidence?: ElementEvidence[];
  neutralEvidence?: ElementEvidence[];
  evidenceCounts: {
    supporting: number;
    contradicting: number;
    neutral: number;
  };
}

// ================================
// CLIENTS / CONTACTS MANAGEMENT
// ================================

export const clientTypeEnum = pgEnum("client_type", [
  "individual",
  "corporation",
  "llc",
  "partnership",
  "government_entity",
  "nonprofit",
  "trust",
  "estate",
  "other",
]);

export const contactRoleEnum = pgEnum("contact_role", [
  "client",
  "representative",
  "general_counsel",
  "in_house_counsel",
  "cfo",
  "ceo",
  "other_executive",
  "assistant",
  "other",
]);

export const communicationPreferenceEnum = pgEnum("communication_preference", [
  "email",
  "phone_call",
  "text",
  "any",
]);

export const emailProviderEnum = pgEnum("email_provider", [
  "gmail",
  "outlook",
  "other",
]);

export const clients = pgTable("clients", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  clientType: clientTypeEnum("client_type").default("corporation").notNull(),
  industrySector: text("industry_sector"),
  referredBy: text("referred_by"),
  retainerDate: date("retainer_date"),
  retainerDocumentUrl: text("retainer_document_url"),
  billingRate: numeric("billing_rate", { precision: 10, scale: 2 }),
  feeArrangement: text("fee_arrangement"),
  paymentTerms: text("payment_terms"),
  retainerBalance: numeric("retainer_balance", { precision: 12, scale: 2 }),
  outstandingInvoices: numeric("outstanding_invoices", { precision: 12, scale: 2 }),
  lifetimeBilling: numeric("lifetime_billing", { precision: 14, scale: 2 }),
  primaryAttorneyId: varchar("primary_attorney_id").references(() => users.id),
  leadParalegalId: varchar("lead_paralegal_id").references(() => users.id),
  emailProvider: emailProviderEnum("email_provider").default("gmail"),
  emailSearchDomain: text("email_search_domain"),
  lastContactDate: date("last_contact_date"),
  nextFollowUp: date("next_follow_up"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clientContacts = pgTable("client_contacts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id")
    .references(() => clients.id, { onDelete: "cascade" })
    .notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  contactRole: contactRoleEnum("contact_role").default("client").notNull(),
  title: text("title"),
  email: text("email"),
  officePhone: text("office_phone"),
  cellPhone: text("cell_phone"),
  address1: text("address_1"),
  address2: text("address_2"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country"),
  communicationPreference: communicationPreferenceEnum("communication_preference").default("email"),
  isPrimaryContact: boolean("is_primary_contact").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clientCases = pgTable("client_cases", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id")
    .references(() => clients.id, { onDelete: "cascade" })
    .notNull(),
  caseId: varchar("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").default("plaintiff"),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const clientsRelations = relations(clients, ({ one, many }) => ({
  primaryAttorney: one(users, {
    fields: [clients.primaryAttorneyId],
    references: [users.id],
    relationName: "clientPrimaryAttorney",
  }),
  leadParalegal: one(users, {
    fields: [clients.leadParalegalId],
    references: [users.id],
    relationName: "clientLeadParalegal",
  }),
  createdByUser: one(users, {
    fields: [clients.createdBy],
    references: [users.id],
    relationName: "clientCreatedBy",
  }),
  contacts: many(clientContacts),
  clientCases: many(clientCases),
}));

export const clientContactsRelations = relations(clientContacts, ({ one }) => ({
  client: one(clients, {
    fields: [clientContacts.clientId],
    references: [clients.id],
  }),
}));

export const clientCasesRelations = relations(clientCases, ({ one }) => ({
  client: one(clients, {
    fields: [clientCases.clientId],
    references: [clients.id],
  }),
  case: one(cases, {
    fields: [clientCases.caseId],
    references: [cases.id],
  }),
}));

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientContactSchema = createInsertSchema(clientContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientCaseSchema = createInsertSchema(clientCases).omit({
  id: true,
  addedAt: true,
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type ClientContact = typeof clientContacts.$inferSelect;
export type InsertClientContact = z.infer<typeof insertClientContactSchema>;
export type ClientCase = typeof clientCases.$inferSelect;
export type InsertClientCase = z.infer<typeof insertClientCaseSchema>;

export interface ClientWithDetails extends Client {
  contacts: ClientContact[];
  cases: Array<{
    caseId: string;
    caseNumber: string;
    title: string;
    status: string;
    role: string;
  }>;
  primaryAttorney?: { id: string; firstName: string | null; lastName: string | null };
  leadParalegal?: { id: string; firstName: string | null; lastName: string | null };
}

// Litigation Templates / Forms
export const templateCategoryEnum = pgEnum("template_category", [
  "pleadings",
  "discovery",
  "memoranda",
  "court_forms",
  "agreements",
  "correspondence",
  "other",
]);

export const templatePleadingTypeEnum = pgEnum("template_pleading_type", [
  "complaint",
  "answer",
  "motion",
  "brief",
  "opposition",
  "reply",
  "notice",
  "declaration",
  "affidavit",
  "order",
  "judgment",
  "other",
]);

export const templateJurisdictionEnum = pgEnum("template_jurisdiction", [
  "federal",
  "state",
  "local",
  "administrative",
  "arbitration",
  "other",
]);

export const litigationTemplates = pgTable("litigation_templates", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: templateCategoryEnum("category").notNull().default("other"),
  pleadingType: templatePleadingTypeEnum("pleading_type"),
  jurisdiction: templateJurisdictionEnum("jurisdiction"),
  courtName: text("court_name"),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  downloadCount: integer("download_count").default(0),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  lastUsedAt: timestamp("last_used_at"),
  lastUsedBy: varchar("last_used_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const templateFavorites = pgTable("template_favorites", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  templateId: varchar("template_id")
    .references(() => litigationTemplates.id, { onDelete: "cascade" })
    .notNull(),
  userId: varchar("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueFavorite: unique().on(table.templateId, table.userId),
}));

export const templateUsageHistory = pgTable("template_usage_history", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  templateId: varchar("template_id")
    .references(() => litigationTemplates.id, { onDelete: "cascade" })
    .notNull(),
  userId: varchar("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

export const litigationTemplatesRelations = relations(litigationTemplates, ({ one, many }) => ({
  uploadedByUser: one(users, {
    fields: [litigationTemplates.uploadedBy],
    references: [users.id],
    relationName: "templateUploadedBy",
  }),
  lastUsedByUser: one(users, {
    fields: [litigationTemplates.lastUsedBy],
    references: [users.id],
    relationName: "templateLastUsedBy",
  }),
  favorites: many(templateFavorites),
  usageHistory: many(templateUsageHistory),
}));

export const templateFavoritesRelations = relations(templateFavorites, ({ one }) => ({
  template: one(litigationTemplates, {
    fields: [templateFavorites.templateId],
    references: [litigationTemplates.id],
  }),
  user: one(users, {
    fields: [templateFavorites.userId],
    references: [users.id],
  }),
}));

export const templateUsageHistoryRelations = relations(templateUsageHistory, ({ one }) => ({
  template: one(litigationTemplates, {
    fields: [templateUsageHistory.templateId],
    references: [litigationTemplates.id],
  }),
  user: one(users, {
    fields: [templateUsageHistory.userId],
    references: [users.id],
  }),
}));

export const insertLitigationTemplateSchema = createInsertSchema(litigationTemplates).omit({
  id: true,
  downloadCount: true,
  lastUsedAt: true,
  lastUsedBy: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTemplateFavoriteSchema = createInsertSchema(templateFavorites).omit({
  id: true,
  createdAt: true,
});

export type LitigationTemplate = typeof litigationTemplates.$inferSelect;
export type InsertLitigationTemplate = z.infer<typeof insertLitigationTemplateSchema>;
export type TemplateFavorite = typeof templateFavorites.$inferSelect;
export type InsertTemplateFavorite = z.infer<typeof insertTemplateFavoriteSchema>;
export type TemplateUsageHistory = typeof templateUsageHistory.$inferSelect;

export interface LitigationTemplateWithDetails extends LitigationTemplate {
  uploadedByUser?: { id: string; firstName: string | null; lastName: string | null };
  isFavorite?: boolean;
  recentlyUsed?: boolean;
}

// ============================================
// CALENDAR SYSTEM
// ============================================

export const calendarEventTypeEnum = pgEnum("calendar_event_type", [
  "meeting",
  "hearing",
  "deposition",
  "deadline",
  "filing",
  "trial",
  "mediation",
  "arbitration",
  "conference",
  "consultation",
  "internal",
  "personal",
  "focus_time",
  "out_of_office",
  "travel",
  "other",
]);

export const calendarEventStatusEnum = pgEnum("calendar_event_status", [
  "tentative",
  "confirmed",
  "cancelled",
]);

export const calendarRecurrenceFrequencyEnum = pgEnum("calendar_recurrence_frequency", [
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

// User calendars for multi-calendar support
export const userCalendars = pgTable("user_calendars", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  color: varchar("color", { length: 20 }).notNull().default("#3b82f6"),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  isVisible: boolean("is_visible").notNull().default(true),
  userId: varchar("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserCalendarSchema = createInsertSchema(userCalendars).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserCalendar = z.infer<typeof insertUserCalendarSchema>;
export type UserCalendar = typeof userCalendars.$inferSelect;


export const calendarEvents = pgTable("calendar_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  eventType: calendarEventTypeEnum("event_type").notNull().default("meeting"),
  status: calendarEventStatusEnum("status").notNull().default("confirmed"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  isAllDay: boolean("is_all_day").notNull().default(false),
  location: text("location"),
  videoConferenceUrl: text("video_conference_url"),
  color: varchar("color", { length: 20 }),
  isPrivate: boolean("is_private").notNull().default(false),
  isBillable: boolean("is_billable").notNull().default(false),
  billingCode: varchar("billing_code", { length: 50 }),
  estimatedHours: real("estimated_hours"),
  actualHours: real("actual_hours"),
  hourlyRate: real("hourly_rate"),
  caseId: varchar("case_id").references(() => cases.id, { onDelete: "set null" }),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }),
  matterId: varchar("matter_id"),
  calendarId: varchar("calendar_id").references(() => userCalendars.id, { onDelete: "set null" }),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  attendees: jsonb("attendees").$type<string[]>().default([]),
  externalAttendees: jsonb("external_attendees").$type<{ name: string; email: string }[]>().default([]),
  reminderMinutes: integer("reminder_minutes").default(15),
  notes: text("notes"),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurrencePattern: jsonb("recurrence_pattern").$type<{
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    endDate?: string;
    endAfterOccurrences?: number;
  }>(),
  recurrenceParentId: varchar("recurrence_parent_id"),
  deadlineType: varchar("deadline_type", { length: 50 }),
  courtName: text("court_name"),
  judgeName: text("judge_name"),
  opposingCounsel: text("opposing_counsel"),
  witnessName: text("witness_name"),
  timeEntryId: varchar("time_entry_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  createdByIdx: index("idx_calendar_events_created_by").on(table.createdBy),
  startTimeIdx: index("idx_calendar_events_start_time").on(table.startTime),
  caseIdx: index("idx_calendar_events_case").on(table.caseId),
  clientIdx: index("idx_calendar_events_client").on(table.clientId),
  eventTypeIdx: index("idx_calendar_events_type").on(table.eventType),
}));

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  createdByUser: one(users, {
    fields: [calendarEvents.createdBy],
    references: [users.id],
  }),
  case: one(cases, {
    fields: [calendarEvents.caseId],
    references: [cases.id],
  }),
  client: one(clients, {
    fields: [calendarEvents.clientId],
    references: [clients.id],
  }),
}));
