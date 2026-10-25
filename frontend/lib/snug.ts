export type Pt = { x: number; y: number };
export type PointName =
  | "right_shoulder"
  | "left_shoulder"
  | "chest_clip"
  | "right_strap"
  | "left_strap"
  | "hips";
export type Points = Partial<Record<PointName, Pt>>;
export type Flag = { present: boolean | null; confidence: number };
export type Flags = { coat?: Flag; twist?: Flag };
export type Status = "pass" | "fail" | "unsure" | "todo";
export type Item = {
  id: string;
  status: Status;
  title: string;
  detail: string;
  fix: string | null;
  at: Pt | null;
  group: "photo" | "hands" | "label";
};
export type Headline = "fix" | "unsure" | "passed";
export type Result = {
  direction: "rear" | "forward";
  items: Item[];
  photo_headline: Headline;
  headline: Headline;
  counts: Record<Status, number>;
  lines: { shoulder_y: number; armpit_y: number } | null;
};

// Tap order. Left/right are as the parent sees the photo (the child's right is on the left).
export const TARGETS: { name: PointName; label: string; hint: string }[] = [
  {
    name: "right_shoulder",
    label: "Tap the shoulder on the left side of the photo",
    hint: "Where the shoulder meets the strap.",
  },
  {
    name: "left_shoulder",
    label: "Tap the shoulder on the right side of the photo",
    hint: "Where the shoulder meets the strap.",
  },
  {
    name: "chest_clip",
    label: "Tap the chest clip",
    hint: "The plastic clip that joins the two straps.",
  },
  {
    name: "right_strap",
    label: "Tap where the left strap comes out of the seat",
    hint: "The slot in the seat back, behind the shoulder.",
  },
  {
    name: "left_strap",
    label: "Tap where the right strap comes out of the seat",
    hint: "The slot in the seat back, behind the shoulder.",
  },
  {
    name: "hips",
    label: "Tap the middle of the hips",
    hint: "Where the legs meet the body.",
  },
];

// Sample illustrations ship with their points marked (600 x 800 drawing).
const px = (x: number, y: number): Pt => ({ x: x / 600, y: y / 800 });
const base: Points = {
  right_shoulder: px(214, 332),
  left_shoulder: px(386, 332),
  right_strap: px(245, 338),
  left_strap: px(355, 338),
  hips: px(300, 600),
};
export const SAMPLES = {
  "clip-low": {
    src: "/samples/clip-low.svg",
    label: "Sample: clip too low",
    points: { ...base, chest_clip: px(300, 520) } as Points,
  },
  fixed: {
    src: "/samples/fixed.svg",
    label: "Sample: fixed",
    points: { ...base, chest_clip: px(300, 386) } as Points,
  },
};
export type SampleKey = keyof typeof SAMPLES;
export const SAMPLE_FACE: Pt = px(300, 208);

export const HEADLINES: Record<Headline, { title: string; body: string }> = {
  fix: {
    title: "Fix before you drive",
    body: "Each red mark has a one-line fix. Fix it, then retake the photo.",
  },
  unsure: {
    title: "Some checks couldn’t be confirmed",
    body: "Snug won’t guess. Retake the photo, or ask a technician to look.",
  },
  passed: {
    title: "Visible checks passed",
    body: "Everything a photo can show looks right. Now do the hands-on tests, which a photo can’t judge.",
  },
};

export const STATUS_LABEL: Record<Status, string> = {
  pass: "Looks right",
  fail: "Fix this",
  unsure: "Couldn’t tell",
  todo: "Not checked yet",
};

export const TECH_URL =
  "https://www.nhtsa.gov/equipment/car-seats-and-booster-seats#installation-help-inspection";
export const RECALL_URL = "https://www.nhtsa.gov/recalls";

export async function loadCanvas(src: string, max = 1280) {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  await img.decode();
  const w = img.naturalWidth || 600;
  const h = img.naturalHeight || 800;
  const scale = Math.min(1, max / Math.max(w, h)) * (w < 700 ? 1.5 : 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Pixelates a circle so the face is unrecognizable. Runs on the parent's device.
export function blurFace(canvas: HTMLCanvasElement, at: Pt, size = 0.17) {
  const ctx = canvas.getContext("2d")!;
  const r = size * Math.min(canvas.width, canvas.height);
  const cx = at.x * canvas.width;
  const cy = at.y * canvas.height;
  const x = Math.max(0, cx - r);
  const y = Math.max(0, cy - r);
  const w = Math.min(canvas.width - x, 2 * r);
  const h = Math.min(canvas.height - y, 2 * r);
  const block = Math.max(6, Math.round(r / 5));
  const small = document.createElement("canvas");
  small.width = Math.max(1, Math.round(w / block));
  small.height = Math.max(1, Math.round(h / block));
  small.getContext("2d")!.drawImage(canvas, x, y, w, h, 0, 0, small.width, small.height);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, small.width, small.height, x, y, w, h);
  ctx.restore();
}
