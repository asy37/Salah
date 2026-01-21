import { useCallback, useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, FlatList, PanResponder } from "react-native";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DEFAULT_SWIPE_THRESHOLD = SCREEN_WIDTH * 0.5;
const DEFAULT_VIEW_POSITION = 0.3;

export type UseSwipeScrollOptions<T = unknown> = {
  /** Sonraki sayfa/bölüm */
  goNext: () => void;
  /** Önceki sayfa/bölüm */
  goPrev: () => void;
  /** Bu değerler değiştiğinde liste başa sarılır (örn. [data] veya [pageKey]) */
  resetDeps?: React.DependencyList;
  /** Scroll edilecek aktif öğe indexi; değişince scrollToIndex çalışır */
  activeIndex?: number | null;
  /** Kaydırma eşiği (px); varsayılan ekran genişliğinin yarısı */
  swipeThreshold?: number;
  /** scrollToIndex viewPosition (0–1); varsayılan 0.3 */
  viewPosition?: number;
};

export type UseSwipeScrollReturn<T = unknown> = {
  listRef: React.RefObject<FlatList<T> | null>;
  translateX: Animated.Value;
  panHandlers: ReturnType<typeof PanResponder.create>["panHandlers"];
  onScrollToIndexFailed: (info: { index: number }) => void;
};

/**
 * Sayfa/sayfa geçişli liste için: swipe ile goNext/goPrev, reset, aktif indexe scroll.
 * FlatList ile kullanım için.
 */
export function useSwipeScroll<T = unknown>(
  options: UseSwipeScrollOptions<T>
): UseSwipeScrollReturn<T> {
  const {
    goNext,
    goPrev,
    resetDeps = [],
    activeIndex,
    swipeThreshold = DEFAULT_SWIPE_THRESHOLD,
    viewPosition = DEFAULT_VIEW_POSITION,
  } = options;

  const listRef = useRef<FlatList<T>>(null);
  const translateX = useRef(new Animated.Value(0)).current;
  const prevActiveIndexRef = useRef<number | null | undefined>(undefined);

  // Veri/sayfa değişince başa sar
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    translateX.setValue(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetDeps ile çağıran kontrol eder
  }, resetDeps);

  // Aktif index değişince o indexe scroll
  useEffect(() => {
    if (activeIndex == null || activeIndex < 0) {
      prevActiveIndexRef.current = activeIndex;
      return;
    }
    if (prevActiveIndexRef.current === activeIndex) return;
    prevActiveIndexRef.current = activeIndex;
    listRef.current?.scrollToIndex({
      index: activeIndex,
      animated: true,
      viewPosition,
    });
  }, [activeIndex, viewPosition]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 10,
        onPanResponderMove: (_, g) => translateX.setValue(g.dx),
        onPanResponderRelease: (_, g) => {
          const dx = g.dx;
          const isSwipeLeft = dx < 0;

          if (Math.abs(dx) > swipeThreshold) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const targetX = isSwipeLeft ? -SCREEN_WIDTH : SCREEN_WIDTH;
            Animated.timing(translateX, {
              toValue: targetX,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              isSwipeLeft ? goPrev() : goNext();
              translateX.setValue(0);
            });
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              tension: 50,
              friction: 7,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [goNext, goPrev, translateX, swipeThreshold]
  );

  const onScrollToIndexFailed = useCallback((info: { index: number }) => {
    const wait = new Promise<void>((r) => setTimeout(r, 500));
    wait.then(() => {
      listRef.current?.scrollToIndex({ index: info.index, animated: true });
    });
  }, []);

  return {
    listRef,
    translateX,
    panHandlers: panResponder.panHandlers,
    onScrollToIndexFailed,
  };
}
