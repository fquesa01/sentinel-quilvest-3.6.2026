// ElevenLabs API configuration
// Note: FormData and Blob are available as globals in Node.js 20+
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

/**
 * Validate API key is configured
 * @throws Error if API key is missing
 */
function validateApiKey(): void {
  if (!ELEVENLABS_API_KEY) {
    throw new Error(
      "ELEVENLABS_API_KEY environment variable is not configured. " +
      "Please set this secret in your Replit environment."
    );
  }
}

export interface TranscriptionSegment {
  text: string;
  isFinal: boolean;
  confidence?: number;
  timestampMs: number;
  speakerId?: number | null;
  speakerLabel?: string | null;
}

export interface TranscriptionResult {
  fullText: string;
  segments: TranscriptionSegment[];
  duration: number;
  speakers?: Array<{ id: number; label: string }>;
}

/**
 * Transcribe audio from a video/audio file (post-recording transcription)
 * 
 * Uses the ElevenLabs REST API to transcribe pre-recorded audio files.
 * 
 * @param audioBuffer - Audio data as Buffer
 * @param options - Transcription options
 * @param options.language - Language code (e.g., 'en', 'es'). Leave empty for auto-detect.
 * @param options.mimeType - MIME type of the audio file (e.g., 'audio/webm', 'audio/mp3')
 * @param options.filename - Original filename (used for format detection)
 * @returns Transcription result with full text and timestamped segments
 */
export async function transcribeAudioFile(
  audioBuffer: Buffer,
  options: {
    language?: string;
    mimeType?: string;
    filename?: string;
    enableDiarization?: boolean;
    numSpeakers?: number;
  } = {}
): Promise<TranscriptionResult> {
  const { 
    language = "", 
    mimeType = "audio/webm", 
    filename = "audio.webm",
    enableDiarization = true,
    numSpeakers,
  } = options;
  try {
    validateApiKey();
    console.log("[ELEVENLABS] Starting post-recording transcription with diarization:", enableDiarization);
    
    // Create form data for multipart/form-data upload using native FormData/Blob
    const formData = new FormData();
    
    // Use correct field name 'file' with native Blob and caller-provided MIME type
    const audioBlob = new Blob([audioBuffer], { type: mimeType });
    formData.append('file', audioBlob, filename);
    formData.append('model_id', 'scribe_v1');
    if (language) {
      formData.append('language_code', language);
    }
    // Enable word-level timestamps
    formData.append('timestamps_granularity', 'word');
    
    // Enable speaker diarization to identify different speakers
    if (enableDiarization) {
      formData.append('diarize', 'true');
      if (numSpeakers) {
        formData.append('num_speakers', numSpeakers.toString());
      }
    }

    // Call ElevenLabs Speech-to-Text API
    // Note: fetch automatically sets Content-Type with boundary for FormData
    const response = await fetch(`${ELEVENLABS_BASE_URL}/speech-to-text`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY!,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const fullText = data.text || "";
    const segments: TranscriptionSegment[] = [];
    
    // Track unique speakers from diarization
    const uniqueSpeakers = new Map<string, number>();

    // Process word-level timestamps if available
    // Note: API may return 'start'/'end' in seconds, not 'start_ms'
    if (data.words && Array.isArray(data.words)) {
      data.words.forEach((word: any) => {
        // Extract speaker ID from diarization (format: "speaker_0", "speaker_1", etc.)
        let speakerId: number | null = null;
        let speakerLabel: string | null = null;
        
        if (word.speaker_id) {
          // Parse speaker_id like "speaker_0" to numeric ID
          const match = word.speaker_id.match(/speaker_(\d+)/);
          if (match) {
            speakerId = parseInt(match[1], 10);
            speakerLabel = `Speaker ${speakerId + 1}`;
            
            if (!uniqueSpeakers.has(word.speaker_id)) {
              uniqueSpeakers.set(word.speaker_id, speakerId);
            }
          }
        }
        
        segments.push({
          text: word.text,
          isFinal: true,
          confidence: word.confidence,
          // Convert seconds to milliseconds if needed
          timestampMs: word.start_ms || (word.start ? word.start * 1000 : 0),
          speakerId,
          speakerLabel,
        });
      });
    } else {
      // Fallback: single segment
      segments.push({
        text: fullText,
        isFinal: true,
        timestampMs: 0,
        speakerId: null,
        speakerLabel: null,
      });
    }
    
    // Build speakers array from unique speakers
    const speakers = Array.from(uniqueSpeakers.entries()).map(([id, idx]) => ({
      id: idx,
      label: `Speaker ${idx + 1}`,
    }));

    console.log("[ELEVENLABS] Post-recording transcription complete:", {
      textLength: fullText.length,
      segmentCount: segments.length,
      speakerCount: speakers.length,
    });

    return {
      fullText,
      segments,
      duration: data.duration_ms || 0,
      speakers: speakers.length > 0 ? speakers : undefined,
    };
  } catch (error: any) {
    console.error("[ELEVENLABS] Error during post-recording transcription:", error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

/**
 * Generate a single-use token for client-side real-time transcription
 * 
 * The client will use this token to connect directly to ElevenLabs WebSocket.
 * Token expires after 15 minutes.
 * 
 * @returns Single-use token for Scribe v2 Realtime WebSocket connection
 */
export async function generateRealtimeToken(): Promise<string> {
  try {
    validateApiKey();
    console.log("[ELEVENLABS] Generating single-use realtime token...");
    
    // Single-use token endpoint for realtime scribe - no body needed
    const response = await fetch(`${ELEVENLABS_BASE_URL}/single-use-token/realtime_scribe`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY!,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to generate token: ${response.status} - ${error}`);
    }

    const data = await response.json();
    console.log("[ELEVENLABS] Single-use token generated successfully");
    
    return data.token;
  } catch (error: any) {
    console.error("[ELEVENLABS] Error generating realtime token:", error);
    throw new Error(`Token generation failed: ${error.message}`);
  }
}

/**
 * Transcribe a video file
 * 
 * The ElevenLabs API accepts both audio and video files directly.
 * The API will extract and transcribe the audio track automatically.
 * 
 * @param videoBuffer - Video file as Buffer
 * @param options - Transcription options
 * @param options.language - Language code for transcription
 * @param options.mimeType - MIME type of the video file (e.g., 'video/webm', 'video/mp4')
 * @param options.filename - Original filename (used for format detection)
 * @returns Transcription result
 */
export async function transcribeVideoFile(
  videoBuffer: Buffer,
  options: {
    language?: string;
    mimeType?: string;
    filename?: string;
  } = {}
): Promise<TranscriptionResult> {
  const { language = "", mimeType = "video/webm", filename = "video.webm" } = options;
  try {
    validateApiKey();
    console.log("[ELEVENLABS] Starting video transcription...");
    
    // Create form data with video file
    // ElevenLabs API accepts video formats and extracts audio automatically
    const formData = new FormData();
    const videoBlob = new Blob([videoBuffer], { type: mimeType });
    formData.append('file', videoBlob, filename);
    formData.append('model_id', 'scribe_v1');
    if (language) {
      formData.append('language_code', language);
    }
    formData.append('timestamps_granularity', 'word');

    // Call ElevenLabs Speech-to-Text API
    const response = await fetch(`${ELEVENLABS_BASE_URL}/speech-to-text`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY!,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const fullText = data.text || "";
    const segments: TranscriptionSegment[] = [];

    // Process word-level timestamps
    if (data.words && Array.isArray(data.words)) {
      data.words.forEach((word: any) => {
        segments.push({
          text: word.text,
          isFinal: true,
          confidence: word.confidence,
          timestampMs: word.start_ms || (word.start ? word.start * 1000 : 0),
        });
      });
    } else {
      segments.push({
        text: fullText,
        isFinal: true,
        timestampMs: 0,
      });
    }

    console.log("[ELEVENLABS] Video transcription complete:", {
      textLength: fullText.length,
      segmentCount: segments.length,
    });

    return {
      fullText,
      segments,
      duration: data.duration_ms || 0,
    };
  } catch (error: any) {
    console.error("[ELEVENLABS] Error during video transcription:", error);
    throw new Error(`Video transcription failed: ${error.message}`);
  }
}
