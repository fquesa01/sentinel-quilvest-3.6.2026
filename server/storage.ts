import {
  users,
  communications,
  alerts,
  cases,
  caseAssignments,
  tags,
  documentTags,
  regulations,
  interviews,
  interviewTemplates,
  interviewInvites,
  recordedInterviews,
  interviewNotes,
  interviewResponses,
  auditLogs,
  connectorConfigurations,
  productionSets,
  documentRedactions,
  privilegeLogs,
  documentCodings,
  trainingCourses,
  trainingEnrollments,
  trainingAssignments,
  policies,
  policyAttestations,
  remediationPlans,
  regulatoryStrategies,
  disclosurePlaybooks,
  boardReports,
  sectorRulePacks,
  detectionRules,
  type User,
  type UpsertUser,
  type Communication,
  type InsertCommunication,
  type Alert,
  type InsertAlert,
  type Case,
  type InsertCase,
  type UpdateCase,
  type CaseAssignment,
  type InsertCaseAssignment,
  type Tag,
  type InsertTag,
  type DocumentTag,
  type InsertDocumentTag,
  type Regulation,
  type InsertRegulation,
  type Interview,
  type InsertInterview,
  type InterviewTemplate,
  type InsertInterviewTemplate,
  type InterviewInvite,
  type InsertInterviewInvite,
  type RecordedInterview,
  type InsertRecordedInterview,
  type InterviewNote,
  type InsertInterviewNote,
  type InterviewResponse,
  type InsertInterviewResponse,
  type AuditLog,
  type InsertAuditLog,
  type ConnectorConfiguration,
  type InsertConnectorConfiguration,
  type ProductionSet,
  type InsertProductionSet,
  productionBatches,
  productionBatchDocuments,
  productionBatchEvents,
  batesSequences,
  type ProductionBatch,
  type InsertProductionBatch,
  type ProductionBatchDocument,
  type InsertProductionBatchDocument,
  type ProductionBatchEvent,
  type InsertProductionBatchEvent,
  type BatesSequence,
  type InsertBatesSequence,
  type DocumentCoding,
  type InsertDocumentCoding,
  type Policy,
  type PolicyAttestation,
  type RemediationPlan,
  type InsertRemediationPlan,
  type RegulatoryStrategy,
  type InsertRegulatoryStrategy,
  type DisclosurePlaybook,
  type InsertDisclosurePlaybook,
  type BoardReport,
  type InsertBoardReport,
  documentSets,
  documentSetMembers,
  documentForwards,
  type DocumentSet,
  type InsertDocumentSet,
  type DocumentSetMember,
  type InsertDocumentSetMember,
  type DocumentForward,
  type InsertDocumentForward,
  employees,
  vendorContacts,
  monitoredDevices,
  folderAccess,
  communicationStats,
  dataVolumeHistory,
  type Employee,
  type InsertEmployee,
  type VendorContact,
  type InsertVendorContact,
  type MonitoredDevice,
  type InsertMonitoredDevice,
  type FolderAccess,
  type InsertFolderAccess,
  type CommunicationStat,
  type InsertCommunicationStat,
  type DataVolumeHistory,
  type InsertDataVolumeHistory,
  caseMessages,
  type CaseMessage,
  type InsertCaseMessage,
  experts,
  regulatorCommunications,
  investigationDeadlines,
  preservationChecklists,
  conflictChecks,
  legalHoldNotifications,
  custodians,
  reportTemplates,
  type Expert,
  type InsertExpert,
  type RegulatorCommunication,
  type InsertRegulatorCommunication,
  type InvestigationDeadline,
  type InsertInvestigationDeadline,
  type PreservationChecklist,
  type InsertPreservationChecklist,
  type ConflictCheck,
  type InsertConflictCheck,
  type LegalHoldNotification,
  type InsertLegalHoldNotification,
  type Custodian,
  type InsertCustodian,
  type ReportTemplate,
  type InsertReportTemplate,
  caseAIAnalysis,
  caseParties,
  caseTimelineEvents,
  customTimelineColumns,
  customTimelineColumnValues,
  type CaseAIAnalysis,
  type InsertCaseAIAnalysis,
  type CaseParty,
  type InsertCaseParty,
  type CaseTimelineEvent,
  type InsertCaseTimelineEvent,
  type CustomTimelineColumn,
  type InsertCustomTimelineColumn,
  type CustomTimelineColumnValue,
  type InsertCustomTimelineColumnValue,
  chatThreads,
  ingestedChatMessages,
  chatMessageNotes,
  type ChatThread,
  type InsertChatThread,
  type IngestedChatMessage,
  type InsertIngestedChatMessage,
  type ChatMessageNote,
  type InsertChatMessageNote,
  savedSearches,
  type SavedSearch,
  type InsertSavedSearch,
  documentHighlights,
  highlightComments,
  textSelectionTags,
  type DocumentHighlight,
  type InsertDocumentHighlight,
  type HighlightComment,
  type InsertHighlightComment,
  type TextSelectionTag,
  type InsertTextSelectionTag,
  bookmarks,
  userActivity,
  type Bookmark,
  type InsertBookmark,
  type UserActivity,
  type InsertUserActivity,
  liveInterviewSessions,
  liveInterviewParticipants,
  interviewRecordings,
  interviewTranscriptSegments,
  interviewQuestions,
  interviewAnalyses,
  interviewSessionNotes,
  interviewEvidenceLinks,
  type LiveInterviewSession,
  type InsertLiveInterviewSession,
  type UpdateLiveInterviewSession,
  type LiveInterviewParticipant,
  type InsertLiveInterviewParticipant,
  type InterviewRecording,
  type InsertInterviewRecording,
  type UpdateInterviewRecording,
  type InterviewTranscriptSegment,
  type InsertInterviewTranscriptSegment,
  type UpdateInterviewTranscriptSegment,
  type InterviewQuestion,
  type InsertInterviewQuestion,
  type UpdateInterviewQuestion,
  type InterviewAnalysis,
  type InsertInterviewAnalysis,
  type UpdateInterviewAnalysis,
  type InterviewSessionNote,
  type InsertInterviewSessionNote,
  type UpdateInterviewSessionNote,
  type InterviewEvidenceLink,
  type InsertInterviewEvidenceLink,
  findings,
  videoMeetings,
  videoMeetingParticipants,
  videoMeetingRecordings,
  videoMeetingChatMessages,
  meetingInvitations,
  type VideoMeeting,
  type InsertVideoMeeting,
  type UpdateVideoMeeting,
  type VideoMeetingParticipant,
  type InsertVideoMeetingParticipant,
  type UpdateVideoMeetingParticipant,
  type VideoMeetingRecording,
  type InsertVideoMeetingRecording,
  type UpdateVideoMeetingRecording,
  type VideoMeetingChatMessage,
  type InsertVideoMeetingChatMessage,
  type MeetingInvitation,
  type InsertMeetingInvitation,
  type UpdateMeetingInvitation,
  meetingTranscriptions,
  meetingSummaries,
  type MeetingTranscription,
  type InsertMeetingTranscription,
  type UpdateMeetingTranscription,
  type MeetingSummary,
  type InsertMeetingSummary,
  type UpdateMeetingSummary,
  findingTags,
  findingEvidenceLinks,
  findingVersions,
  findingAiTasks,
  type Finding,
  type InsertFinding,
  type FindingTag,
  type InsertFindingTag,
  type FindingEvidenceLink,
  type InsertFindingEvidenceLink,
  type FindingVersion,
  type InsertFindingVersion,
  type FindingAiTask,
  type InsertFindingAiTask,
  dealTemplates,
  templateCategories,
  templateItems,
  dealChecklists,
  dealChecklistItems,
  checklistItemDocuments,
  checklistItemComments,
  type DealTemplate,
  type InsertDealTemplate,
  type TemplateCategory,
  type InsertTemplateCategory,
  type TemplateItem,
  type InsertTemplateItem,
  type DealChecklist,
  type InsertDealChecklist,
  type DealChecklistItem,
  type InsertDealChecklistItem,
  type ChecklistItemDocument,
  type InsertChecklistItemDocument,
  type ChecklistItemComment,
  type InsertChecklistItemComment,
  peFirms,
  peFirmSettings,
  peDeals,
  dealContacts,
  workstreams,
  diligenceQuestions,
  questionDocumentLinks,
  peCalls,
  peCallParticipants,
  callDocumentReferences,
  callQuestionReferences,
  peRiskFlags,
  patternMatches,
  portfolioCompanies,
  diligenceTemplates,
  peDealDocuments,
  dealTimelineEvents,
  type PEFirm,
  type InsertPEFirm,
  type PEFirmSettings,
  type PEDeal,
  type InsertPEDeal,
  type DealContact,
  type InsertDealContact,
  type Workstream,
  type InsertWorkstream,
  type DiligenceQuestion,
  type InsertDiligenceQuestion,
  type QuestionDocumentLink,
  type PECall,
  type InsertPECall,
  type PECallParticipant,
  type CallDocumentReference,
  type CallQuestionReference,
  type PERiskFlag,
  type InsertPERiskFlag,
  type PatternMatch,
  type InsertPatternMatch,
  type PortfolioCompany,
  type InsertPortfolioCompany,
  type DiligenceTemplate,
  type InsertDiligenceTemplate,
  type PEDealDocument,
  type InsertPEDealDocument,
  type DealTimelineEvent,
  type InsertDealTimelineEvent,
  clients,
  clientContacts,
  clientCases,
  type Client,
  type InsertClient,
  type ClientContact,
  type InsertClientContact,
  type ClientCase,
  type InsertClientCase,
  type ClientWithDetails,
  litigationTemplates,
  templateFavorites,
  templateUsageHistory,
  type LitigationTemplate,
  type InsertLitigationTemplate,
  type TemplateFavorite,
  type TemplateUsageHistory,
  type LitigationTemplateWithDetails,
  calendarEvents,
  type CalendarEvent,
  type InsertCalendarEvent,
  userCalendars,
  type UserCalendar,
  type InsertUserCalendar,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, ilike, sql, inArray, gte, lte } from "drizzle-orm";

// Comprehensive filter type for communications
export interface CommunicationFilters {
  // Legacy filters (for compatibility)
  employees?: string[];
  departments?: string[];
  caseId?: string;
  
  // Date filters
  dateFrom?: string;
  dateTo?: string;
  date?: string;
  
  // People filters
  sender?: string;
  recipient?: string;
  from?: string[];
  to?: string[];
  cc?: string[];
  bcc?: string[];
  participants?: string[];
  excludePeople?: string[];
  domain?: string[];
  author?: string[];
  custodian?: string[];
  
  // Content filters
  query?: string;
  queryMode?: 'natural' | 'boolean';
  
  // Communication type
  communicationType?: string[];
  
  // Attachment filters
  hasAttachments?: boolean;
  attachmentTypes?: string[];
  attachmentSizeMin?: number;
  attachmentSizeMax?: number;
  
  // Classification filters
  tags?: string[];
  privilege?: string[];  // 'none', 'attorney_client_privileged', 'work_product', 'both'
  riskScoreMin?: number;
  riskScoreMax?: number;
  
  // Review workflow filters
  reviewStatus?: string[];
  assignedReviewer?: string[];
  reviewedBy?: string;
  batchSet?: string[];
}

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User>;
  getUserByEmail(email: string | undefined): Promise<User | undefined>;
  getUserByMicrosoftId(microsoftId: string): Promise<User | undefined>;
  createUser(user: any): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Communication operations
  getCommunications(filters?: CommunicationFilters): Promise<Communication[]>;
  getCommunication(id: string): Promise<Communication | undefined>;
  createCommunication(comm: InsertCommunication): Promise<Communication>;
  searchCommunications(query: string, mode: 'boolean' | 'natural'): Promise<Communication[]>;

  // Chat Thread operations (conversation groupings)
  getChatThreads(filters?: { caseId?: string }): Promise<ChatThread[]>;
  getChatThread(id: string): Promise<ChatThread | undefined>;
  createChatThread(thread: InsertChatThread): Promise<ChatThread>;
  updateChatThread(id: string, updates: Partial<ChatThread>): Promise<ChatThread>;

  // Chat message operations (ingested from WhatsApp, SMS, etc.)
  getIngestedChatMessages(filters?: { caseId?: string; threadId?: string }): Promise<IngestedChatMessage[]>;
  getIngestedChatMessage(id: string): Promise<IngestedChatMessage | undefined>;
  createIngestedChatMessage(chatMsg: InsertIngestedChatMessage): Promise<IngestedChatMessage>;
  updateIngestedChatMessage(id: string, updates: Partial<IngestedChatMessage>): Promise<IngestedChatMessage>;

  // Chat message notes operations
  getChatMessageNotes(messageId: string): Promise<ChatMessageNote[]>;
  createChatMessageNote(note: InsertChatMessageNote): Promise<ChatMessageNote>;
  deleteChatMessageNote(id: string): Promise<void>;

  // Alert operations
  getAlerts(): Promise<Alert[]>;
  getAlert(id: string): Promise<Alert | undefined>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlert(id: string, updates: Partial<Alert>): Promise<Alert>;

  // Case operations
  getCases(): Promise<Case[]>;
  getCase(id: string): Promise<Case | undefined>;
  getCaseSummary(id: string): Promise<{ id: string; caseNumber: string; title: string } | undefined>;
  createCase(caseData: InsertCase): Promise<Case>;
  updateCase(id: string, updates: UpdateCase): Promise<Case>;

  // Regulation operations
  getRegulations(): Promise<Regulation[]>;
  createRegulation(regulation: InsertRegulation): Promise<Regulation>;

  // Interview operations
  getInterviews(filters?: { caseId?: string }): Promise<Interview[]>;
  getInterview(id: string): Promise<Interview | undefined>;
  getInterviewByAccessToken(accessToken: string): Promise<Interview | undefined>;
  createInterview(interview: InsertInterview): Promise<Interview>;
  updateInterview(id: string, updates: Partial<Interview>): Promise<Interview>;

  // Interview Response operations (per-question video responses)
  getInterviewResponses(interviewId: string): Promise<InterviewResponse[]>;
  getInterviewResponse(id: string): Promise<InterviewResponse | undefined>;
  createInterviewResponse(response: InsertInterviewResponse): Promise<InterviewResponse>;
  updateInterviewResponse(id: string, updates: Partial<InterviewResponse>): Promise<InterviewResponse>;
  getInterviewsWithResponses(caseId?: string): Promise<{ interview: Interview; responses: InterviewResponse[] }[]>;

  // Interview Template operations
  getInterviewTemplates(): Promise<InterviewTemplate[]>;
  getInterviewTemplate(id: string): Promise<InterviewTemplate | undefined>;
  createInterviewTemplate(template: InsertInterviewTemplate): Promise<InterviewTemplate>;
  updateInterviewTemplate(id: string, updates: Partial<InterviewTemplate>): Promise<InterviewTemplate>;
  deleteInterviewTemplate(id: string): Promise<void>;

  // Interview Invite operations
  getInterviewInvites(caseId?: string): Promise<InterviewInvite[]>;
  getInterviewInvite(id: string): Promise<InterviewInvite | undefined>;
  getInterviewInviteByToken(token: string): Promise<InterviewInvite | undefined>;
  createInterviewInvite(invite: InsertInterviewInvite): Promise<InterviewInvite>;
  updateInterviewInvite(id: string, updates: Partial<InterviewInvite>): Promise<InterviewInvite>;

  // Recorded Interview operations
  getRecordedInterviews(caseId?: string): Promise<RecordedInterview[]>;
  getRecordedInterview(id: string): Promise<RecordedInterview | undefined>;
  createRecordedInterview(interview: InsertRecordedInterview): Promise<RecordedInterview>;
  updateRecordedInterview(id: string, updates: Partial<RecordedInterview>): Promise<RecordedInterview>;

  // Interview Note operations
  getInterviewNotes(recordedInterviewId: string): Promise<InterviewNote[]>;
  createInterviewNote(note: InsertInterviewNote): Promise<InterviewNote>;
  updateInterviewNote(id: string, updates: Partial<InterviewNote>): Promise<InterviewNote>;
  deleteInterviewNote(id: string): Promise<void>;

  // Live Interview Session operations
  getLiveInterviewSessions(filters?: { caseId?: string; interviewId?: string; status?: string }): Promise<LiveInterviewSession[]>;
  getLiveInterviewSession(id: string): Promise<LiveInterviewSession | undefined>;
  getLiveInterviewSessionByRoomId(roomId: string): Promise<LiveInterviewSession | undefined>;
  createLiveInterviewSession(session: InsertLiveInterviewSession): Promise<LiveInterviewSession>;
  updateLiveInterviewSession(id: string, updates: UpdateLiveInterviewSession): Promise<LiveInterviewSession>;

  // Live Interview Participant operations
  getLiveInterviewParticipants(sessionId: string): Promise<LiveInterviewParticipant[]>;
  getLiveInterviewParticipant(id: string): Promise<LiveInterviewParticipant | undefined>;
  createLiveInterviewParticipant(participant: InsertLiveInterviewParticipant): Promise<LiveInterviewParticipant>;
  updateLiveInterviewParticipant(id: string, updates: Partial<LiveInterviewParticipant>): Promise<LiveInterviewParticipant>;

  // Interview Recording operations
  getInterviewRecordings(sessionId: string): Promise<InterviewRecording[]>;
  getInterviewRecording(id: string): Promise<InterviewRecording | undefined>;
  createInterviewRecording(recording: InsertInterviewRecording): Promise<InterviewRecording>;
  updateInterviewRecording(id: string, updates: UpdateInterviewRecording): Promise<InterviewRecording>;

  // Interview Transcript Segment operations
  getInterviewTranscriptSegments(sessionId: string): Promise<InterviewTranscriptSegment[]>;
  getInterviewTranscriptSegment(id: string): Promise<InterviewTranscriptSegment | undefined>;
  createInterviewTranscriptSegment(segment: InsertInterviewTranscriptSegment): Promise<InterviewTranscriptSegment>;
  createInterviewTranscriptSegmentsBulk(segments: InsertInterviewTranscriptSegment[]): Promise<InterviewTranscriptSegment[]>;
  updateInterviewTranscriptSegment(id: string, updates: UpdateInterviewTranscriptSegment): Promise<InterviewTranscriptSegment>;

  // Interview Question operations
  getInterviewQuestions(sessionId: string): Promise<InterviewQuestion[]>;
  getInterviewQuestion(id: string): Promise<InterviewQuestion | undefined>;
  createInterviewQuestion(question: InsertInterviewQuestion): Promise<InterviewQuestion>;
  updateInterviewQuestion(id: string, updates: UpdateInterviewQuestion): Promise<InterviewQuestion>;

  // Interview Analysis operations
  getInterviewAnalyses(sessionId: string): Promise<InterviewAnalysis[]>;
  getInterviewAnalysis(id: string): Promise<InterviewAnalysis | undefined>;
  createInterviewAnalysis(analysis: InsertInterviewAnalysis): Promise<InterviewAnalysis>;
  updateInterviewAnalysis(id: string, updates: UpdateInterviewAnalysis): Promise<InterviewAnalysis>;

  // Interview Session Note operations
  getInterviewSessionNotes(sessionId: string): Promise<InterviewSessionNote[]>;
  getInterviewSessionNote(id: string): Promise<InterviewSessionNote | undefined>;
  createInterviewSessionNote(note: InsertInterviewSessionNote): Promise<InterviewSessionNote>;
  updateInterviewSessionNote(id: string, updates: UpdateInterviewSessionNote): Promise<InterviewSessionNote>;
  deleteInterviewSessionNote(id: string): Promise<void>;

  // Interview Evidence Link operations
  getInterviewEvidenceLinks(sessionId: string): Promise<InterviewEvidenceLink[]>;
  getInterviewEvidenceLink(id: string): Promise<InterviewEvidenceLink | undefined>;
  createInterviewEvidenceLink(link: InsertInterviewEvidenceLink): Promise<InterviewEvidenceLink>;
  deleteInterviewEvidenceLink(id: string): Promise<void>;

  // Video Meeting operations
  getVideoMeetings(filters?: { userId?: string; caseId?: string }): Promise<VideoMeeting[]>;
  getVideoMeeting(id: string): Promise<VideoMeeting | undefined>;
  getVideoMeetingByRoomId(roomId: string): Promise<VideoMeeting | undefined>;
  createVideoMeeting(meeting: InsertVideoMeeting): Promise<VideoMeeting>;
  updateVideoMeeting(id: string, updates: UpdateVideoMeeting): Promise<VideoMeeting>;

  // Video Meeting Participant operations
  getVideoMeetingParticipants(meetingId: string): Promise<VideoMeetingParticipant[]>;
  createVideoMeetingParticipant(participant: InsertVideoMeetingParticipant): Promise<VideoMeetingParticipant>;
  updateVideoMeetingParticipant(id: string, updates: Partial<VideoMeetingParticipant>): Promise<VideoMeetingParticipant>;

  // Video Meeting Recording operations
  getVideoMeetingRecordings(meetingId: string): Promise<VideoMeetingRecording[]>;
  createVideoMeetingRecording(recording: InsertVideoMeetingRecording): Promise<VideoMeetingRecording>;
  updateVideoMeetingRecording(id: string, updates: UpdateVideoMeetingRecording): Promise<VideoMeetingRecording>;

  // Video Meeting Chat Message operations
  getVideoMeetingChatMessages(meetingId: string): Promise<VideoMeetingChatMessage[]>;
  createVideoMeetingChatMessage(message: InsertVideoMeetingChatMessage): Promise<VideoMeetingChatMessage>;

  // Meeting Invitation operations
  getMeetingInvitations(meetingId: string): Promise<MeetingInvitation[]>;
  getMeetingInvitation(id: string): Promise<MeetingInvitation | undefined>;
  getMeetingInvitationByToken(token: string): Promise<MeetingInvitation | undefined>;
  createMeetingInvitation(invitation: InsertMeetingInvitation): Promise<MeetingInvitation>;
  updateMeetingInvitation(id: string, updates: UpdateMeetingInvitation): Promise<MeetingInvitation>;
  deleteMeetingInvitation(id: string): Promise<void>;

  // Meeting Transcription operations
  getMeetingTranscriptions(meetingId: string): Promise<MeetingTranscription[]>;
  getMeetingTranscription(id: string): Promise<MeetingTranscription | undefined>;
  getMeetingTranscriptionByRecording(recordingId: string): Promise<MeetingTranscription | undefined>;
  createMeetingTranscription(transcription: InsertMeetingTranscription): Promise<MeetingTranscription>;
  updateMeetingTranscription(id: string, updates: UpdateMeetingTranscription): Promise<MeetingTranscription>;
  deleteMeetingTranscription(id: string): Promise<void>;
  searchMeetingTranscriptions(query: string, meetingId?: string): Promise<MeetingTranscription[]>;

  // Meeting Summary operations
  getMeetingSummaries(meetingId: string): Promise<MeetingSummary[]>;
  getMeetingSummary(id: string): Promise<MeetingSummary | undefined>;
  getMeetingSummaryByTranscription(transcriptionId: string): Promise<MeetingSummary | undefined>;
  createMeetingSummary(summary: InsertMeetingSummary): Promise<MeetingSummary>;
  updateMeetingSummary(id: string, updates: UpdateMeetingSummary): Promise<MeetingSummary>;
  deleteMeetingSummary(id: string): Promise<void>;

  // Audit log operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Connector operations
  getConnectors(): Promise<ConnectorConfiguration[]>;
  createConnector(connector: InsertConnectorConfiguration): Promise<ConnectorConfiguration>;
  updateConnector(id: string, updates: Partial<ConnectorConfiguration>): Promise<ConnectorConfiguration>;
  deleteConnector(id: string): Promise<void>;

  // Analytics
  getDashboardMetrics(userId: string): Promise<any>;
  getAnalytics(): Promise<any>;
  getNetworkAnalysis(): Promise<any>;
  getTrendingRisks(): Promise<any>;
  getCostSavingsModel(): Promise<any>;

  // eDiscovery Production Sets
  getProductionSets(caseId?: string): Promise<ProductionSet[]>;
  getProductionSet(id: string): Promise<ProductionSet | undefined>;
  createProductionSet(productionSet: InsertProductionSet): Promise<ProductionSet>;
  updateProductionSet(id: string, updates: Partial<ProductionSet>): Promise<ProductionSet>;
  deleteProductionSet(id: string): Promise<void>;

  // Production Batches (tag-based production)
  getProductionBatches(caseId: string): Promise<ProductionBatch[]>;
  getProductionBatch(id: string): Promise<ProductionBatch | undefined>;
  createProductionBatch(batch: InsertProductionBatch): Promise<ProductionBatch>;
  updateProductionBatch(id: string, updates: Partial<ProductionBatch>): Promise<ProductionBatch>;
  deleteProductionBatch(id: string): Promise<void>;
  
  // Production Batch Documents
  getProductionBatchDocuments(batchId: string): Promise<ProductionBatchDocument[]>;
  createProductionBatchDocument(doc: InsertProductionBatchDocument): Promise<ProductionBatchDocument>;
  createProductionBatchDocuments(docs: InsertProductionBatchDocument[]): Promise<ProductionBatchDocument[]>;
  updateProductionBatchDocument(id: string, updates: Partial<ProductionBatchDocument>): Promise<ProductionBatchDocument>;
  
  // Production Batch Events
  getProductionBatchEvents(batchId: string): Promise<ProductionBatchEvent[]>;
  createProductionBatchEvent(event: InsertProductionBatchEvent): Promise<ProductionBatchEvent>;
  
  // Bates Sequences
  getBatesSequence(caseId: string, prefix: string): Promise<BatesSequence | undefined>;
  getOrCreateBatesSequence(caseId: string, prefix: string, padding?: number): Promise<BatesSequence>;
  incrementBatesSequence(id: string, increment: number): Promise<BatesSequence>;

  // Report Template operations
  getReportTemplates(filters?: { createdBy?: string; templateType?: string; isSystemTemplate?: boolean }): Promise<ReportTemplate[]>;
  getReportTemplate(id: string): Promise<ReportTemplate | undefined>;
  createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate>;
  updateReportTemplate(id: string, updates: Partial<ReportTemplate>): Promise<ReportTemplate>;
  deleteReportTemplate(id: string): Promise<void>;

  // Training operations
  getTrainingCourses(): Promise<any[]>;
  getTrainingCourse(id: string): Promise<any | undefined>;
  createTrainingCourse(course: any): Promise<any>;
  getTrainingEnrollments(userId: string): Promise<any[]>;
  createTrainingEnrollment(enrollment: any): Promise<any>;
  updateTrainingEnrollment(id: string, updates: any): Promise<any>;
  getTrainingAssignments(userId: string): Promise<any[]>;
  createTrainingAssignment(assignment: any): Promise<any>;
  
  // Policy attestation operations
  getPolicies(): Promise<Policy[]>;
  getPolicy(id: string): Promise<Policy | undefined>;
  createPolicy(policy: any): Promise<Policy>;
  getPolicyAttestations(userId?: string): Promise<PolicyAttestation[]>;
  createPolicyAttestation(attestation: any): Promise<PolicyAttestation>;
  
  // HR compliance metrics
  getTrainingCompletionMetrics(): Promise<any>;
  getPolicyAttestationMetrics(): Promise<any>;
  
  // Privilege workflows
  getPrivilegeReviewQueue(): Promise<any[]>;
  updateCommunicationPrivilege(id: string, updates: Partial<Communication>): Promise<Communication>;
  updateInterviewPrivilege(id: string, updates: Partial<Interview>): Promise<Interview>;
  updateCasePrivilege(id: string, updates: Partial<Case>): Promise<Case>;
  getPrivilegeLogs(caseId?: string): Promise<any[]>;
  createPrivilegeLog(log: any): Promise<any>;
  updatePrivilegeLog(id: string, updates: any): Promise<any>;
  deletePrivilegeLog(id: string): Promise<void>;

  // Attorney Review Queue
  getAttorneyReviewQueue(): Promise<any>;

  // Remediation Plans
  getRemediationPlans(caseId?: string): Promise<RemediationPlan[]>;
  getRemediationPlan(id: string): Promise<RemediationPlan | undefined>;
  createRemediationPlan(plan: InsertRemediationPlan): Promise<RemediationPlan>;
  updateRemediationPlan(id: string, updates: Partial<RemediationPlan>): Promise<RemediationPlan>;
  deleteRemediationPlan(id: string): Promise<void>;

  // Regulatory Strategies
  getRegulatoryStrategies(caseId?: string): Promise<RegulatoryStrategy[]>;
  getRegulatoryStrategy(id: string): Promise<RegulatoryStrategy | undefined>;
  createRegulatoryStrategy(strategy: InsertRegulatoryStrategy): Promise<RegulatoryStrategy>;
  updateRegulatoryStrategy(id: string, updates: Partial<RegulatoryStrategy>): Promise<RegulatoryStrategy>;
  deleteRegulatoryStrategy(id: string): Promise<void>;

  // Disclosure Playbooks
  getDisclosurePlaybooks(caseId?: string): Promise<DisclosurePlaybook[]>;
  getDisclosurePlaybook(id: string): Promise<DisclosurePlaybook | undefined>;
  createDisclosurePlaybook(playbook: InsertDisclosurePlaybook): Promise<DisclosurePlaybook>;
  updateDisclosurePlaybook(id: string, updates: Partial<DisclosurePlaybook>): Promise<DisclosurePlaybook>;
  deleteDisclosurePlaybook(id: string): Promise<void>;

  // Board Reports
  getBoardReports(): Promise<BoardReport[]>;
  getBoardReport(id: string): Promise<BoardReport | undefined>;
  createBoardReport(report: InsertBoardReport): Promise<BoardReport>;
  updateBoardReport(id: string, updates: Partial<BoardReport>): Promise<BoardReport>;
  deleteBoardReport(id: string): Promise<void>;

  // Document Sets
  getDocumentSets(caseId?: string): Promise<DocumentSet[]>;
  getDocumentSet(id: string): Promise<DocumentSet | undefined>;
  createDocumentSet(documentSet: InsertDocumentSet): Promise<DocumentSet>;
  updateDocumentSet(id: string, updates: Partial<DocumentSet>): Promise<DocumentSet>;
  deleteDocumentSet(id: string): Promise<void>;
  addDocumentToSet(documentSetId: string, communicationId: string, addedBy: string, notes?: string): Promise<DocumentSetMember>;
  removeDocumentFromSet(documentSetId: string, communicationId: string): Promise<void>;
  getDocumentsInSet(documentSetId: string): Promise<Communication[]>;
  
  // Document Forwards
  getDocumentForwards(communicationId?: string): Promise<DocumentForward[]>;
  createDocumentForward(forward: InsertDocumentForward): Promise<DocumentForward>;
  revokeDocumentForward(id: string, revokedBy: string): Promise<DocumentForward>;
  markForwardViewed(id: string): Promise<void>;

  // Tag operations
  getTags(category?: string): Promise<Tag[]>;
  getTag(id: string): Promise<Tag | undefined>;
  createTag(tag: InsertTag): Promise<Tag>;
  updateTag(id: string, updates: Partial<Tag>): Promise<Tag>;
  deleteTag(id: string): Promise<void>;
  getRecentlyUsedTags(userId: string, limit?: number): Promise<Tag[]>;
  
  // Document Tag operations
  getEntityTags(entityType: string, entityId: string): Promise<Array<DocumentTag & { tag: Tag }>>;
  addTagToEntity(documentTag: InsertDocumentTag): Promise<DocumentTag>;
  removeTagFromEntity(entityType: string, entityId: string, tagId: string): Promise<void>;
  
  // Saved Search operations
  getSavedSearches(filters?: { userId?: string; caseId?: string; isPublic?: boolean }): Promise<SavedSearch[]>;
  getSavedSearch(id: string): Promise<SavedSearch | undefined>;
  createSavedSearch(search: InsertSavedSearch): Promise<SavedSearch>;
  updateSavedSearch(id: string, updates: Partial<SavedSearch>): Promise<SavedSearch>;
  deleteSavedSearch(id: string): Promise<void>;
  
  // Document Highlight operations
  getHighlights(communicationId: string): Promise<DocumentHighlight[]>;
  getHighlight(id: string): Promise<DocumentHighlight | undefined>;
  createHighlight(highlight: InsertDocumentHighlight): Promise<DocumentHighlight>;
  updateHighlight(id: string, updates: Partial<DocumentHighlight>): Promise<DocumentHighlight>;
  deleteHighlight(id: string): Promise<void>;
  
  // Highlight Comment operations
  getHighlightComments(highlightId: string): Promise<HighlightComment[]>;
  createHighlightComment(comment: InsertHighlightComment): Promise<HighlightComment>;
  deleteHighlightComment(id: string): Promise<void>;
  
  // Text Selection Tag operations
  getTextSelectionTags(communicationId: string): Promise<Array<TextSelectionTag & { tag: Tag }>>;
  createTextSelectionTag(textSelectionTag: InsertTextSelectionTag): Promise<TextSelectionTag>;
  deleteTextSelectionTag(id: string): Promise<void>;
  
  // Tag Analytics operations (for Tagged Material view)
  getTagsWithDocumentCounts(caseId?: string): Promise<Array<Tag & { 
    documentCount: number; 
    textSelectionCount: number;
    custodianCount?: number;
    earliestDate?: string;
    latestDate?: string; 
    totalCount: number 
  }>>;
  getDocumentsForTag(tagId: string, caseId?: string): Promise<Array<Communication & { 
    tagType: 'document' | 'textSelection';
    textSelectionCount?: number;
  }>>;
  
  // Employee & Vendor Monitoring operations
  getEmployees(filters?: { department?: string; search?: string }): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee>;
  
  getVendorContacts(filters?: { vendorType?: string; search?: string }): Promise<VendorContact[]>;
  getVendorContact(id: string): Promise<VendorContact | undefined>;
  createVendorContact(vendorContact: InsertVendorContact): Promise<VendorContact>;
  updateVendorContact(id: string, updates: Partial<VendorContact>): Promise<VendorContact>;
  
  getMonitoredDevices(personType: string, personId: string): Promise<MonitoredDevice[]>;
  createMonitoredDevice(device: InsertMonitoredDevice): Promise<MonitoredDevice>;
  
  getFolderAccess(personType: string, personId: string): Promise<FolderAccess[]>;
  createFolderAccess(folder: InsertFolderAccess): Promise<FolderAccess>;
  
  getCommunicationStats(personId: string): Promise<CommunicationStat[]>;
  updateCommunicationStats(stat: InsertCommunicationStat): Promise<CommunicationStat>;
  
  getDataVolumeHistory(personType: string, personId: string): Promise<DataVolumeHistory[]>;
  createDataVolumeHistory(data: InsertDataVolumeHistory): Promise<DataVolumeHistory>;
  
  // Case Message operations (internal investigator communications)
  getCaseMessages(filters?: { caseId?: string; userId?: string }): Promise<CaseMessage[]>;
  getCaseMessage(id: string): Promise<CaseMessage | undefined>;
  createCaseMessage(message: InsertCaseMessage): Promise<CaseMessage>;
  markMessageAsRead(messageId: string, userId: string): Promise<CaseMessage>;
  getUserInbox(userId: string): Promise<Array<CaseMessage & { sender: User; case: Case }>>;
  getUnreadMessageCount(userId: string): Promise<number>;

  // Crisis Response operations (government investigations)
  createCustodian(custodian: InsertCustodian): Promise<Custodian>;
  getCustodians(caseId: string): Promise<Custodian[]>;
  createExpert(expert: InsertExpert): Promise<Expert>;
  getExperts(caseId?: string): Promise<Expert[]>;
  createRegulatorCommunication(comm: InsertRegulatorCommunication): Promise<RegulatorCommunication>;
  getRegulatorCommunications(caseId: string): Promise<RegulatorCommunication[]>;
  createInvestigationDeadline(deadline: InsertInvestigationDeadline): Promise<InvestigationDeadline>;
  getInvestigationDeadlines(caseId: string): Promise<InvestigationDeadline[]>;
  createPreservationChecklist(checklist: InsertPreservationChecklist): Promise<PreservationChecklist>;
  getPreservationChecklists(caseId: string): Promise<PreservationChecklist[]>;
  createConflictCheck(check: InsertConflictCheck): Promise<ConflictCheck>;
  getConflictChecks(caseId?: string): Promise<ConflictCheck[]>;
  createLegalHoldNotification(notification: InsertLegalHoldNotification): Promise<LegalHoldNotification>;
  getLegalHoldNotifications(caseId: string): Promise<LegalHoldNotification[]>;

  // Case Detail Page operations
  getCaseStats(caseId: string): Promise<{
    documentSetsCount: number;
    documentsCount: number;
    custodians: number;
    interviewsCompleted: number;
    interviewsScheduled: number;
    alertsCount: number;
  }>;
  getCaseParties(caseId: string): Promise<any[]>;
  getDiscoveredEntities(caseId: string): Promise<{
    entities: {
      email: string;
      name: string | null;
      domain: string;
      sentCount: number;
      receivedCount: number;
      totalCount: number;
      firstSeen: Date | null;
      lastSeen: Date | null;
    }[];
    organizations: {
      domain: string;
      personCount: number;
      messageCount: number;
    }[];
    totalUniqueEntities: number;
    totalOrganizations: number;
  }>;
  getCaseParty(id: string): Promise<any | undefined>;
  createCaseParty(party: any): Promise<any>;
  updateCaseParty(id: string, updates: Partial<any>): Promise<any>;
  getCaseTimelineEvents(caseId: string, filters?: {
    showHidden?: boolean;
    eventTypes?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    minImportance?: number;
  }): Promise<CaseTimelineEvent[]>;
  createCaseTimelineEvent(event: InsertCaseTimelineEvent): Promise<CaseTimelineEvent>;
  updateCaseTimelineEvent(id: string, updates: Partial<InsertCaseTimelineEvent>): Promise<CaseTimelineEvent>;
  deleteCaseTimelineEvent(id: string): Promise<void>;
  getCustomTimelineColumns(caseId: string, userId: string): Promise<CustomTimelineColumn[]>;
  createCustomTimelineColumn(column: InsertCustomTimelineColumn): Promise<CustomTimelineColumn>;
  updateCustomTimelineColumn(id: string, updates: Partial<InsertCustomTimelineColumn>): Promise<CustomTimelineColumn>;
  deleteCustomTimelineColumn(id: string): Promise<void>;
  getCustomTimelineColumnValues(eventId: string): Promise<CustomTimelineColumnValue[]>;
  upsertCustomTimelineColumnValue(value: InsertCustomTimelineColumnValue): Promise<CustomTimelineColumnValue>;
  getCaseAIAnalysis(caseId: string): Promise<any | undefined>;
  createCaseAIAnalysis(analysis: any): Promise<any>;
  updateCaseAIAnalysis(caseId: string, updates: Partial<any>): Promise<any>;
  searchCaseContent(caseId: string, query: string): Promise<{
    communications: Communication[];
    interviews: any[];
    alerts: Alert[];
    timelineEvents: any[];
  }>;

  // Deal Template operations
  getDealTemplates(filters?: { transactionType?: string; isActive?: boolean; isSystemTemplate?: boolean }): Promise<DealTemplate[]>;
  getDealTemplate(id: string): Promise<DealTemplate | undefined>;
  getDealTemplateBySlug(slug: string): Promise<DealTemplate | undefined>;
  getDealTemplateWithDetails(id: string): Promise<{ template: DealTemplate; categories: TemplateCategory[]; items: TemplateItem[] } | undefined>;
  createDealTemplate(template: InsertDealTemplate): Promise<DealTemplate>;
  updateDealTemplate(id: string, updates: Partial<DealTemplate>): Promise<DealTemplate>;
  deleteDealTemplate(id: string): Promise<void>;
  
  // Template Category operations
  getTemplateCategories(templateId: string): Promise<TemplateCategory[]>;
  createTemplateCategory(category: InsertTemplateCategory): Promise<TemplateCategory>;
  updateTemplateCategory(id: string, updates: Partial<TemplateCategory>): Promise<TemplateCategory>;
  deleteTemplateCategory(id: string): Promise<void>;
  
  // Template Item operations
  getTemplateItems(categoryId: string): Promise<TemplateItem[]>;
  getTemplateItemsByTemplate(templateId: string): Promise<TemplateItem[]>;
  createTemplateItem(item: InsertTemplateItem): Promise<TemplateItem>;
  updateTemplateItem(id: string, updates: Partial<TemplateItem>): Promise<TemplateItem>;
  deleteTemplateItem(id: string): Promise<void>;
  
  // Deal Checklist operations
  getDealChecklists(dealId: string): Promise<DealChecklist[]>;
  getDealChecklist(id: string): Promise<DealChecklist | undefined>;
  createDealChecklist(checklist: InsertDealChecklist): Promise<DealChecklist>;
  updateDealChecklist(id: string, updates: Partial<DealChecklist>): Promise<DealChecklist>;
  deleteDealChecklist(id: string): Promise<void>;
  
  // Deal Checklist Item operations
  getDealChecklistItems(checklistId: string): Promise<DealChecklistItem[]>;
  getDealChecklistItem(id: string): Promise<DealChecklistItem | undefined>;
  createDealChecklistItem(item: InsertDealChecklistItem): Promise<DealChecklistItem>;
  createDealChecklistItemsBulk(items: InsertDealChecklistItem[]): Promise<DealChecklistItem[]>;
  updateDealChecklistItem(id: string, updates: Partial<DealChecklistItem>): Promise<DealChecklistItem>;
  
  // Checklist Item Document operations
  getChecklistItemDocuments(itemId: string): Promise<ChecklistItemDocument[]>;
  createChecklistItemDocument(doc: InsertChecklistItemDocument): Promise<ChecklistItemDocument>;
  updateChecklistItemDocument(id: string, updates: Partial<ChecklistItemDocument>): Promise<ChecklistItemDocument>;
  deleteChecklistItemDocument(id: string): Promise<void>;
  
  // Checklist Item Comment operations
  getChecklistItemComments(itemId: string): Promise<ChecklistItemComment[]>;
  createChecklistItemComment(comment: InsertChecklistItemComment): Promise<ChecklistItemComment>;
  
  // Litigation Template operations
  getLitigationTemplates(filters?: { category?: string; jurisdiction?: string; searchQuery?: string; userId?: string }): Promise<LitigationTemplateWithDetails[]>;
  getLitigationTemplate(id: string): Promise<LitigationTemplate | undefined>;
  createLitigationTemplate(template: InsertLitigationTemplate): Promise<LitigationTemplate>;
  updateLitigationTemplate(id: string, updates: Partial<LitigationTemplate>): Promise<LitigationTemplate>;
  deleteLitigationTemplate(id: string): Promise<void>;
  
  // Template Favorites operations
  getTemplateFavorites(userId: string): Promise<TemplateFavorite[]>;
  addTemplateFavorite(templateId: string, userId: string): Promise<TemplateFavorite>;
  removeTemplateFavorite(templateId: string, userId: string): Promise<void>;
  isTemplateFavorite(templateId: string, userId: string): Promise<boolean>;
  
  // Template Usage History operations
  recordTemplateUsage(templateId: string, userId: string): Promise<void>;
  getRecentlyUsedTemplates(userId: string, limit?: number): Promise<LitigationTemplate[]>;
  
  // Calendar Event operations
  getCalendarEvents(filters?: { userId?: string; startDate?: Date; endDate?: Date; caseId?: string; clientId?: string; eventType?: string }): Promise<CalendarEvent[]>;
  getCalendarEvent(id: string): Promise<CalendarEvent | undefined>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent>;
  deleteCalendarEvent(id: string): Promise<void>;
  
  // User Calendars
  getUserCalendars(userId: string): Promise<UserCalendar[]>;
  getUserCalendar(id: string): Promise<UserCalendar | undefined>;
  createUserCalendar(calendar: InsertUserCalendar): Promise<UserCalendar>;
  updateUserCalendar(id: string, updates: Partial<UserCalendar>): Promise<UserCalendar>;
  deleteUserCalendar(id: string): Promise<void>;
  getDefaultUserCalendar(userId: string): Promise<UserCalendar | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Separate id from the rest of the userData to avoid updating the primary key
    const { id, ...updateData } = userData;
    
    try {
      const existingByEmail = await db
        .select()
        .from(users)
        .where(sql`${users.email} = ${userData.email}`)
        .limit(1);
      
      if (existingByEmail.length > 0) {
        const [updated] = await db
          .update(users)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(sql`${users.email} = ${userData.email}`)
          .returning();
        return updated;
      }
    } catch (error) {
      console.log("Error checking existing user by email:", error);
    }
    
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...updateData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role: role as any, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUserByEmail(email: string | undefined): Promise<User | undefined> {
    if (!email) return undefined;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByMicrosoftId(microsoftId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.microsoftId, microsoftId));
    return user;
  }

  async createUser(userData: any): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Communication operations
  async getCommunications(filters?: CommunicationFilters): Promise<Communication[]> {
    // Only select columns that actually exist in the database
    // Note: eDiscovery columns like email_thread_id, custodianName, etc. haven't been added to DB yet
    let query = db.select({
      id: communications.id,
      subject: communications.subject,
      body: communications.body,
      sender: communications.sender,
      recipients: communications.recipients,
      communicationType: communications.communicationType,
      timestamp: communications.timestamp,
      legalHold: communications.legalHold,
      sourceType: communications.sourceType,
      metadata: communications.metadata,
      privilegeStatus: communications.privilegeStatus,
      createdAt: communications.createdAt,
      complianceScore: communications.complianceScore,
      riskLevel: communications.riskLevel,
      aiComplianceAnalysis: communications.aiComplianceAnalysis,
      analyzedAt: communications.analyzedAt,
      isTranslated: communications.isTranslated,
      translatedSubject: communications.translatedSubject,
      translatedBody: communications.translatedBody,
      originalLanguage: communications.originalLanguage,
      // Add attachment fields for proper attachment viewing
      attachmentIds: communications.attachmentIds,
      attachmentCount: communications.attachmentCount,
      // Add caseId to enable case-scoped document filtering
      caseId: communications.caseId,
      // Add file/media fields for inline media display
      filePath: communications.filePath,
      mimeType: communications.mimeType,
      fileExtension: communications.fileExtension,
      fileSize: communications.fileSize,
      wordCount: communications.wordCount,
    }).from(communications)
      .orderBy(desc(communications.timestamp))
      .limit(10000);
    
    // Build WHERE conditions
    const conditions: any[] = [];

    // Apply caseId filter if provided
    if (filters?.caseId) {
      conditions.push(eq(communications.caseId, filters.caseId));
    }

    // === DATE FILTERS ===
    // Apply specific date filter if provided (filter by date only, ignoring time)
    if (filters?.date) {
      conditions.push(sql`DATE(${communications.timestamp}) = ${filters.date}::date`);
    }
    // Apply date range filters if provided
    if (filters?.dateFrom) {
      conditions.push(sql`${communications.timestamp} >= ${filters.dateFrom}::timestamptz`);
    }
    if (filters?.dateTo) {
      conditions.push(sql`${communications.timestamp} <= ${filters.dateTo}::timestamptz`);
    }

    // === PEOPLE FILTERS ===
    // Apply sender filter using ILIKE for display-name format matching (e.g., "Name" <email>)
    if (filters?.sender) {
      // Sanitize email to prevent SQL injection - remove wildcards and control chars
      const sanitizedEmail = filters.sender.replace(/[%_\\]/g, '');
      conditions.push(sql`${communications.sender} ILIKE ${'%' + sanitizedEmail + '%'}`);
    }
    if (filters?.from && filters.from.length > 0) {
      // Use ILIKE for each sender in the list
      const fromConditions = filters.from.map(sender => {
        const sanitized = sender.replace(/[%_\\]/g, '');
        return sql`${communications.sender} ILIKE ${'%' + sanitized + '%'}`;
      });
      conditions.push(or(...fromConditions));
    }
    
    // Apply recipient filter using ILIKE (check if recipient email is in recipients JSONB array)
    if (filters?.recipient) {
      // Sanitize email to prevent SQL injection
      const sanitizedEmail = filters.recipient.replace(/[%_\\]/g, '');
      conditions.push(sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${communications.recipients}::jsonb) AS recipient
        WHERE recipient ILIKE ${'%' + sanitizedEmail + '%'}
      )`);
    }
    if (filters?.to && filters.to.length > 0) {
      const toConditions = filters.to.map(recipient => 
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(${communications.recipients}::jsonb) AS r
          WHERE r = ${recipient}
        )`
      );
      conditions.push(or(...toConditions));
    }
    
    // Participants filter (sender OR recipient) - using ILIKE for display-name format matching
    if (filters?.participants && filters.participants.length > 0) {
      const participantConditions = filters.participants.map(participant => {
        const sanitized = participant.replace(/[%_\\]/g, '');
        return or(
          sql`${communications.sender} ILIKE ${'%' + sanitized + '%'}`,
          sql`EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(${communications.recipients}::jsonb) AS r
            WHERE r ILIKE ${'%' + sanitized + '%'}
          )`
        );
      });
      conditions.push(or(...participantConditions));
    }
    
    // Domain filter - filter by sender or recipient email domain
    if (filters?.domain && filters.domain.length > 0) {
      const domainConditions = filters.domain.map(domain => {
        const sanitized = domain.replace(/[%_\\]/g, '');
        return or(
          sql`${communications.sender} ILIKE ${'%@' + sanitized + '%'}`,
          sql`EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(${communications.recipients}::jsonb) AS r
            WHERE r ILIKE ${'%@' + sanitized + '%'}
          )`
        );
      });
      conditions.push(or(...domainConditions));
    }
    
    // Exclude people filter
    if (filters?.excludePeople && filters.excludePeople.length > 0) {
      const excludeConditions = filters.excludePeople.map(person => 
        and(
          sql`${communications.sender} != ${person}`,
          sql`NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(${communications.recipients}::jsonb) AS r
            WHERE r = ${person}
          )`
        )
      );
      conditions.push(and(...excludeConditions));
    }

    // === COMMUNICATION TYPE FILTER ===
    if (filters?.communicationType && filters.communicationType.length > 0) {
      conditions.push(inArray(communications.communicationType, filters.communicationType));
    }

    // === ATTACHMENT FILTERS ===
    if (filters?.hasAttachments !== undefined) {
      if (filters.hasAttachments) {
        conditions.push(sql`${communications.containsAttachments} = 'true'`);
      } else {
        conditions.push(sql`${communications.containsAttachments} = 'false'`);
      }
    }
    
    if (filters?.attachmentTypes && filters.attachmentTypes.length > 0) {
      // This would require checking attachment file extensions/types
      // For now, we'll just ensure has attachments
      conditions.push(sql`${communications.containsAttachments} = 'true'`);
    }

    // === CLASSIFICATION FILTERS ===
    if (filters?.privilege && filters.privilege.length > 0) {
      const privilegeValues = filters.privilege.map(status => {
        if (status === 'both') return ['attorney_client_privileged', 'work_product'];
        return [status];
      }).flat();
      conditions.push(inArray(communications.privilegeStatus, privilegeValues as any));
    }
    
    // Risk score filters
    if (filters?.riskScoreMin !== undefined) {
      conditions.push(sql`${communications.complianceScore} >= ${filters.riskScoreMin}`);
    }
    if (filters?.riskScoreMax !== undefined) {
      conditions.push(sql`${communications.complianceScore} <= ${filters.riskScoreMax}`);
    }

    // === REVIEW WORKFLOW FILTERS ===
    if (filters?.reviewStatus && filters.reviewStatus.length > 0) {
      conditions.push(inArray(communications.reviewStatus, filters.reviewStatus));
    }
    
    if (filters?.assignedReviewer && filters.assignedReviewer.length > 0) {
      conditions.push(inArray(communications.reviewedBy, filters.assignedReviewer));
    }
    
    if (filters?.reviewedBy) {
      conditions.push(eq(communications.reviewedBy, filters.reviewedBy));
    }

    // === TEXT SEARCH FILTER ===
    if (filters?.query && filters.query.trim()) {
      // Respect query mode (boolean vs natural)
      if (filters.queryMode === 'boolean') {
        // Use existing searchCommunications boolean logic
        // For now, fallback to simple ILIKE with AND logic
        const terms = filters.query.split(/\s+AND\s+/i);
        for (const term of terms) {
          const searchTerm = `%${term.trim()}%`;
          conditions.push(
            or(
              ilike(communications.subject, searchTerm),
              ilike(communications.body, searchTerm),
              ilike(communications.sender, searchTerm)
            )
          );
        }
      } else {
        // Natural language search - simple OR matching
        const searchTerm = `%${filters.query}%`;
        conditions.push(
          or(
            ilike(communications.subject, searchTerm),
            ilike(communications.body, searchTerm),
            ilike(communications.sender, searchTerm)
          )
        );
      }
    }

    // === TAG FILTER (requires JOIN to documentTags) ===
    if (filters?.tags && filters.tags.length > 0) {
      // Filter communications that have ANY of the specified tags
      conditions.push(sql`EXISTS (
        SELECT 1 FROM document_tags
        WHERE document_tags.entity_type = 'communication'
        AND document_tags.entity_id = ${communications.id}
        AND document_tags.tag_id IN (${sql.join(filters.tags.map(tagId => sql`${tagId}`), sql`, `)})
      )`);
    }

    // Apply all conditions if any exist
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query as any;
  }

  async getCommunication(id: string): Promise<Communication | undefined> {
    // Only select columns that actually exist in the database
    const [communication] = await db.select({
      id: communications.id,
      subject: communications.subject,
      body: communications.body,
      sender: communications.sender,
      recipients: communications.recipients,
      communicationType: communications.communicationType,
      timestamp: communications.timestamp,
      legalHold: communications.legalHold,
      sourceType: communications.sourceType,
      metadata: communications.metadata,
      privilegeStatus: communications.privilegeStatus,
      createdAt: communications.createdAt,
      complianceScore: communications.complianceScore,
      riskLevel: communications.riskLevel,
      aiComplianceAnalysis: communications.aiComplianceAnalysis,
      analyzedAt: communications.analyzedAt,
      isTranslated: communications.isTranslated,
      translatedSubject: communications.translatedSubject,
      translatedBody: communications.translatedBody,
      originalLanguage: communications.originalLanguage,
      // Add attachment fields for proper attachment viewing
      attachmentIds: communications.attachmentIds,
      attachmentCount: communications.attachmentCount,
    }).from(communications).where(eq(communications.id, id));
    return communication as Communication | undefined;
  }

  async createCommunication(comm: InsertCommunication): Promise<Communication> {
    const [communication] = await db.insert(communications).values(comm).returning();
    return communication;
  }

  async searchCommunications(query: string, mode: 'boolean' | 'natural'): Promise<Communication[]> {
    if (!query || query.trim() === '') {
      return [];
    }

    // Define the full select fields (same as getCommunication)
    const selectFields = {
      id: communications.id,
      communicationType: communications.communicationType,
      subject: communications.subject,
      body: communications.body,
      sender: communications.sender,
      recipients: communications.recipients,
      timestamp: communications.timestamp,
      emailThreadId: communications.emailThreadId,
      custodianName: communications.custodianName,
      custodianDepartment: communications.custodianDepartment,
      fileSize: communications.fileSize,
      wordCount: communications.wordCount,
      language: communications.language,
      fileExtension: communications.fileExtension,
      mimeType: communications.mimeType,
      legalHold: communications.legalHold,
      sourceType: communications.sourceType,
      metadata: communications.metadata,
      privilegeStatus: communications.privilegeStatus,
      createdAt: communications.createdAt,
      complianceScore: communications.complianceScore,
      riskLevel: communications.riskLevel,
      aiComplianceAnalysis: communications.aiComplianceAnalysis,
      analyzedAt: communications.analyzedAt,
      isTranslated: communications.isTranslated,
      translatedSubject: communications.translatedSubject,
      translatedBody: communications.translatedBody,
      originalLanguage: communications.originalLanguage,
      attachmentIds: communications.attachmentIds,
      attachmentCount: communications.attachmentCount,
    };

    if (mode === 'boolean') {
      // Parse boolean search query
      // Support: AND, OR, NOT, quotes for exact phrases
      // Example: "contract" AND "payment" NOT "approved"
      
      const searchTerms = this.parseBooleanQuery(query);
      let sqlQuery = db.select(selectFields).from(communications);
      
      // Build WHERE clause for boolean search
      const conditions: any[] = [];
      
      for (const term of searchTerms.include) {
        const termPattern = `%${term}%`;
        conditions.push(
          or(
            ilike(communications.subject, termPattern),
            ilike(communications.body, termPattern),
            ilike(communications.sender, termPattern)
          )
        );
      }
      
      if (conditions.length > 0) {
        sqlQuery = sqlQuery.where(and(...conditions)) as any;
      }
      
      // Apply NOT exclusions
      for (const term of searchTerms.exclude) {
        const termPattern = `%${term}%`;
        sqlQuery = sqlQuery.where(
          and(
            sql`NOT (${ilike(communications.subject, termPattern)} OR ${ilike(communications.body, termPattern)} OR ${ilike(communications.sender, termPattern)})`
          )
        ) as any;
      }
      
      return await sqlQuery.orderBy(desc(communications.timestamp)).limit(50000);
    } else {
      // Natural language search - simple keyword extraction for now
      // Extract meaningful terms (remove common words)
      const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'about']);
      const terms = query.toLowerCase()
        .split(/\s+/)
        .filter(term => term.length > 2 && !stopWords.has(term));
      
      if (terms.length === 0) {
        // Fall back to full query
        const pattern = `%${query}%`;
        return await db.select(selectFields)
          .from(communications)
          .where(
            or(
              ilike(communications.subject, pattern),
              ilike(communications.body, pattern),
              ilike(communications.sender, pattern)
            )
          )
          .orderBy(desc(communications.timestamp))
          .limit(50000);
      }
      
      // Search for any of the extracted terms
      const conditions = terms.map(term => {
        const pattern = `%${term}%`;
        return or(
          ilike(communications.subject, pattern),
          ilike(communications.body, pattern),
          ilike(communications.sender, pattern)
        );
      });
      
      return await db.select(selectFields)
        .from(communications)
        .where(or(...conditions))
        .orderBy(desc(communications.timestamp))
        .limit(50000);
    }
  }

  private parseBooleanQuery(query: string): { include: string[]; exclude: string[] } {
    const include: string[] = [];
    const exclude: string[] = [];
    
    // Extract phrases in quotes
    const phraseRegex = /"([^"]+)"/g;
    let match;
    const phrases: string[] = [];
    while ((match = phraseRegex.exec(query)) !== null) {
      phrases.push(match[1]);
    }
    
    // Remove phrases from query to process remaining terms
    let remainingQuery = query.replace(phraseRegex, '');
    
    // Split by AND/OR and process
    const tokens = remainingQuery.split(/\s+/);
    let currentMode: 'include' | 'exclude' = 'include';
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].trim();
      
      if (token === 'NOT' || token === '-') {
        currentMode = 'exclude';
        continue;
      }
      
      if (token === 'AND' || token === 'OR' || token === '') {
        currentMode = 'include';
        continue;
      }
      
      // Clean the token
      const cleanToken = token.replace(/[^\w\s-]/g, '').trim();
      if (cleanToken.length > 0) {
        if (currentMode === 'exclude') {
          exclude.push(cleanToken);
          currentMode = 'include'; // Reset after processing NOT term
        } else {
          include.push(cleanToken);
        }
      }
    }
    
    // Add phrases to include
    include.push(...phrases);
    
    return { include, exclude };
  }

  // Chat Thread operations (conversation groupings)
  async getChatThreads(filters?: { caseId?: string }): Promise<ChatThread[]> {
    let query = db.select().from(chatThreads);
    
    if (filters?.caseId) {
      query = query.where(eq(chatThreads.caseId, filters.caseId)) as any;
    }
    
    return await query.orderBy(desc(chatThreads.createdAt)).limit(500);
  }

  async getChatThread(id: string): Promise<ChatThread | undefined> {
    const [thread] = await db.select().from(chatThreads).where(eq(chatThreads.id, id));
    return thread;
  }

  async createChatThread(thread: InsertChatThread): Promise<ChatThread> {
    const [newThread] = await db.insert(chatThreads).values(thread).returning();
    return newThread;
  }

  async updateChatThread(id: string, updates: Partial<ChatThread>): Promise<ChatThread> {
    const [thread] = await db
      .update(chatThreads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(chatThreads.id, id))
      .returning();
    return thread;
  }

  // Chat message operations (ingested from WhatsApp, SMS, etc.)
  async getIngestedChatMessages(filters?: { caseId?: string; threadId?: string }): Promise<IngestedChatMessage[]> {
    let query = db.select().from(ingestedChatMessages);
    
    const conditions = [];
    
    if (filters?.caseId) {
      conditions.push(eq(ingestedChatMessages.caseId, filters.caseId));
    }
    
    if (filters?.threadId) {
      conditions.push(eq(ingestedChatMessages.threadId, filters.threadId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(ingestedChatMessages.sentAt).limit(5000);
  }

  async getIngestedChatMessage(id: string): Promise<IngestedChatMessage | undefined> {
    const [message] = await db.select().from(ingestedChatMessages).where(eq(ingestedChatMessages.id, id));
    return message;
  }

  async createIngestedChatMessage(chatMsg: InsertIngestedChatMessage): Promise<IngestedChatMessage> {
    const [newChatMessage] = await db.insert(ingestedChatMessages).values(chatMsg).returning();
    return newChatMessage;
  }

  async updateIngestedChatMessage(id: string, updates: Partial<IngestedChatMessage>): Promise<IngestedChatMessage> {
    const [message] = await db
      .update(ingestedChatMessages)
      .set(updates)
      .where(eq(ingestedChatMessages.id, id))
      .returning();
    return message;
  }

  // Chat message notes operations
  async getChatMessageNotes(messageId: string): Promise<ChatMessageNote[]> {
    return await db
      .select()
      .from(chatMessageNotes)
      .where(eq(chatMessageNotes.messageId, messageId))
      .orderBy(chatMessageNotes.createdAt);
  }

  async createChatMessageNote(note: InsertChatMessageNote): Promise<ChatMessageNote> {
    const [newNote] = await db.insert(chatMessageNotes).values(note).returning();
    return newNote;
  }

  async deleteChatMessageNote(id: string): Promise<void> {
    await db.delete(chatMessageNotes).where(eq(chatMessageNotes.id, id));
  }

  // Alert operations
  async getAlerts(): Promise<Alert[]> {
    return await db.select().from(alerts).orderBy(desc(alerts.createdAt));
  }

  async getAlert(id: string): Promise<Alert | undefined> {
    const [alert] = await db.select().from(alerts).where(eq(alerts.id, id));
    return alert;
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db.insert(alerts).values(alert).returning();
    return newAlert;
  }

  async updateAlert(id: string, updates: Partial<Alert>): Promise<Alert> {
    const [alert] = await db
      .update(alerts)
      .set(updates)
      .where(eq(alerts.id, id))
      .returning();
    return alert;
  }

  // Case operations
  async getCases(): Promise<Case[]> {
    return await db.select({
      id: cases.id,
      caseNumber: cases.caseNumber,
      alertId: cases.alertId,
      title: cases.title,
      description: cases.description,
      status: cases.status,
      violationType: cases.violationType,
      assignedTo: cases.assignedTo,
      createdBy: cases.createdBy,
      priority: cases.priority,
      employeeName: cases.employeeName,
      employeePosition: cases.employeePosition,
      resolutionNotes: cases.resolutionNotes,
      attorneyReviewRequired: cases.attorneyReviewRequired,
      attorneyReviewStatus: cases.attorneyReviewStatus,
      reviewedByAttorney: cases.reviewedByAttorney,
      attorneyReviewNotes: cases.attorneyReviewNotes,
      attorneyReviewDecision: cases.attorneyReviewDecision,
      attorneyReviewedAt: cases.attorneyReviewedAt,
      escalatedTo: cases.escalatedTo,
      escalationReason: cases.escalationReason,
      escalatedAt: cases.escalatedAt,
      isCounselDirected: cases.isCounselDirected,
      privilegeStatus: cases.privilegeStatus,
      privilegeBasis: cases.privilegeBasis,
      privilegeAssertedBy: cases.privilegeAssertedBy,
      privilegeAssertedAt: cases.privilegeAssertedAt,
      privilegeReviewStatus: cases.privilegeReviewStatus,
      privilegeReviewedBy: cases.privilegeReviewedBy,
      privilegeReviewedAt: cases.privilegeReviewedAt,
      privilegeNotes: cases.privilegeNotes,
      isRedacted: cases.isRedacted,
      redactionLog: cases.redactionLog,
      privilegeStamp: cases.privilegeStamp,
      riskScore: cases.riskScore,
      riskLevel: cases.riskLevel,
      aiAnalysisSummary: cases.aiAnalysisSummary,
      closedAt: cases.closedAt,
      closedBy: cases.closedBy,
      archivedAt: cases.archivedAt,
      archivedBy: cases.archivedBy,
      createdAt: cases.createdAt,
      updatedAt: cases.updatedAt,
    }).from(cases).orderBy(desc(cases.createdAt));
  }

  async getCase(id: string): Promise<Case | undefined> {
    const [caseData] = await db.select({
      id: cases.id,
      caseNumber: cases.caseNumber,
      alertId: cases.alertId,
      title: cases.title,
      description: cases.description,
      status: cases.status,
      violationType: cases.violationType,
      assignedTo: cases.assignedTo,
      createdBy: cases.createdBy,
      priority: cases.priority,
      employeeName: cases.employeeName,
      employeePosition: cases.employeePosition,
      resolutionNotes: cases.resolutionNotes,
      attorneyReviewRequired: cases.attorneyReviewRequired,
      attorneyReviewStatus: cases.attorneyReviewStatus,
      reviewedByAttorney: cases.reviewedByAttorney,
      attorneyReviewNotes: cases.attorneyReviewNotes,
      attorneyReviewDecision: cases.attorneyReviewDecision,
      attorneyReviewedAt: cases.attorneyReviewedAt,
      escalatedTo: cases.escalatedTo,
      escalationReason: cases.escalationReason,
      escalatedAt: cases.escalatedAt,
      isCounselDirected: cases.isCounselDirected,
      privilegeStatus: cases.privilegeStatus,
      privilegeBasis: cases.privilegeBasis,
      privilegeAssertedBy: cases.privilegeAssertedBy,
      privilegeAssertedAt: cases.privilegeAssertedAt,
      privilegeReviewStatus: cases.privilegeReviewStatus,
      privilegeReviewedBy: cases.privilegeReviewedBy,
      privilegeReviewedAt: cases.privilegeReviewedAt,
      privilegeNotes: cases.privilegeNotes,
      isRedacted: cases.isRedacted,
      redactionLog: cases.redactionLog,
      privilegeStamp: cases.privilegeStamp,
      riskScore: cases.riskScore,
      riskLevel: cases.riskLevel,
      aiAnalysisSummary: cases.aiAnalysisSummary,
      closedAt: cases.closedAt,
      closedBy: cases.closedBy,
      archivedAt: cases.archivedAt,
      archivedBy: cases.archivedBy,
      createdAt: cases.createdAt,
      updatedAt: cases.updatedAt,
    }).from(cases).where(eq(cases.id, id));
    return caseData;
  }

  async getCaseSummary(id: string): Promise<{ id: string; caseNumber: string; title: string } | undefined> {
    const [summary] = await db.select({
      id: cases.id,
      caseNumber: cases.caseNumber,
      title: cases.title,
    }).from(cases).where(eq(cases.id, id));
    return summary;
  }

  async createCase(caseData: InsertCase): Promise<Case> {
    // Generate case number
    const count = await db.select({ count: sql<number>`count(*)` }).from(cases);
    const caseNumber = `CASE-${new Date().getFullYear()}-${String((count[0]?.count || 0) + 1).padStart(4, "0")}`;

    // Insert and explicitly return only columns that exist in the database
    // Note: risk_score column doesn't exist in DB yet, so we exclude it
    const [newCase] = await db
      .insert(cases)
      .values({ ...caseData, caseNumber })
      .returning({
        id: cases.id,
        caseNumber: cases.caseNumber,
        alertId: cases.alertId,
        title: cases.title,
        description: cases.description,
        status: cases.status,
        violationType: cases.violationType,
        assignedTo: cases.assignedTo,
        createdBy: cases.createdBy,
        priority: cases.priority,
        employeeName: cases.employeeName,
        employeePosition: cases.employeePosition,
        resolutionNotes: cases.resolutionNotes,
        attorneyReviewRequired: cases.attorneyReviewRequired,
        attorneyReviewStatus: cases.attorneyReviewStatus,
        reviewedByAttorney: cases.reviewedByAttorney,
        attorneyReviewNotes: cases.attorneyReviewNotes,
        attorneyReviewDecision: cases.attorneyReviewDecision,
        attorneyReviewedAt: cases.attorneyReviewedAt,
        escalatedTo: cases.escalatedTo,
        escalationReason: cases.escalationReason,
        escalatedAt: cases.escalatedAt,
        isCounselDirected: cases.isCounselDirected,
        privilegeStatus: cases.privilegeStatus,
        privilegeBasis: cases.privilegeBasis,
        privilegeAssertedBy: cases.privilegeAssertedBy,
        privilegeAssertedAt: cases.privilegeAssertedAt,
        privilegeReviewStatus: cases.privilegeReviewStatus,
        privilegeReviewedBy: cases.privilegeReviewedBy,
        privilegeReviewedAt: cases.privilegeReviewedAt,
        privilegeNotes: cases.privilegeNotes,
        isRedacted: cases.isRedacted,
        redactionLog: cases.redactionLog,
        privilegeStamp: cases.privilegeStamp,
        riskScore: cases.riskScore,
        riskLevel: cases.riskLevel,
        aiAnalysisSummary: cases.aiAnalysisSummary,
        closedAt: cases.closedAt,
        closedBy: cases.closedBy,
        archivedAt: cases.archivedAt,
        archivedBy: cases.archivedBy,
        createdAt: cases.createdAt,
        updatedAt: cases.updatedAt,
      });
    return newCase as any;
  }

  async updateCase(id: string, updates: UpdateCase): Promise<Case> {
    const [updatedCase] = await db
      .update(cases)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cases.id, id))
      .returning({
        id: cases.id,
        caseNumber: cases.caseNumber,
        alertId: cases.alertId,
        title: cases.title,
        description: cases.description,
        status: cases.status,
        violationType: cases.violationType,
        assignedTo: cases.assignedTo,
        createdBy: cases.createdBy,
        priority: cases.priority,
        employeeName: cases.employeeName,
        employeePosition: cases.employeePosition,
        resolutionNotes: cases.resolutionNotes,
        attorneyReviewRequired: cases.attorneyReviewRequired,
        attorneyReviewStatus: cases.attorneyReviewStatus,
        reviewedByAttorney: cases.reviewedByAttorney,
        attorneyReviewNotes: cases.attorneyReviewNotes,
        attorneyReviewDecision: cases.attorneyReviewDecision,
        attorneyReviewedAt: cases.attorneyReviewedAt,
        escalatedTo: cases.escalatedTo,
        escalationReason: cases.escalationReason,
        escalatedAt: cases.escalatedAt,
        isCounselDirected: cases.isCounselDirected,
        privilegeStatus: cases.privilegeStatus,
        privilegeBasis: cases.privilegeBasis,
        privilegeAssertedBy: cases.privilegeAssertedBy,
        privilegeAssertedAt: cases.privilegeAssertedAt,
        privilegeReviewStatus: cases.privilegeReviewStatus,
        privilegeReviewedBy: cases.privilegeReviewedBy,
        privilegeReviewedAt: cases.privilegeReviewedAt,
        privilegeNotes: cases.privilegeNotes,
        isRedacted: cases.isRedacted,
        redactionLog: cases.redactionLog,
        privilegeStamp: cases.privilegeStamp,
        riskScore: cases.riskScore,
        riskLevel: cases.riskLevel,
        aiAnalysisSummary: cases.aiAnalysisSummary,
        closedAt: cases.closedAt,
        closedBy: cases.closedBy,
        archivedAt: cases.archivedAt,
        archivedBy: cases.archivedBy,
        createdAt: cases.createdAt,
        updatedAt: cases.updatedAt,
      });
    return updatedCase as any;
  }

  // Case Assignment operations
  async getCaseAssignments(caseId: string): Promise<CaseAssignment[]> {
    return await db
      .select()
      .from(caseAssignments)
      .where(
        and(
          eq(caseAssignments.caseId, caseId),
          sql`${caseAssignments.removedAt} IS NULL` // Filter out soft-deleted assignments
        )
      )
      .orderBy(desc(caseAssignments.assignedAt));
  }

  async getUserCaseAssignments(userId: string): Promise<CaseAssignment[]> {
    return await db
      .select()
      .from(caseAssignments)
      .where(
        and(
          eq(caseAssignments.userId, userId),
          sql`${caseAssignments.removedAt} IS NULL` // Filter out soft-deleted assignments
        )
      )
      .orderBy(desc(caseAssignments.assignedAt));
  }

  async createCaseAssignment(assignment: InsertCaseAssignment): Promise<CaseAssignment> {
    const [newAssignment] = await db
      .insert(caseAssignments)
      .values(assignment)
      .returning();
    return newAssignment;
  }

  async removeCaseAssignment(id: string, removedBy: string): Promise<void> {
    await db
      .update(caseAssignments)
      .set({ removedAt: new Date(), removedBy })
      .where(eq(caseAssignments.id, id));
  }

  // Tag operations
  async getTags(category?: string): Promise<Tag[]> {
    if (category) {
      return await db
        .select()
        .from(tags)
        .where(eq(tags.category, category as any))
        .orderBy(tags.name);
    }
    return await db.select().from(tags).orderBy(tags.name);
  }

  async getTag(id: string): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    return tag;
  }

  async createTag(tagData: InsertTag): Promise<Tag> {
    const [newTag] = await db.insert(tags).values(tagData).returning();
    return newTag;
  }

  async updateTag(id: string, updates: Partial<Tag>): Promise<Tag> {
    const [updatedTag] = await db
      .update(tags)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tags.id, id))
      .returning();
    return updatedTag;
  }

  async deleteTag(id: string): Promise<void> {
    // Only allow deletion of non-preset tags
    await db.delete(tags).where(and(eq(tags.id, id), eq(tags.isPreset, false)));
  }

  async getRecentlyUsedTags(userId: string, limit: number = 5): Promise<Tag[]> {
    const recentTags = await db
      .select({
        tag: tags,
        taggedAt: documentTags.taggedAt,
      })
      .from(documentTags)
      .innerJoin(tags, eq(documentTags.tagId, tags.id))
      .where(eq(documentTags.taggedBy, userId))
      .orderBy(desc(documentTags.taggedAt))
      .limit(limit * 2); // Fetch more to account for duplicates

    // Get unique tags by ID, preserving order
    const seenIds = new Set<string>();
    const uniqueTags: Tag[] = [];
    
    for (const item of recentTags) {
      if (!seenIds.has(item.tag.id) && uniqueTags.length < limit) {
        seenIds.add(item.tag.id);
        uniqueTags.push(item.tag);
      }
    }
    
    return uniqueTags;
  }

  // Document Tag operations
  async getEntityTags(entityType: string, entityId: string): Promise<Array<DocumentTag & { tag: Tag }>> {
    const results = await db
      .select({
        id: documentTags.id,
        tagId: documentTags.tagId,
        entityType: documentTags.entityType,
        entityId: documentTags.entityId,
        taggedBy: documentTags.taggedBy,
        taggedAt: documentTags.taggedAt,
        tag: tags,
      })
      .from(documentTags)
      .innerJoin(tags, eq(documentTags.tagId, tags.id))
      .where(
        and(
          eq(documentTags.entityType, entityType),
          eq(documentTags.entityId, entityId)
        )
      )
      .orderBy(tags.name);
    
    return results as any;
  }

  async addTagToEntity(documentTag: InsertDocumentTag): Promise<DocumentTag> {
    const [newDocumentTag] = await db
      .insert(documentTags)
      .values(documentTag)
      .returning();
    return newDocumentTag;
  }

  async removeTagFromEntity(entityType: string, entityId: string, tagId: string): Promise<void> {
    await db
      .delete(documentTags)
      .where(
        and(
          eq(documentTags.entityType, entityType),
          eq(documentTags.entityId, entityId),
          eq(documentTags.tagId, tagId)
        )
      );
  }

  // Saved Search operations
  async getSavedSearches(filters?: { userId?: string; caseId?: string }): Promise<SavedSearch[]> {
    const conditions = [];
    
    // Return searches owned by user OR public searches
    if (filters?.userId) {
      conditions.push(
        or(
          eq(savedSearches.ownerId, filters.userId),
          eq(savedSearches.isPublic, 'true')
        )
      );
    }
    
    if (filters?.caseId) {
      conditions.push(eq(savedSearches.caseId, filters.caseId));
    }
    
    let query = db.select().from(savedSearches);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(savedSearches.createdAt)) as any;
  }

  async getSavedSearch(id: string): Promise<SavedSearch | undefined> {
    const [search] = await db.select().from(savedSearches).where(eq(savedSearches.id, id));
    return search;
  }

  async createSavedSearch(searchData: InsertSavedSearch): Promise<SavedSearch> {
    const [newSearch] = await db.insert(savedSearches).values(searchData).returning();
    return newSearch;
  }

  async updateSavedSearch(id: string, updates: Partial<SavedSearch>): Promise<SavedSearch> {
    const [updatedSearch] = await db
      .update(savedSearches)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(savedSearches.id, id))
      .returning();
    return updatedSearch;
  }

  async deleteSavedSearch(id: string): Promise<void> {
    await db.delete(savedSearches).where(eq(savedSearches.id, id));
  }

  // Employee & Vendor Monitoring operations
  async getEmployees(filters?: { department?: string; search?: string }): Promise<Employee[]> {
    const conditions = [];
    
    if (filters?.department) {
      conditions.push(eq(employees.department, filters.department));
    }
    
    if (filters?.search) {
      conditions.push(
        or(
          ilike(employees.firstName, `%${filters.search}%`),
          ilike(employees.lastName, `%${filters.search}%`),
          ilike(employees.email, `%${filters.search}%`)
        )
      );
    }
    
    let query = db.select().from(employees);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(employees.createdAt));
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const employeeNumber = `EMP-${Date.now()}`;
    const [newEmployee] = await db
      .insert(employees)
      .values({ ...employee, employeeNumber })
      .returning();
    return newEmployee;
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
    const [employee] = await db
      .update(employees)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(employees.id, id))
      .returning();
    return employee;
  }

  async getVendorContacts(filters?: { vendorType?: string; search?: string }): Promise<VendorContact[]> {
    const conditions = [];
    
    if (filters?.vendorType) {
      conditions.push(eq(vendorContacts.vendorType, filters.vendorType));
    }
    
    if (filters?.search) {
      conditions.push(
        or(
          ilike(vendorContacts.firstName, `%${filters.search}%`),
          ilike(vendorContacts.lastName, `%${filters.search}%`),
          ilike(vendorContacts.email, `%${filters.search}%`),
          ilike(vendorContacts.companyName, `%${filters.search}%`)
        )
      );
    }
    
    let query = db.select().from(vendorContacts);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(vendorContacts.createdAt));
  }

  async getVendorContact(id: string): Promise<VendorContact | undefined> {
    const [vendorContact] = await db.select().from(vendorContacts).where(eq(vendorContacts.id, id));
    return vendorContact;
  }

  async createVendorContact(vendorContact: InsertVendorContact): Promise<VendorContact> {
    const contactNumber = `VEN-${Date.now()}`;
    const [newVendorContact] = await db
      .insert(vendorContacts)
      .values({ ...vendorContact, contactNumber })
      .returning();
    return newVendorContact;
  }

  async updateVendorContact(id: string, updates: Partial<VendorContact>): Promise<VendorContact> {
    const [vendorContact] = await db
      .update(vendorContacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(vendorContacts.id, id))
      .returning();
    return vendorContact;
  }

  async getMonitoredDevices(personType: string, personId: string): Promise<MonitoredDevice[]> {
    return await db
      .select()
      .from(monitoredDevices)
      .where(
        and(
          eq(monitoredDevices.personType, personType),
          eq(monitoredDevices.personId, personId)
        )
      )
      .orderBy(desc(monitoredDevices.createdAt));
  }

  async createMonitoredDevice(device: InsertMonitoredDevice): Promise<MonitoredDevice> {
    const [newDevice] = await db.insert(monitoredDevices).values(device).returning();
    return newDevice;
  }

  async getFolderAccess(personType: string, personId: string): Promise<FolderAccess[]> {
    return await db
      .select()
      .from(folderAccess)
      .where(
        and(
          eq(folderAccess.personType, personType),
          eq(folderAccess.personId, personId)
        )
      )
      .orderBy(desc(folderAccess.createdAt));
  }

  async createFolderAccess(folder: InsertFolderAccess): Promise<FolderAccess> {
    const [newFolder] = await db.insert(folderAccess).values(folder).returning();
    return newFolder;
  }

  async getCommunicationStats(personId: string): Promise<CommunicationStat[]> {
    return await db
      .select()
      .from(communicationStats)
      .where(
        or(
          eq(communicationStats.personId1, personId),
          eq(communicationStats.personId2, personId)
        )
      )
      .orderBy(desc(communicationStats.messageCount));
  }

  async updateCommunicationStats(stat: InsertCommunicationStat): Promise<CommunicationStat> {
    const existing = await db
      .select()
      .from(communicationStats)
      .where(
        and(
          eq(communicationStats.personId1, stat.personId1),
          eq(communicationStats.personId2, stat.personId2),
          eq(communicationStats.method, stat.method)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(communicationStats)
        .set({
          messageCount: existing[0].messageCount + (stat.messageCount || 1),
          lastContactDate: stat.lastContactDate || new Date(),
          updatedAt: new Date(),
        })
        .where(eq(communicationStats.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(communicationStats).values(stat).returning();
      return created;
    }
  }

  async getDataVolumeHistory(personType: string, personId: string): Promise<DataVolumeHistory[]> {
    return await db
      .select()
      .from(dataVolumeHistory)
      .where(
        and(
          eq(dataVolumeHistory.personType, personType),
          eq(dataVolumeHistory.personId, personId)
        )
      )
      .orderBy(dataVolumeHistory.date);
  }

  async createDataVolumeHistory(data: InsertDataVolumeHistory): Promise<DataVolumeHistory> {
    const [newData] = await db.insert(dataVolumeHistory).values(data).returning();
    return newData;
  }

  // Regulation operations
  async getRegulations(): Promise<Regulation[]> {
    return await db.select().from(regulations).orderBy(desc(regulations.createdAt));
  }

  async createRegulation(regulation: InsertRegulation): Promise<Regulation> {
    const [newRegulation] = await db.insert(regulations).values(regulation).returning();
    return newRegulation;
  }

  // Interview operations
  async getInterviews(filters?: { caseId?: string }): Promise<Interview[]> {
    let query = db.select().from(interviews).orderBy(desc(interviews.scheduledFor));
    
    // Apply caseId filter if provided
    if (filters?.caseId) {
      query = query.where(eq(interviews.caseId, filters.caseId)) as any;
    }
    
    return await query;
  }

  async getInterview(id: string): Promise<Interview | undefined> {
    const [interview] = await db.select().from(interviews).where(eq(interviews.id, id));
    return interview;
  }

  async getInterviewByAccessToken(accessToken: string): Promise<Interview | undefined> {
    const [interview] = await db.select().from(interviews).where(eq(interviews.accessToken, accessToken));
    return interview;
  }

  async createInterview(interview: InsertInterview): Promise<Interview> {
    const [newInterview] = await db.insert(interviews).values(interview).returning();
    return newInterview;
  }

  async updateInterview(id: string, updates: Partial<Interview>): Promise<Interview> {
    const [interview] = await db
      .update(interviews)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(interviews.id, id))
      .returning();
    return interview;
  }

  // Interview Response operations (per-question video responses)
  async getInterviewResponses(interviewId: string): Promise<InterviewResponse[]> {
    return await db
      .select()
      .from(interviewResponses)
      .where(eq(interviewResponses.interviewId, interviewId))
      .orderBy(interviewResponses.questionIndex);
  }

  async getInterviewResponse(id: string): Promise<InterviewResponse | undefined> {
    const [response] = await db.select().from(interviewResponses).where(eq(interviewResponses.id, id));
    return response;
  }

  async createInterviewResponse(response: InsertInterviewResponse): Promise<InterviewResponse> {
    const [newResponse] = await db.insert(interviewResponses).values(response).returning();
    return newResponse;
  }

  async updateInterviewResponse(id: string, updates: Partial<InterviewResponse>): Promise<InterviewResponse> {
    const [response] = await db
      .update(interviewResponses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(interviewResponses.id, id))
      .returning();
    return response;
  }

  async getInterviewsWithResponses(caseId?: string): Promise<{ interview: Interview; responses: InterviewResponse[] }[]> {
    // Get all interviews that have at least one response
    const allResponses = await db
      .select()
      .from(interviewResponses)
      .orderBy(interviewResponses.interviewId, interviewResponses.questionIndex);

    // Get unique interview IDs that have responses
    const interviewIds = [...new Set(allResponses.map(r => r.interviewId))];

    if (interviewIds.length === 0) {
      return [];
    }

    // Fetch all those interviews, optionally filtered by caseId
    let interviewsList;
    if (caseId) {
      interviewsList = await db
        .select()
        .from(interviews)
        .where(and(
          sql`${interviews.id} IN (${sql.join(interviewIds.map(id => sql`${id}`), sql`, `)})`,
          eq(interviews.caseId, caseId)
        ));
    } else {
      interviewsList = await db
        .select()
        .from(interviews)
        .where(sql`${interviews.id} IN (${sql.join(interviewIds.map(id => sql`${id}`), sql`, `)})`);
    }

    // Group responses by interview
    const responsesByInterview = new Map<string, InterviewResponse[]>();
    for (const response of allResponses) {
      const existing = responsesByInterview.get(response.interviewId) || [];
      existing.push(response);
      responsesByInterview.set(response.interviewId, existing);
    }

    // Combine interviews with their responses
    return interviewsList.map(interview => ({
      interview,
      responses: responsesByInterview.get(interview.id) || [],
    })).sort((a, b) => {
      // Sort by most recent response date
      const aDate = a.responses[a.responses.length - 1]?.recordedAt;
      const bDate = b.responses[b.responses.length - 1]?.recordedAt;
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }

  // Interview Template operations
  async getInterviewTemplates(): Promise<InterviewTemplate[]> {
    return await db.select().from(interviewTemplates).where(eq(interviewTemplates.isActive, "true")).orderBy(desc(interviewTemplates.createdAt));
  }

  async getInterviewTemplate(id: string): Promise<InterviewTemplate | undefined> {
    const [template] = await db.select().from(interviewTemplates).where(eq(interviewTemplates.id, id));
    return template;
  }

  async createInterviewTemplate(template: InsertInterviewTemplate): Promise<InterviewTemplate> {
    try {
      console.log("[STORAGE DEBUG] createInterviewTemplate - Input:", JSON.stringify(template, null, 2));
      const [newTemplate] = await db.insert(interviewTemplates).values(template).returning();
      console.log("[STORAGE DEBUG] createInterviewTemplate - Created template:", JSON.stringify(newTemplate, null, 2));
      return newTemplate;
    } catch (error) {
      console.error("[STORAGE ERROR] createInterviewTemplate - Failed:", error);
      throw error;
    }
  }

  async updateInterviewTemplate(id: string, updates: Partial<InterviewTemplate>): Promise<InterviewTemplate> {
    const [template] = await db
      .update(interviewTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(interviewTemplates.id, id))
      .returning();
    if (!template) {
      throw new Error("Interview template not found");
    }
    return template;
  }

  async deleteInterviewTemplate(id: string): Promise<void> {
    const [result] = await db.update(interviewTemplates)
      .set({ isActive: "false", updatedAt: new Date() })
      .where(eq(interviewTemplates.id, id))
      .returning();
    if (!result) {
      throw new Error("Interview template not found");
    }
  }

  // Interview Invite operations
  async getInterviewInvites(caseId?: string): Promise<InterviewInvite[]> {
    if (caseId) {
      return await db.select().from(interviewInvites).where(eq(interviewInvites.caseId, caseId)).orderBy(desc(interviewInvites.createdAt));
    }
    return await db.select().from(interviewInvites).orderBy(desc(interviewInvites.createdAt));
  }

  async getInterviewInvite(id: string): Promise<InterviewInvite | undefined> {
    const [invite] = await db.select().from(interviewInvites).where(eq(interviewInvites.id, id));
    return invite;
  }

  async getInterviewInviteByToken(token: string): Promise<InterviewInvite | undefined> {
    const [invite] = await db.select().from(interviewInvites).where(eq(interviewInvites.uniqueToken, token));
    return invite;
  }

  async createInterviewInvite(invite: InsertInterviewInvite): Promise<InterviewInvite> {
    const [newInvite] = await db.insert(interviewInvites).values(invite).returning();
    return newInvite;
  }

  async updateInterviewInvite(id: string, updates: Partial<InterviewInvite>): Promise<InterviewInvite> {
    const [invite] = await db
      .update(interviewInvites)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(interviewInvites.id, id))
      .returning();
    if (!invite) {
      throw new Error("Interview invite not found");
    }
    return invite;
  }

  // Recorded Interview operations
  async getRecordedInterviews(caseId?: string): Promise<RecordedInterview[]> {
    if (caseId) {
      return await db.select().from(recordedInterviews).where(eq(recordedInterviews.caseId, caseId)).orderBy(desc(recordedInterviews.createdAt));
    }
    return await db.select().from(recordedInterviews).orderBy(desc(recordedInterviews.createdAt));
  }

  async getRecordedInterview(id: string): Promise<RecordedInterview | undefined> {
    const [interview] = await db.select().from(recordedInterviews).where(eq(recordedInterviews.id, id));
    return interview;
  }

  async createRecordedInterview(interview: InsertRecordedInterview): Promise<RecordedInterview> {
    const [newInterview] = await db.insert(recordedInterviews).values(interview).returning();
    return newInterview;
  }

  async updateRecordedInterview(id: string, updates: Partial<RecordedInterview>): Promise<RecordedInterview> {
    const [interview] = await db
      .update(recordedInterviews)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(recordedInterviews.id, id))
      .returning();
    if (!interview) {
      throw new Error("Recorded interview not found");
    }
    return interview;
  }

  // Interview Note operations
  async getInterviewNotes(recordedInterviewId: string): Promise<InterviewNote[]> {
    return await db.select().from(interviewNotes)
      .where(eq(interviewNotes.recordedInterviewId, recordedInterviewId))
      .orderBy(desc(interviewNotes.createdAt));
  }

  async createInterviewNote(note: InsertInterviewNote): Promise<InterviewNote> {
    const [newNote] = await db.insert(interviewNotes).values(note).returning();
    return newNote;
  }

  async updateInterviewNote(id: string, updates: Partial<InterviewNote>): Promise<InterviewNote> {
    const [note] = await db
      .update(interviewNotes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(interviewNotes.id, id))
      .returning();
    if (!note) {
      throw new Error("Interview note not found");
    }
    return note;
  }

  async deleteInterviewNote(id: string): Promise<void> {
    const [result] = await db.delete(interviewNotes)
      .where(eq(interviewNotes.id, id))
      .returning();
    if (!result) {
      throw new Error("Interview note not found");
    }
  }

  // Live Interview Session operations
  async getLiveInterviewSessions(filters?: { caseId?: string; interviewId?: string; status?: string }): Promise<LiveInterviewSession[]> {
    let query = db.select().from(liveInterviewSessions).orderBy(desc(liveInterviewSessions.scheduledStartTime));
    if (filters?.caseId) {
      query = query.where(eq(liveInterviewSessions.caseId, filters.caseId)) as any;
    }
    if (filters?.interviewId) {
      query = query.where(eq(liveInterviewSessions.interviewId, filters.interviewId)) as any;
    }
    if (filters?.status) {
      query = query.where(eq(liveInterviewSessions.status, filters.status as any)) as any;
    }
    return await query;
  }

  async getLiveInterviewSession(id: string): Promise<LiveInterviewSession | undefined> {
    const [session] = await db.select().from(liveInterviewSessions).where(eq(liveInterviewSessions.id, id));
    return session;
  }

  async getLiveInterviewSessionByRoomId(roomId: string): Promise<LiveInterviewSession | undefined> {
    const [session] = await db.select().from(liveInterviewSessions).where(eq(liveInterviewSessions.roomId, roomId));
    return session;
  }

  async createLiveInterviewSession(session: InsertLiveInterviewSession): Promise<LiveInterviewSession> {
    const [newSession] = await db.insert(liveInterviewSessions).values(session).returning();
    return newSession;
  }

  async updateLiveInterviewSession(id: string, updates: UpdateLiveInterviewSession): Promise<LiveInterviewSession> {
    const [session] = await db
      .update(liveInterviewSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(liveInterviewSessions.id, id))
      .returning();
    if (!session) {
      throw new Error("Live interview session not found");
    }
    return session;
  }

  // Live Interview Participant operations
  async getLiveInterviewParticipants(sessionId: string): Promise<LiveInterviewParticipant[]> {
    return await db.select().from(liveInterviewParticipants)
      .where(eq(liveInterviewParticipants.sessionId, sessionId))
      .orderBy(liveInterviewParticipants.createdAt);
  }

  async getLiveInterviewParticipant(id: string): Promise<LiveInterviewParticipant | undefined> {
    const [participant] = await db.select().from(liveInterviewParticipants).where(eq(liveInterviewParticipants.id, id));
    return participant;
  }

  async createLiveInterviewParticipant(participant: InsertLiveInterviewParticipant): Promise<LiveInterviewParticipant> {
    const [newParticipant] = await db.insert(liveInterviewParticipants).values(participant).returning();
    return newParticipant;
  }

  async updateLiveInterviewParticipant(id: string, updates: Partial<LiveInterviewParticipant>): Promise<LiveInterviewParticipant> {
    const [participant] = await db
      .update(liveInterviewParticipants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(liveInterviewParticipants.id, id))
      .returning();
    if (!participant) {
      throw new Error("Live interview participant not found");
    }
    return participant;
  }

  // Interview Recording operations
  async getInterviewRecordings(sessionId: string): Promise<InterviewRecording[]> {
    return await db.select().from(interviewRecordings)
      .where(eq(interviewRecordings.sessionId, sessionId))
      .orderBy(interviewRecordings.createdAt);
  }

  async getInterviewRecording(id: string): Promise<InterviewRecording | undefined> {
    const [recording] = await db.select().from(interviewRecordings).where(eq(interviewRecordings.id, id));
    return recording;
  }

  async createInterviewRecording(recording: InsertInterviewRecording): Promise<InterviewRecording> {
    const [newRecording] = await db.insert(interviewRecordings).values(recording).returning();
    return newRecording;
  }

  async updateInterviewRecording(id: string, updates: UpdateInterviewRecording): Promise<InterviewRecording> {
    const [recording] = await db
      .update(interviewRecordings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(interviewRecordings.id, id))
      .returning();
    if (!recording) {
      throw new Error("Interview recording not found");
    }
    return recording;
  }

  // Interview Transcript Segment operations
  async getInterviewTranscriptSegments(sessionId: string): Promise<InterviewTranscriptSegment[]> {
    return await db.select().from(interviewTranscriptSegments)
      .where(eq(interviewTranscriptSegments.sessionId, sessionId))
      .orderBy(interviewTranscriptSegments.startTime);
  }

  async getInterviewTranscriptSegment(id: string): Promise<InterviewTranscriptSegment | undefined> {
    const [segment] = await db.select().from(interviewTranscriptSegments).where(eq(interviewTranscriptSegments.id, id));
    return segment;
  }

  async createInterviewTranscriptSegment(segment: InsertInterviewTranscriptSegment): Promise<InterviewTranscriptSegment> {
    const [newSegment] = await db.insert(interviewTranscriptSegments).values(segment).returning();
    return newSegment;
  }

  async createInterviewTranscriptSegmentsBulk(segments: InsertInterviewTranscriptSegment[]): Promise<InterviewTranscriptSegment[]> {
    if (segments.length === 0) return [];
    const newSegments = await db.insert(interviewTranscriptSegments).values(segments).returning();
    return newSegments;
  }

  async updateInterviewTranscriptSegment(id: string, updates: UpdateInterviewTranscriptSegment): Promise<InterviewTranscriptSegment> {
    const [segment] = await db
      .update(interviewTranscriptSegments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(interviewTranscriptSegments.id, id))
      .returning();
    if (!segment) {
      throw new Error("Interview transcript segment not found");
    }
    return segment;
  }

  // Interview Question operations
  async getInterviewQuestions(sessionId: string): Promise<InterviewQuestion[]> {
    return await db.select().from(interviewQuestions)
      .where(eq(interviewQuestions.sessionId, sessionId))
      .orderBy(interviewQuestions.orderIndex);
  }

  async getInterviewQuestion(id: string): Promise<InterviewQuestion | undefined> {
    const [question] = await db.select().from(interviewQuestions).where(eq(interviewQuestions.id, id));
    return question;
  }

  async createInterviewQuestion(question: InsertInterviewQuestion): Promise<InterviewQuestion> {
    const [newQuestion] = await db.insert(interviewQuestions).values(question).returning();
    return newQuestion;
  }

  async updateInterviewQuestion(id: string, updates: UpdateInterviewQuestion): Promise<InterviewQuestion> {
    const [question] = await db
      .update(interviewQuestions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(interviewQuestions.id, id))
      .returning();
    if (!question) {
      throw new Error("Interview question not found");
    }
    return question;
  }

  // Interview Analysis operations
  async getInterviewAnalyses(sessionId: string): Promise<InterviewAnalysis[]> {
    return await db.select().from(interviewAnalyses)
      .where(eq(interviewAnalyses.sessionId, sessionId))
      .orderBy(desc(interviewAnalyses.createdAt));
  }

  async getInterviewAnalysis(id: string): Promise<InterviewAnalysis | undefined> {
    const [analysis] = await db.select().from(interviewAnalyses).where(eq(interviewAnalyses.id, id));
    return analysis;
  }

  async createInterviewAnalysis(analysis: InsertInterviewAnalysis): Promise<InterviewAnalysis> {
    const [newAnalysis] = await db.insert(interviewAnalyses).values(analysis).returning();
    return newAnalysis;
  }

  async updateInterviewAnalysis(id: string, updates: UpdateInterviewAnalysis): Promise<InterviewAnalysis> {
    const [analysis] = await db
      .update(interviewAnalyses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(interviewAnalyses.id, id))
      .returning();
    if (!analysis) {
      throw new Error("Interview analysis not found");
    }
    return analysis;
  }

  // Interview Session Note operations
  async getInterviewSessionNotes(sessionId: string): Promise<InterviewSessionNote[]> {
    return await db.select().from(interviewSessionNotes)
      .where(eq(interviewSessionNotes.sessionId, sessionId))
      .orderBy(desc(interviewSessionNotes.createdAt));
  }

  async getInterviewSessionNote(id: string): Promise<InterviewSessionNote | undefined> {
    const [note] = await db.select().from(interviewSessionNotes).where(eq(interviewSessionNotes.id, id));
    return note;
  }

  async createInterviewSessionNote(note: InsertInterviewSessionNote): Promise<InterviewSessionNote> {
    const [newNote] = await db.insert(interviewSessionNotes).values(note).returning();
    return newNote;
  }

  async updateInterviewSessionNote(id: string, updates: UpdateInterviewSessionNote): Promise<InterviewSessionNote> {
    const [note] = await db
      .update(interviewSessionNotes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(interviewSessionNotes.id, id))
      .returning();
    if (!note) {
      throw new Error("Interview session note not found");
    }
    return note;
  }

  async deleteInterviewSessionNote(id: string): Promise<void> {
    const [result] = await db.delete(interviewSessionNotes)
      .where(eq(interviewSessionNotes.id, id))
      .returning();
    if (!result) {
      throw new Error("Interview session note not found");
    }
  }

  // Interview Evidence Link operations
  async getInterviewEvidenceLinks(sessionId: string): Promise<InterviewEvidenceLink[]> {
    return await db.select().from(interviewEvidenceLinks)
      .where(eq(interviewEvidenceLinks.sessionId, sessionId))
      .orderBy(desc(interviewEvidenceLinks.createdAt));
  }

  async getInterviewEvidenceLink(id: string): Promise<InterviewEvidenceLink | undefined> {
    const [link] = await db.select().from(interviewEvidenceLinks).where(eq(interviewEvidenceLinks.id, id));
    return link;
  }

  async createInterviewEvidenceLink(link: InsertInterviewEvidenceLink): Promise<InterviewEvidenceLink> {
    const [newLink] = await db.insert(interviewEvidenceLinks).values(link).returning();
    return newLink;
  }

  async deleteInterviewEvidenceLink(id: string): Promise<void> {
    const [result] = await db.delete(interviewEvidenceLinks)
      .where(eq(interviewEvidenceLinks.id, id))
      .returning();
    if (!result) {
      throw new Error("Interview evidence link not found");
    }
  }

  // Video Meeting operations
  async getVideoMeetings(filters?: { userId?: string; caseId?: string }): Promise<VideoMeeting[]> {
    const conditions = [];
    
    if (filters?.caseId) {
      conditions.push(eq(videoMeetings.caseId, filters.caseId));
    }
    
    if (filters?.userId) {
      conditions.push(eq(videoMeetings.hostId, filters.userId));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(videoMeetings)
        .where(and(...conditions))
        .orderBy(desc(videoMeetings.createdAt));
    }
    
    return await db.select().from(videoMeetings)
      .orderBy(desc(videoMeetings.createdAt));
  }

  async getVideoMeeting(id: string): Promise<VideoMeeting | undefined> {
    const [meeting] = await db.select().from(videoMeetings).where(eq(videoMeetings.id, id));
    return meeting;
  }

  async getVideoMeetingByRoomId(roomId: string): Promise<VideoMeeting | undefined> {
    const [meeting] = await db.select().from(videoMeetings).where(eq(videoMeetings.roomId, roomId));
    return meeting;
  }

  async createVideoMeeting(meeting: InsertVideoMeeting): Promise<VideoMeeting> {
    const [created] = await db.insert(videoMeetings).values(meeting).returning();
    return created;
  }

  async updateVideoMeeting(id: string, updates: UpdateVideoMeeting): Promise<VideoMeeting> {
    const [updated] = await db.update(videoMeetings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(videoMeetings.id, id))
      .returning();
    return updated;
  }

  // Video Meeting Participant operations
  async getVideoMeetingParticipants(meetingId: string): Promise<VideoMeetingParticipant[]> {
    return await db.select().from(videoMeetingParticipants)
      .where(eq(videoMeetingParticipants.meetingId, meetingId));
  }

  async createVideoMeetingParticipant(participant: InsertVideoMeetingParticipant): Promise<VideoMeetingParticipant> {
    const [created] = await db.insert(videoMeetingParticipants).values(participant).returning();
    return created;
  }

  async updateVideoMeetingParticipant(id: string, updates: Partial<VideoMeetingParticipant>): Promise<VideoMeetingParticipant> {
    const [updated] = await db.update(videoMeetingParticipants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(videoMeetingParticipants.id, id))
      .returning();
    return updated;
  }

  // Video Meeting Recording operations
  async getVideoMeetingRecordings(meetingId: string): Promise<VideoMeetingRecording[]> {
    return await db.select().from(videoMeetingRecordings)
      .where(eq(videoMeetingRecordings.meetingId, meetingId));
  }

  async createVideoMeetingRecording(recording: InsertVideoMeetingRecording): Promise<VideoMeetingRecording> {
    const [created] = await db.insert(videoMeetingRecordings).values(recording).returning();
    return created;
  }

  async updateVideoMeetingRecording(id: string, updates: UpdateVideoMeetingRecording): Promise<VideoMeetingRecording> {
    const [updated] = await db.update(videoMeetingRecordings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(videoMeetingRecordings.id, id))
      .returning();
    return updated;
  }

  // Video Meeting Chat Message operations
  async getVideoMeetingChatMessages(meetingId: string): Promise<VideoMeetingChatMessage[]> {
    return await db.select().from(videoMeetingChatMessages)
      .where(eq(videoMeetingChatMessages.meetingId, meetingId))
      .orderBy(videoMeetingChatMessages.createdAt);
  }

  async createVideoMeetingChatMessage(message: InsertVideoMeetingChatMessage): Promise<VideoMeetingChatMessage> {
    const [created] = await db.insert(videoMeetingChatMessages).values(message).returning();
    return created;
  }

  // Meeting Invitation operations
  async getMeetingInvitations(meetingId: string): Promise<MeetingInvitation[]> {
    return await db.select().from(meetingInvitations)
      .where(eq(meetingInvitations.meetingId, meetingId))
      .orderBy(desc(meetingInvitations.createdAt));
  }

  async getMeetingInvitation(id: string): Promise<MeetingInvitation | undefined> {
    const [invitation] = await db.select().from(meetingInvitations)
      .where(eq(meetingInvitations.id, id));
    return invitation;
  }

  async getMeetingInvitationByToken(token: string): Promise<MeetingInvitation | undefined> {
    const [invitation] = await db.select().from(meetingInvitations)
      .where(eq(meetingInvitations.accessToken, token));
    return invitation;
  }

  async createMeetingInvitation(invitation: InsertMeetingInvitation): Promise<MeetingInvitation> {
    const [created] = await db.insert(meetingInvitations).values(invitation).returning();
    return created;
  }

  async updateMeetingInvitation(id: string, updates: UpdateMeetingInvitation): Promise<MeetingInvitation> {
    const [updated] = await db.update(meetingInvitations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(meetingInvitations.id, id))
      .returning();
    return updated;
  }

  async deleteMeetingInvitation(id: string): Promise<void> {
    await db.delete(meetingInvitations).where(eq(meetingInvitations.id, id));
  }

  // Meeting Transcription operations
  async getMeetingTranscriptions(meetingId: string): Promise<MeetingTranscription[]> {
    return await db.select().from(meetingTranscriptions).where(eq(meetingTranscriptions.meetingId, meetingId)).orderBy(desc(meetingTranscriptions.createdAt));
  }

  async getMeetingTranscription(id: string): Promise<MeetingTranscription | undefined> {
    const [transcription] = await db.select().from(meetingTranscriptions).where(eq(meetingTranscriptions.id, id));
    return transcription;
  }

  async getMeetingTranscriptionByRecording(recordingId: string): Promise<MeetingTranscription | undefined> {
    const [transcription] = await db.select().from(meetingTranscriptions).where(eq(meetingTranscriptions.recordingId, recordingId));
    return transcription;
  }

  async createMeetingTranscription(transcription: InsertMeetingTranscription): Promise<MeetingTranscription> {
    const [created] = await db.insert(meetingTranscriptions).values(transcription).returning();
    return created;
  }

  async updateMeetingTranscription(id: string, updates: UpdateMeetingTranscription): Promise<MeetingTranscription> {
    const [updated] = await db.update(meetingTranscriptions).set(updates).where(eq(meetingTranscriptions.id, id)).returning();
    return updated;
  }

  async deleteMeetingTranscription(id: string): Promise<void> {
    await db.delete(meetingTranscriptions).where(eq(meetingTranscriptions.id, id));
  }

  async searchMeetingTranscriptions(query: string, meetingId?: string): Promise<MeetingTranscription[]> {
    const conditions = [ilike(meetingTranscriptions.transcriptionText, `%${query}%`)];
    if (meetingId) {
      conditions.push(eq(meetingTranscriptions.meetingId, meetingId));
    }
    return await db.select().from(meetingTranscriptions).where(and(...conditions)).orderBy(desc(meetingTranscriptions.createdAt));
  }

  // Meeting Summary operations
  async getMeetingSummaries(meetingId: string): Promise<MeetingSummary[]> {
    return await db.select().from(meetingSummaries).where(eq(meetingSummaries.meetingId, meetingId)).orderBy(desc(meetingSummaries.createdAt));
  }

  async getMeetingSummary(id: string): Promise<MeetingSummary | undefined> {
    const [summary] = await db.select().from(meetingSummaries).where(eq(meetingSummaries.id, id));
    return summary;
  }

  async getMeetingSummaryByTranscription(transcriptionId: string): Promise<MeetingSummary | undefined> {
    const [summary] = await db.select().from(meetingSummaries).where(eq(meetingSummaries.transcriptionId, transcriptionId));
    return summary;
  }

  async createMeetingSummary(summary: InsertMeetingSummary): Promise<MeetingSummary> {
    const [created] = await db.insert(meetingSummaries).values(summary).returning();
    return created;
  }

  async updateMeetingSummary(id: string, updates: UpdateMeetingSummary): Promise<MeetingSummary> {
    const [updated] = await db.update(meetingSummaries).set(updates).where(eq(meetingSummaries.id, id)).returning();
    return updated;
  }

  async deleteMeetingSummary(id: string): Promise<void> {
    await db.delete(meetingSummaries).where(eq(meetingSummaries.id, id));
  }

  // Audit log operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(log).returning();
    return auditLog;
  }

  // Connector operations
  async getConnectors(): Promise<ConnectorConfiguration[]> {
    return await db.select().from(connectorConfigurations).orderBy(desc(connectorConfigurations.createdAt));
  }

  async getConnector(id: string): Promise<ConnectorConfiguration | undefined> {
    const [connector] = await db
      .select()
      .from(connectorConfigurations)
      .where(eq(connectorConfigurations.id, id));
    return connector;
  }

  async createConnector(connectorData: InsertConnectorConfiguration): Promise<ConnectorConfiguration> {
    const [connector] = await db.insert(connectorConfigurations).values(connectorData).returning();
    return connector;
  }

  async updateConnector(id: string, updates: Partial<ConnectorConfiguration>): Promise<ConnectorConfiguration> {
    const [connector] = await db
      .update(connectorConfigurations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(connectorConfigurations.id, id))
      .returning();
    return connector;
  }

  async deleteConnector(id: string): Promise<void> {
    await db.delete(connectorConfigurations).where(eq(connectorConfigurations.id, id));
  }

  // Analytics
  async getDashboardMetrics(userId: string): Promise<any> {
    const totalAlerts = await db.select({ count: sql<number>`count(*)` }).from(alerts);
    const criticalAlerts = await db
      .select({ count: sql<number>`count(*)` })
      .from(alerts)
      .where(eq(alerts.severity, "critical"));
    const activeCases = await db
      .select({ count: sql<number>`count(*)` })
      .from(cases)
      .where(sql`${cases.status} != 'closed'`);
    const closedCases = await db
      .select({ count: sql<number>`count(*)` })
      .from(cases)
      .where(eq(cases.status, "closed"));
    const pendingReviews = await db
      .select({ count: sql<number>`count(*)` })
      .from(alerts)
      .where(eq(alerts.status, "pending"));

    const recentAlerts = await db
      .select({
        id: alerts.id,
        severity: alerts.severity,
        violationType: alerts.violationType,
        sender: communications.sender,
        createdAt: alerts.createdAt,
      })
      .from(alerts)
      .leftJoin(communications, eq(alerts.communicationId, communications.id))
      .orderBy(desc(alerts.createdAt))
      .limit(5);

    const violationByType = await db
      .select({
        type: alerts.violationType,
        count: sql<number>`count(*)::int`,
      })
      .from(alerts)
      .groupBy(alerts.violationType);

    return {
      totalAlerts: totalAlerts[0]?.count || 0,
      criticalAlerts: criticalAlerts[0]?.count || 0,
      activeCases: activeCases[0]?.count || 0,
      closedCases: closedCases[0]?.count || 0,
      pendingReviews: pendingReviews[0]?.count || 0,
      alertsTrend: 0,
      violationByType: violationByType.map((v) => ({ type: v.type.toUpperCase(), count: v.count })),
      recentAlerts,
    };
  }

  async getAnalytics(): Promise<any> {
    const casesByStatus = await db
      .select({
        status: cases.status,
        count: sql<number>`count(*)::int`,
      })
      .from(cases)
      .groupBy(cases.status);

    const violationByType = await db
      .select({
        type: alerts.violationType,
        count: sql<number>`count(*)::int`,
      })
      .from(alerts)
      .groupBy(alerts.violationType);

    return {
      violationTrends: [
        { month: "Jan", count: 12 },
        { month: "Feb", count: 19 },
        { month: "Mar", count: 15 },
        { month: "Apr", count: 22 },
        { month: "May", count: 18 },
        { month: "Jun", count: 25 },
      ],
      casesByStatus: casesByStatus.map((c) => ({ status: c.status, count: c.count })),
      violationByType: violationByType.map((v) => ({ type: v.type.replace(/_/g, " ").toUpperCase(), count: v.count })),
      averageResolutionTime: 7,
      complianceRate: 94,
    };
  }

  async getNetworkAnalysis(): Promise<any> {
    // Get all flagged communications (legal hold active)
    const flaggedComms = await db
      .select({
        id: communications.id,
        sender: communications.sender,
        recipients: communications.recipients,
        timestamp: communications.timestamp,
        legalHold: communications.legalHold,
        riskScore: sql<number>`COALESCE((
          SELECT risk_score FROM ${alerts} WHERE communication_id = ${communications.id} LIMIT 1
        ), 0)`,
      })
      .from(communications)
      .where(sql`${communications.legalHold} IN ('active', 'pending')`)
      .limit(200);

    // Build network nodes and edges
    const nodes = new Map<string, { id: string; label: string; riskScore: number; commCount: number }>();
    const edges: { source: string; target: string; weight: number }[] = [];

    flaggedComms.forEach((comm) => {
      const sender = comm.sender;
      const recipients = (comm.recipients as any) || [];
      const riskScore = comm.riskScore || 0;

      // Add sender node
      if (!nodes.has(sender)) {
        nodes.set(sender, { id: sender, label: sender, riskScore: 0, commCount: 0 });
      }
      const senderNode = nodes.get(sender)!;
      senderNode.riskScore = Math.max(senderNode.riskScore, riskScore);
      senderNode.commCount++;

      // Add recipient nodes and edges
      recipients.forEach((recipient: string) => {
        if (!nodes.has(recipient)) {
          nodes.set(recipient, { id: recipient, label: recipient, riskScore: 0, commCount: 0 });
        }
        const recipientNode = nodes.get(recipient)!;
        recipientNode.riskScore = Math.max(recipientNode.riskScore, riskScore);
        recipientNode.commCount++;

        // Find existing edge or create new
        const existingEdge = edges.find(
          (e) => (e.source === sender && e.target === recipient) || (e.source === recipient && e.target === sender)
        );
        if (existingEdge) {
          existingEdge.weight++;
        } else {
          edges.push({ source: sender, target: recipient, weight: 1 });
        }
      });
    });

    return {
      nodes: Array.from(nodes.values()),
      edges,
      totalFlaggedComms: flaggedComms.length,
      uniqueParticipants: nodes.size,
    };
  }

  async getTrendingRisks(): Promise<any> {
    // Get risk trends by time period (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const riskByDay = await db
      .select({
        date: sql<string>`DATE(${communications.timestamp})`,
        avgRisk: sql<number>`AVG(COALESCE((
          SELECT risk_score FROM ${alerts} WHERE communication_id = ${communications.id} LIMIT 1
        ), 0))::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(communications)
      .where(sql`${communications.timestamp} >= ${thirtyDaysAgo}`)
      .groupBy(sql`DATE(${communications.timestamp})`)
      .orderBy(sql`DATE(${communications.timestamp})`);

    // Risk by communication channel
    const riskByChannel = await db
      .select({
        channel: communications.communicationType,
        avgRisk: sql<number>`AVG(COALESCE((
          SELECT risk_score FROM ${alerts} WHERE communication_id = ${communications.id} LIMIT 1
        ), 0))::int`,
        count: sql<number>`count(*)::int`,
        flaggedCount: sql<number>`count(*) FILTER (WHERE ${communications.legalHold} = 'active')::int`,
      })
      .from(communications)
      .where(sql`${communications.timestamp} >= ${thirtyDaysAgo}`)
      .groupBy(communications.communicationType);

    // Risk hot spots by violation type
    const riskHotSpots = await db
      .select({
        violationType: alerts.violationType,
        avgRisk: sql<number>`AVG(${alerts.riskScore})::int`,
        count: sql<number>`count(*)::int`,
        criticalCount: sql<number>`count(*) FILTER (WHERE ${alerts.severity} = 'critical')::int`,
      })
      .from(alerts)
      .where(sql`${alerts.createdAt} >= ${thirtyDaysAgo}`)
      .groupBy(alerts.violationType)
      .orderBy(sql`AVG(${alerts.riskScore}) DESC`);

    return {
      timeSeriesData: riskByDay,
      channelBreakdown: riskByChannel.map((c) => ({
        channel: c.channel,
        avgRisk: c.avgRisk,
        total: c.count,
        flagged: c.flaggedCount,
        flaggedRate: c.count > 0 ? Math.round((c.flaggedCount / c.count) * 100) : 0,
      })),
      hotSpots: riskHotSpots.map((h) => ({
        type: h.violationType.replace(/_/g, " ").toUpperCase(),
        avgRisk: h.avgRisk,
        count: h.count,
        criticalCount: h.criticalCount,
      })),
    };
  }

  async getCostSavingsModel(): Promise<any> {
    // Calculate cost savings metrics
    const totalAlerts = await db.select({ count: sql<number>`count(*)::int` }).from(alerts);
    const criticalAlerts = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(alerts)
      .where(eq(alerts.severity, "critical"));
    
    const totalCases = await db.select({ count: sql<number>`count(*)::int` }).from(cases);
    const closedCases = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cases)
      .where(eq(cases.status, "closed"));

    // Cost savings calculations
    const avgManualReviewHours = 8; // Hours per alert without AI
    const avgAIReviewHours = 0.5; // Hours per alert with AI
    const attorneyHourlyRate = 350; // USD per hour
    const avgInvestigationCost = 50000; // USD per investigation
    const avgRegulatorFine = 2500000; // USD per violation

    const totalAlertsCount = totalAlerts[0]?.count || 0;
    const criticalAlertsCount = criticalAlerts[0]?.count || 0;
    const totalCasesCount = totalCases[0]?.count || 0;
    const closedCasesCount = closedCases[0]?.count || 0;

    // Time savings
    const hoursSavedPerAlert = avgManualReviewHours - avgAIReviewHours;
    const totalHoursSaved = totalAlertsCount * hoursSavedPerAlert;
    const costSavedOnReview = totalHoursSaved * attorneyHourlyRate;

    // Early detection savings (critical alerts caught early)
    const potentialFinesAvoided = criticalAlertsCount * avgRegulatorFine * 0.3; // 30% of potential fines

    // Investigation efficiency
    const investigationCostSavings = closedCasesCount * (avgInvestigationCost * 0.4); // 40% cost reduction

    const totalSavings = costSavedOnReview + potentialFinesAvoided + investigationCostSavings;

    // Platform cost estimate (annual)
    const platformCost = 250000; // Annual platform cost
    const roi = platformCost > 0 ? ((totalSavings - platformCost) / platformCost) * 100 : 0;

    return {
      summary: {
        totalSavings: Math.round(totalSavings),
        platformCost,
        netSavings: Math.round(totalSavings - platformCost),
        roi: Math.round(roi),
      },
      reviewEfficiency: {
        totalAlerts: totalAlertsCount,
        hoursSaved: Math.round(totalHoursSaved),
        costSaved: Math.round(costSavedOnReview),
        avgTimePerAlert: avgAIReviewHours,
        manualTimePerAlert: avgManualReviewHours,
      },
      riskMitigation: {
        criticalAlertsCaught: criticalAlertsCount,
        potentialFinesAvoided: Math.round(potentialFinesAvoided),
        avgFinePerViolation: avgRegulatorFine,
        preventionRate: 30, // 30% of violations prevented
      },
      investigationEfficiency: {
        totalInvestigations: totalCasesCount,
        closedInvestigations: closedCasesCount,
        costSavings: Math.round(investigationCostSavings),
        avgCostReduction: 40, // 40% cost reduction
      },
      projectedAnnual: {
        currentMonthSavings: Math.round(totalSavings / 12),
        projectedYearlySavings: Math.round(totalSavings),
        breakEvenMonth: platformCost > 0 ? Math.ceil(platformCost / (totalSavings / 12)) : 0,
      },
    };
  }

  // eDiscovery Production Set operations
  async getProductionSets(caseId?: string): Promise<ProductionSet[]> {
    if (caseId) {
      return await db
        .select()
        .from(productionSets)
        .where(eq(productionSets.caseId, caseId))
        .orderBy(desc(productionSets.createdAt));
    }
    return await db
      .select()
      .from(productionSets)
      .orderBy(desc(productionSets.createdAt));
  }

  async getProductionSet(id: string): Promise<ProductionSet | undefined> {
    const [productionSet] = await db
      .select()
      .from(productionSets)
      .where(eq(productionSets.id, id));
    return productionSet;
  }

  async createProductionSet(productionSetData: InsertProductionSet): Promise<ProductionSet> {
    const [productionSet] = await db
      .insert(productionSets)
      .values(productionSetData)
      .returning();
    return productionSet;
  }

  async updateProductionSet(id: string, updates: Partial<ProductionSet>): Promise<ProductionSet> {
    const [updatedSet] = await db
      .update(productionSets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(productionSets.id, id))
      .returning();
    return updatedSet;
  }

  async deleteProductionSet(id: string): Promise<void> {
    await db.delete(productionSets).where(eq(productionSets.id, id));
  }

  // Production Batch operations (tag-based production)
  async getProductionBatches(caseId: string): Promise<ProductionBatch[]> {
    return await db
      .select()
      .from(productionBatches)
      .where(eq(productionBatches.caseId, caseId))
      .orderBy(desc(productionBatches.createdAt));
  }

  async getProductionBatch(id: string): Promise<ProductionBatch | undefined> {
    const [batch] = await db
      .select()
      .from(productionBatches)
      .where(eq(productionBatches.id, id));
    return batch;
  }

  async createProductionBatch(batchData: InsertProductionBatch): Promise<ProductionBatch> {
    const [batch] = await db
      .insert(productionBatches)
      .values(batchData)
      .returning();
    return batch;
  }

  async updateProductionBatch(id: string, updates: Partial<ProductionBatch>): Promise<ProductionBatch> {
    const [updatedBatch] = await db
      .update(productionBatches)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(productionBatches.id, id))
      .returning();
    return updatedBatch;
  }

  async deleteProductionBatch(id: string): Promise<void> {
    await db.delete(productionBatches).where(eq(productionBatches.id, id));
  }

  // Production Batch Document operations
  async getProductionBatchDocuments(batchId: string): Promise<ProductionBatchDocument[]> {
    return await db
      .select()
      .from(productionBatchDocuments)
      .where(eq(productionBatchDocuments.batchId, batchId));
  }

  async createProductionBatchDocument(docData: InsertProductionBatchDocument): Promise<ProductionBatchDocument> {
    const [doc] = await db
      .insert(productionBatchDocuments)
      .values(docData)
      .returning();
    return doc;
  }

  async createProductionBatchDocuments(docs: InsertProductionBatchDocument[]): Promise<ProductionBatchDocument[]> {
    if (docs.length === 0) return [];
    return await db
      .insert(productionBatchDocuments)
      .values(docs)
      .returning();
  }

  async updateProductionBatchDocument(id: string, updates: Partial<ProductionBatchDocument>): Promise<ProductionBatchDocument> {
    const [updatedDoc] = await db
      .update(productionBatchDocuments)
      .set(updates)
      .where(eq(productionBatchDocuments.id, id))
      .returning();
    return updatedDoc;
  }

  // Production Batch Event operations
  async getProductionBatchEvents(batchId: string): Promise<ProductionBatchEvent[]> {
    return await db
      .select()
      .from(productionBatchEvents)
      .where(eq(productionBatchEvents.batchId, batchId))
      .orderBy(asc(productionBatchEvents.createdAt));
  }

  async createProductionBatchEvent(eventData: InsertProductionBatchEvent): Promise<ProductionBatchEvent> {
    const [event] = await db
      .insert(productionBatchEvents)
      .values(eventData)
      .returning();
    return event;
  }

  // Bates Sequence operations
  async getBatesSequence(caseId: string, prefix: string): Promise<BatesSequence | undefined> {
    const [sequence] = await db
      .select()
      .from(batesSequences)
      .where(and(
        eq(batesSequences.caseId, caseId),
        eq(batesSequences.prefix, prefix)
      ));
    return sequence;
  }

  async getOrCreateBatesSequence(caseId: string, prefix: string, padding: number = 6): Promise<BatesSequence> {
    const existing = await this.getBatesSequence(caseId, prefix);
    if (existing) return existing;
    
    const [sequence] = await db
      .insert(batesSequences)
      .values({ caseId, prefix, padding, nextNumber: 1 })
      .returning();
    return sequence;
  }

  async incrementBatesSequence(id: string, increment: number): Promise<BatesSequence> {
    const [sequence] = await db
      .update(batesSequences)
      .set({ 
        nextNumber: sql`${batesSequences.nextNumber} + ${increment}`,
        updatedAt: new Date()
      })
      .where(eq(batesSequences.id, id))
      .returning();
    return sequence;
  }

  // Report Template operations
  async getReportTemplates(filters?: { createdBy?: string; templateType?: string; isSystemTemplate?: boolean }): Promise<ReportTemplate[]> {
    let query = db.select().from(reportTemplates);
    
    if (filters) {
      const conditions = [];
      if (filters.createdBy) {
        conditions.push(eq(reportTemplates.createdBy, filters.createdBy));
      }
      if (filters.templateType) {
        conditions.push(eq(reportTemplates.templateType, filters.templateType));
      }
      if (filters.isSystemTemplate !== undefined) {
        conditions.push(eq(reportTemplates.isSystemTemplate, filters.isSystemTemplate ? "true" : "false"));
      }
      
      if (conditions.length > 0) {
        return await query.where(and(...conditions)).orderBy(desc(reportTemplates.createdAt));
      }
    }
    
    return await query.orderBy(desc(reportTemplates.createdAt));
  }

  async getReportTemplate(id: string): Promise<ReportTemplate | undefined> {
    const [template] = await db
      .select()
      .from(reportTemplates)
      .where(eq(reportTemplates.id, id));
    return template;
  }

  async createReportTemplate(templateData: InsertReportTemplate): Promise<ReportTemplate> {
    const [template] = await db
      .insert(reportTemplates)
      .values(templateData)
      .returning();
    return template;
  }

  async updateReportTemplate(id: string, updates: Partial<ReportTemplate>): Promise<ReportTemplate> {
    const [template] = await db
      .update(reportTemplates)
      .set(updates)
      .where(eq(reportTemplates.id, id))
      .returning();
    return template;
  }

  async deleteReportTemplate(id: string): Promise<void> {
    await db.delete(reportTemplates).where(eq(reportTemplates.id, id));
  }

  // Document coding operations
  async getDocumentCoding(documentId: string): Promise<DocumentCoding | undefined> {
    const [coding] = await db
      .select()
      .from(documentCodings)
      .where(eq(documentCodings.documentId, documentId));
    return coding;
  }

  async saveDocumentCoding(codingData: InsertDocumentCoding): Promise<DocumentCoding> {
    // Check if coding already exists for this document
    const existing = await this.getDocumentCoding(codingData.documentId);
    
    if (existing) {
      // Update existing coding
      const [updated] = await db
        .update(documentCodings)
        .set({ ...codingData, updatedAt: new Date() })
        .where(eq(documentCodings.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new coding
      const [coding] = await db
        .insert(documentCodings)
        .values(codingData)
        .returning();
      return coding;
    }
  }

  // Sector Rule Pack operations
  async getSectorRulePacks(): Promise<any[]> {
    return await db
      .select()
      .from(sectorRulePacks)
      .orderBy(desc(sectorRulePacks.createdAt));
  }

  async getSectorRulePack(id: string): Promise<any | undefined> {
    const [pack] = await db
      .select()
      .from(sectorRulePacks)
      .where(eq(sectorRulePacks.id, id));
    return pack;
  }

  async createSectorRulePack(packData: any): Promise<any> {
    const [pack] = await db
      .insert(sectorRulePacks)
      .values(packData)
      .returning();
    return pack;
  }

  async updateSectorRulePack(id: string, updates: any): Promise<any> {
    const [updated] = await db
      .update(sectorRulePacks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sectorRulePacks.id, id))
      .returning();
    return updated;
  }

  async getDetectionRulesByPack(packId: string): Promise<any[]> {
    return await db
      .select()
      .from(detectionRules)
      .where(eq(detectionRules.sectorRulePackId, packId));
  }

  async createDetectionRule(ruleData: any): Promise<any> {
    const [rule] = await db
      .insert(detectionRules)
      .values(ruleData)
      .returning();
    return rule;
  }

  // Training operations
  async getTrainingCourses(): Promise<any[]> {
    return await db
      .select()
      .from(trainingCourses)
      .orderBy(desc(trainingCourses.createdAt));
  }

  async getTrainingCourse(id: string): Promise<any | undefined> {
    const [course] = await db
      .select()
      .from(trainingCourses)
      .where(eq(trainingCourses.id, id));
    return course;
  }

  async createTrainingCourse(courseData: any): Promise<any> {
    const [course] = await db
      .insert(trainingCourses)
      .values(courseData)
      .returning();
    return course;
  }

  async getTrainingEnrollments(userId: string): Promise<any[]> {
    return await db
      .select()
      .from(trainingEnrollments)
      .where(eq(trainingEnrollments.userId, userId))
      .orderBy(desc(trainingEnrollments.enrolledAt));
  }

  async createTrainingEnrollment(enrollmentData: any): Promise<any> {
    const [enrollment] = await db
      .insert(trainingEnrollments)
      .values(enrollmentData)
      .returning();
    return enrollment;
  }

  async updateTrainingEnrollment(id: string, updates: any): Promise<any> {
    const [updated] = await db
      .update(trainingEnrollments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(trainingEnrollments.id, id))
      .returning();
    return updated;
  }

  async getTrainingAssignments(userId: string): Promise<any[]> {
    return await db
      .select()
      .from(trainingAssignments)
      .where(eq(trainingAssignments.userId, userId))
      .orderBy(desc(trainingAssignments.assignedAt));
  }

  async createTrainingAssignment(assignmentData: any): Promise<any> {
    const [assignment] = await db
      .insert(trainingAssignments)
      .values(assignmentData)
      .returning();
    return assignment;
  }

  // Policy operations
  async getPolicies(): Promise<Policy[]> {
    return await db
      .select()
      .from(policies)
      .orderBy(desc(policies.createdAt));
  }

  async getPolicy(id: string): Promise<Policy | undefined> {
    const [policy] = await db
      .select()
      .from(policies)
      .where(eq(policies.id, id));
    return policy;
  }

  async createPolicy(policyData: any): Promise<Policy> {
    const [policy] = await db
      .insert(policies)
      .values(policyData)
      .returning();
    return policy;
  }

  async getPolicyAttestations(userId?: string): Promise<PolicyAttestation[]> {
    if (userId) {
      return await db
        .select()
        .from(policyAttestations)
        .where(eq(policyAttestations.userId, userId))
        .orderBy(desc(policyAttestations.attestedAt));
    }
    return await db
      .select()
      .from(policyAttestations)
      .orderBy(desc(policyAttestations.attestedAt));
  }

  async createPolicyAttestation(attestationData: any): Promise<PolicyAttestation> {
    const [attestation] = await db
      .insert(policyAttestations)
      .values(attestationData)
      .returning();
    return attestation;
  }

  // HR compliance metrics
  async getTrainingCompletionMetrics(): Promise<any> {
    const allEnrollments = await db.select().from(trainingEnrollments);
    const completedEnrollments = allEnrollments.filter(e => e.passedStatus === 'passed');
    const inProgressEnrollments = allEnrollments.filter(e => e.passedStatus === 'in_progress');
    const overdueEnrollments = allEnrollments.filter(e => e.passedStatus === 'not_started');

    const allAssignments = await db.select().from(trainingAssignments);
    const completedAssignments = allAssignments.filter(a => a.status === 'completed');
    const overdueAssignments = allAssignments.filter(a => {
      return a.dueDate && new Date(a.dueDate) < new Date() && a.status !== 'completed';
    });

    return {
      totalEnrollments: allEnrollments.length,
      completedCount: completedEnrollments.length,
      inProgressCount: inProgressEnrollments.length,
      notStartedCount: overdueEnrollments.length,
      completionRate: allEnrollments.length > 0 
        ? Math.round((completedEnrollments.length / allEnrollments.length) * 100)
        : 0,
      totalAssignments: allAssignments.length,
      completedAssignments: completedAssignments.length,
      overdueAssignments: overdueAssignments.length,
    };
  }

  async getPolicyAttestationMetrics(): Promise<any> {
    const allPolicies = await db.select().from(policies);
    const allAttestations = await db.select().from(policyAttestations);
    
    const currentPolicies = allPolicies.filter(p => p.isCurrent === 'true');
    const validAttestations = allAttestations.filter(a => a.isValid === 'true');

    return {
      totalPolicies: currentPolicies.length,
      totalAttestations: validAttestations.length,
      pendingAttestations: currentPolicies.reduce((sum, p) => sum + (p.pendingAttestations || 0), 0),
      attestationRate: currentPolicies.length > 0
        ? Math.round((validAttestations.length / (currentPolicies.length * 100)) * 100) // Rough estimate
        : 0,
    };
  }

  // Privilege workflows
  async getPrivilegeReviewQueue(): Promise<any[]> {
    // Get communications pending privilege review
    const pendingCommunications = await db
      .select()
      .from(communications)
      .where(eq(communications.privilegeReviewStatus, "pending"))
      .orderBy(desc(communications.privilegeAssertedAt));

    // Get interviews pending privilege review
    const pendingInterviews = await db
      .select()
      .from(interviews)
      .where(eq(interviews.privilegeReviewStatus, "pending"))
      .orderBy(desc(interviews.privilegeAssertedAt));

    // Get cases pending privilege review
    const pendingCases = await db
      .select()
      .from(cases)
      .where(eq(cases.privilegeReviewStatus, "pending"))
      .orderBy(desc(cases.privilegeAssertedAt));

    // Combine and format the results
    const items = [
      ...pendingCommunications.map(c => ({
        ...c,
        itemType: 'communication',
        itemId: c.id,
      })),
      ...pendingInterviews.map(i => ({
        ...i,
        itemType: 'interview',
        itemId: i.id,
      })),
      ...pendingCases.map(c => ({
        ...c,
        itemType: 'case',
        itemId: c.id,
      })),
    ];

    return items.sort((a, b) => {
      const aDate = a.privilegeAssertedAt ? new Date(a.privilegeAssertedAt).getTime() : 0;
      const bDate = b.privilegeAssertedAt ? new Date(b.privilegeAssertedAt).getTime() : 0;
      return bDate - aDate;
    });
  }

  async updateCommunicationPrivilege(id: string, updates: Partial<Communication>): Promise<Communication> {
    const [communication] = await db
      .update(communications)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(communications.id, id))
      .returning();
    return communication;
  }

  async updateInterviewPrivilege(id: string, updates: Partial<Interview>): Promise<Interview> {
    const [interview] = await db
      .update(interviews)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(interviews.id, id))
      .returning();
    return interview;
  }

  async updateCasePrivilege(id: string, updates: Partial<Case>): Promise<Case> {
    const [caseRecord] = await db
      .update(cases)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cases.id, id))
      .returning();
    return caseRecord;
  }

  async getPrivilegeLogs(caseId?: string): Promise<any[]> {
    if (caseId) {
      return await db
        .select()
        .from(privilegeLogs)
        .where(eq(privilegeLogs.caseId, caseId))
        .orderBy(desc(privilegeLogs.documentDate));
    }
    return await db
      .select()
      .from(privilegeLogs)
      .orderBy(desc(privilegeLogs.createdAt));
  }

  async createPrivilegeLog(logData: any): Promise<any> {
    const [log] = await db
      .insert(privilegeLogs)
      .values(logData)
      .returning();
    return log;
  }

  async updatePrivilegeLog(id: string, updates: any): Promise<any> {
    const [log] = await db
      .update(privilegeLogs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(privilegeLogs.id, id))
      .returning();
    return log;
  }

  async deletePrivilegeLog(id: string): Promise<void> {
    await db.delete(privilegeLogs).where(eq(privilegeLogs.id, id));
  }

  // Attorney Review Queue
  async getAttorneyReviewQueue(): Promise<any> {
    // Get cases pending review
    const pendingCases = await db
      .select()
      .from(cases)
      .where(or(
        eq(cases.status, "under_investigation"),
        eq(cases.status, "under_review")
      ))
      .orderBy(desc(cases.createdAt));

    // Get alerts pending review
    const pendingAlerts = await db
      .select()
      .from(alerts)
      .where(or(
        eq(alerts.status, "new"),
        eq(alerts.status, "under_investigation")
      ))
      .orderBy(desc(alerts.detectedAt));

    // Get communications flagged for review
    const flaggedComms = await db
      .select()
      .from(communications)
      .where(eq(communications.reviewStatus, "flagged"))
      .orderBy(desc(communications.timestamp));

    return {
      cases: pendingCases,
      alerts: pendingAlerts,
      communications: flaggedComms,
      totalItems: pendingCases.length + pendingAlerts.length + flaggedComms.length,
    };
  }

  // Remediation Plans
  async getRemediationPlans(caseId?: string): Promise<RemediationPlan[]> {
    if (caseId) {
      return db
        .select()
        .from(remediationPlans)
        .where(eq(remediationPlans.caseId, caseId))
        .orderBy(desc(remediationPlans.createdAt));
    }
    return db.select().from(remediationPlans).orderBy(desc(remediationPlans.createdAt));
  }

  async getRemediationPlan(id: string): Promise<RemediationPlan | undefined> {
    const [plan] = await db
      .select()
      .from(remediationPlans)
      .where(eq(remediationPlans.id, id));
    return plan;
  }

  async createRemediationPlan(planData: InsertRemediationPlan): Promise<RemediationPlan> {
    const [plan] = await db
      .insert(remediationPlans)
      .values(planData)
      .returning();
    return plan;
  }

  async updateRemediationPlan(id: string, updates: Partial<RemediationPlan>): Promise<RemediationPlan> {
    const [plan] = await db
      .update(remediationPlans)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(remediationPlans.id, id))
      .returning();
    return plan;
  }

  async deleteRemediationPlan(id: string): Promise<void> {
    await db.delete(remediationPlans).where(eq(remediationPlans.id, id));
  }

  // Regulatory Strategies
  async getRegulatoryStrategies(caseId?: string): Promise<RegulatoryStrategy[]> {
    if (caseId) {
      return db
        .select()
        .from(regulatoryStrategies)
        .where(eq(regulatoryStrategies.caseId, caseId))
        .orderBy(desc(regulatoryStrategies.createdAt));
    }
    return db.select().from(regulatoryStrategies).orderBy(desc(regulatoryStrategies.createdAt));
  }

  async getRegulatoryStrategy(id: string): Promise<RegulatoryStrategy | undefined> {
    const [strategy] = await db
      .select()
      .from(regulatoryStrategies)
      .where(eq(regulatoryStrategies.id, id));
    return strategy;
  }

  async createRegulatoryStrategy(strategyData: InsertRegulatoryStrategy): Promise<RegulatoryStrategy> {
    const [strategy] = await db
      .insert(regulatoryStrategies)
      .values(strategyData)
      .returning();
    return strategy;
  }

  async updateRegulatoryStrategy(id: string, updates: Partial<RegulatoryStrategy>): Promise<RegulatoryStrategy> {
    const [strategy] = await db
      .update(regulatoryStrategies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(regulatoryStrategies.id, id))
      .returning();
    return strategy;
  }

  async deleteRegulatoryStrategy(id: string): Promise<void> {
    await db.delete(regulatoryStrategies).where(eq(regulatoryStrategies.id, id));
  }

  // Disclosure Playbooks
  async getDisclosurePlaybooks(caseId?: string): Promise<DisclosurePlaybook[]> {
    if (caseId) {
      return db
        .select()
        .from(disclosurePlaybooks)
        .where(eq(disclosurePlaybooks.caseId, caseId))
        .orderBy(desc(disclosurePlaybooks.createdAt));
    }
    return db.select().from(disclosurePlaybooks).orderBy(desc(disclosurePlaybooks.createdAt));
  }

  async getDisclosurePlaybook(id: string): Promise<DisclosurePlaybook | undefined> {
    const [playbook] = await db
      .select()
      .from(disclosurePlaybooks)
      .where(eq(disclosurePlaybooks.id, id));
    return playbook;
  }

  async createDisclosurePlaybook(playbookData: InsertDisclosurePlaybook): Promise<DisclosurePlaybook> {
    const [playbook] = await db
      .insert(disclosurePlaybooks)
      .values(playbookData)
      .returning();
    return playbook;
  }

  async updateDisclosurePlaybook(id: string, updates: Partial<DisclosurePlaybook>): Promise<DisclosurePlaybook> {
    const [playbook] = await db
      .update(disclosurePlaybooks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(disclosurePlaybooks.id, id))
      .returning();
    return playbook;
  }

  async deleteDisclosurePlaybook(id: string): Promise<void> {
    await db.delete(disclosurePlaybooks).where(eq(disclosurePlaybooks.id, id));
  }

  // Board Reports
  async getBoardReports(): Promise<BoardReport[]> {
    return db.select().from(boardReports).orderBy(desc(boardReports.reportPeriodEnd));
  }

  async getBoardReport(id: string): Promise<BoardReport | undefined> {
    const [report] = await db
      .select()
      .from(boardReports)
      .where(eq(boardReports.id, id));
    return report;
  }

  async createBoardReport(reportData: InsertBoardReport): Promise<BoardReport> {
    const [report] = await db
      .insert(boardReports)
      .values(reportData)
      .returning();
    return report;
  }

  async updateBoardReport(id: string, updates: Partial<BoardReport>): Promise<BoardReport> {
    const [report] = await db
      .update(boardReports)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(boardReports.id, id))
      .returning();
    return report;
  }

  async deleteBoardReport(id: string): Promise<void> {
    await db.delete(boardReports).where(eq(boardReports.id, id));
  }

  // Document Sets
  async getDocumentSets(caseId?: string): Promise<DocumentSet[]> {
    if (caseId) {
      return db.select().from(documentSets).where(eq(documentSets.caseId, caseId)).orderBy(desc(documentSets.createdAt));
    }
    return db.select().from(documentSets).orderBy(desc(documentSets.createdAt));
  }

  async getDocumentSet(id: string): Promise<DocumentSet | undefined> {
    const [set] = await db.select().from(documentSets).where(eq(documentSets.id, id));
    return set;
  }

  async createDocumentSet(documentSet: InsertDocumentSet): Promise<DocumentSet> {
    const [set] = await db.insert(documentSets).values(documentSet).returning();
    return set;
  }

  async updateDocumentSet(id: string, updates: Partial<DocumentSet>): Promise<DocumentSet> {
    const [set] = await db.update(documentSets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(documentSets.id, id))
      .returning();
    return set;
  }

  async deleteDocumentSet(id: string): Promise<void> {
    await db.delete(documentSets).where(eq(documentSets.id, id));
  }

  async addDocumentToSet(documentSetId: string, communicationId: string, addedBy: string, notes?: string): Promise<DocumentSetMember> {
    const [member] = await db.insert(documentSetMembers).values({
      documentSetId,
      communicationId,
      addedBy,
      notes,
    }).returning();
    
    // Update document count
    await db.update(documentSets)
      .set({ documentCount: sql`${documentSets.documentCount} + 1` })
      .where(eq(documentSets.id, documentSetId));
    
    return member;
  }

  async removeDocumentFromSet(documentSetId: string, communicationId: string): Promise<void> {
    await db.delete(documentSetMembers)
      .where(
        and(
          eq(documentSetMembers.documentSetId, documentSetId),
          eq(documentSetMembers.communicationId, communicationId)
        )
      );
    
    // Update document count
    await db.update(documentSets)
      .set({ documentCount: sql`${documentSets.documentCount} - 1` })
      .where(eq(documentSets.id, documentSetId));
  }

  async getDocumentsInSet(documentSetId: string): Promise<Communication[]> {
    const members = await db.select()
      .from(documentSetMembers)
      .where(eq(documentSetMembers.documentSetId, documentSetId));
    
    if (members.length === 0) {
      return [];
    }
    
    const communicationIds = members.map(m => m.communicationId);
    return db.select()
      .from(communications)
      .where(inArray(communications.id, communicationIds))
      .orderBy(desc(communications.timestamp));
  }

  // Document Forwards
  async getDocumentForwards(communicationId?: string): Promise<DocumentForward[]> {
    if (communicationId) {
      return db.select()
        .from(documentForwards)
        .where(eq(documentForwards.communicationId, communicationId))
        .orderBy(desc(documentForwards.forwardedAt));
    }
    return db.select().from(documentForwards).orderBy(desc(documentForwards.forwardedAt));
  }

  async createDocumentForward(forward: InsertDocumentForward): Promise<DocumentForward> {
    const [created] = await db.insert(documentForwards).values(forward).returning();
    return created;
  }

  async revokeDocumentForward(id: string, revokedBy: string): Promise<DocumentForward> {
    const [forward] = await db.update(documentForwards)
      .set({
        accessGranted: "false",
        accessRevokedBy: revokedBy,
        accessRevokedAt: new Date(),
      })
      .where(eq(documentForwards.id, id))
      .returning();
    return forward;
  }

  async markForwardViewed(id: string): Promise<void> {
    await db.update(documentForwards)
      .set({ viewedAt: new Date() })
      .where(eq(documentForwards.id, id));
  }

  // Case Message operations (internal investigator communications)
  async getCaseMessages(filters?: { caseId?: string; userId?: string }): Promise<CaseMessage[]> {
    let query = db.select().from(caseMessages);
    
    if (filters?.caseId) {
      query = query.where(eq(caseMessages.caseId, filters.caseId)) as any;
    }
    
    if (filters?.userId) {
      query = query.where(
        or(
          eq(caseMessages.senderId, filters.userId),
          sql`${filters.userId} = ANY(${caseMessages.recipientIds})`
        )
      ) as any;
    }
    
    return query.orderBy(desc(caseMessages.createdAt)) as any;
  }

  async getCaseMessage(id: string): Promise<CaseMessage | undefined> {
    const [message] = await db.select().from(caseMessages).where(eq(caseMessages.id, id));
    return message;
  }

  async createCaseMessage(message: InsertCaseMessage): Promise<CaseMessage> {
    const [newMessage] = await db.insert(caseMessages).values(message).returning();
    return newMessage;
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<CaseMessage> {
    const [message] = await db.select().from(caseMessages).where(eq(caseMessages.id, messageId));
    
    if (!message) {
      throw new Error("Message not found");
    }
    
    const readByArray = message.readBy || [];
    if (!readByArray.includes(userId)) {
      readByArray.push(userId);
    }
    
    const [updatedMessage] = await db
      .update(caseMessages)
      .set({ 
        readBy: readByArray,
        updatedAt: new Date()
      })
      .where(eq(caseMessages.id, messageId))
      .returning();
    
    return updatedMessage;
  }

  async getUserInbox(userId: string): Promise<Array<CaseMessage & { sender: User; case: Case }>> {
    const messages = await db
      .select({
        message: caseMessages,
        sender: users,
        case: cases,
      })
      .from(caseMessages)
      .leftJoin(users, eq(caseMessages.senderId, users.id))
      .leftJoin(cases, eq(caseMessages.caseId, cases.id))
      .where(sql`${userId} = ANY(COALESCE(${caseMessages.recipientIds}, ARRAY[]::text[]))`)
      .orderBy(desc(caseMessages.createdAt));
    
    return messages.map((row) => ({
      ...row.message,
      sender: row.sender!,
      case: row.case!,
    }));
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(caseMessages)
      .where(
        and(
          sql`${userId} = ANY(COALESCE(${caseMessages.recipientIds}, ARRAY[]::text[]))`,
          sql`NOT (${userId} = ANY(COALESCE(${caseMessages.readBy}, ARRAY[]::text[])))`
        )
      );
    
    return Number(result[0]?.count || 0);
  }

  // Crisis Response operations (government investigations)
  async createCustodian(custodianData: InsertCustodian): Promise<Custodian> {
    const [custodian] = await db.insert(custodians).values(custodianData).returning();
    return custodian;
  }

  async getCustodians(caseId: string): Promise<Custodian[]> {
    return await db.select().from(custodians).where(eq(custodians.caseId, caseId));
  }

  async createExpert(expertData: InsertExpert): Promise<Expert> {
    const [expert] = await db.insert(experts).values(expertData).returning();
    return expert;
  }

  async getExperts(caseId?: string): Promise<Expert[]> {
    if (caseId) {
      return await db.select().from(experts).where(eq(experts.caseId, caseId));
    }
    return await db.select().from(experts);
  }

  async createRegulatorCommunication(commData: InsertRegulatorCommunication): Promise<RegulatorCommunication> {
    const [comm] = await db.insert(regulatorCommunications).values(commData).returning();
    return comm;
  }

  async getRegulatorCommunications(caseId: string): Promise<RegulatorCommunication[]> {
    return await db.select().from(regulatorCommunications).where(eq(regulatorCommunications.caseId, caseId));
  }

  async createInvestigationDeadline(deadlineData: InsertInvestigationDeadline): Promise<InvestigationDeadline> {
    const [deadline] = await db.insert(investigationDeadlines).values(deadlineData).returning();
    return deadline;
  }

  async getInvestigationDeadlines(caseId: string): Promise<InvestigationDeadline[]> {
    return await db.select().from(investigationDeadlines).where(eq(investigationDeadlines.caseId, caseId));
  }

  async createPreservationChecklist(checklistData: InsertPreservationChecklist): Promise<PreservationChecklist> {
    const [checklist] = await db.insert(preservationChecklists).values(checklistData).returning();
    return checklist;
  }

  async getPreservationChecklists(caseId: string): Promise<PreservationChecklist[]> {
    return await db.select().from(preservationChecklists).where(eq(preservationChecklists.caseId, caseId));
  }

  async createConflictCheck(checkData: InsertConflictCheck): Promise<ConflictCheck> {
    const [check] = await db.insert(conflictChecks).values(checkData).returning();
    return check;
  }

  async getConflictChecks(caseId?: string): Promise<ConflictCheck[]> {
    if (caseId) {
      return await db.select().from(conflictChecks).where(eq(conflictChecks.caseId, caseId));
    }
    return await db.select().from(conflictChecks);
  }

  async createLegalHoldNotification(notificationData: InsertLegalHoldNotification): Promise<LegalHoldNotification> {
    const [notification] = await db.insert(legalHoldNotifications).values(notificationData).returning();
    return notification;
  }

  async getLegalHoldNotifications(caseId: string): Promise<LegalHoldNotification[]> {
    return await db.select().from(legalHoldNotifications).where(eq(legalHoldNotifications.caseId, caseId));
  }

  // Case Detail Page operations
  async getCaseStats(caseId: string): Promise<{
    documentSetsCount: number;
    documentsCount: number;
    custodians: number;
    interviewsCompleted: number;
    interviewsScheduled: number;
    alertsCount: number;
  }> {
    const [docSets] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(documentSets)
      .where(eq(documentSets.caseId, caseId));

    const [docs] = await db
      .select({ count: sql<number>`count(distinct ${documentSetMembers.communicationId})::int` })
      .from(documentSetMembers)
      .innerJoin(documentSets, eq(documentSetMembers.documentSetId, documentSets.id))
      .where(eq(documentSets.caseId, caseId));

    const [partiesCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(caseParties)
      .where(eq(caseParties.caseId, caseId));

    const [completedInterviews] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(interviews)
      .where(and(eq(interviews.caseId, caseId), eq(interviews.status, 'completed')));

    const [scheduledInterviews] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(interviews)
      .where(and(eq(interviews.caseId, caseId), eq(interviews.status, 'scheduled')));

    const [alertCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(alerts)
      .innerJoin(communications, eq(alerts.communicationId, communications.id))
      .where(eq(communications.caseId, caseId));

    return {
      documentSetsCount: docSets?.count || 0,
      documentsCount: docs?.count || 0,
      custodians: partiesCount?.count || 0,
      interviewsCompleted: completedInterviews?.count || 0,
      interviewsScheduled: scheduledInterviews?.count || 0,
      alertsCount: alertCount?.count || 0,
    };
  }

  async getCaseParties(caseId: string): Promise<CaseParty[]> {
    return await db
      .select()
      .from(caseParties)
      .where(eq(caseParties.caseId, caseId))
      .orderBy(desc(caseParties.createdAt));
  }

  async getDiscoveredEntities(caseId: string): Promise<{
    entities: {
      email: string;
      name: string | null;
      domain: string;
      sentCount: number;
      receivedCount: number;
      totalCount: number;
      firstSeen: Date | null;
      lastSeen: Date | null;
    }[];
    organizations: {
      domain: string;
      personCount: number;
      messageCount: number;
    }[];
    totalUniqueEntities: number;
    totalOrganizations: number;
  }> {
    // Get all senders with their statistics
    const senderStats = await db.execute(sql`
      SELECT 
        sender as email,
        SPLIT_PART(sender, '@', 2) as domain,
        COUNT(*) as sent_count,
        0 as received_count,
        MIN(timestamp) as first_seen,
        MAX(timestamp) as last_seen
      FROM communications
      WHERE case_id = ${caseId} AND sender IS NOT NULL AND sender != ''
      GROUP BY sender
    `);

    // Get all recipients with their statistics
    const recipientStats = await db.execute(sql`
      SELECT 
        r.recipient as email,
        SPLIT_PART(r.recipient, '@', 2) as domain,
        0 as sent_count,
        COUNT(*) as received_count,
        MIN(c.timestamp) as first_seen,
        MAX(c.timestamp) as last_seen
      FROM communications c,
      LATERAL jsonb_array_elements_text(c.recipients::jsonb) AS r(recipient)
      WHERE c.case_id = ${caseId} AND r.recipient IS NOT NULL AND r.recipient != ''
      GROUP BY r.recipient
    `);

    // Merge sender and recipient stats
    const entityMap = new Map<string, {
      email: string;
      name: string | null;
      domain: string;
      sentCount: number;
      receivedCount: number;
      firstSeen: Date | null;
      lastSeen: Date | null;
    }>();

    // Process senders
    for (const row of senderStats.rows as any[]) {
      const email = row.email?.toLowerCase() || '';
      if (!email || !email.includes('@')) continue;
      
      entityMap.set(email, {
        email,
        name: this.extractNameFromEmail(email),
        domain: row.domain || '',
        sentCount: parseInt(row.sent_count) || 0,
        receivedCount: 0,
        firstSeen: row.first_seen ? new Date(row.first_seen) : null,
        lastSeen: row.last_seen ? new Date(row.last_seen) : null,
      });
    }

    // Process recipients and merge with senders
    for (const row of recipientStats.rows as any[]) {
      const email = row.email?.toLowerCase() || '';
      if (!email || !email.includes('@')) continue;
      
      const existing = entityMap.get(email);
      if (existing) {
        existing.receivedCount = parseInt(row.received_count) || 0;
        // Update first/last seen if needed
        const rowFirstSeen = row.first_seen ? new Date(row.first_seen) : null;
        const rowLastSeen = row.last_seen ? new Date(row.last_seen) : null;
        if (rowFirstSeen && (!existing.firstSeen || rowFirstSeen < existing.firstSeen)) {
          existing.firstSeen = rowFirstSeen;
        }
        if (rowLastSeen && (!existing.lastSeen || rowLastSeen > existing.lastSeen)) {
          existing.lastSeen = rowLastSeen;
        }
      } else {
        entityMap.set(email, {
          email,
          name: this.extractNameFromEmail(email),
          domain: row.domain || '',
          sentCount: 0,
          receivedCount: parseInt(row.received_count) || 0,
          firstSeen: row.first_seen ? new Date(row.first_seen) : null,
          lastSeen: row.last_seen ? new Date(row.last_seen) : null,
        });
      }
    }

    // Convert to array and sort by total count
    const entities = Array.from(entityMap.values())
      .map(e => ({
        ...e,
        totalCount: e.sentCount + e.receivedCount,
      }))
      .sort((a, b) => b.totalCount - a.totalCount);

    // Aggregate by organization/domain
    const orgMap = new Map<string, { personCount: number; messageCount: number }>();
    for (const entity of entities) {
      if (!entity.domain) continue;
      const existing = orgMap.get(entity.domain);
      if (existing) {
        existing.personCount++;
        existing.messageCount += entity.totalCount;
      } else {
        orgMap.set(entity.domain, {
          personCount: 1,
          messageCount: entity.totalCount,
        });
      }
    }

    const organizations = Array.from(orgMap.entries())
      .map(([domain, stats]) => ({
        domain,
        personCount: stats.personCount,
        messageCount: stats.messageCount,
      }))
      .sort((a, b) => b.messageCount - a.messageCount);

    return {
      entities,
      organizations,
      totalUniqueEntities: entities.length,
      totalOrganizations: organizations.length,
    };
  }

  // Helper to extract name from email address
  private extractNameFromEmail(email: string): string | null {
    if (!email || !email.includes('@')) return null;
    const localPart = email.split('@')[0];
    // Try to parse common email formats like "firstname.lastname" or "firstname_lastname"
    const parts = localPart.split(/[._-]/);
    if (parts.length >= 2) {
      return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    }
    return localPart.charAt(0).toUpperCase() + localPart.slice(1).toLowerCase();
  }

  async getCaseParty(id: string): Promise<CaseParty | undefined> {
    const [party] = await db.select().from(caseParties).where(eq(caseParties.id, id));
    return party;
  }

  async createCaseParty(partyData: InsertCaseParty): Promise<CaseParty> {
    const [party] = await db.insert(caseParties).values(partyData).returning();
    return party;
  }

  async updateCaseParty(id: string, updates: Partial<CaseParty>): Promise<CaseParty> {
    const [party] = await db
      .update(caseParties)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(caseParties.id, id))
      .returning();
    return party;
  }

  async getCaseTimelineEvents(caseId: string, filters?: {
    showHidden?: boolean;
    eventTypes?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    minImportance?: number;
  }): Promise<CaseTimelineEvent[]> {
    const conditions: any[] = [eq(caseTimelineEvents.caseId, caseId)];
    
    // Default: hide hidden events unless showHidden is true
    if (!filters?.showHidden) {
      conditions.push(eq(caseTimelineEvents.isHidden, false));
    }
    
    // Filter by event types - use inArray for proper type handling
    if (filters?.eventTypes && filters.eventTypes.length > 0) {
      conditions.push(inArray(caseTimelineEvents.eventType, filters.eventTypes));
    }
    
    // Filter by date range - use sql for date comparisons
    if (filters?.dateFrom) {
      conditions.push(sql<boolean>`${caseTimelineEvents.eventDate} >= ${filters.dateFrom.toISOString()}`);
    }
    if (filters?.dateTo) {
      conditions.push(sql<boolean>`${caseTimelineEvents.eventDate} <= ${filters.dateTo.toISOString()}`);
    }
    
    // Filter by minimum importance score
    if (filters?.minImportance !== undefined) {
      conditions.push(sql<boolean>`${caseTimelineEvents.importanceScore} >= ${filters.minImportance}`);
    }
    
    // TODO: Tag and participant filtering deferred due to Drizzle JSONB limitations
    // Need to implement safe parameter binding for JSONB array operators
    // Tracking issue: https://github.com/drizzle-team/drizzle-orm/issues/jsonb-operators
    
    return await db
      .select()
      .from(caseTimelineEvents)
      .where(and(...conditions))
      .orderBy(caseTimelineEvents.eventDate);
  }

  async createCaseTimelineEvent(eventData: InsertCaseTimelineEvent): Promise<CaseTimelineEvent> {
    const [event] = await db.insert(caseTimelineEvents).values(eventData).returning();
    return event;
  }

  async updateCaseTimelineEvent(id: string, updates: Partial<InsertCaseTimelineEvent>): Promise<CaseTimelineEvent> {
    const [event] = await db
      .update(caseTimelineEvents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(caseTimelineEvents.id, id))
      .returning();
    return event;
  }

  async deleteCaseTimelineEvent(id: string): Promise<void> {
    await db.delete(caseTimelineEvents).where(eq(caseTimelineEvents.id, id));
  }

  async getCustomTimelineColumns(caseId: string, userId: string): Promise<CustomTimelineColumn[]> {
    // Check if default columns exist for this case
    const existing = await db
      .select()
      .from(customTimelineColumns)
      .where(eq(customTimelineColumns.caseId, caseId));
    
    // If no columns exist, seed default columns using the authenticated user
    // Use onConflictDoNothing() to handle concurrent requests gracefully
    if (existing.length === 0) {
      const defaultColumns = [
        { columnKey: "date", columnLabel: "Date", displayOrder: 0, isVisible: true },
        { columnKey: "type", columnLabel: "Type", displayOrder: 1, isVisible: true },
        { columnKey: "title", columnLabel: "Title", displayOrder: 2, isVisible: true },
        { columnKey: "participants", columnLabel: "Participants", displayOrder: 3, isVisible: true },
        { columnKey: "tags", columnLabel: "Tags", displayOrder: 4, isVisible: true },
        { columnKey: "risk", columnLabel: "Risk", displayOrder: 5, isVisible: true },
        { columnKey: "importance", columnLabel: "Importance", displayOrder: 6, isVisible: true },
        { columnKey: "notes", columnLabel: "User Notes", displayOrder: 7, isVisible: true },
      ];
      
      // Use onConflictDoNothing() to handle concurrent requests gracefully
      // With the unique constraint on (caseId, columnKey), duplicate inserts are silently skipped
      // Real errors (FK violations, etc.) will still surface properly
      await Promise.all(
        defaultColumns.map(col =>
          db.insert(customTimelineColumns)
            .values({
              caseId,
              columnKey: col.columnKey,
              columnLabel: col.columnLabel,
              columnType: "default",
              displayOrder: col.displayOrder,
              isVisible: col.isVisible,
              createdBy: userId,
              selectOptions: null,
            })
            .onConflictDoNothing()
        )
      );
    }
    
    // Return all columns ordered by displayOrder
    return await db
      .select()
      .from(customTimelineColumns)
      .where(eq(customTimelineColumns.caseId, caseId))
      .orderBy(customTimelineColumns.displayOrder);
  }

  async createCustomTimelineColumn(columnData: InsertCustomTimelineColumn): Promise<CustomTimelineColumn> {
    const [column] = await db.insert(customTimelineColumns).values(columnData).returning();
    return column;
  }

  async updateCustomTimelineColumn(id: string, updates: Partial<InsertCustomTimelineColumn>): Promise<CustomTimelineColumn> {
    const [column] = await db
      .update(customTimelineColumns)
      .set(updates)
      .where(eq(customTimelineColumns.id, id))
      .returning();
    return column;
  }

  async deleteCustomTimelineColumn(id: string): Promise<void> {
    // Prevent deletion of default columns - only allow deleting custom columns
    const [column] = await db
      .select()
      .from(customTimelineColumns)
      .where(eq(customTimelineColumns.id, id));
    
    if (column && column.columnType === "default") {
      throw new Error("Cannot delete default columns");
    }
    
    await db.delete(customTimelineColumns).where(eq(customTimelineColumns.id, id));
  }

  async getCustomTimelineColumnValues(eventId: string): Promise<CustomTimelineColumnValue[]> {
    return await db
      .select()
      .from(customTimelineColumnValues)
      .where(eq(customTimelineColumnValues.eventId, eventId));
  }

  async upsertCustomTimelineColumnValue(valueData: InsertCustomTimelineColumnValue): Promise<CustomTimelineColumnValue> {
    const [value] = await db
      .insert(customTimelineColumnValues)
      .values(valueData)
      .onConflictDoUpdate({
        target: [customTimelineColumnValues.eventId, customTimelineColumnValues.columnId],
        set: {
          value: valueData.value,
          updatedBy: valueData.updatedBy,
          updatedAt: new Date(),
        },
      })
      .returning();
    return value;
  }

  async getCaseAIAnalysis(caseId: string): Promise<CaseAIAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(caseAIAnalysis)
      .where(eq(caseAIAnalysis.caseId, caseId));
    return analysis;
  }

  async createCaseAIAnalysis(analysisData: InsertCaseAIAnalysis): Promise<CaseAIAnalysis> {
    const [analysis] = await db.insert(caseAIAnalysis).values(analysisData).returning();
    return analysis;
  }

  async updateCaseAIAnalysis(caseId: string, updates: Partial<CaseAIAnalysis>): Promise<CaseAIAnalysis> {
    const [analysis] = await db
      .update(caseAIAnalysis)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(caseAIAnalysis.caseId, caseId))
      .returning();
    return analysis;
  }

  async searchCaseContent(caseId: string, query: string): Promise<{
    communications: Communication[];
    interviews: Interview[];
    alerts: Alert[];
    timelineEvents: CaseTimelineEvent[];
  }> {
    const searchPattern = `%${query}%`;

    const comms = await db
      .select()
      .from(communications)
      .where(
        and(
          eq(communications.caseId, caseId),
          or(
            ilike(communications.subject, searchPattern),
            ilike(communications.body, searchPattern),
            ilike(communications.sender, searchPattern)
          )
        )
      )
      .limit(50);

    const interviewList = await db
      .select()
      .from(interviews)
      .where(
        and(
          eq(interviews.caseId, caseId),
          or(
            ilike(interviews.employeeName, searchPattern),
            ilike(interviews.notes, searchPattern),
            ilike(interviews.summary, searchPattern)
          )
        )
      )
      .limit(50);

    const alertList = await db
      .select()
      .from(alerts)
      .innerJoin(communications, eq(alerts.communicationId, communications.id))
      .where(
        and(
          eq(communications.caseId, caseId),
          ilike(alerts.aiAnalysis, searchPattern)
        )
      )
      .limit(50);

    const timelineList = await db
      .select()
      .from(caseTimelineEvents)
      .where(
        and(
          eq(caseTimelineEvents.caseId, caseId),
          or(
            ilike(caseTimelineEvents.title, searchPattern),
            ilike(caseTimelineEvents.description, searchPattern)
          )
        )
      )
      .limit(50);

    return {
      communications: comms,
      interviews: interviewList,
      alerts: alertList.map((a) => a.alerts),
      timelineEvents: timelineList,
    };
  }

  // Document Highlight operations
  async getHighlights(communicationId: string): Promise<DocumentHighlight[]> {
    return await db
      .select()
      .from(documentHighlights)
      .where(eq(documentHighlights.communicationId, communicationId))
      .orderBy(documentHighlights.startOffset);
  }

  async getHighlight(id: string): Promise<DocumentHighlight | undefined> {
    const [highlight] = await db
      .select()
      .from(documentHighlights)
      .where(eq(documentHighlights.id, id));
    return highlight;
  }

  async createHighlight(highlight: InsertDocumentHighlight): Promise<DocumentHighlight> {
    const [newHighlight] = await db
      .insert(documentHighlights)
      .values(highlight)
      .returning();
    return newHighlight;
  }

  async updateHighlight(id: string, updates: Partial<DocumentHighlight>): Promise<DocumentHighlight> {
    const [updated] = await db
      .update(documentHighlights)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(documentHighlights.id, id))
      .returning();
    return updated;
  }

  async deleteHighlight(id: string): Promise<void> {
    await db.delete(documentHighlights).where(eq(documentHighlights.id, id));
  }

  // Highlight Comment operations
  async getHighlightComments(highlightId: string): Promise<HighlightComment[]> {
    return await db
      .select()
      .from(highlightComments)
      .where(eq(highlightComments.highlightId, highlightId))
      .orderBy(highlightComments.createdAt);
  }

  async createHighlightComment(comment: InsertHighlightComment): Promise<HighlightComment> {
    const [newComment] = await db
      .insert(highlightComments)
      .values(comment)
      .returning();
    return newComment;
  }

  async deleteHighlightComment(id: string): Promise<void> {
    await db.delete(highlightComments).where(eq(highlightComments.id, id));
  }

  async getTextSelectionTags(communicationId: string): Promise<Array<TextSelectionTag & { tag: Tag }>> {
    const results = await db
      .select({
        id: textSelectionTags.id,
        communicationId: textSelectionTags.communicationId,
        tagId: textSelectionTags.tagId,
        selectedText: textSelectionTags.selectedText,
        startOffset: textSelectionTags.startOffset,
        endOffset: textSelectionTags.endOffset,
        taggedBy: textSelectionTags.taggedBy,
        createdAt: textSelectionTags.createdAt,
        tag: tags,
      })
      .from(textSelectionTags)
      .leftJoin(tags, eq(textSelectionTags.tagId, tags.id))
      .where(eq(textSelectionTags.communicationId, communicationId))
      .orderBy(textSelectionTags.startOffset);
    
    return results.filter(r => r.tag !== null) as Array<TextSelectionTag & { tag: Tag }>;
  }

  async createTextSelectionTag(textSelectionTag: InsertTextSelectionTag): Promise<TextSelectionTag> {
    const [newTag] = await db
      .insert(textSelectionTags)
      .values(textSelectionTag)
      .returning();
    return newTag;
  }

  async deleteTextSelectionTag(id: string): Promise<void> {
    await db.delete(textSelectionTags).where(eq(textSelectionTags.id, id));
  }

  async getTagsWithDocumentCounts(caseId?: string): Promise<Array<Tag & { 
    documentCount: number; 
    textSelectionCount: number;
    custodianCount?: number;
    earliestDate?: string;
    latestDate?: string; 
    totalCount: number 
  }>> {
    // Get all tags first
    const allTags = await db.select().from(tags);
    
    // Get document tag counts (entityType = 'communication')
    // Filter by caseId if provided by joining with communications table
    let documentTagCounts;
    if (caseId) {
      documentTagCounts = await db
        .select({
          tagId: documentTags.tagId,
          count: sql<number>`count(distinct ${documentTags.entityId})`.as('count'),
        })
        .from(documentTags)
        .innerJoin(communications, eq(documentTags.entityId, communications.id))
        .where(and(
          eq(documentTags.entityType, 'communication'),
          eq(communications.caseId, caseId)
        ))
        .groupBy(documentTags.tagId);
    } else {
      documentTagCounts = await db
        .select({
          tagId: documentTags.tagId,
          count: sql<number>`count(distinct ${documentTags.entityId})`.as('count'),
        })
        .from(documentTags)
        .where(eq(documentTags.entityType, 'communication'))
        .groupBy(documentTags.tagId);
    }
    
    // Get text selection tag counts (unique documents)
    // Filter by caseId if provided
    let textSelectionCounts;
    if (caseId) {
      textSelectionCounts = await db
        .select({
          tagId: textSelectionTags.tagId,
          count: sql<number>`count(distinct ${textSelectionTags.communicationId})`.as('count'),
        })
        .from(textSelectionTags)
        .innerJoin(communications, eq(textSelectionTags.communicationId, communications.id))
        .where(eq(communications.caseId, caseId))
        .groupBy(textSelectionTags.tagId);
    } else {
      textSelectionCounts = await db
        .select({
          tagId: textSelectionTags.tagId,
          count: sql<number>`count(distinct ${textSelectionTags.communicationId})`.as('count'),
        })
        .from(textSelectionTags)
        .groupBy(textSelectionTags.tagId);
    }
    
    // Create lookup maps
    const docCountMap = new Map(documentTagCounts.map(d => [d.tagId, Number(d.count)]));
    const textCountMap = new Map(textSelectionCounts.map(t => [t.tagId, Number(t.count)]));
    
    
    // For each tag with documents, get enhanced stats (custodian count, date range)
    const enhancedResults = await Promise.all(
      allTags.map(async tag => {
        const documentCount = docCountMap.get(tag.id) || 0;
        const textSelectionCount = textCountMap.get(tag.id) || 0;
        const totalCount = documentCount + textSelectionCount;
        
        if (totalCount === 0) {
          return {
            ...tag,
            documentCount,
            textSelectionCount,
            totalCount,
            custodianCount: 0,
            earliestDate: undefined,
            latestDate: undefined,
          };
        }
        
        // Get documents for this tag to compute enhanced stats
        let statsQuery;
        if (caseId) {
          statsQuery = await db
            .select({
              sender: communications.sender,
              timestamp: communications.timestamp,
            })
            .from(documentTags)
            .innerJoin(communications, eq(documentTags.entityId, communications.id))
            .where(and(
              eq(documentTags.tagId, tag.id),
              eq(documentTags.entityType, 'communication'),
              eq(communications.caseId, caseId)
            ));
        } else {
          statsQuery = await db
            .select({
              sender: communications.sender,
              timestamp: communications.timestamp,
            })
            .from(documentTags)
            .innerJoin(communications, eq(documentTags.entityId, communications.id))
            .where(and(
              eq(documentTags.tagId, tag.id),
              eq(documentTags.entityType, 'communication')
            ));
        }
        
        // Calculate unique custodians and date range
        const uniqueSenders = new Set(statsQuery.map(d => d.sender?.toLowerCase()).filter(Boolean));
        const dates = statsQuery.map(d => d.timestamp).filter((d): d is Date => d !== null);
        
        return {
          ...tag,
          documentCount,
          textSelectionCount,
          totalCount,
          custodianCount: uniqueSenders.size,
          earliestDate: dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))).toISOString() : undefined,
          latestDate: dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))).toISOString() : undefined,
        };
      })
    );
    
    return enhancedResults
      .filter(tag => tag.totalCount > 0) // Only return tags with at least one tagged document
      .sort((a, b) => b.totalCount - a.totalCount); // Sort by most used first
  }

  async getDocumentsForTag(tagId: string, caseId?: string): Promise<Array<Communication & { 
    tagType: 'document' | 'textSelection';
    textSelectionCount?: number;
  }>> {
    // Get documents tagged with document tags
    let docTagQuery = db
      .select({
        communication: communications,
      })
      .from(documentTags)
      .innerJoin(communications, eq(documentTags.entityId, communications.id))
      .where(and(
        eq(documentTags.tagId, tagId),
        eq(documentTags.entityType, 'communication')
      ));
    
    if (caseId) {
      docTagQuery = docTagQuery.where(and(
        eq(documentTags.tagId, tagId),
        eq(documentTags.entityType, 'communication'),
        eq(communications.caseId, caseId)
      ));
    }
    
    const docTaggedDocs = await docTagQuery;
    
    // Get documents with text selection tags
    let textTagQuery = db
      .select({
        communication: communications,
        textSelectionCount: sql<number>`count(*)`.as('text_selection_count'),
      })
      .from(textSelectionTags)
      .innerJoin(communications, eq(textSelectionTags.communicationId, communications.id))
      .where(eq(textSelectionTags.tagId, tagId))
      .groupBy(communications.id);
    
    if (caseId) {
      textTagQuery = db
        .select({
          communication: communications,
          textSelectionCount: sql<number>`count(*)`.as('text_selection_count'),
        })
        .from(textSelectionTags)
        .innerJoin(communications, eq(textSelectionTags.communicationId, communications.id))
        .where(and(
          eq(textSelectionTags.tagId, tagId),
          eq(communications.caseId, caseId)
        ))
        .groupBy(communications.id);
    }
    
    const textTaggedDocs = await textTagQuery;
    
    // Merge results, avoiding duplicates
    const docMap = new Map<string, Communication & { 
      tagType: 'document' | 'textSelection';
      textSelectionCount?: number;
    }>();
    
    // Add document-tagged docs
    for (const { communication } of docTaggedDocs) {
      docMap.set(communication.id, {
        ...communication,
        tagType: 'document',
      });
    }
    
    // Add or update with text-selection-tagged docs
    for (const { communication, textSelectionCount } of textTaggedDocs) {
      const existing = docMap.get(communication.id);
      if (existing) {
        // Document has both types of tags
        existing.textSelectionCount = Number(textSelectionCount);
      } else {
        docMap.set(communication.id, {
          ...communication,
          tagType: 'textSelection',
          textSelectionCount: Number(textSelectionCount),
        });
      }
    }
    
    return Array.from(docMap.values());
  }

  // ===== BOOKMARK OPERATIONS =====
  
  async getBookmarks(filters: { userId: string; caseId?: string; bookmarkType?: string }): Promise<Bookmark[]> {
    let query = db.select().from(bookmarks).where(eq(bookmarks.userId, filters.userId));
    
    const conditions = [eq(bookmarks.userId, filters.userId)];
    if (filters.caseId) {
      conditions.push(eq(bookmarks.caseId, filters.caseId));
    }
    
    return db.select()
      .from(bookmarks)
      .where(and(...conditions))
      .orderBy(desc(bookmarks.isPinned), desc(bookmarks.createdAt));
  }

  async getBookmark(id: string): Promise<Bookmark | undefined> {
    const result = await db.select().from(bookmarks).where(eq(bookmarks.id, id));
    return result[0];
  }

  async createBookmark(bookmark: InsertBookmark): Promise<Bookmark> {
    const result = await db.insert(bookmarks).values(bookmark).returning();
    return result[0];
  }

  async updateBookmark(id: string, updates: Partial<Bookmark>): Promise<Bookmark> {
    const result = await db.update(bookmarks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bookmarks.id, id))
      .returning();
    return result[0];
  }

  async deleteBookmark(id: string): Promise<void> {
    await db.delete(bookmarks).where(eq(bookmarks.id, id));
  }

  // ===== USER ACTIVITY OPERATIONS =====

  async getUserActivity(userId: string, limit: number = 10): Promise<UserActivity[]> {
    return db.select()
      .from(userActivity)
      .where(eq(userActivity.userId, userId))
      .orderBy(desc(userActivity.accessedAt))
      .limit(limit);
  }

  async createUserActivity(activity: InsertUserActivity): Promise<UserActivity> {
    // First, check if there's a recent activity for the same URL (within last 5 minutes)
    // If so, just update the accessedAt timestamp instead of creating a new record
    const recentActivity = await db.select()
      .from(userActivity)
      .where(and(
        eq(userActivity.userId, activity.userId),
        eq(userActivity.url, activity.url)
      ))
      .orderBy(desc(userActivity.accessedAt))
      .limit(1);
    
    if (recentActivity.length > 0) {
      const recent = recentActivity[0];
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (new Date(recent.accessedAt) > fiveMinutesAgo) {
        // Update existing record instead of creating new one
        const result = await db.update(userActivity)
          .set({ accessedAt: new Date() })
          .where(eq(userActivity.id, recent.id))
          .returning();
        return result[0];
      }
    }
    
    // Create new activity record
    const result = await db.insert(userActivity).values(activity).returning();
    return result[0];
  }

  async clearUserActivity(userId: string): Promise<void> {
    await db.delete(userActivity).where(eq(userActivity.userId, userId));
  }

  // ===== FINDINGS OPERATIONS =====

  async getFindings(caseId: string, filters?: { 
    category?: string; 
    isPinned?: boolean;
    authorId?: string;
    search?: string;
    entryType?: string;
  }): Promise<(Finding & { tags: FindingTag[]; evidenceLinkCount: number })[]> {
    const conditions = [eq(findings.caseId, caseId)];
    
    if (filters?.isPinned !== undefined) {
      conditions.push(eq(findings.isPinned, filters.isPinned));
    }
    if (filters?.authorId) {
      conditions.push(eq(findings.authorId, filters.authorId));
    }
    if (filters?.entryType) {
      conditions.push(eq(findings.entryType, filters.entryType as any));
    }
    if (filters?.search) {
      conditions.push(or(
        ilike(findings.title, `%${filters.search}%`),
        ilike(findings.content, `%${filters.search}%`)
      )!);
    }

    const findingsResult = await db.select()
      .from(findings)
      .where(and(...conditions))
      .orderBy(desc(findings.isPinned), desc(findings.updatedAt));

    // Get tags and evidence link counts for each finding
    const enrichedFindings = await Promise.all(findingsResult.map(async (finding) => {
      const [tagResults, evidenceLinkResults] = await Promise.all([
        db.select().from(findingTags).where(eq(findingTags.findingId, finding.id)),
        db.select({ count: sql<number>`count(*)`.as('count') })
          .from(findingEvidenceLinks)
          .where(eq(findingEvidenceLinks.findingId, finding.id)),
      ]);
      
      // Filter by category if specified
      let filteredTags = tagResults;
      if (filters?.category) {
        filteredTags = tagResults.filter(t => t.category === filters.category);
        // If category filter is specified and this finding doesn't have that tag, skip it
        if (filteredTags.length === 0) {
          return null;
        }
      }
      
      return {
        ...finding,
        tags: tagResults,
        evidenceLinkCount: Number(evidenceLinkResults[0]?.count || 0),
      };
    }));

    // Filter out nulls (findings that don't match category filter)
    return enrichedFindings.filter(f => f !== null) as (Finding & { tags: FindingTag[]; evidenceLinkCount: number })[];
  }

  async getFindingsCountsByType(caseId: string): Promise<{ entryType: string; count: number }[]> {
    const result = await db.select({
      entryType: findings.entryType,
      count: sql<number>`count(*)`.as('count'),
    })
    .from(findings)
    .where(eq(findings.caseId, caseId))
    .groupBy(findings.entryType);
    
    return result.map(r => ({
      entryType: r.entryType,
      count: Number(r.count),
    }));
  }

  async getFinding(id: string): Promise<(Finding & { tags: FindingTag[]; evidenceLinks: FindingEvidenceLink[] }) | undefined> {
    const result = await db.select().from(findings).where(eq(findings.id, id));
    if (result.length === 0) return undefined;

    const [tagResults, evidenceLinkResults] = await Promise.all([
      db.select().from(findingTags).where(eq(findingTags.findingId, id)),
      db.select().from(findingEvidenceLinks).where(eq(findingEvidenceLinks.findingId, id)),
    ]);

    return {
      ...result[0],
      tags: tagResults,
      evidenceLinks: evidenceLinkResults,
    };
  }

  async createFinding(finding: InsertFinding): Promise<Finding> {
    const result = await db.insert(findings).values(finding).returning();
    const newFinding = result[0];
    
    // Create initial version
    await db.insert(findingVersions).values({
      findingId: newFinding.id,
      versionNumber: 1,
      versionType: 'original',
      title: newFinding.title,
      content: newFinding.content,
      summary: newFinding.summary,
      createdBy: newFinding.authorId,
    });

    return newFinding;
  }

  async updateFinding(id: string, updates: Partial<Finding>, createVersion: boolean = true, versionType: 'autosave' | 'manual' = 'autosave'): Promise<Finding> {
    const existing = await db.select().from(findings).where(eq(findings.id, id));
    if (existing.length === 0) throw new Error('Finding not found');
    
    // Only create version if content actually changed
    const contentChanged = (updates.title && updates.title !== existing[0].title) ||
                          (updates.content && updates.content !== existing[0].content) ||
                          (updates.summary && updates.summary !== existing[0].summary);
    
    const shouldCreateVersion = createVersion && contentChanged;
    const newVersionCount = existing[0].versionCount + (shouldCreateVersion ? 1 : 0);
    
    const result = await db.update(findings)
      .set({ 
        ...updates, 
        updatedAt: new Date(),
        versionCount: newVersionCount,
      })
      .where(eq(findings.id, id))
      .returning();
    
    // Create version only if content changed and version creation is requested
    if (shouldCreateVersion) {
      await db.insert(findingVersions).values({
        findingId: id,
        versionNumber: newVersionCount,
        versionType,
        title: updates.title || existing[0].title,
        content: updates.content || existing[0].content,
        summary: updates.summary || existing[0].summary,
        createdBy: existing[0].authorId,
      });
    }

    return result[0];
  }

  async deleteFinding(id: string, caseId?: string): Promise<void> {
    const conditions = [eq(findings.id, id)];
    if (caseId) {
      conditions.push(eq(findings.caseId, caseId));
    }
    await db.delete(findings).where(and(...conditions));
  }

  // ===== FINDING TAGS OPERATIONS =====

  async addFindingTag(tag: InsertFindingTag): Promise<FindingTag> {
    const result = await db.insert(findingTags).values(tag).returning();
    return result[0];
  }

  async removeFindingTag(findingId: string, category: string): Promise<void> {
    await db.delete(findingTags).where(
      and(
        eq(findingTags.findingId, findingId),
        eq(findingTags.category, category as any)
      )
    );
  }

  async getFindingTags(findingId: string): Promise<FindingTag[]> {
    return db.select().from(findingTags).where(eq(findingTags.findingId, findingId));
  }

  // ===== FINDING EVIDENCE LINKS OPERATIONS =====

  async getFindingEvidenceLinks(findingId: string): Promise<FindingEvidenceLink[]> {
    return db.select()
      .from(findingEvidenceLinks)
      .where(eq(findingEvidenceLinks.findingId, findingId))
      .orderBy(desc(findingEvidenceLinks.createdAt));
  }

  async createFindingEvidenceLink(link: InsertFindingEvidenceLink): Promise<FindingEvidenceLink> {
    const result = await db.insert(findingEvidenceLinks).values(link).returning();
    return result[0];
  }

  async deleteFindingEvidenceLink(id: string): Promise<void> {
    await db.delete(findingEvidenceLinks).where(eq(findingEvidenceLinks.id, id));
  }

  // ===== FINDING VERSIONS OPERATIONS =====

  async getFindingVersions(findingId: string): Promise<FindingVersion[]> {
    return db.select()
      .from(findingVersions)
      .where(eq(findingVersions.findingId, findingId))
      .orderBy(desc(findingVersions.versionNumber));
  }

  async getFindingVersion(id: string): Promise<FindingVersion | undefined> {
    const result = await db.select().from(findingVersions).where(eq(findingVersions.id, id));
    return result[0];
  }

  async createFindingVersion(version: InsertFindingVersion): Promise<FindingVersion> {
    const result = await db.insert(findingVersions).values(version).returning();
    return result[0];
  }

  async acceptAiSuggestedVersion(findingId: string, versionId: string, userId: string): Promise<Finding> {
    // Get the AI-suggested version
    const version = await this.getFindingVersion(versionId);
    if (!version) throw new Error('Version not found');
    if (version.findingId !== findingId) throw new Error('Version does not belong to this finding');
    
    // Create a user_accepted version
    const finding = await db.select().from(findings).where(eq(findings.id, findingId));
    if (finding.length === 0) throw new Error('Finding not found');
    
    const newVersionNumber = finding[0].versionCount + 1;
    
    await db.insert(findingVersions).values({
      findingId,
      versionNumber: newVersionNumber,
      versionType: 'user_accepted',
      title: version.title,
      content: version.content,
      summary: version.summary,
      aiTaskId: version.aiTaskId,
      createdBy: userId,
    });
    
    // Update the finding with the accepted content
    const result = await db.update(findings)
      .set({
        title: version.title,
        content: version.content,
        summary: version.summary,
        versionCount: newVersionNumber,
        updatedAt: new Date(),
      })
      .where(eq(findings.id, findingId))
      .returning();
    
    return result[0];
  }

  async restoreFindingVersion(findingId: string, versionId: string, userId: string): Promise<Finding> {
    const version = await this.getFindingVersion(versionId);
    if (!version) throw new Error('Version not found');
    if (version.findingId !== findingId) throw new Error('Version does not belong to this finding');
    
    // Update the finding with the restored content and create a new manual version
    return this.updateFinding(findingId, {
      title: version.title,
      content: version.content,
      summary: version.summary,
    }, true, 'manual');
  }

  // ===== FINDING AI TASKS OPERATIONS =====

  async getFindingAiTasks(filters: { findingId?: string; caseId?: string; status?: string }): Promise<FindingAiTask[]> {
    const conditions: any[] = [];
    
    if (filters.findingId) {
      conditions.push(eq(findingAiTasks.findingId, filters.findingId));
    }
    if (filters.caseId) {
      conditions.push(eq(findingAiTasks.caseId, filters.caseId));
    }
    if (filters.status) {
      conditions.push(eq(findingAiTasks.status, filters.status as any));
    }

    return db.select()
      .from(findingAiTasks)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(findingAiTasks.createdAt));
  }

  async getFindingAiTask(id: string): Promise<FindingAiTask | undefined> {
    const result = await db.select().from(findingAiTasks).where(eq(findingAiTasks.id, id));
    return result[0];
  }

  async createFindingAiTask(task: InsertFindingAiTask): Promise<FindingAiTask> {
    const result = await db.insert(findingAiTasks).values(task).returning();
    return result[0];
  }

  async updateFindingAiTask(id: string, updates: Partial<FindingAiTask>): Promise<FindingAiTask> {
    const result = await db.update(findingAiTasks)
      .set(updates)
      .where(eq(findingAiTasks.id, id))
      .returning();
    return result[0];
  }

  // ===== DEAL TEMPLATE OPERATIONS =====

  async getDealTemplates(filters?: { transactionType?: string; isActive?: boolean; isSystemTemplate?: boolean }): Promise<DealTemplate[]> {
    const conditions: any[] = [];
    
    if (filters?.transactionType) {
      conditions.push(eq(dealTemplates.transactionType, filters.transactionType));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(dealTemplates.isActive, filters.isActive));
    }
    if (filters?.isSystemTemplate !== undefined) {
      conditions.push(eq(dealTemplates.isSystemTemplate, filters.isSystemTemplate));
    }

    return db.select()
      .from(dealTemplates)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(dealTemplates.name);
  }

  async getDealTemplate(id: string): Promise<DealTemplate | undefined> {
    const result = await db.select().from(dealTemplates).where(eq(dealTemplates.id, id));
    return result[0];
  }

  async getDealTemplateBySlug(slug: string): Promise<DealTemplate | undefined> {
    const result = await db.select().from(dealTemplates).where(eq(dealTemplates.slug, slug));
    return result[0];
  }

  async getDealTemplateWithDetails(id: string): Promise<{ template: DealTemplate; categories: TemplateCategory[]; items: TemplateItem[] } | undefined> {
    const template = await this.getDealTemplate(id);
    if (!template) return undefined;

    const categories = await db.select()
      .from(templateCategories)
      .where(eq(templateCategories.templateId, id))
      .orderBy(templateCategories.sortOrder);

    const items = await db.select()
      .from(templateItems)
      .where(eq(templateItems.templateId, id))
      .orderBy(templateItems.sortOrder);

    return { template, categories, items };
  }

  async createDealTemplate(template: InsertDealTemplate): Promise<DealTemplate> {
    const result = await db.insert(dealTemplates).values(template).returning();
    return result[0];
  }

  async updateDealTemplate(id: string, updates: Partial<DealTemplate>): Promise<DealTemplate> {
    const result = await db.update(dealTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dealTemplates.id, id))
      .returning();
    return result[0];
  }

  async deleteDealTemplate(id: string): Promise<void> {
    await db.delete(dealTemplates).where(eq(dealTemplates.id, id));
  }

  // ===== TEMPLATE CATEGORY OPERATIONS =====

  async getTemplateCategories(templateId: string): Promise<TemplateCategory[]> {
    return db.select()
      .from(templateCategories)
      .where(eq(templateCategories.templateId, templateId))
      .orderBy(templateCategories.sortOrder);
  }

  async createTemplateCategory(category: InsertTemplateCategory): Promise<TemplateCategory> {
    const result = await db.insert(templateCategories).values(category).returning();
    return result[0];
  }

  async updateTemplateCategory(id: string, updates: Partial<TemplateCategory>): Promise<TemplateCategory> {
    const result = await db.update(templateCategories)
      .set(updates)
      .where(eq(templateCategories.id, id))
      .returning();
    return result[0];
  }

  async deleteTemplateCategory(id: string): Promise<void> {
    await db.delete(templateCategories).where(eq(templateCategories.id, id));
  }

  // ===== TEMPLATE ITEM OPERATIONS =====

  async getTemplateItems(categoryId: string): Promise<TemplateItem[]> {
    return db.select()
      .from(templateItems)
      .where(eq(templateItems.categoryId, categoryId))
      .orderBy(templateItems.sortOrder);
  }

  async getTemplateItemsByTemplate(templateId: string): Promise<TemplateItem[]> {
    return db.select()
      .from(templateItems)
      .where(eq(templateItems.templateId, templateId))
      .orderBy(templateItems.sortOrder);
  }

  async createTemplateItem(item: InsertTemplateItem): Promise<TemplateItem> {
    const result = await db.insert(templateItems).values(item).returning();
    return result[0];
  }

  async updateTemplateItem(id: string, updates: Partial<TemplateItem>): Promise<TemplateItem> {
    const result = await db.update(templateItems)
      .set(updates)
      .where(eq(templateItems.id, id))
      .returning();
    return result[0];
  }

  async deleteTemplateItem(id: string): Promise<void> {
    await db.delete(templateItems).where(eq(templateItems.id, id));
  }

  // ===== DEAL CHECKLIST OPERATIONS =====

  async getDealChecklists(dealId: string): Promise<DealChecklist[]> {
    return db.select()
      .from(dealChecklists)
      .where(eq(dealChecklists.dealId, dealId));
  }

  async getDealChecklist(id: string): Promise<DealChecklist | undefined> {
    const result = await db.select().from(dealChecklists).where(eq(dealChecklists.id, id));
    return result[0];
  }

  async createDealChecklist(checklist: InsertDealChecklist): Promise<DealChecklist> {
    const result = await db.insert(dealChecklists).values(checklist).returning();
    return result[0];
  }

  async updateDealChecklist(id: string, updates: Partial<DealChecklist>): Promise<DealChecklist> {
    const result = await db.update(dealChecklists)
      .set(updates)
      .where(eq(dealChecklists.id, id))
      .returning();
    return result[0];
  }

  async deleteDealChecklist(id: string): Promise<void> {
    await db.delete(dealChecklists).where(eq(dealChecklists.id, id));
  }

  // ===== DEAL CHECKLIST ITEM OPERATIONS =====

  async getDealChecklistItems(checklistId: string): Promise<DealChecklistItem[]> {
    return db.select()
      .from(dealChecklistItems)
      .where(eq(dealChecklistItems.dealChecklistId, checklistId));
  }

  async getDealChecklistItem(id: string): Promise<DealChecklistItem | undefined> {
    const result = await db.select().from(dealChecklistItems).where(eq(dealChecklistItems.id, id));
    return result[0];
  }

  async createDealChecklistItem(item: InsertDealChecklistItem): Promise<DealChecklistItem> {
    const result = await db.insert(dealChecklistItems).values(item).returning();
    return result[0];
  }

  async createDealChecklistItemsBulk(items: InsertDealChecklistItem[]): Promise<DealChecklistItem[]> {
    if (items.length === 0) return [];
    const result = await db.insert(dealChecklistItems).values(items).returning();
    return result;
  }

  async updateDealChecklistItem(id: string, updates: Partial<DealChecklistItem>): Promise<DealChecklistItem> {
    const result = await db.update(dealChecklistItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dealChecklistItems.id, id))
      .returning();
    return result[0];
  }

  // ===== CHECKLIST ITEM DOCUMENT OPERATIONS =====

  async getChecklistItemDocuments(itemId: string): Promise<ChecklistItemDocument[]> {
    return db.select()
      .from(checklistItemDocuments)
      .where(eq(checklistItemDocuments.checklistItemId, itemId));
  }

  async createChecklistItemDocument(doc: InsertChecklistItemDocument): Promise<ChecklistItemDocument> {
    const result = await db.insert(checklistItemDocuments).values(doc).returning();
    return result[0];
  }

  async updateChecklistItemDocument(id: string, updates: Partial<ChecklistItemDocument>): Promise<ChecklistItemDocument> {
    const result = await db.update(checklistItemDocuments)
      .set(updates)
      .where(eq(checklistItemDocuments.id, id))
      .returning();
    return result[0];
  }

  async deleteChecklistItemDocument(id: string): Promise<void> {
    await db.delete(checklistItemDocuments).where(eq(checklistItemDocuments.id, id));
  }

  // ===== CHECKLIST ITEM COMMENT OPERATIONS =====

  async getChecklistItemComments(itemId: string): Promise<ChecklistItemComment[]> {
    return db.select()
      .from(checklistItemComments)
      .where(eq(checklistItemComments.checklistItemId, itemId))
      .orderBy(checklistItemComments.createdAt);
  }

  async createChecklistItemComment(comment: InsertChecklistItemComment): Promise<ChecklistItemComment> {
    const result = await db.insert(checklistItemComments).values(comment).returning();
    return result[0];
  }

  // ===== PE FIRM OPERATIONS =====

  async getPEFirms(): Promise<PEFirm[]> {
    return db.select().from(peFirms).orderBy(peFirms.name);
  }

  async getPEFirm(id: string): Promise<PEFirm | undefined> {
    const result = await db.select().from(peFirms).where(eq(peFirms.id, id));
    return result[0];
  }

  async createPEFirm(firm: InsertPEFirm): Promise<PEFirm> {
    const result = await db.insert(peFirms).values(firm).returning();
    return result[0];
  }

  async updatePEFirm(id: string, updates: Partial<PEFirm>): Promise<PEFirm> {
    const result = await db.update(peFirms)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(peFirms.id, id))
      .returning();
    return result[0];
  }

  // ===== PE DEAL OPERATIONS =====

  async getPEDeals(filters?: { firmId?: string; status?: string; sector?: string }): Promise<PEDeal[]> {
    let query = db.select().from(peDeals);
    const conditions = [];
    
    if (filters?.firmId) conditions.push(eq(peDeals.firmId, filters.firmId));
    if (filters?.status) conditions.push(eq(peDeals.status, filters.status as any));
    if (filters?.sector) conditions.push(eq(peDeals.sector, filters.sector));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return query.orderBy(desc(peDeals.updatedAt));
  }

  async getPEDeal(id: string): Promise<PEDeal | undefined> {
    const result = await db.select().from(peDeals).where(eq(peDeals.id, id));
    return result[0];
  }

  async createPEDeal(deal: InsertPEDeal): Promise<PEDeal> {
    const result = await db.insert(peDeals).values(deal).returning();
    return result[0];
  }

  async updatePEDeal(id: string, updates: Partial<PEDeal>): Promise<PEDeal> {
    const result = await db.update(peDeals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(peDeals.id, id))
      .returning();
    return result[0];
  }

  async deletePEDeal(id: string): Promise<void> {
    await db.delete(peDeals).where(eq(peDeals.id, id));
  }

  // ===== DEAL CONTACTS OPERATIONS =====

  async getDealContacts(dealId: string): Promise<DealContact[]> {
    return db.select().from(dealContacts).where(eq(dealContacts.dealId, dealId));
  }

  async createDealContact(contact: InsertDealContact): Promise<DealContact> {
    const result = await db.insert(dealContacts).values(contact).returning();
    return result[0];
  }

  async updateDealContact(id: string, updates: Partial<DealContact>): Promise<DealContact> {
    const result = await db.update(dealContacts)
      .set(updates)
      .where(eq(dealContacts.id, id))
      .returning();
    return result[0];
  }

  async deleteDealContact(id: string): Promise<void> {
    await db.delete(dealContacts).where(eq(dealContacts.id, id));
  }

  // ===== WORKSTREAM OPERATIONS =====

  async getWorkstreams(dealId: string): Promise<Workstream[]> {
    return db.select().from(workstreams).where(eq(workstreams.dealId, dealId)).orderBy(workstreams.name);
  }

  async getWorkstream(id: string): Promise<Workstream | undefined> {
    const result = await db.select().from(workstreams).where(eq(workstreams.id, id));
    return result[0];
  }

  async createWorkstream(workstream: InsertWorkstream): Promise<Workstream> {
    const result = await db.insert(workstreams).values(workstream).returning();
    return result[0];
  }

  async updateWorkstream(id: string, updates: Partial<Workstream>): Promise<Workstream> {
    const result = await db.update(workstreams)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workstreams.id, id))
      .returning();
    return result[0];
  }

  async deleteWorkstream(id: string): Promise<void> {
    await db.delete(workstreams).where(eq(workstreams.id, id));
  }

  // ===== DILIGENCE QUESTIONS OPERATIONS =====

  async getDiligenceQuestions(filters: { dealId?: string; workstreamId?: string; status?: string }): Promise<DiligenceQuestion[]> {
    let query = db.select().from(diligenceQuestions);
    const conditions = [];
    
    if (filters.dealId) conditions.push(eq(diligenceQuestions.dealId, filters.dealId));
    if (filters.workstreamId) conditions.push(eq(diligenceQuestions.workstreamId, filters.workstreamId));
    if (filters.status) conditions.push(eq(diligenceQuestions.status, filters.status as any));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return query.orderBy(desc(diligenceQuestions.createdAt));
  }

  async getDiligenceQuestion(id: string): Promise<DiligenceQuestion | undefined> {
    const result = await db.select().from(diligenceQuestions).where(eq(diligenceQuestions.id, id));
    return result[0];
  }

  async createDiligenceQuestion(question: InsertDiligenceQuestion): Promise<DiligenceQuestion> {
    const result = await db.insert(diligenceQuestions).values(question).returning();
    return result[0];
  }

  async updateDiligenceQuestion(id: string, updates: Partial<DiligenceQuestion>): Promise<DiligenceQuestion> {
    const result = await db.update(diligenceQuestions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(diligenceQuestions.id, id))
      .returning();
    return result[0];
  }

  async deleteDiligenceQuestion(id: string): Promise<void> {
    await db.delete(diligenceQuestions).where(eq(diligenceQuestions.id, id));
  }

  // ===== PE CALLS OPERATIONS =====

  async getPECalls(dealId: string): Promise<PECall[]> {
    return db.select().from(peCalls).where(eq(peCalls.dealId, dealId)).orderBy(desc(peCalls.scheduledAt));
  }

  async getPECall(id: string): Promise<PECall | undefined> {
    const result = await db.select().from(peCalls).where(eq(peCalls.id, id));
    return result[0];
  }

  async createPECall(call: InsertPECall): Promise<PECall> {
    const result = await db.insert(peCalls).values(call).returning();
    return result[0];
  }

  async updatePECall(id: string, updates: Partial<PECall>): Promise<PECall> {
    const result = await db.update(peCalls)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(peCalls.id, id))
      .returning();
    return result[0];
  }

  async deletePECall(id: string): Promise<void> {
    await db.delete(peCalls).where(eq(peCalls.id, id));
  }

  // ===== PE CALL PARTICIPANTS OPERATIONS =====

  async getPECallParticipants(callId: string): Promise<PECallParticipant[]> {
    return db.select().from(peCallParticipants).where(eq(peCallParticipants.callId, callId));
  }

  async createPECallParticipant(participant: InsertPECallParticipant): Promise<PECallParticipant> {
    const result = await db.insert(peCallParticipants).values(participant).returning();
    return result[0];
  }

  async deletePECallParticipant(id: string): Promise<void> {
    await db.delete(peCallParticipants).where(eq(peCallParticipants.id, id));
  }

  // ===== PE RISK FLAGS OPERATIONS =====

  async getPERiskFlags(dealId: string): Promise<PERiskFlag[]> {
    return db.select().from(peRiskFlags).where(eq(peRiskFlags.dealId, dealId)).orderBy(desc(peRiskFlags.createdAt));
  }

  async getPERiskFlag(id: string): Promise<PERiskFlag | undefined> {
    const result = await db.select().from(peRiskFlags).where(eq(peRiskFlags.id, id));
    return result[0];
  }

  async createPERiskFlag(flag: InsertPERiskFlag): Promise<PERiskFlag> {
    const result = await db.insert(peRiskFlags).values(flag).returning();
    return result[0];
  }

  async updatePERiskFlag(id: string, updates: Partial<PERiskFlag>): Promise<PERiskFlag> {
    const result = await db.update(peRiskFlags)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(peRiskFlags.id, id))
      .returning();
    return result[0];
  }

  async deletePERiskFlag(id: string): Promise<void> {
    await db.delete(peRiskFlags).where(eq(peRiskFlags.id, id));
  }

  // ===== PATTERN MATCHES OPERATIONS =====

  async getPatternMatches(dealId: string): Promise<PatternMatch[]> {
    return db.select().from(patternMatches).where(eq(patternMatches.dealId, dealId)).orderBy(desc(patternMatches.createdAt));
  }

  async createPatternMatch(match: InsertPatternMatch): Promise<PatternMatch> {
    const result = await db.insert(patternMatches).values(match).returning();
    return result[0];
  }

  async updatePatternMatch(id: string, updates: Partial<PatternMatch>): Promise<PatternMatch> {
    const result = await db.update(patternMatches)
      .set(updates)
      .where(eq(patternMatches.id, id))
      .returning();
    return result[0];
  }

  // ===== PORTFOLIO COMPANIES OPERATIONS =====

  async getPortfolioCompanies(firmId?: string): Promise<PortfolioCompany[]> {
    if (firmId) {
      return db.select().from(portfolioCompanies).where(eq(portfolioCompanies.firmId, firmId)).orderBy(portfolioCompanies.name);
    }
    return db.select().from(portfolioCompanies).orderBy(portfolioCompanies.name);
  }

  async getPortfolioCompany(id: string): Promise<PortfolioCompany | undefined> {
    const result = await db.select().from(portfolioCompanies).where(eq(portfolioCompanies.id, id));
    return result[0];
  }

  async createPortfolioCompany(company: InsertPortfolioCompany): Promise<PortfolioCompany> {
    const result = await db.insert(portfolioCompanies).values(company).returning();
    return result[0];
  }

  async updatePortfolioCompany(id: string, updates: Partial<PortfolioCompany>): Promise<PortfolioCompany> {
    const result = await db.update(portfolioCompanies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(portfolioCompanies.id, id))
      .returning();
    return result[0];
  }

  // ===== PE DEAL DOCUMENTS OPERATIONS =====

  async getPEDealDocuments(dealId: string, category?: string): Promise<PEDealDocument[]> {
    let query = db.select().from(peDealDocuments).where(eq(peDealDocuments.dealId, dealId));
    
    if (category) {
      query = db.select().from(peDealDocuments).where(
        and(eq(peDealDocuments.dealId, dealId), eq(peDealDocuments.category, category as any))
      );
    }
    
    return query.orderBy(desc(peDealDocuments.uploadedAt));
  }

  async getPEDealDocument(id: string): Promise<PEDealDocument | undefined> {
    const result = await db.select().from(peDealDocuments).where(eq(peDealDocuments.id, id));
    return result[0];
  }

  async createPEDealDocument(doc: InsertPEDealDocument): Promise<PEDealDocument> {
    const result = await db.insert(peDealDocuments).values(doc).returning();
    return result[0];
  }

  async updatePEDealDocument(id: string, updates: Partial<PEDealDocument>): Promise<PEDealDocument> {
    const result = await db.update(peDealDocuments)
      .set(updates)
      .where(eq(peDealDocuments.id, id))
      .returning();
    return result[0];
  }

  async deletePEDealDocument(id: string): Promise<void> {
    await db.delete(peDealDocuments).where(eq(peDealDocuments.id, id));
  }

  // ===== DEAL TIMELINE EVENTS OPERATIONS =====

  async getDealTimelineEvents(dealId: string): Promise<DealTimelineEvent[]> {
    return db.select().from(dealTimelineEvents).where(eq(dealTimelineEvents.dealId, dealId)).orderBy(desc(dealTimelineEvents.occurredAt));
  }

  async createDealTimelineEvent(event: InsertDealTimelineEvent): Promise<DealTimelineEvent> {
    const result = await db.insert(dealTimelineEvents).values(event).returning();
    return result[0];
  }

  // ===== DILIGENCE TEMPLATES OPERATIONS =====

  async getDiligenceTemplates(firmId?: string): Promise<DiligenceTemplate[]> {
    if (firmId) {
      return db.select().from(diligenceTemplates).where(eq(diligenceTemplates.firmId, firmId));
    }
    return db.select().from(diligenceTemplates);
  }

  async getDiligenceTemplate(id: string): Promise<DiligenceTemplate | undefined> {
    const result = await db.select().from(diligenceTemplates).where(eq(diligenceTemplates.id, id));
    return result[0];
  }

  async createDiligenceTemplate(template: InsertDiligenceTemplate): Promise<DiligenceTemplate> {
    const result = await db.insert(diligenceTemplates).values(template).returning();
    return result[0];
  }

  async updateDiligenceTemplate(id: string, updates: Partial<DiligenceTemplate>): Promise<DiligenceTemplate> {
    const result = await db.update(diligenceTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(diligenceTemplates.id, id))
      .returning();
    return result[0];
  }

  async deleteDiligenceTemplate(id: string): Promise<void> {
    await db.delete(diligenceTemplates).where(eq(diligenceTemplates.id, id));
  }

  // ===== CLIENT MANAGEMENT OPERATIONS =====

  async getClients(filters?: { isActive?: boolean; searchQuery?: string }): Promise<Client[]> {
    let query = db.select().from(clients);
    const conditions: any[] = [];
    
    if (filters?.isActive !== undefined) {
      conditions.push(eq(clients.isActive, filters.isActive));
    }
    if (filters?.searchQuery) {
      conditions.push(ilike(clients.companyName, `%${filters.searchQuery}%`));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return query.orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.id, id));
    return result[0];
  }

  async getClientWithDetails(id: string): Promise<ClientWithDetails | undefined> {
    const client = await this.getClient(id);
    if (!client) return undefined;

    const contacts = await db.select().from(clientContacts).where(eq(clientContacts.clientId, id));
    
    const clientCaseLinks = await db.select({
      caseId: clientCases.caseId,
      role: clientCases.role,
      caseNumber: cases.caseNumber,
      title: cases.title,
      status: cases.status,
    })
    .from(clientCases)
    .leftJoin(cases, eq(clientCases.caseId, cases.id))
    .where(eq(clientCases.clientId, id));

    let primaryAttorney: { id: string; firstName: string | null; lastName: string | null } | undefined;
    let leadParalegal: { id: string; firstName: string | null; lastName: string | null } | undefined;

    if (client.primaryAttorneyId) {
      const attorney = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
        .from(users).where(eq(users.id, client.primaryAttorneyId));
      primaryAttorney = attorney[0];
    }
    if (client.leadParalegalId) {
      const paralegal = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
        .from(users).where(eq(users.id, client.leadParalegalId));
      leadParalegal = paralegal[0];
    }

    return {
      ...client,
      contacts,
      cases: clientCaseLinks.map(c => ({
        caseId: c.caseId,
        caseNumber: c.caseNumber || '',
        title: c.title || '',
        status: c.status || '',
        role: c.role || 'plaintiff',
      })),
      primaryAttorney,
      leadParalegal,
    };
  }

  async createClient(data: InsertClient): Promise<Client> {
    const result = await db.insert(clients).values(data).returning();
    return result[0];
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    const result = await db.update(clients)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return result[0];
  }

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Client Contacts
  async getClientContacts(clientId: string): Promise<ClientContact[]> {
    return db.select().from(clientContacts).where(eq(clientContacts.clientId, clientId));
  }

  async createClientContact(data: InsertClientContact): Promise<ClientContact> {
    const result = await db.insert(clientContacts).values(data).returning();
    return result[0];
  }

  async updateClientContact(id: string, updates: Partial<ClientContact>): Promise<ClientContact> {
    const result = await db.update(clientContacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clientContacts.id, id))
      .returning();
    return result[0];
  }

  async deleteClientContact(id: string): Promise<void> {
    await db.delete(clientContacts).where(eq(clientContacts.id, id));
  }

  // Client-Case Links
  async getClientCases(clientId: string): Promise<ClientCase[]> {
    return db.select().from(clientCases).where(eq(clientCases.clientId, clientId));
  }

  async linkClientToCase(data: InsertClientCase): Promise<ClientCase> {
    const result = await db.insert(clientCases).values(data).returning();
    return result[0];
  }

  async unlinkClientFromCase(clientId: string, caseId: string): Promise<void> {
    await db.delete(clientCases).where(and(
      eq(clientCases.clientId, clientId),
      eq(clientCases.caseId, caseId)
    ));
  }

  // Litigation Template operations
  async getLitigationTemplates(filters?: { category?: string; jurisdiction?: string; searchQuery?: string; userId?: string }): Promise<LitigationTemplateWithDetails[]> {
    const conditions: any[] = [];
    
    if (filters?.category) {
      conditions.push(eq(litigationTemplates.category, filters.category as any));
    }
    if (filters?.jurisdiction) {
      conditions.push(eq(litigationTemplates.jurisdiction, filters.jurisdiction as any));
    }
    if (filters?.searchQuery) {
      conditions.push(
        or(
          ilike(litigationTemplates.name, `%${filters.searchQuery}%`),
          ilike(litigationTemplates.description, `%${filters.searchQuery}%`),
          ilike(litigationTemplates.fileName, `%${filters.searchQuery}%`)
        )
      );
    }
    
    const templates = await db.select()
      .from(litigationTemplates)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(litigationTemplates.createdAt));
    
    // Get favorites for user if userId provided
    let userFavorites: string[] = [];
    let recentlyUsedIds: string[] = [];
    
    if (filters?.userId) {
      const favorites = await db.select({ templateId: templateFavorites.templateId })
        .from(templateFavorites)
        .where(eq(templateFavorites.userId, filters.userId));
      userFavorites = favorites.map(f => f.templateId);
      
      // Get recently used (last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentUsage = await db.select({ templateId: templateUsageHistory.templateId })
        .from(templateUsageHistory)
        .where(and(
          eq(templateUsageHistory.userId, filters.userId),
          sql`${templateUsageHistory.usedAt} > ${oneWeekAgo}`
        ));
      recentlyUsedIds = [...new Set(recentUsage.map(r => r.templateId))];
    }
    
    // Get uploader info
    const templatesWithDetails: LitigationTemplateWithDetails[] = await Promise.all(
      templates.map(async (template) => {
        let uploadedByUser: { id: string; firstName: string | null; lastName: string | null } | undefined;
        if (template.uploadedBy) {
          const [user] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
            .from(users).where(eq(users.id, template.uploadedBy));
          uploadedByUser = user;
        }
        return {
          ...template,
          uploadedByUser,
          isFavorite: userFavorites.includes(template.id),
          recentlyUsed: recentlyUsedIds.includes(template.id),
        };
      })
    );
    
    return templatesWithDetails;
  }

  async getLitigationTemplate(id: string): Promise<LitigationTemplate | undefined> {
    const [template] = await db.select().from(litigationTemplates).where(eq(litigationTemplates.id, id));
    return template;
  }

  async createLitigationTemplate(template: InsertLitigationTemplate): Promise<LitigationTemplate> {
    const [result] = await db.insert(litigationTemplates).values(template).returning();
    return result;
  }

  async updateLitigationTemplate(id: string, updates: Partial<LitigationTemplate>): Promise<LitigationTemplate> {
    const [result] = await db.update(litigationTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(litigationTemplates.id, id))
      .returning();
    return result;
  }

  async deleteLitigationTemplate(id: string): Promise<void> {
    await db.delete(litigationTemplates).where(eq(litigationTemplates.id, id));
  }

  // Template Favorites operations
  async getTemplateFavorites(userId: string): Promise<TemplateFavorite[]> {
    return db.select().from(templateFavorites).where(eq(templateFavorites.userId, userId));
  }

  async addTemplateFavorite(templateId: string, userId: string): Promise<TemplateFavorite> {
    const [result] = await db.insert(templateFavorites)
      .values({ templateId, userId })
      .returning();
    return result;
  }

  async removeTemplateFavorite(templateId: string, userId: string): Promise<void> {
    await db.delete(templateFavorites).where(and(
      eq(templateFavorites.templateId, templateId),
      eq(templateFavorites.userId, userId)
    ));
  }

  async isTemplateFavorite(templateId: string, userId: string): Promise<boolean> {
    const [result] = await db.select()
      .from(templateFavorites)
      .where(and(
        eq(templateFavorites.templateId, templateId),
        eq(templateFavorites.userId, userId)
      ));
    return !!result;
  }

  // Template Usage History operations
  async recordTemplateUsage(templateId: string, userId: string): Promise<void> {
    await db.insert(templateUsageHistory).values({ templateId, userId });
    // Also update the template's download count and last used info
    await db.update(litigationTemplates)
      .set({ 
        downloadCount: sql`${litigationTemplates.downloadCount} + 1`,
        lastUsedAt: new Date(),
        lastUsedBy: userId
      })
      .where(eq(litigationTemplates.id, templateId));
  }

  async getRecentlyUsedTemplates(userId: string, limit: number = 10): Promise<LitigationTemplate[]> {
    const recentUsage = await db.select({ templateId: templateUsageHistory.templateId })
      .from(templateUsageHistory)
      .where(eq(templateUsageHistory.userId, userId))
      .orderBy(desc(templateUsageHistory.usedAt))
      .limit(limit * 2);
    
    const uniqueIds = [...new Set(recentUsage.map(r => r.templateId))].slice(0, limit);
    
    if (uniqueIds.length === 0) return [];
    
    return db.select()
      .from(litigationTemplates)
      .where(inArray(litigationTemplates.id, uniqueIds));
  }

  // Calendar Event operations
  async getCalendarEvents(filters?: { userId?: string; startDate?: Date; endDate?: Date; caseId?: string; clientId?: string; eventType?: string }): Promise<CalendarEvent[]> {
    const conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(calendarEvents.createdBy, filters.userId));
    }
    if (filters?.startDate) {
      conditions.push(gte(calendarEvents.startTime, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(calendarEvents.endTime, filters.endDate));
    }
    if (filters?.caseId) {
      conditions.push(eq(calendarEvents.caseId, filters.caseId));
    }
    if (filters?.clientId) {
      conditions.push(eq(calendarEvents.clientId, filters.clientId));
    }
    if (filters?.eventType) {
      conditions.push(eq(calendarEvents.eventType, filters.eventType as any));
    }
    
    return db.select()
      .from(calendarEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(calendarEvents.startTime));
  }

  async getCalendarEvent(id: string): Promise<CalendarEvent | undefined> {
    const [event] = await db.select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, id));
    return event;
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const [created] = await db.insert(calendarEvents).values(event).returning();
    return created;
  }

  async updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const [updated] = await db.update(calendarEvents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(calendarEvents.id, id))
      .returning();
    return updated;
  }

  async deleteCalendarEvent(id: string): Promise<void> {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  }

  // User Calendars implementation
  async getUserCalendars(userId: string): Promise<UserCalendar[]> {
    return await db.select().from(userCalendars).where(eq(userCalendars.userId, userId)).orderBy(desc(userCalendars.isDefault), asc(userCalendars.name));
  }

  async getUserCalendar(id: string): Promise<UserCalendar | undefined> {
    const [calendar] = await db.select().from(userCalendars).where(eq(userCalendars.id, id));
    return calendar;
  }

  async createUserCalendar(calendar: InsertUserCalendar): Promise<UserCalendar> {
    const [newCalendar] = await db.insert(userCalendars).values(calendar).returning();
    return newCalendar;
  }

  async updateUserCalendar(id: string, updates: Partial<UserCalendar>): Promise<UserCalendar> {
    const [updated] = await db.update(userCalendars).set({ ...updates, updatedAt: new Date() }).where(eq(userCalendars.id, id)).returning();
    return updated;
  }

  async deleteUserCalendar(id: string): Promise<void> {
    await db.delete(userCalendars).where(eq(userCalendars.id, id));
  }

  async getDefaultUserCalendar(userId: string): Promise<UserCalendar | undefined> {
    const [calendar] = await db.select().from(userCalendars).where(and(eq(userCalendars.userId, userId), eq(userCalendars.isDefault, true)));
    return calendar;
  }
}

export const storage = new DatabaseStorage();
