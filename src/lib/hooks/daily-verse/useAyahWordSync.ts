import { useEffect } from "react";
import { splitAyahText } from "@/lib/quran/utils/wordSplitter";
import {
    getActiveWordIndexFromTimings,
    getVerseTiming,
} from "@/lib/quran/utils/audioTimings";
import { useAudioStore } from "@/lib/storage/useQuranStore";

type UseAyahWordSyncParams = {
    ayahText?: string;
    ayahNumber?: number;
    surahNumber?: number;
    verseNumberInSurah?: number;
};

export function useAyahWordSync({
    ayahText,
    ayahNumber,
    surahNumber,
    verseNumberInSurah,
}: UseAyahWordSyncParams) {
    const {
        activeAyahNumber,
        activeWordIndex,
        setActiveWordIndex,
        position,
        duration,
        isPlaying,
    } = useAudioStore();

    useEffect(() => {
        if (
            !ayahText ||
            ayahNumber == null ||
            activeAyahNumber !== ayahNumber ||
            !isPlaying ||
            duration <= 0 ||
            position <= 0
        ) {
            return;
        }

        const words = splitAyahText(ayahText);
        if (words.length === 0) return;

        const verseTiming =
            surahNumber && verseNumberInSurah
                ? getVerseTiming(surahNumber, verseNumberInSurah)
                : null;

        const timingIndex = verseTiming
            ? getActiveWordIndexFromTimings(position, verseTiming)
            : null;

        const spokenWords = words.filter(w => !w.isPause);
        if (spokenWords.length === 0) return;

        const wordDuration = duration / spokenWords.length;
        const fallbackIndex = Math.min(
            Math.floor(position / wordDuration),
            spokenWords.length - 1
        );

        const clampedIndex =
            typeof timingIndex === "number"
                ? Math.max(0, Math.min(timingIndex, spokenWords.length - 1))
                : fallbackIndex;

        if (clampedIndex !== activeWordIndex) {
            setActiveWordIndex(clampedIndex);
        }
    }, [
        ayahText,
        ayahNumber,
        surahNumber,
        verseNumberInSurah,
        activeAyahNumber,
        position,
        duration,
        isPlaying,
        activeWordIndex,
        setActiveWordIndex,
    ]);
}