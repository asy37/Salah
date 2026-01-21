import { useEffect, useState } from "react";
import { getTranslationByIdentifier } from "../database/sqlite/translation/repository";
import { Surah } from "@/types/quran";

type translationData = {
  editions: {
    englishName: string;
    format: string;
    identifier: string;
    language: string;
    name: string;
    type: string;
  };
  surahs: Surah[];
};
export function useTranslationByIdentifier(identifier?: string | null) {
  const [translation, setTranslation] = useState<translationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!identifier) {
      setTranslation(null);
      setIsLoading(false);
      return;
    }

    let mounted = true;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getTranslationByIdentifier(identifier ?? "");
        if (mounted) {
          setTranslation(data as translationData | null);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [identifier]);

  return {
    translation,
    isLoading,
    error,
    hasTranslation: translation !== null,
  };
}
