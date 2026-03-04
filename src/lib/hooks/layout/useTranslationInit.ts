/**
 * İndirilmiş çevirileri yükle, seçili yoksa ilkini seç, store ile senkronize et.
 */

import { useEffect, useState } from "react";
import { useTranslationStore } from "@/lib/storage/useQuranStore";
import { getDownloadedTranslations } from "@/lib/database/sqlite/translation/repository";
import { useTranslationByIdentifier } from "@/lib/hooks/quran/useTranslationByIdentifier";

export function useTranslationInit(dbReady: boolean): void {
  const { selectedTranslation, setSelectedTranslation, setTranslationData } =
    useTranslationStore();
  const [downloadedList, setDownloadedList] = useState<
    Awaited<ReturnType<typeof getDownloadedTranslations>> | null
  >(null);

  useEffect(() => {
    if (!dbReady) return;
    getDownloadedTranslations()
      .then(setDownloadedList)
      .catch(() => setDownloadedList([]));
  }, [dbReady]);

  const effectiveIdentifier =
    selectedTranslation?.edition_identifier ??
    downloadedList?.[0]?.edition_identifier ??
    null;

  const { translation: quran } = useTranslationByIdentifier(effectiveIdentifier);

  useEffect(() => {
    if (!selectedTranslation && downloadedList?.length) {
      setSelectedTranslation(downloadedList[0]);
    }
  }, [selectedTranslation, downloadedList, setSelectedTranslation]);

  useEffect(() => {
    if (quran) setTranslationData(quran);
  }, [quran, setTranslationData]);
}
