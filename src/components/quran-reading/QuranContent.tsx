import { Animated, FlatList, View } from "react-native";
import AyahBlock from "./AyahBlock";
import { Ayah } from "@/types/quran";
import PageIndicator from "./PageIndicator";
import { useMemo } from "react";
import { useSurahStore } from "@/lib/storage/useQuranStore";
import { useSwipeScroll } from "@/lib/hooks/useSwipeScroll";

type QuranContentProps = Readonly<{
  ayahs: Ayah[];
  isDark: boolean;
  goNext: () => void;
  goPrev: () => void;
  activeAyahNumber?: number | null;
  activeWordIndex?: number;
  onScroll?: () => void;
  onAyahPress?: (ayahNumber: number) => void;
}>;

export default function QuranContent({
  isDark,
  ayahs,
  goNext,
  goPrev,
  activeAyahNumber,
  activeWordIndex = -1,
  onScroll,
  onAyahPress,
}: QuranContentProps) {
  const { surahNumber } = useSurahStore();

  const activeIndex =
    activeAyahNumber == null
      ? -1
      : ayahs.findIndex((a) => a.number === activeAyahNumber);

  const {
    listRef,
    translateX,
    panHandlers,
    onScrollToIndexFailed,
  } = useSwipeScroll<Ayah>({
    goNext,
    goPrev,
    resetDeps: [ayahs],
    activeIndex: activeIndex < 0 ? undefined : activeIndex,
  });

  const footerComponent = useMemo(
    () => (
      <PageIndicator
        goPrev={goPrev}
        goNext={goNext}
        isDark={isDark}
        numberOfSurah={surahNumber}
      />
    ),
    [goPrev, goNext, isDark, surahNumber]
  );

  return (
    <View style={{ flex: 1 }} {...panHandlers}>
      <Animated.View
        style={{
          flex: 1,
          transform: [{ translateX }],
        }}
      >
        <FlatList
          ref={listRef}
          data={ayahs}
          keyExtractor={(item) => `${item.number}-${item.numberInSurah}`}
          renderItem={({ item }) => (
            <AyahBlock
              ayah={item}
              isDark={isDark}
              activeWordIndex={
                activeAyahNumber === item.number ? activeWordIndex : -1
              }
              onAyahPress={onAyahPress}
            />
          )}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={5}
          removeClippedSubviews
          scrollsToTop={true}
          ListFooterComponent={footerComponent}
          onScrollBeginDrag={() => {
            // Kullanıcı scroll yapmaya başladığında callback çağır
            if (onScroll) {
              onScroll();
            }
          }}
          onScrollToIndexFailed={onScrollToIndexFailed}
        />
      </Animated.View>
    </View>
  );
}
