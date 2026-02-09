import Button from "@/components/button/Button";
import ModalComponent from "@/components/modal/ModalComponent";
import {
  getDownloadedTranslations,
  TranslationMetadata,
} from "@/lib/database/sqlite/translation/repository";
import { queryKeys } from "@/lib/query/queryKeys";
import { useTranslationStore } from "@/lib/storage/useQuranStore";
import { useTheme } from "@/lib/storage/useThemeStore";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import React from "react";
import { FlatList, Text, View } from "react-native";

type TranslationSelectProps = {
  readonly visible: boolean;
  readonly onClose: () => void;
};
export default function TranslationSelect({
  visible,
  onClose,
}: TranslationSelectProps) {
  const { isDark } = useTheme();
  const { selectedTranslation, setSelectedTranslation } = useTranslationStore();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.translation.downloaded(),
    queryFn: getDownloadedTranslations,
  });

  const flatListData = React.useMemo(() => {
    return data ?? [];
  }, [data]);
  const handleSelect = (item: TranslationMetadata) => {
    setSelectedTranslation(item);
    onClose();
  };
  return (
    <ModalComponent
      visible={visible}
      onClose={onClose}
      title="Translation Select"
      isLoading={isLoading}
    >
      <FlatList
        data={flatListData}
        ListEmptyComponent={
          <Text className={clsx("text-center", isDark ? "text-text-primaryDark" : "text-text-primaryLight")}>First download a translation to see the list</Text>
        }
        keyExtractor={(item) => item.edition_identifier}
        contentContainerClassName="gap-2 pb-4 w-full"
        renderItem={({ item }) => {
          const isSelected = selectedTranslation?.edition_identifier === item.edition_identifier;
          return (
            <View className="w-full">
              <Button
                onPress={() => handleSelect(item)}
                backgroundColor="primary"
                rightIcon={isSelected ? "check" : "chevron-right"}
                text={item.name}
                size="large"
                isActive={isSelected}
              />
            </View>
          );
        }}
      />
    </ModalComponent>
  );
}
