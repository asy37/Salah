import { MaterialIcons } from "@expo/vector-icons";
import { FlatList, TextInput, useColorScheme, View } from "react-native";
import SurahData from "@/lib/quran/surah/surah.json";
import { useState } from "react";
import clsx from "clsx";
import { useFilteredSurahs, useSearchableSurahs } from "@/components/quran-reading/utils/utils";
import { colors } from "@/components/theme/colors";
import { SurahListItem } from "./SurahModalItem";
import ModalComponent from "@/components/modal/ModalComponent";

type SurahSelectionModalProps = {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly setCurrentPage: (surahNumber: number) => void;
};

export default function SurahSelectionModal({
  visible,
  onClose,
  setCurrentPage,
}: SurahSelectionModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [search, setSearch] = useState("");

  const searchableSurah = useSearchableSurahs(SurahData);
  const filteredSurahs = useFilteredSurahs(searchableSurah, search);

  return (
    <ModalComponent
      isDark={isDark}
      visible={visible}
      onClose={onClose}
      title="Surah Selection"
    >
      <View className="px-6 pb-2 w-full">
        <View
          className={clsx(
            "relative flex-row items-center rounded-xl px-3 py-2.5",
            isDark ? "bg-primary-400" : "bg-white"
          )}
        >
          <MaterialIcons
            name="search"
            size={20}
            color={colors.text.primaryLight}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Sure ara (Bakara, Yasin, 2…)"
            placeholderTextColor={colors.text.primaryLight}
            className={"ml-2 flex-1 text-base text-text-muted"}
          />
        </View>
      </View>
      <FlatList
        className="w-full"
        data={filteredSurahs}
        renderItem={({ item }) => (
          <SurahListItem
            setSearch={setSearch}
            setCurrentPage={setCurrentPage}
            key={item.id}
            surah={item}
            isDark={isDark}
            onClose={onClose}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerClassName="gap-2 pb-4 w-full"
      />
    </ModalComponent>
  );
}
