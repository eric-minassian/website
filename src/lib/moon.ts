// Lunar phase from the low-precision series in Jean Meeus, "Astronomical Algorithms", ch. 48.
// New and full moon times land within about ten minutes of published tables.

const DAY_MS = 86_400_000;
const RAD = Math.PI / 180;
const SEARCH_STEP_MS = 2 * 3_600_000;

const sin = (deg: number): number => Math.sin(deg * RAD);
const cos = (deg: number): number => Math.cos(deg * RAD);
const wrap360 = (deg: number): number => ((deg % 360) + 360) % 360;

export interface MoonPosition {
  /** Degrees east of the sun: 0 new, 90 first quarter, 180 full, 270 last quarter. */
  elongation: number;
  /** Fraction of the disc that is lit, 0 to 1. */
  illumination: number;
}

export const moonPosition = (ms: number): MoonPosition => {
  const t = (ms / DAY_MS + 2_440_587.5 - 2_451_545) / 36_525;
  const d = 297.8501921 + 445267.1114034 * t - 0.0018819 * t * t;
  const m = 357.5291092 + 35999.0502909 * t - 0.0001536 * t * t;
  const mp = 134.9633964 + 477198.8675055 * t + 0.0087414 * t * t;
  const phaseAngle =
    180 -
    d -
    6.289 * sin(mp) +
    2.1 * sin(m) -
    1.274 * sin(2 * d - mp) -
    0.658 * sin(2 * d) -
    0.214 * sin(2 * mp) -
    0.11 * sin(d);

  return { elongation: wrap360(180 - phaseAngle), illumination: (1 + cos(phaseAngle)) / 2 };
};

// Signed distance in degrees from `target` to the elongation at `ms`, in [-180, 180).
const offsetFrom = (ms: number, target: number): number =>
  wrap360(moonPosition(ms).elongation - target + 180) - 180;

/** The next time (searching forwards or backwards from `ms`) the elongation reaches `target`. */
export const findElongation = (ms: number, target: number, direction: 1 | -1 = 1): number => {
  let a = ms;
  let fa = offsetFrom(a, target);

  // Step in two-hour increments until the sign flips, skipping the wrap at the opposite point.
  for (let step = 0; step < 400; step++) {
    const b = a + direction * SEARCH_STEP_MS;
    const fb = offsetFrom(b, target);

    if (Math.sign(fa) !== Math.sign(fb) && Math.abs(fa - fb) < 90) {
      let lo = a;
      let hi = b;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        if (Math.sign(offsetFrom(mid, target)) === Math.sign(offsetFrom(lo, target))) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    }

    a = b;
    fa = fb;
  }

  return ms;
};

export interface MoonPhase extends MoonPosition {
  name: string;
  waxing: boolean;
  /** Days since the last new moon. */
  ageDays: number;
  /** The next full or new moon, skipping the one the moon is currently at. */
  next: { name: "Full moon" | "New moon"; at: number };
}

const phaseName = ({ illumination, elongation }: MoonPosition): string => {
  const waxing = elongation < 180;
  if (illumination < 0.03) return "New moon";
  if (illumination > 0.97) return "Full moon";
  if (Math.abs(illumination - 0.5) < 0.03) return waxing ? "First quarter" : "Last quarter";
  return `${waxing ? "Waxing" : "Waning"} ${illumination < 0.5 ? "crescent" : "gibbous"}`;
};

export const moonPhase = (ms: number): MoonPhase => {
  const position = moonPosition(ms);
  const waxing = position.elongation < 180;
  const name = phaseName(position);
  // While the moon is already (nearly) full or new, look ahead to the other one.
  const nextIsFull = name === "Full moon" ? false : name === "New moon" ? true : waxing;

  return {
    ...position,
    name,
    waxing,
    ageDays: (ms - findElongation(ms, 0, -1)) / DAY_MS,
    next: nextIsFull
      ? { name: "Full moon", at: findElongation(ms, 180) }
      : { name: "New moon", at: findElongation(ms, 0) },
  };
};

/**
 * Unit vector towards the sun as seen by the viewer (x right, y up, z towards the screen), drawn
 * for the northern hemisphere: the lit limb is on the right while waxing.
 */
export const sunDirection = (elongation: number): [number, number, number] => {
  const phaseAngle = Math.abs(180 - elongation);
  const x = (elongation < 180 ? 1 : -1) * sin(phaseAngle);
  const y = 0.08;
  const z = cos(phaseAngle);
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
};
