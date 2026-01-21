import Button from "@/components/button/Button";
import ModalComponent from "@/components/modal/ModalComponent";
import {
  getDownloadedTranslations,
  TranslationMetadata,
} from "@/lib/database/sqlite/translation/repository";
import { queryKeys } from "@/lib/query/queryKeys";
import { useTranslationStore } from "@/lib/storage/useQuranStore";
import { useQuery } from "@tanstack/react-query";
import { FlatList, View } from "react-native";

type TranslationSelectProps = {
  readonly isDark: boolean;
  readonly visible: boolean;
  readonly onClose: () => void;
};
export default function TranslationSelect({
  isDark,
  visible,
  onClose,
}: TranslationSelectProps) {
  const { selectedTranslation, setSelectedTranslation } = useTranslationStore();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.translation.downloaded(),
    queryFn: getDownloadedTranslations,
  });

  const handleSelect = (item: TranslationMetadata) => {
    setSelectedTranslation(item);
    onClose();
  };
  return (
    <ModalComponent
      isDark={isDark}
      visible={visible}
      onClose={onClose}
      title="Translation Select"
      isLoading={isLoading}
    >
      <FlatList
        data={data}
        keyExtractor={(item) => item.edition_identifier}
        contentContainerClassName="gap-2 pb-4 w-full"
        renderItem={({ item }) => {
          const isSelected = selectedTranslation?.edition_identifier === item.edition_identifier;
          return (
            <View className="w-full">
              <Button
                onPress={() => handleSelect(item)}
                isDark={isDark}
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
