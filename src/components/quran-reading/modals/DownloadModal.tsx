import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { getEditions, getCompleteQuran } from "@/lib/api/services/quranApi";
import { QuranEdition } from "@/types/quran";
import { LanguageSelect } from "@/components/quran-reading/modals/LanguageSelect";
import { EditionsSelect } from "@/components/quran-reading/modals/EditionsSelect";
import clsx from "clsx";
import { saveQuranTranslation } from "@/lib/database/sqlite/translation/repository";
import ModalComponent from "@/components/modal/ModalComponent";
import Button from "@/components/button/Button";

type DownloadModalType = {
  readonly visible: boolean;
  readonly onClose: () => void;
};
export const DownloadModal = ({
  visible,
  onClose,
}: DownloadModalType) => {
  const [editionsData, setEditionsData] = useState<QuranEdition[]>();
  const [openEditions, setOpenEditions] = useState(false);
  const [editionsText, setEditionsText] = useState<string | null>(null);
  const [selectedIde, setSelectedIde] = useState<string | null>(null);

  const [openLanguage, setOpenLanguage] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [languageText, setLanguageText] = useState<string | null>(null);

  const { mutate: fetchTranslationQuran, isPending: isQuranPending } =
    useMutation({
      mutationFn: (identifier: string) => getCompleteQuran(identifier),
      onSuccess: async (res) => {
        await saveQuranTranslation({
          edition_identifier: res.data.edition.identifier,
          language: res.data.edition.language,
          name: res.data.edition.name,
          direction: res.data.edition.direction ?? "ltr",
          data: res.data, // surahs array
        });

        Alert.alert("Başarılı", "Meal indirildi");
      },
    });

  const { mutate: fetchEditions, isPending } = useMutation({
    mutationFn: (language: string) =>
      getEditions({
        format: "text",
        language: language,
        type: "translation",
      }),
    onSuccess: (res) => {
      setEditionsData(res.data);
    },
  });

  const handleSelectLanguage = (item: { code: string; label: string }) => {
    setLanguageText(item.label);
    setSelectedLanguage(item.code);
    setOpenLanguage(false);
    setSelectedIde(null);
    setEditionsText(null);
  };

  const handleSelectIde = (item: QuranEdition) => {
    setEditionsText(item.name);
    setSelectedIde(item.identifier);
    setOpenEditions(false);
  };

  const handleGetTranslation = () => {
    if (!selectedLanguage) return;
    setOpenEditions(true);
    fetchEditions(selectedLanguage);
  };

  const handleDownloadQuran = () => {
    if (!selectedIde) return;
    fetchTranslationQuran(selectedIde);
  };

  return (
    <ModalComponent
      visible={visible}
      onClose={onClose}
      title="Download Translation"
    >
      <View className="flex-1 items-center gap-2 w-full">
        <Button
          text={languageText ?? "Select Language"}
          onPress={() => setOpenLanguage(true)}
          rightIcon="chevron-right"
          size="large"
        />
        <Button
          text={editionsText ?? "Select Author"}
          onPress={handleGetTranslation}
          rightIcon="chevron-right"
          size="large"
        />

        <TouchableOpacity
          onPress={handleDownloadQuran}
          disabled={!selectedIde || isQuranPending}
          className={clsx(
            "w-6/12 mx-auto p-4  rounded-full",
            selectedIde ? "bg-primary-500" : "bg-primary-200"
          )}
        >
          {isQuranPending ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-white text-center">İndir</Text>
          )}
        </TouchableOpacity>
      </View>
      {openLanguage && (
        <LanguageSelect
          openLanguage={openLanguage}
          setOpenLanguage={setOpenLanguage}
          handleSelectLanguage={handleSelectLanguage}
        />
      )}
      {openEditions && (
        <EditionsSelect
          isLoading={isPending}
          openEditions={openEditions}
          setOpenEditions={setOpenEditions}
          editionsData={editionsData}
          handleSelectIde={handleSelectIde}
        />
      )}
    </ModalComponent>
  );
};
