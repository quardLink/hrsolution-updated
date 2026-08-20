interface Point {
  x: number;
  y: number;
}

// Standard eye-aspect-ratio formula (Soukupová & Čech): ratio of the eye's
// vertical opening to its width, from the 6 contour points face-api.js's
// 68-point landmark model returns per eye. It drops sharply during a
// blink and recovers once the eye reopens.
function eyeAspectRatio(eye: Point[]): number {
  const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  const vertical = dist(eye[1], eye[5]) + dist(eye[2], eye[4]);
  const horizontal = dist(eye[0], eye[3]);
  return horizontal === 0 ? 0 : vertical / (2 * horizontal);
}

const EAR_BLINK_THRESHOLD = 0.22;

// A blink defeats a static photo or a paused video frame held up to the
// camera — it can't blink on cue the way a real person glances and
// naturally blinks within a few seconds. Not foolproof against a
// pre-recorded video of the enrolled person, but that's a much higher bar
// than the realistic "hold up a phone photo" attack this is aimed at.
export function createBlinkDetector() {
  let framesBelowThreshold = 0;
  let blinkDetected = false;

  return {
    // Feed one frame's eye landmarks; returns true once a full blink
    // (close then reopen) has been observed since the last reset().
    update(leftEye: Point[], rightEye: Point[]): boolean {
      const ear = (eyeAspectRatio(leftEye) + eyeAspectRatio(rightEye)) / 2;
      if (ear < EAR_BLINK_THRESHOLD) {
        framesBelowThreshold++;
      } else {
        if (framesBelowThreshold >= 1) blinkDetected = true;
        framesBelowThreshold = 0;
      }
      return blinkDetected;
    },
    reset(): void {
      framesBelowThreshold = 0;
      blinkDetected = false;
    },
  };
}
