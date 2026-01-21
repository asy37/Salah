// src/lib/hooks/useDownloadedTranslations.ts
import { useEffect, useState } from "react";
import {
  getDownloadedTranslations,
  TranslationMetadata,
} from "../database/sqlite/translation/repository";

export function useTranslationsQuran() {
  const [translations, setTranslations] = useState<TranslationMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const data = await getDownloadedTranslations();
      if (mounted) {
        setTranslations(data);
        setIsLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    translations,
    isLoading,
    hasTranslation: translations.length > 0,
  };
}
