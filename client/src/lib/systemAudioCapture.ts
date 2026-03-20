export type SystemAudioCaptureResult = {
  combinedStream: MediaStream;
  systemStream: MediaStream;
  audioContext: AudioContext;
  cleanup: () => void;
};

export type SystemAudioPlaybackResult = {
  systemStream: MediaStream;
  audioContext: AudioContext;
  cleanup: () => void;
};

async function acquireSystemStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video: false,
      audio: true,
    } as DisplayMediaStreamOptions);
  } catch (firstErr: any) {
    if (firstErr.name === "NotAllowedError") {
      throw firstErr;
    }
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: 1, height: 1, frameRate: 1 },
      audio: true,
    } as DisplayMediaStreamOptions);
    stream.getVideoTracks().forEach((t) => t.stop());
    return stream;
  }
}

function validateSystemAudio(systemStream: MediaStream): void {
  const systemAudioTracks = systemStream.getAudioTracks();
  if (systemAudioTracks.length === 0) {
    systemStream.getTracks().forEach((t) => t.stop());
    throw new Error("NO_SYSTEM_AUDIO");
  }
}

export async function captureSystemAudio(
  micStream: MediaStream
): Promise<SystemAudioCaptureResult> {
  const systemStream = await acquireSystemStream();
  validateSystemAudio(systemStream);

  const systemAudioTracks = systemStream.getAudioTracks();
  const audioContext = new AudioContext();
  const micSource = audioContext.createMediaStreamSource(micStream);
  const systemSource = audioContext.createMediaStreamSource(
    new MediaStream(systemAudioTracks)
  );

  const destination = audioContext.createMediaStreamDestination();

  micSource.connect(destination);
  systemSource.connect(destination);

  const combinedStream = destination.stream;

  const cleanup = () => {
    try {
      micSource.disconnect();
    } catch (_) {}
    try {
      systemSource.disconnect();
    } catch (_) {}
    systemStream.getTracks().forEach((t) => t.stop());
    if (audioContext.state !== "closed") {
      audioContext.close().catch(() => {});
    }
  };

  systemAudioTracks[0].addEventListener("ended", cleanup, { once: true });

  return { combinedStream, systemStream, audioContext, cleanup };
}

export async function captureSystemAudioPlayback(): Promise<SystemAudioPlaybackResult> {
  const systemStream = await acquireSystemStream();
  validateSystemAudio(systemStream);

  const systemAudioTracks = systemStream.getAudioTracks();
  const audioContext = new AudioContext();
  const systemSource = audioContext.createMediaStreamSource(
    new MediaStream(systemAudioTracks)
  );

  systemSource.connect(audioContext.destination);

  const cleanup = () => {
    try {
      systemSource.disconnect();
    } catch (_) {}
    systemStream.getTracks().forEach((t) => t.stop());
    if (audioContext.state !== "closed") {
      audioContext.close().catch(() => {});
    }
  };

  systemAudioTracks[0].addEventListener("ended", cleanup, { once: true });

  return { systemStream, audioContext, cleanup };
}

export function isSystemAudioSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === "function"
  );
}
