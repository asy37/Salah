import { useEffect, useMemo, useRef } from "react";

export type FeedbackLevel = "far" | "near" | "aligned";

function normalizeToSigned180(angle: number): number {
  // (-180, 180]
  const normalized = ((angle + 540) % 360) - 180;
  return normalized;
}

/**
 * heading ve qiblaBearing arasındaki farkı hesaplar.
 * angleDiff: -180..+180
 */
export function useQiblaGuide(
  heading: number | null,
  qiblaBearing: number | null
): {
  angleDiff: number;
  isAligned: boolean;
  feedbackLevel: FeedbackLevel;
} {
  const prevLevelRef = useRef<FeedbackLevel>("far");

  const computed = useMemo(() => {
    if (heading === null || qiblaBearing === null) {
      return { angleDiff: 0, isAligned: false, feedbackLevel: "far" as const };
    }

    const angleDiff = normalizeToSigned180(qiblaBearing - heading);
    const abs = Math.abs(angleDiff);

    /**
     * Hysteresis:
     * - aligned'a giriş: <= 3°
     * - aligned'dan çıkış: > 4°
     * - near'a giriş: <= 5°
     * - near'dan çıkış: > 6°
     *
     * Amaç: 1-2° sensör jitter'ında renk/ikonun sürekli değişmesini engellemek.
     */
    const prev = prevLevelRef.current;
    let feedbackLevel: FeedbackLevel = prev;

    if (prev === "aligned") {
      feedbackLevel = abs > 4 ? "near" : "aligned";
    } else if (prev === "near") {
      if (abs <= 3) feedbackLevel = "aligned";
      else feedbackLevel = abs > 6 ? "far" : "near";
    } else {
      // prev === far
      feedbackLevel = abs <= 5 ? "near" : "far";
    }

    return { angleDiff, isAligned: feedbackLevel === "aligned", feedbackLevel };
  }, [heading, qiblaBearing]);

  useEffect(() => {
    const prev = prevLevelRef.current;
    const next = computed.feedbackLevel;
    if (prev !== next) prevLevelRef.current = next;
  }, [computed.angleDiff, computed.feedbackLevel]);

  return computed;
}

