import { Text } from "react-native";
import clsx from "clsx";
import ModalComponent from "@/components/modal/ModalComponent";
import Button from "@/components/button/Button";
import { useTranslation } from "@/i18n";
import { usePrayerTimesStore } from "@/lib/storage/prayerTimesStore";
import { useTheme } from "@/lib/storage/useThemeStore";

type StalePrayerTimesModalProps = {
  readonly visible: boolean;
  readonly onClose: () => void;
};

export default function StalePrayerTimesModal({
  visible,
  onClose,
}: StalePrayerTimesModalProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const getDaysSinceLastSync = usePrayerTimesStore(
    (state) => state.getDaysSinceLastSync
  );

  const days = getDaysSinceLastSync();
  const displayDays = days != null && days >= 7 ? days : 7;

  return (
    <ModalComponent
      visible={visible}
      onClose={onClose}
      title={t("common.stalePrayerTimesModalTitle")}
    >
      <Text
        className={clsx(
          "text-base font-normal leading-relaxed text-center max-w-[340px]",
          isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
        )}
      >
        {t("common.stalePrayerTimesModalMessage", { days: displayDays })}
      </Text>
      <Button
        size="medium"
        onPress={onClose}
        text={t("common.ok")}
        backgroundColor="primary"
      />
    </ModalComponent>
  );
}
