import { View, Text, TouchableOpacity } from "react-native";
import clsx from "clsx";
import { PrayerStatus, PrayerName } from "@/types/prayer-tracking";
import { MaterialIcons } from "@expo/vector-icons";
import { PrayerItem } from "./types/prayer-timings";
import { useTheme } from "@/lib/storage/useThemeStore";

type ActionButtonsProps = {
  readonly updateStatus: (
    data: {
      prayer: PrayerName;
      status: PrayerStatus;
    },
    options?: {
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    }
  ) => void;
  readonly setIsExpanded: (isExpanded: boolean) => void;
  readonly isPending: boolean;
  readonly prayer: PrayerItem;
  readonly isPast: boolean;
  readonly isActive: boolean;
};
export const ActionButtons = ({
  updateStatus,
  setIsExpanded,
  isPending,
  prayer,
  isPast,
  isActive,
}: ActionButtonsProps) => {
  const { isDark } = useTheme();

  const handleStatusUpdate = (newStatus: PrayerStatus) => {
    updateStatus(
      { prayer: prayer.name.toLowerCase() as PrayerName, status: newStatus },
      {
        onSuccess: () => {
          setIsExpanded(false);
        },
      }
    );
  };
  
  return (
    <View
      className={clsx(
        "flex-1 w-full border-t px-4 py-3 gap-2",
        isDark ? "border-border-dark" : "border-border-light"
      )}
    >
      <TouchableOpacity
        onPress={() => handleStatusUpdate("prayed")}
        disabled={isPending}
        className={clsx(
          "flex-row items-center justify-center gap-2 h-11 rounded-lg",
          isDark ? "bg-primary-500/20" : "bg-primary-50"
        )}
      >
        <MaterialIcons name="check-circle" size={18} color="#1F8F5F" />
        <Text className="text-primary-500 font-semibold">Kıldım</Text>
      </TouchableOpacity>

      {isPast && isActive && (
        <TouchableOpacity
          onPress={() => handleStatusUpdate("later")}
          disabled={isPending}
          className={clsx(
            "flex-row items-center justify-center gap-2 h-11 rounded-lg",
            isDark ? "bg-warning/20" : "bg-warning/10"
          )}
        >
          <MaterialIcons name="schedule" size={18} color="#E6B566" />
          <Text className={clsx("font-semibold text-warning")}>
            Daha sonra kılacağım
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={() => handleStatusUpdate("unprayed")}
        disabled={isPending}
        className={clsx(
          "flex-row items-center justify-center gap-2 h-11 rounded-lg",
          isDark ? "bg-error/20" : "bg-error/10"
        )}
      >
        <MaterialIcons name="cancel" size={18} color="#D96C6C" />
        <Text
          style={{ color: isDark ? "#D96C6C" : "#C62828" }}
          className="font-semibold"
        >
          Kılmadım
        </Text>
      </TouchableOpacity>
    </View>
  );
};
