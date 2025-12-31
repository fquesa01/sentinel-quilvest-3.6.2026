import { WebSocketServer, WebSocket } from 'ws';
import type { Server, IncomingMessage } from 'http';
import { storage } from './storage';
import crypto from 'crypto';

// Signaling token management
// Tokens are generated when a user requests to join an interview session
// They are single-use and expire after a short time
interface SignalingToken {
  token: string;
  sessionId: string;
  userId: string;
  userName: string;
  role: string;
  roomId: string;
  expiresAt: Date;
  used: boolean;
}

const signalingTokens = new Map<string, SignalingToken>();

// Generate a secure token for WebRTC signaling access
export function generateSignalingToken(params: {
  sessionId: string;
  userId: string;
  userName: string;
  role: string;
  roomId: string;
}): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minute expiry
  
  signalingTokens.set(token, {
    token,
    ...params,
    expiresAt,
    used: false,
  });
  
  // Clean up expired tokens periodically
  cleanupExpiredTokens();
  
  return token;
}

// Validate and consume a signaling token
function validateSignalingToken(token: string): SignalingToken | null {
  const tokenData = signalingTokens.get(token);
  
  if (!tokenData) {
    return null;
  }
  
  if (tokenData.used) {
    signalingTokens.delete(token);
    return null;
  }
  
  if (new Date() > tokenData.expiresAt) {
    signalingTokens.delete(token);
    return null;
  }
  
  // Mark as used but keep for a short grace period
  tokenData.used = true;
  
  return tokenData;
}

function cleanupExpiredTokens() {
  const now = new Date();
  signalingTokens.forEach((token, key) => {
    // Remove expired tokens or used tokens older than 1 minute
    if (now > token.expiresAt || (token.used && now.getTime() - token.expiresAt.getTime() > 60000)) {
      signalingTokens.delete(key);
    }
  });
}

interface SignalingMessage {
  type: 'join' | 'leave' | 'offer' | 'answer' | 'ice-candidate' | 'participant-update' | 'session-state' | 'chat' | 'admit-participant' | 'deny-participant' | 'ping' | 'pong';
  roomId: string;
  participantId?: string;
  userId?: string;
  userName?: string;
  role?: string;
  payload?: any;
  peerId?: string;
}

interface Participant {
  participantId: string;
  peerId: string;
  userId?: string;
  userName: string;
  role: string;
  ws: WebSocket;
  joinedAt: Date;
}

interface WaitingParticipant {
  peerId: string;
  participantId: string;
  userId?: string;
  userName: string;
  role: string;
  ws: WebSocket;
  requestedAt: Date;
  auth: SignalingToken;
}

interface Room {
  roomId: string;
  sessionId: string;
  participants: Map<string, Participant>;
  waitingRoom: Map<string, WaitingParticipant>;
  createdAt: Date;
  isRecording: boolean;
  hostPeerId?: string;
  waitingRoomEnabled: boolean;
}

const rooms = new Map<string, Room>();

function broadcast(room: Room, message: any, excludePeerId?: string) {
  const payload = JSON.stringify(message);
  room.participants.forEach((participant, peerId) => {
    if (peerId !== excludePeerId && participant.ws.readyState === WebSocket.OPEN) {
      participant.ws.send(payload);
    }
  });
}

function getParticipantsList(room: Room, excludePeerId?: string): Array<{ peerId: string; participantId: string; userId?: string; userName: string; role: string }> {
  return Array.from(room.participants.values())
    .filter(p => !excludePeerId || p.peerId !== excludePeerId)
    .map(p => ({
      peerId: p.peerId,
      participantId: p.participantId,
      userId: p.userId,
      userName: p.userName,
      role: p.role,
    }));
}

export function setupWebRTCSignaling(server: Server) {
  const wss = new WebSocketServer({ 
    server, 
    path: '/ws/signaling',
    verifyClient: (info: { origin: string; secure: boolean; req: IncomingMessage }, callback) => {
      // Extract token from query string
      const url = new URL(info.req.url || '', `http://${info.req.headers.host}`);
      const token = url.searchParams.get('token');
      
      if (!token) {
        console.log('[WebRTC Signaling] Connection rejected: No token provided');
        callback(false, 401, 'Authentication required');
        return;
      }
      
      const tokenData = validateSignalingToken(token);
      if (!tokenData) {
        console.log('[WebRTC Signaling] Connection rejected: Invalid or expired token');
        callback(false, 401, 'Invalid or expired token');
        return;
      }
      
      // Store token data on the request for use in connection handler
      (info.req as any).signalingAuth = tokenData;
      callback(true);
    }
  });

  console.log('[WebRTC Signaling] WebSocket server initialized on /ws/signaling (authenticated)');

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const auth = (req as any).signalingAuth as SignalingToken;
    const peerId = `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let currentRoomId: string | null = null;
    let currentParticipantId: string | null = null;

    console.log(`[WebRTC Signaling] Authenticated connection: ${peerId} for user ${auth.userId} (${auth.userName})`);

    ws.on('message', async (data) => {
      try {
        const message: SignalingMessage = JSON.parse(data.toString());

        switch (message.type) {
          case 'join': {
            const { roomId } = message;
            
            // Enforce room authorization from token
            if (!roomId || roomId !== auth.roomId) {
              ws.send(JSON.stringify({ type: 'error', error: 'Unauthorized: Cannot join this room' }));
              console.log(`[WebRTC Signaling] Unauthorized room access attempt: ${roomId} vs authorized ${auth.roomId}`);
              return;
            }

            let room = rooms.get(roomId);
            
            if (!room) {
              // Try to find the session - could be either a LiveInterviewSession or VideoMeeting
              let sessionId: string | null = null;
              
              // First try LiveInterviewSession
              const liveSession = await storage.getLiveInterviewSessionByRoomId(roomId);
              if (liveSession) {
                sessionId = liveSession.id;
              } else {
                // Try VideoMeeting
                const videoMeeting = await storage.getVideoMeetingByRoomId(roomId);
                if (videoMeeting) {
                  sessionId = videoMeeting.id;
                }
              }
              
              if (!sessionId) {
                ws.send(JSON.stringify({ type: 'error', error: 'Invalid room ID - session not found' }));
                console.log(`[WebRTC Signaling] Room not found: ${roomId}`);
                return;
              }
              
              // Verify the session matches the token's session
              if (sessionId !== auth.sessionId) {
                ws.send(JSON.stringify({ type: 'error', error: 'Session mismatch - unauthorized' }));
                console.log(`[WebRTC Signaling] Session mismatch: ${sessionId} vs ${auth.sessionId}`);
                return;
              }
              
              // Check if waiting room is enabled for video meetings
              let waitingRoomEnabled = false;
              const videoMeetingCheck = await storage.getVideoMeetingByRoomId(roomId);
              if (videoMeetingCheck && videoMeetingCheck.waitingRoomEnabled) {
                waitingRoomEnabled = true;
              }

              room = {
                roomId,
                sessionId,
                participants: new Map(),
                waitingRoom: new Map(),
                createdAt: new Date(),
                isRecording: false,
                waitingRoomEnabled,
              };
              rooms.set(roomId, room);
              console.log(`[WebRTC Signaling] Created room: ${roomId} for session ${sessionId} (waiting room: ${waitingRoomEnabled})`);
            }

            currentRoomId = roomId;
            currentParticipantId = `participant-${auth.userId}`;

            const isHost = auth.role === 'interviewer' || auth.role === 'host';

            // Check if waiting room is enabled and user is not the host
            if (room.waitingRoomEnabled && !isHost && room.hostPeerId) {
              // Put participant in waiting room
              const waitingParticipant: WaitingParticipant = {
                peerId,
                participantId: currentParticipantId,
                userId: auth.userId,
                userName: auth.userName,
                role: auth.role,
                ws,
                requestedAt: new Date(),
                auth,
              };

              room.waitingRoom.set(peerId, waitingParticipant);

              // Notify the participant they're in the waiting room
              ws.send(JSON.stringify({
                type: 'waiting-room',
                roomId,
                peerId,
                message: 'Please wait for the host to admit you.',
              }));

              // Notify host about new waiting participant
              if (room.hostPeerId) {
                const hostParticipant = room.participants.get(room.hostPeerId);
                if (hostParticipant && hostParticipant.ws.readyState === WebSocket.OPEN) {
                  hostParticipant.ws.send(JSON.stringify({
                    type: 'waiting-room-update',
                    roomId,
                    waitingParticipants: Array.from(room.waitingRoom.values()).map(p => ({
                      peerId: p.peerId,
                      participantId: p.participantId,
                      userId: p.userId,
                      userName: p.userName,
                      role: p.role,
                      requestedAt: p.requestedAt.toISOString(),
                    })),
                  }));
                }
              }

              console.log(`[WebRTC Signaling] ${auth.userName} added to waiting room for ${roomId}`);
              break;
            }

            // Use authenticated user data from token, not from client message
            const participant: Participant = {
              participantId: currentParticipantId,
              peerId,
              userId: auth.userId,
              userName: auth.userName,
              role: auth.role,
              ws,
              joinedAt: new Date(),
            };

            room.participants.set(peerId, participant);

            if (isHost) {
              room.hostPeerId = peerId;
              
              // Send current waiting room list to new host
              if (room.waitingRoom.size > 0) {
                ws.send(JSON.stringify({
                  type: 'waiting-room-update',
                  roomId,
                  waitingParticipants: Array.from(room.waitingRoom.values()).map(p => ({
                    peerId: p.peerId,
                    participantId: p.participantId,
                    userId: p.userId,
                    userName: p.userName,
                    role: p.role,
                    requestedAt: p.requestedAt.toISOString(),
                  })),
                }));
              }
            }

            ws.send(JSON.stringify({
              type: 'joined',
              roomId,
              peerId,
              participantId: currentParticipantId,
              existingParticipants: getParticipantsList(room, peerId),
              isHost: peerId === room.hostPeerId,
            }));

            broadcast(room, {
              type: 'participant-joined',
              roomId,
              peerId,
              participantId: currentParticipantId,
              userId: auth.userId,
              userName: auth.userName,
              role: auth.role,
              participants: getParticipantsList(room),
            }, peerId);

            console.log(`[WebRTC Signaling] ${auth.userName} joined room ${roomId} as ${auth.role}`);
            break;
          }

          case 'offer': {
            const { roomId, payload } = message;
            const room = rooms.get(roomId);
            
            if (room && payload?.targetPeerId) {
              const targetParticipant = room.participants.get(payload.targetPeerId);
              if (targetParticipant && targetParticipant.ws.readyState === WebSocket.OPEN) {
                targetParticipant.ws.send(JSON.stringify({
                  type: 'offer',
                  roomId,
                  fromPeerId: peerId,
                  sdp: payload.sdp,
                }));
              }
            }
            break;
          }

          case 'answer': {
            const { roomId, payload } = message;
            const room = rooms.get(roomId);
            
            if (room && payload?.targetPeerId) {
              const targetParticipant = room.participants.get(payload.targetPeerId);
              if (targetParticipant && targetParticipant.ws.readyState === WebSocket.OPEN) {
                targetParticipant.ws.send(JSON.stringify({
                  type: 'answer',
                  roomId,
                  fromPeerId: peerId,
                  sdp: payload.sdp,
                }));
              }
            }
            break;
          }

          case 'ice-candidate': {
            const { roomId, payload } = message;
            const room = rooms.get(roomId);
            
            if (room && payload?.targetPeerId && payload?.candidate) {
              const targetParticipant = room.participants.get(payload.targetPeerId);
              if (targetParticipant && targetParticipant.ws.readyState === WebSocket.OPEN) {
                targetParticipant.ws.send(JSON.stringify({
                  type: 'ice-candidate',
                  roomId,
                  fromPeerId: peerId,
                  candidate: payload.candidate,
                }));
              }
            }
            break;
          }

          case 'session-state': {
            const { roomId, payload } = message;
            const room = rooms.get(roomId);
            
            if (room) {
              if (payload?.isRecording !== undefined) {
                room.isRecording = payload.isRecording;
              }
              
              broadcast(room, {
                type: 'session-state',
                roomId,
                state: {
                  isRecording: room.isRecording,
                  hostPeerId: room.hostPeerId,
                  participantCount: room.participants.size,
                  ...payload,
                },
              });
            }
            break;
          }

          case 'chat': {
            const { roomId, payload } = message;
            const room = rooms.get(roomId);
            
            if (room && payload?.message) {
              const participant = room.participants.get(peerId);
              const timestamp = new Date().toISOString();
              
              // Persist chat message to database (async, non-blocking)
              (async () => {
                try {
                  // Get meeting by roomId
                  const meeting = await storage.getVideoMeetingByRoomId(roomId);
                  if (meeting) {
                    await storage.createVideoMeetingChatMessage({
                      meetingId: meeting.id,
                      senderId: participant?.userId || null,
                      senderName: participant?.userName || 'Unknown',
                      content: payload.message,
                      messageType: 'text',
                    });
                  }
                } catch (err) {
                  console.error('[Chat] Failed to persist message:', err);
                }
              })();
              
              broadcast(room, {
                type: 'chat',
                roomId,
                fromPeerId: peerId,
                userName: participant?.userName || 'Unknown',
                message: payload.message,
                timestamp,
              });
            }
            break;
          }

          case 'participant-update': {
            const { roomId, payload } = message;
            const room = rooms.get(roomId);
            
            if (room) {
              const participant = room.participants.get(peerId);
              if (participant) {
                if (payload?.audioEnabled !== undefined) {
                  (participant as any).audioEnabled = payload.audioEnabled;
                }
                if (payload?.videoEnabled !== undefined) {
                  (participant as any).videoEnabled = payload.videoEnabled;
                }
                if (payload?.screenSharing !== undefined) {
                  (participant as any).screenSharing = payload.screenSharing;
                }
                
                broadcast(room, {
                  type: 'participant-update',
                  roomId,
                  peerId,
                  participantId: participant.participantId,
                  ...payload,
                });
              }
            }
            break;
          }

          case 'admit-participant': {
            const { roomId, peerId: targetPeerId } = message;
            const room = rooms.get(roomId);
            
            if (room && targetPeerId) {
              // Only host can admit participants
              if (peerId !== room.hostPeerId) {
                ws.send(JSON.stringify({ type: 'error', error: 'Only host can admit participants' }));
                break;
              }
              
              const waitingParticipant = room.waitingRoom.get(targetPeerId);
              if (waitingParticipant) {
                // Remove from waiting room
                room.waitingRoom.delete(targetPeerId);
                
                // Add to participants
                const participant: Participant = {
                  participantId: waitingParticipant.participantId,
                  peerId: waitingParticipant.peerId,
                  userId: waitingParticipant.userId,
                  userName: waitingParticipant.userName,
                  role: waitingParticipant.role,
                  ws: waitingParticipant.ws,
                  joinedAt: new Date(),
                };
                
                room.participants.set(targetPeerId, participant);
                
                // Notify admitted participant
                waitingParticipant.ws.send(JSON.stringify({
                  type: 'admitted',
                  roomId,
                  peerId: targetPeerId,
                  participantId: waitingParticipant.participantId,
                  existingParticipants: getParticipantsList(room, targetPeerId),
                  isHost: false,
                }));
                
                // Broadcast new participant to everyone
                broadcast(room, {
                  type: 'participant-joined',
                  roomId,
                  peerId: targetPeerId,
                  participantId: waitingParticipant.participantId,
                  userId: waitingParticipant.userId,
                  userName: waitingParticipant.userName,
                  role: waitingParticipant.role,
                  participants: getParticipantsList(room),
                }, targetPeerId);
                
                // Update host's waiting room list
                ws.send(JSON.stringify({
                  type: 'waiting-room-update',
                  roomId,
                  waitingParticipants: Array.from(room.waitingRoom.values()).map(p => ({
                    peerId: p.peerId,
                    participantId: p.participantId,
                    userId: p.userId,
                    userName: p.userName,
                    role: p.role,
                    requestedAt: p.requestedAt.toISOString(),
                  })),
                }));
                
                console.log(`[WebRTC Signaling] ${waitingParticipant.userName} admitted to ${roomId}`);
              }
            }
            break;
          }

          case 'deny-participant': {
            const { roomId, peerId: targetPeerId } = message;
            const room = rooms.get(roomId);
            
            if (room && targetPeerId) {
              // Only host can deny participants
              if (peerId !== room.hostPeerId) {
                ws.send(JSON.stringify({ type: 'error', error: 'Only host can deny participants' }));
                break;
              }
              
              const waitingParticipant = room.waitingRoom.get(targetPeerId);
              if (waitingParticipant) {
                // Remove from waiting room
                room.waitingRoom.delete(targetPeerId);
                
                // Notify denied participant
                waitingParticipant.ws.send(JSON.stringify({
                  type: 'denied',
                  roomId,
                  message: 'Your request to join the meeting was denied by the host.',
                }));
                
                // Close their connection
                waitingParticipant.ws.close();
                
                // Update host's waiting room list
                ws.send(JSON.stringify({
                  type: 'waiting-room-update',
                  roomId,
                  waitingParticipants: Array.from(room.waitingRoom.values()).map(p => ({
                    peerId: p.peerId,
                    participantId: p.participantId,
                    userId: p.userId,
                    userName: p.userName,
                    role: p.role,
                    requestedAt: p.requestedAt.toISOString(),
                  })),
                }));
                
                console.log(`[WebRTC Signaling] ${waitingParticipant.userName} denied from ${roomId}`);
              }
            }
            break;
          }

          case 'leave': {
            handleLeave(peerId, currentRoomId);
            break;
          }

          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;
          }
        }
      } catch (error) {
        console.error('[WebRTC Signaling] Error processing message:', error);
        ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      console.log(`[WebRTC Signaling] Connection closed: ${peerId}`);
      handleLeave(peerId, currentRoomId);
    });

    ws.on('error', (error) => {
      console.error(`[WebRTC Signaling] WebSocket error for ${peerId}:`, error);
    });

    function handleLeave(leavingPeerId: string, roomId: string | null) {
      if (!roomId) return;
      
      const room = rooms.get(roomId);
      if (!room) return;

      const participant = room.participants.get(leavingPeerId);
      if (participant) {
        room.participants.delete(leavingPeerId);
        
        broadcast(room, {
          type: 'participant-left',
          roomId,
          peerId: leavingPeerId,
          participantId: participant.participantId,
          participants: getParticipantsList(room),
        });

        console.log(`[WebRTC Signaling] ${participant.userName} left room ${roomId}`);

        if (room.participants.size === 0) {
          rooms.delete(roomId);
          console.log(`[WebRTC Signaling] Room ${roomId} closed (no participants)`);
        }
      }
    }
  });

  setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, roomId) => {
      room.participants.forEach((participant, peerId) => {
        if (participant.ws.readyState === WebSocket.OPEN) {
          participant.ws.ping();
        } else {
          room.participants.delete(peerId);
          broadcast(room, {
            type: 'participant-left',
            roomId,
            peerId,
            participantId: participant.participantId,
            participants: getParticipantsList(room),
          });
        }
      });
      
      if (room.participants.size === 0) {
        const roomAge = now - room.createdAt.getTime();
        if (roomAge > 30 * 60 * 1000) {
          rooms.delete(roomId);
          console.log(`[WebRTC Signaling] Cleaned up stale room: ${roomId}`);
        }
      }
    });
  }, 30000);

  return wss;
}

export function getRoomInfo(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function getActiveRooms(): Array<{ roomId: string; participantCount: number; isRecording: boolean }> {
  return Array.from(rooms.entries()).map(([roomId, room]) => ({
    roomId,
    participantCount: room.participants.size,
    isRecording: room.isRecording,
  }));
}
