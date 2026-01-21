import { useMemo } from "react";

type Location = { lat: number; lng: number };

const KAABA = {
  lat: 21.422487,
  lng: 39.826206,
} as const;

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number) {
  return (rad * 180) / Math.PI;
}

/**
 * Kullanıcı koordinatından Kâbe'ye initial bearing hesaplar.
 * Sonuç 0-360 derece aralığında normalize edilir.
 *
 * Formül:
 * θ = atan2( sin(Δλ)*cos(φ2), cos(φ1)*sin(φ2) − sin(φ1)*cos(φ2)*cos(Δλ) )
 */
export function useQiblaBearing(location: Location | null): {
  qiblaBearing: number | null;
} {
  const qiblaBearing = useMemo(() => {
    if (!location) return null;

    const φ1 = toRadians(location.lat);
    const φ2 = toRadians(KAABA.lat);
    const Δλ = toRadians(KAABA.lng - location.lng);

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) -
      Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);
    const bearing = (toDegrees(θ) + 360) % 360;
    return bearing;
  }, [location]);

  return { qiblaBearing };
}

