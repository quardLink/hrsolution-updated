import * as faceapi from "@vladmandic/face-api";

// Self-hosted in public/models (copied from @vladmandic/face-api's own
// weights) so the kiosk never depends on an external CDN being reachable.
const MODEL_URL = `${import.meta.env.BASE_URL}models`.replace(/([^:])\/\/+/g, "$1/");

let modelsPromise: Promise<void> | null = null;

export function loadFaceModels(): Promise<void> {
  if (!modelsPromise) {
    modelsPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]).then(() => undefined);
  }
  return modelsPromise;
}

// Single-shot detection: one face, well-lit, roughly centered. Returns the
// 128-d recognition descriptor as a plain number[] (JSON-transportable),
// or null if no face was found in this frame.
export async function detectFaceDescriptor(video: HTMLVideoElement): Promise<number[] | null> {
  await loadFaceModels();
  const result = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  return result ? Array.from(result.descriptor) : null;
}

export async function openCamera(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 480 } },
    audio: false,
  });
}

export function stopCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}
