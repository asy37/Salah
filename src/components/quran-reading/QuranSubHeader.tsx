import { Text, View } from "react-native";
import { useState } from "react";
import QuranSettings from "./modals/QuranSettings";
import Button from "../button/Button";
import { TranslationMetadata } from "@/lib/database/sqlite/translation/repository";
import clsx from "clsx";
import { useAudioStore, useSurahStore } from "@/lib/storage/useQuranStore";

type QuranSubHeaderProps = {
  readonly isDark: boolean;
  readonly onOpenSurahModal: () => void;
  readonly setSelectTranslation: (item: TranslationMetadata) => void;
  readonly selectedTranslation: string | null;
  readonly onPlaySurah?: (surahNumber: number) => void; // Sure okuma başlatma callback'i
};

export default function QuranSubHeader({
  isDark,
  onOpenSurahModal,
  setSelectTranslation,
  selectedTranslation,
  onPlaySurah,
}: QuranSubHeaderProps) {
  const [settingsModal, setSettingsModal] = useState(false);
  const { surahName, surahEnglishName, juz, surahNumber } = useSurahStore();
  const { isSurahPlaybackActive, isPlaying } = useAudioStore();

  const handlePlaySurah = () => {
    if (onPlaySurah) {
      onPlaySurah(surahNumber);
    }
  };
  return (
    <>
      <View
        className={clsx(
          "z-10 flex-row items-center justify-between border-b px-5 py-3 ",
          isDark
            ? "border-b border-primary-100"
            : " border-b border-primary-500"
        )}
      >
        <Button
          onPress={onOpenSurahModal}
          isDark={isDark}
          leftIcon="menu-open"
          size="small"
          backgroundColor="primary"
        />
        <View className="items-center">
          <Text
            className={clsx(
              "text-lg font-bold leading-tight ",
              isDark ? "text-text-primaryDark" : "text-text-primaryLight"
            )}
          >
            {surahEnglishName} / {surahName}
          </Text>
          <Text className="text-xs font-medium uppercase tracking-wide text-primary-500">
            {juz ? `Juz ${juz}` : ""}
          </Text>
          {!isSurahPlaybackActive && (
            <Button
              onPress={handlePlaySurah}
              isDark={isDark}
              leftIcon="play-arrow"
              size="small"
              backgroundColor="primary"
            />
          )}
          {isSurahPlaybackActive && (
          <Button
              onPress={handlePlaySurah}
            isDark={isDark}
              leftIcon={isPlaying ? "pause" : "play-arrow"}
            size="small"
            backgroundColor="primary"
          />
          )}
        </View>
        <Button
          onPress={() => setSettingsModal(true)}
          isDark={isDark}
          leftIcon="settings"
          size="small"
          backgroundColor="primary"
        />
      </View>
      <QuranSettings
        setSelectTranslation={setSelectTranslation}
        selectedTranslation={selectedTranslation}
        isDark={isDark}
        visible={settingsModal}
        onClose={() => setSettingsModal(false)}
      />
    </>
  );
}
