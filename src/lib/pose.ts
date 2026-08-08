import { FilesetResolver, PoseLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

export function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM);
      return PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
        runningMode: "IMAGE",
        numPoses: 1,
      });
    })();
  }
  return landmarkerPromise;
}

export type PoseResult = {
  landmarks: NormalizedLandmark[];
  shoulderTilt: number;
  hipTilt: number;
  headOffset: number;
  score: number;
  notes: string[];
};

/** Runs MediaPipe pose landmark detection in the browser on one photo. */
export async function analyzePhoto(file: File): Promise<PoseResult | null> {
  const landmarker = await getLandmarker();
  const bitmap = await createImageBitmap(file);
  const result = landmarker.detect(bitmap as unknown as HTMLImageElement);
  bitmap.close();

  const landmarks = result.landmarks?.[0];
  if (!landmarks || landmarks.length < 25) return null;

  const at = (i: number) => landmarks[i]!;
  const shoulderL = at(11);
  const shoulderR = at(12);
  const hipL = at(23);
  const hipR = at(24);
  const nose = at(0);

  const shoulderTilt = Math.abs(shoulderL.y - shoulderR.y);
  const hipTilt = Math.abs(hipL.y - hipR.y);
  const midShoulderX = (shoulderL.x + shoulderR.x) / 2;
  const headOffset = Math.abs(nose.x - midShoulderX);

  const notes: string[] = [];
  if (shoulderTilt > 0.03) notes.push("Uneven shoulder height detected — one shoulder sits higher.");
  if (hipTilt > 0.03) notes.push("Pelvic tilt detected — hips are not level.");
  if (headOffset > 0.04) notes.push("Head is offset from the shoulder midline (forward/lateral head carriage).");
  if (!notes.length) notes.push("Alignment looks balanced across shoulders, hips and head.");

  const penalty = Math.min(shoulderTilt * 500 + hipTilt * 500 + headOffset * 300, 55);
  const score = Math.max(45, Math.round(100 - penalty));

  return { landmarks, shoulderTilt, hipTilt, headOffset, score, notes };
}

export function drawSkeleton(canvas: HTMLCanvasElement, image: HTMLImageElement, landmarks: NormalizedLandmark[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  ctx.drawImage(image, 0, 0);
  ctx.strokeStyle = "rgb(198,241,53)";
  ctx.fillStyle = "rgb(198,241,53)";
  ctx.lineWidth = Math.max(2, canvas.width / 250);

  for (const [a, b] of PoseLandmarker.POSE_CONNECTIONS.map((c) => [c.start, c.end] as const)) {
    const p1 = landmarks[a];
    const p2 = landmarks[b];
    if (!p1 || !p2) continue;
    ctx.beginPath();
    ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
    ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
    ctx.stroke();
  }
  for (const p of landmarks) {
    ctx.beginPath();
    ctx.arc(p.x * canvas.width, p.y * canvas.height, ctx.lineWidth * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}
