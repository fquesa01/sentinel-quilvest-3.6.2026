import { Express } from "express";
import { isAuthenticated, requireRole } from "./replitAuth";
import { storage } from "./storage";
import { generateSignalingToken } from "./webrtc-signaling";
import { insertVideoMeetingSchema, updateVideoMeetingSchema, insertVideoMeetingParticipantSchema } from "@shared/schema";
import { generateRealtimeToken } from "./elevenlabs";
import { ObjectStorageService } from "./objectStorage";
import crypto from "crypto";

const objectStorage = new ObjectStorageService();

export function registerVideoMeetingRoutes(app: Express, logAction: Function) {
  // Get all video meetings for a user
  app.get("/api/video-meetings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const caseId = req.query.caseId as string | undefined;
      const meetings = await storage.getVideoMeetings({ userId, caseId });
      res.json(meetings);
    } catch (error: any) {
      console.error("Error fetching video meetings:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get a specific video meeting
  app.get("/api/video-meetings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const meeting = await storage.getVideoMeeting(req.params.id);
      if (!meeting) {
        return res.status(404).json({ message: "Video meeting not found" });
      }
      res.json(meeting);
    } catch (error: any) {
      console.error("Error fetching video meeting:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get a video meeting by room ID (public - allows guest access)
  app.get("/api/video-meetings/room/:roomId", async (req: any, res) => {
    try {
      const meeting = await storage.getVideoMeetingByRoomId(req.params.roomId);
      if (!meeting) {
        return res.status(404).json({ message: "Video meeting not found" });
      }
      
      // Fetch minimal case info if caseId exists (lightweight query)
      let caseInfo = null;
      if (meeting.caseId) {
        try {
          const caseResult = await storage.getCaseSummary(meeting.caseId);
          if (caseResult) {
            caseInfo = {
              caseNumber: caseResult.caseNumber,
              title: caseResult.title,
            };
          }
        } catch (e) {
          console.warn("Could not fetch case info for meeting:", e);
        }
      }
      
      // Return limited info for public access - hide sensitive data
      const publicMeetingInfo = {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        meetingType: meeting.meetingType,
        status: meeting.status,
        roomId: meeting.roomId,
        scheduledStartTime: meeting.scheduledStartTime,
        caseId: meeting.caseId,
        caseNumber: caseInfo?.caseNumber,
        caseTitle: caseInfo?.title,
      };
      res.json(publicMeetingInfo);
    } catch (error: any) {
      console.error("Error fetching video meeting:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Create a new video meeting
  app.post("/api/video-meetings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const roomId = `meeting-${crypto.randomBytes(6).toString('hex')}`;
      
      const meetingData = insertVideoMeetingSchema.parse({
        ...req.body,
        hostId: userId,
        roomId,
        inviteLink: `/video-meeting/${roomId}`,
      });
      
      const meeting = await storage.createVideoMeeting(meetingData);
      await logAction(req, "video_meeting_created", "video_meeting", meeting.id);
      res.status(201).json(meeting);
    } catch (error: any) {
      console.error("Error creating video meeting:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update a video meeting
  app.patch("/api/video-meetings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const updates = updateVideoMeetingSchema.parse(req.body);
      const meeting = await storage.updateVideoMeeting(req.params.id, updates);
      await logAction(req, "video_meeting_updated", "video_meeting", req.params.id);
      res.json(meeting);
    } catch (error: any) {
      console.error("Error updating video meeting:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Start a video meeting
  app.post("/api/video-meetings/:id/start", isAuthenticated, async (req: any, res) => {
    try {
      const meeting = await storage.updateVideoMeeting(req.params.id, {
        status: "in_progress",
        actualStartTime: new Date(),
      });
      await logAction(req, "video_meeting_started", "video_meeting", req.params.id);
      res.json(meeting);
    } catch (error: any) {
      console.error("Error starting video meeting:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // End a video meeting
  app.post("/api/video-meetings/:id/end", isAuthenticated, async (req: any, res) => {
    try {
      const currentMeeting = await storage.getVideoMeeting(req.params.id);
      const duration = currentMeeting?.actualStartTime 
        ? Math.floor((Date.now() - new Date(currentMeeting.actualStartTime).getTime()) / 1000)
        : 0;
      
      const meeting = await storage.updateVideoMeeting(req.params.id, {
        status: "completed",
        actualEndTime: new Date(),
        duration,
      });
      await logAction(req, "video_meeting_ended", "video_meeting", req.params.id);
      res.json(meeting);
    } catch (error: any) {
      console.error("Error ending video meeting:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get signaling token for video meeting (authenticated users)
  app.post("/api/video-meetings/:id/signaling-token", isAuthenticated, async (req: any, res) => {
    try {
      const meeting = await storage.getVideoMeeting(req.params.id);
      if (!meeting) {
        return res.status(404).json({ message: "Video meeting not found" });
      }
      
      const { role = "participant" } = req.body;
      const userName = req.user.firstName 
        ? `${req.user.firstName} ${req.user.lastName || ''}`.trim()
        : req.user.email;
      
      const token = generateSignalingToken({
        sessionId: meeting.id,
        userId: req.user.id,
        userName,
        role,
        roomId: meeting.roomId,
      });
      
      res.json({ token, roomId: meeting.roomId });
    } catch (error: any) {
      console.error("Error generating signaling token:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get signaling token for guest participants (no auth required)
  app.post("/api/video-meetings/:id/guest-token", async (req: any, res) => {
    try {
      const meeting = await storage.getVideoMeeting(req.params.id);
      if (!meeting) {
        return res.status(404).json({ message: "Video meeting not found" });
      }
      
      // Check if meeting allows guests
      if (meeting.status === 'completed' || meeting.status === 'cancelled') {
        return res.status(400).json({ message: "This meeting has ended" });
      }
      
      const { displayName } = req.body;
      if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 2) {
        return res.status(400).json({ message: "Display name is required (minimum 2 characters)" });
      }
      
      // Generate a guest ID for this session
      const guestId = `guest-${crypto.randomBytes(8).toString('hex')}`;
      
      const token = generateSignalingToken({
        sessionId: meeting.id,
        userId: guestId,
        userName: displayName.trim(),
        role: "guest",
        roomId: meeting.roomId,
      });
      
      // Record guest participant
      await storage.createVideoMeetingParticipant({
        meetingId: meeting.id,
        name: displayName.trim(),
        role: 'guest',
        joinedAt: new Date(),
      });
      
      res.json({ token, roomId: meeting.roomId, guestId });
    } catch (error: any) {
      console.error("Error generating guest signaling token:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get participants for a video meeting
  app.get("/api/video-meetings/:meetingId/participants", isAuthenticated, async (req: any, res) => {
    try {
      const participants = await storage.getVideoMeetingParticipants(req.params.meetingId);
      res.json(participants);
    } catch (error: any) {
      console.error("Error fetching participants:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Add a participant to video meeting
  app.post("/api/video-meetings/:meetingId/participants", isAuthenticated, async (req: any, res) => {
    try {
      const participantData = insertVideoMeetingParticipantSchema.parse({
        ...req.body,
        meetingId: req.params.meetingId,
        joinedAt: new Date(),
      });
      const participant = await storage.createVideoMeetingParticipant(participantData);
      res.status(201).json(participant);
    } catch (error: any) {
      console.error("Error adding participant:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update participant (e.g., when they leave)
  app.patch("/api/video-meetings/:meetingId/participants/:participantId", isAuthenticated, async (req: any, res) => {
    try {
      const participant = await storage.updateVideoMeetingParticipant(req.params.participantId, req.body);
      res.json(participant);
    } catch (error: any) {
      console.error("Error updating participant:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get recordings for a video meeting
  app.get("/api/video-meetings/:meetingId/recordings", isAuthenticated, async (req: any, res) => {
    try {
      const recordings = await storage.getVideoMeetingRecordings(req.params.meetingId);
      res.json(recordings);
    } catch (error: any) {
      console.error("Error fetching recordings:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Create a recording
  app.post("/api/video-meetings/:meetingId/recordings", isAuthenticated, async (req: any, res) => {
    try {
      const recording = await storage.createVideoMeetingRecording({
        ...req.body,
        meetingId: req.params.meetingId,
        startedAt: new Date(),
      });
      res.status(201).json(recording);
    } catch (error: any) {
      console.error("Error creating recording:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update a recording
  app.patch("/api/video-meetings/:meetingId/recordings/:recordingId", isAuthenticated, async (req: any, res) => {
    try {
      const recording = await storage.updateVideoMeetingRecording(req.params.recordingId, req.body);
      res.json(recording);
    } catch (error: any) {
      console.error("Error updating recording:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Request upload URL for recording
  app.post("/api/video-meetings/:meetingId/recordings/request-upload-url", isAuthenticated, async (req: any, res) => {
    try {
      const { meetingId } = req.params;
      const { fileName, contentType, duration, fileSize } = req.body;

      // Verify meeting exists
      const meeting = await storage.getVideoMeeting(meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Video meeting not found" });
      }

      // Generate unique path for recording
      const recordingId = crypto.randomUUID();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = fileName?.split('.').pop() || 'webm';
      const objectPath = `recordings/${meetingId}/${timestamp}-${recordingId}.${extension}`;

      // Get presigned upload URL from object storage
      const uploadURL = await objectStorage.getObjectEntityUploadURL();

      // Create recording metadata in database
      const recording = await storage.createVideoMeetingRecording({
        meetingId,
        status: 'uploading',
        format: 'webm',
        duration: duration || 0,
        fileSize: fileSize || 0,
        startedAt: new Date(),
      });

      res.json({
        uploadURL,
        recordingId: recording.id,
        objectPath,
      });
    } catch (error: any) {
      console.error("Error requesting upload URL:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Finalize recording upload
  app.post("/api/video-meetings/:meetingId/recordings/:recordingId/finalize", isAuthenticated, async (req: any, res) => {
    try {
      const { meetingId, recordingId } = req.params;
      const { objectPath, duration, fileSize } = req.body;

      // Normalize the object path for storage
      const normalizedPath = objectStorage.normalizeObjectEntityPath(objectPath);

      // Update recording with final URL and status
      const recording = await storage.updateVideoMeetingRecording(recordingId, {
        videoUrl: normalizedPath,
        status: 'completed',
        duration: duration || 0,
        fileSize: fileSize || 0,
        endedAt: new Date(),
      });

      await logAction(req, "recording_uploaded", "video_meeting_recording", recordingId);

      // Check if auto-transcription is enabled for this meeting
      const meeting = await storage.getVideoMeeting(meetingId);
      if (meeting?.autoTranscribe === 'true') {
        try {
          const { meetingAIService } = await import("./services/meeting-ai-service");
          const transcription = await meetingAIService.generateTranscriptionFromRecording(
            recordingId,
            meetingId,
            req.user.id
          );
          console.log(`[AutoProcess] Transcription started for recording ${recordingId}`);
          
          // If auto-summarize is also enabled, it will be triggered when transcription completes
          if (meeting.autoSummarize === 'true') {
            console.log(`[AutoProcess] Auto-summarize enabled - will generate summary when transcription completes`);
          }
        } catch (autoError) {
          console.error("[AutoProcess] Failed to start auto-transcription:", autoError);
          // Don't fail the recording finalization if auto-processing fails
        }
      }

      res.json(recording);
    } catch (error: any) {
      console.error("Error finalizing recording:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Stream/download a recording
  app.get("/api/video-meetings/:meetingId/recordings/:recordingId/stream", isAuthenticated, async (req: any, res) => {
    try {
      const { recordingId } = req.params;
      
      // Get recording metadata
      const recordings = await storage.getVideoMeetingRecordings(req.params.meetingId);
      const recording = recordings.find(r => r.id === recordingId);
      
      if (!recording || !recording.videoUrl) {
        return res.status(404).json({ message: "Recording not found" });
      }

      // Get the file from object storage and stream it
      const objectFile = await objectStorage.getObjectEntityFile(recording.videoUrl);
      await objectStorage.downloadObject(objectFile, res);
    } catch (error: any) {
      console.error("Error streaming recording:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get chat messages for a video meeting
  app.get("/api/video-meetings/:meetingId/chat", isAuthenticated, async (req: any, res) => {
    try {
      const messages = await storage.getVideoMeetingChatMessages(req.params.meetingId);
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Send a chat message (for REST API fallback, primary is WebSocket)
  app.post("/api/video-meetings/:meetingId/chat", isAuthenticated, async (req: any, res) => {
    try {
      const { content, messageType = 'text' } = req.body;
      const message = await storage.createVideoMeetingChatMessage({
        meetingId: req.params.meetingId,
        senderId: req.user.id,
        senderName: req.user.name || 'Unknown',
        content,
        messageType,
      });
      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error creating chat message:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Generate realtime transcription token for video meeting (public - allows guest access)
  app.get("/api/video-meetings/room/:roomId/transcription-token", async (req: any, res) => {
    try {
      const meeting = await storage.getVideoMeetingByRoomId(req.params.roomId);
      if (!meeting) {
        return res.status(404).json({ message: "Video meeting not found" });
      }

      // Generate single-use token for ElevenLabs realtime transcription
      const token = await generateRealtimeToken();
      res.json({ token });
    } catch (error: any) {
      console.error("Error generating transcription token:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Boolean search for AI-powered document discovery during video meetings
  app.post("/api/video-meetings/:meetingId/boolean-search", isAuthenticated, async (req: any, res) => {
    try {
      const { caseId, transcriptText } = req.body;
      
      if (!transcriptText || transcriptText.length < 50) {
        return res.json({ queries: [], results: [] });
      }
      
      const { generateBooleanSearchQueries, executeBooleanSearch } = await import("./services/ambient-ai-service");
      
      // Generate boolean queries from transcript using Claude
      const queries = await generateBooleanSearchQueries(transcriptText);
      
      if (queries.length === 0) {
        return res.json({ queries: [], results: [] });
      }
      
      // Execute each query and gather results
      const allResults: Array<{
        query: string;
        topic: string;
        rationale: string;
        riskLevel: string;
        documents: Array<{
          id: string;
          subject: string | null;
          sender: string | null;
          riskLevel: string | null;
          matchType: string;
        }>;
      }> = [];
      
      for (const q of queries) {
        if (caseId) {
          const docs = await executeBooleanSearch(caseId, q.query);
          if (docs.length > 0) {
            allResults.push({
              query: q.query,
              topic: q.topic,
              rationale: q.rationale,
              riskLevel: q.riskLevel,
              documents: docs,
            });
          }
        }
      }
      
      console.log(`[VideoMeetingAI] Boolean search: ${queries.length} queries, ${allResults.length} with results`);
      
      res.json({ 
        queries, 
        results: allResults 
      });
    } catch (error: any) {
      console.error("[VideoMeetingAI] Boolean search failed:", error);
      res.status(500).json({ error: error.message || "Failed to execute boolean search" });
    }
  });

  // ============= Meeting Invitations (Scheduling) =============

  // Get all invitations for a meeting
  app.get("/api/video-meetings/:meetingId/invitations", isAuthenticated, async (req: any, res) => {
    try {
      const invitations = await storage.getMeetingInvitations(req.params.meetingId);
      res.json(invitations);
    } catch (error: any) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Create a meeting invitation
  app.post("/api/video-meetings/:meetingId/invitations", isAuthenticated, async (req: any, res) => {
    try {
      const { meetingId } = req.params;
      const { inviteeEmail, inviteeName, inviteeRole = 'participant' } = req.body;
      
      if (!inviteeEmail) {
        return res.status(400).json({ message: "Invitee email is required" });
      }

      // Generate unique access token for guest access
      const accessToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invitation = await storage.createMeetingInvitation({
        meetingId,
        inviteeEmail,
        inviteeName: inviteeName || inviteeEmail.split('@')[0],
        inviteeRole,
        accessToken,
        tokenExpiresAt,
        status: 'pending',
      });

      await logAction(req, "meeting_invitation_created", "meeting_invitation", invitation.id);
      res.status(201).json(invitation);
    } catch (error: any) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Send invitation email with ICS attachment
  app.post("/api/video-meetings/:meetingId/invitations/:invitationId/send", isAuthenticated, async (req: any, res) => {
    try {
      const { meetingId, invitationId } = req.params;
      
      // Get meeting and invitation details
      const meeting = await storage.getVideoMeeting(meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }

      const invitation = await storage.getMeetingInvitation(invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      // Get host info
      const host = meeting.hostId ? await storage.getUser(meeting.hostId) : null;
      const hostName = host?.name || 'Meeting Host';
      const hostEmail = host?.email || 'noreply@sentinel-counsel.replit.app';

      // Generate meeting link with access token
      const baseUrl = process.env.REPLIT_DEV_DOMAIN || 'sentinel-counsel.replit.app';
      const meetingLink = `https://${baseUrl}/video-meeting/${meeting.roomId}?token=${invitation.accessToken}`;

      // Generate ICS calendar content
      const startTime = meeting.scheduledStartTime ? new Date(meeting.scheduledStartTime) : new Date();
      const endTime = new Date(startTime.getTime() + (meeting.scheduledDuration || 60) * 60 * 1000);
      
      const icsContent = generateICSContent({
        title: meeting.title || 'Video Meeting',
        description: meeting.description || '',
        startTime,
        endTime,
        location: meetingLink,
        organizerName: hostName,
        organizerEmail: hostEmail,
        attendeeEmail: invitation.inviteeEmail,
        attendeeName: invitation.inviteeName || '',
        uid: `${meeting.id}@sentinel-counsel`,
      });

      // Try to send email via SendGrid if available
      const sendGridApiKey = process.env.SENDGRID_API_KEY;
      let emailSent = false;

      if (sendGridApiKey) {
        try {
          const sgMail = await import('@sendgrid/mail');
          sgMail.default.setApiKey(sendGridApiKey);

          const emailContent = {
            to: invitation.inviteeEmail,
            from: process.env.SENDGRID_FROM_EMAIL || 'noreply@sentinel-counsel.com',
            subject: `Meeting Invitation: ${meeting.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a1a2e;">You're Invited to a Video Meeting</h2>
                <p>Hello ${invitation.inviteeName || 'Participant'},</p>
                <p><strong>${hostName}</strong> has invited you to join a video meeting.</p>
                
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #333;">${meeting.title}</h3>
                  ${meeting.description ? `<p style="color: #666;">${meeting.description}</p>` : ''}
                  <p><strong>Date:</strong> ${startTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p><strong>Time:</strong> ${startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}</p>
                  <p><strong>Duration:</strong> ${meeting.scheduledDuration || 60} minutes</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${meetingLink}" style="background: #1a1a2e; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Join Meeting
                  </a>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="${meetingLink}" style="color: #1a1a2e;">${meetingLink}</a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px;">
                  This invitation was sent via Sentinel Counsel LLP Video Meeting Platform.
                </p>
              </div>
            `,
            attachments: [
              {
                content: Buffer.from(icsContent).toString('base64'),
                filename: 'meeting.ics',
                type: 'text/calendar',
                disposition: 'attachment',
              },
            ],
          };

          await sgMail.default.send(emailContent);
          emailSent = true;
          console.log(`[Invitations] Email sent to ${invitation.inviteeEmail}`);
        } catch (emailError: any) {
          console.error("SendGrid email error:", emailError);
          // Continue without sending email
        }
      }

      // Update invitation status
      const updatedInvitation = await storage.updateMeetingInvitation(invitationId, {
        status: emailSent ? 'sent' : 'pending',
        emailSentAt: emailSent ? new Date() : undefined,
      });

      await logAction(req, "meeting_invitation_sent", "meeting_invitation", invitationId);

      res.json({
        ...updatedInvitation,
        emailSent,
        meetingLink,
        icsContent: emailSent ? undefined : icsContent, // Return ICS if email not sent
      });
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a meeting invitation
  app.delete("/api/video-meetings/:meetingId/invitations/:invitationId", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteMeetingInvitation(req.params.invitationId);
      await logAction(req, "meeting_invitation_deleted", "meeting_invitation", req.params.invitationId);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting invitation:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Verify guest access token
  app.get("/api/video-meetings/verify-token/:token", async (req, res) => {
    try {
      const invitation = await storage.getMeetingInvitationByToken(req.params.token);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invalid or expired invitation" });
      }

      if (invitation.tokenExpiresAt && new Date() > new Date(invitation.tokenExpiresAt)) {
        return res.status(410).json({ message: "Invitation has expired" });
      }

      // Get meeting details
      const meeting = await storage.getVideoMeeting(invitation.meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }

      res.json({
        valid: true,
        invitation: {
          id: invitation.id,
          inviteeName: invitation.inviteeName,
          inviteeEmail: invitation.inviteeEmail,
          inviteeRole: invitation.inviteeRole,
        },
        meeting: {
          id: meeting.id,
          title: meeting.title,
          roomId: meeting.roomId,
        },
      });
    } catch (error: any) {
      console.error("Error verifying token:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ===== MEETING TRANSCRIPTION ENDPOINTS =====

  // Get all transcriptions for a meeting
  app.get("/api/video-meetings/:meetingId/transcriptions", isAuthenticated, async (req: any, res) => {
    try {
      const transcriptions = await storage.getMeetingTranscriptions(req.params.meetingId);
      res.json(transcriptions);
    } catch (error: any) {
      console.error("Error fetching transcriptions:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get a specific transcription
  app.get("/api/transcriptions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const transcription = await storage.getMeetingTranscription(req.params.id);
      if (!transcription) {
        return res.status(404).json({ message: "Transcription not found" });
      }
      res.json(transcription);
    } catch (error: any) {
      console.error("Error fetching transcription:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Generate transcription from a recording
  app.post("/api/video-meetings/:meetingId/transcriptions", isAuthenticated, async (req: any, res) => {
    try {
      const { meetingAIService } = await import("./services/meeting-ai-service");
      const { recordingId } = req.body;
      
      if (!recordingId) {
        return res.status(400).json({ message: "Recording ID is required" });
      }

      const transcription = await meetingAIService.generateTranscriptionFromRecording(
        recordingId,
        req.params.meetingId,
        req.user.id
      );
      
      await logAction(req, "transcription_started", "meeting_transcription", transcription.id);
      res.status(201).json(transcription);
    } catch (error: any) {
      console.error("Error generating transcription:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Regenerate a failed transcription
  app.post("/api/transcriptions/:id/regenerate", isAuthenticated, async (req: any, res) => {
    try {
      const { meetingAIService } = await import("./services/meeting-ai-service");
      const transcription = await meetingAIService.regenerateTranscription(req.params.id, req.user.id);
      await logAction(req, "transcription_regenerated", "meeting_transcription", transcription.id);
      res.json(transcription);
    } catch (error: any) {
      console.error("Error regenerating transcription:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a transcription
  app.delete("/api/transcriptions/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteMeetingTranscription(req.params.id);
      await logAction(req, "transcription_deleted", "meeting_transcription", req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting transcription:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Search transcriptions
  app.get("/api/transcriptions/search", isAuthenticated, async (req: any, res) => {
    try {
      const { query, meetingId } = req.query;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      const results = await storage.searchMeetingTranscriptions(query as string, meetingId as string | undefined);
      res.json(results);
    } catch (error: any) {
      console.error("Error searching transcriptions:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ===== MEETING SUMMARY ENDPOINTS =====

  // Get all summaries for a meeting
  app.get("/api/video-meetings/:meetingId/summaries", isAuthenticated, async (req: any, res) => {
    try {
      const summaries = await storage.getMeetingSummaries(req.params.meetingId);
      res.json(summaries);
    } catch (error: any) {
      console.error("Error fetching summaries:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get a specific summary
  app.get("/api/summaries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const summary = await storage.getMeetingSummary(req.params.id);
      if (!summary) {
        return res.status(404).json({ message: "Summary not found" });
      }
      res.json(summary);
    } catch (error: any) {
      console.error("Error fetching summary:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Generate summary from a transcription
  app.post("/api/video-meetings/:meetingId/summaries", isAuthenticated, async (req: any, res) => {
    try {
      const { meetingAIService } = await import("./services/meeting-ai-service");
      const { transcriptionId, summaryType } = req.body;
      
      if (!transcriptionId) {
        return res.status(400).json({ message: "Transcription ID is required" });
      }

      const summary = await meetingAIService.generateSummaryFromTranscription(
        transcriptionId,
        req.params.meetingId,
        req.user.id,
        summaryType || 'comprehensive'
      );
      
      await logAction(req, "summary_started", "meeting_summary", summary.id);
      res.status(201).json(summary);
    } catch (error: any) {
      console.error("Error generating summary:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Generate summary directly from transcript text (without saved transcription)
  app.post("/api/video-meetings/:meetingId/summaries/direct", isAuthenticated, async (req: any, res) => {
    try {
      const { meetingAIService } = await import("./services/meeting-ai-service");
      const { transcriptText, summaryType } = req.body;
      
      if (!transcriptText) {
        return res.status(400).json({ message: "Transcript text is required" });
      }

      const summary = await meetingAIService.generateDirectSummary(
        req.params.meetingId,
        transcriptText,
        req.user.id,
        summaryType || 'comprehensive'
      );
      
      await logAction(req, "summary_direct_started", "meeting_summary", summary.id);
      res.status(201).json(summary);
    } catch (error: any) {
      console.error("Error generating direct summary:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Regenerate a failed summary
  app.post("/api/summaries/:id/regenerate", isAuthenticated, async (req: any, res) => {
    try {
      const { meetingAIService } = await import("./services/meeting-ai-service");
      const summary = await meetingAIService.regenerateSummary(req.params.id, req.user.id);
      await logAction(req, "summary_regenerated", "meeting_summary", summary.id);
      res.json(summary);
    } catch (error: any) {
      console.error("Error regenerating summary:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a summary
  app.delete("/api/summaries/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteMeetingSummary(req.params.id);
      await logAction(req, "summary_deleted", "meeting_summary", req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting summary:", error);
      res.status(500).json({ message: error.message });
    }
  });

  console.log("[VideoMeetings] Routes registered");
}

// Helper function to generate ICS calendar content
function generateICSContent(params: {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location: string;
  organizerName: string;
  organizerEmail: string;
  attendeeEmail: string;
  attendeeName: string;
  uid: string;
}): string {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const escapeText = (text: string) => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sentinel Counsel LLP//Video Meeting//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
DTSTART:${formatDate(params.startTime)}
DTEND:${formatDate(params.endTime)}
DTSTAMP:${formatDate(new Date())}
ORGANIZER;CN=${escapeText(params.organizerName)}:mailto:${params.organizerEmail}
UID:${params.uid}
ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${escapeText(params.attendeeName)}:mailto:${params.attendeeEmail}
SUMMARY:${escapeText(params.title)}
DESCRIPTION:${escapeText(params.description)}\\n\\nJoin meeting: ${params.location}
LOCATION:${escapeText(params.location)}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Meeting reminder
END:VALARM
END:VEVENT
END:VCALENDAR`;
}
