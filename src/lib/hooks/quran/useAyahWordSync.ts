import { useEffect } from "react";
import { splitAyahText } from "@/lib/quran/utils/wordSplitter";
import {
    getActiveWordIndexFromTimings,
    getVerseTiming,
} from "@/lib/quran/utils/audioTimings";
import { useAudioStore } from "@/lib/storage/useQuranStore";

type UseAyahWordSyncParams = {
    surahNumber: number;
    ayahs: {
        number: number;
        numberInSurah: number;
        text: string;
    }[];
};

export function useAyahWordSync({
    surahNumber,
    ayahs,
}: UseAyahWordSyncParams) {
    const {
        activeAyahNumber,
        activeWordIndex,
        position,
        duration,
        isPlaying,
        setActiveWordIndex,
    } = useAudioStore();

    useEffect(() => {
        if (
            activeAyahNumber === null ||
            duration === 0 ||
            position === 0 ||
            !isPlaying
        ) {
            return;
        }

        const activeAyah = ayahs.find(
            (ayah) => ayah.number === activeAyahNumber
        );
        if (!activeAyah) return;

        const words = splitAyahText(activeAyah.text);
        if (words.length === 0) return;

        // Timing tabanlı hesap (varsa)
        const verseTiming = getVerseTiming(
            surahNumber,
            activeAyah.numberInSurah
        );

        const timingIndex =
            verseTiming
                ? getActiveWordIndexFromTimings(position, verseTiming)
                : null;

        // Fallback (eşit süreli bölme)
        const wordDuration = duration / words.length;
        const fallbackIndex = Math.min(
            Math.floor(position / wordDuration),
            words.length - 1
        );

        const clampedIndex =
            timingIndex !== null
                ? Math.max(0, Math.min(timingIndex, words.length - 1))
                : fallbackIndex;

        if (clampedIndex !== activeWordIndex) {
            setActiveWordIndex(clampedIndex);
        }
    }, [
        activeAyahNumber,
        position,
        duration,
        isPlaying,
        ayahs,
        surahNumber,
        activeWordIndex,
        setActiveWordIndex,
    ]);
}