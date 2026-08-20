import * as faceapi from "@vladmandic/face-api";

// Self-hosted in public/models (copied from @vladmandic/face-api's own
// weights) so the kiosk never depends on an external CDN being reachable.
const MODEL_URL = `${import.meta.env.BASE_URL}models`.replace(/([^:])\/\/+/g, "$1/");

// @vladmandic/face-api's own type declarations don't expose tf.ready(),
// even though it exists at runtime (it's re-exported from the bundled
// tfjs-core) — needed below to pick and initialize a backend before
// loadFromUri builds tensors for the weights.
const tfReady = (faceapi.tf as unknown as { ready: () => Promise<void> }).ready;

let modelsPromise: Promise<void> | null = null;

export function loadFaceModels(): Promise<void> {
  if (modelsPromise) return modelsPromise;

  const promise = tfReady()
    // Without waiting for a backend first, loadFromUri can throw
    // "backend has not yet been initialized" on the very first call —
    // that used to strand the capture UI on a permanent error.
    .then(() =>
      Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]),
    )
    .then(() => undefined)
    .catch((err: unknown) => {
      // don't cache a permanent failure — let the next attempt retry the
      // load instead of instantly replaying the same rejection
      modelsPromise = null;
      throw err;
    });

  modelsPromise = promise;
  return promise;
}

// A cold model load + first WebGL shader compile can take several seconds
// on a modest tablet, and any thrown error inside that chain would
// otherwise leave a caller's "loading" button spinning forever with no
// way out. Every detection call is wrapped in this so a stall or a
// rejected promise always resolves to "give up" instead of hanging the UI.
function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Face detection timed out")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

// Single-shot detection: one face, well-lit, roughly centered. Returns the
// 128-d recognition descriptor as a plain number[] (JSON-transportable),
// or null if no face was found in this frame.
export async function detectFaceDescriptor(video: HTMLVideoElement): Promise<number[] | null> {
  await loadFaceModels();
  const task = faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  const result = await withTimeout(Promise.resolve(task), 8000);
  return result ? Array.from(result.descriptor) : null;
}

// Landmarks only (no recognition descriptor) — used for the liveness/blink
// check once a descriptor has already been captured, since it's
// meaningfully cheaper per frame and we only need eye positions here.
export async function detectFaceLandmarks(video: HTMLVideoElement): Promise<faceapi.Point[][] | null> {
  await loadFaceModels();
  const task = faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();
  const result = await withTimeout(Promise.resolve(task), 8000);
  if (!result) return null;
  return [result.landmarks.getLeftEye(), result.landmarks.getRightEye()];
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
