import ModalComponent from "@/components/modal/ModalComponent";
import React from "react";
import { DownloadModal } from "./DownloadModal";
import Button from "@/components/button/Button";
import TranslationSelect from "./TranslationSelect";

type QuranSettingsProps = {
  readonly visible: boolean;
  readonly onClose: () => void;
};

export default function QuranSettings({
  visible,
  onClose,
}: QuranSettingsProps) {
  const [showDownloadModal, setShowDownloadModal] = React.useState(false);
  const [showTranslationSelect, setShowTranslationSelect] =
    React.useState(false);
  return (
    <ModalComponent
      visible={visible}
      onClose={onClose}
      title="Quran Settings"
    >
      <Button
        className="w-full p-4"
        text="Download Translation"
        onPress={() => setShowDownloadModal(true)}
        rightIcon="chevron-right"
      />
      <Button
        className="w-full p-4"
        text="Select Translation"
        onPress={() => setShowTranslationSelect(true)}
        rightIcon="chevron-right"
      />

      <DownloadModal
        visible={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
      />
      <TranslationSelect
        visible={showTranslationSelect}
        onClose={() => setShowTranslationSelect(false)}
      />
    </ModalComponent>
  );
}
