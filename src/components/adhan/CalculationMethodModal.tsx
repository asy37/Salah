import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { PRAYER_CALCULATION_METHODS, PrayerCalculationMethod } from "@/constants/prayer-method";
import { MaterialIcons } from "@expo/vector-icons";
import clsx from "clsx";
import { useTheme } from "@/lib/storage/useThemeStore";

type CalculationMethodModalProps = {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSelect: (method: PrayerCalculationMethod) => void;
};

type ModalHeaderProps = {
  readonly isDark: boolean;
  readonly onClose: () => void;
};

function ModalHeader({ isDark, onClose }: ModalHeaderProps) {
  return (
    <View className="pt-3 pb-2">
      <View className="flex items-center mb-2">
        <View
          className="h-1.5 w-12 rounded-full"
          style={{
            backgroundColor: isDark ? "#223833" : "#E2ECE8",
          }}
        />
      </View>

      <View className="flex-row items-center justify-between px-6 pb-3">
        <Text
          className={clsx(
            "text-xl font-bold tracking-tight",
            isDark ? "text-text-primaryDark" : "text-text-primaryLight"
          )}
        >
          Calculation Method
        </Text>
        <Pressable onPress={onClose} className="rounded-full p-2" hitSlop={10}>
          <MaterialIcons
            name="close"
            size={26}
            color={isDark ? "#EAF3F0" : "#6B7F78"}
          />
        </Pressable>
      </View>
    </View>
  );
}

type MethodListItemProps = {
  readonly method: {
    readonly id: number;
    readonly label: string;
    readonly description?: string;
    readonly requiresShafaq?: boolean;
  };
  readonly isDark: boolean;
  readonly onPress: () => void;
  readonly isLast: boolean;
};

function MethodListItem({
  method,
  isDark,
  onPress,
  isLast,
}: MethodListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className={clsx(
        "flex-row items-start gap-4 px-6 py-4",
        !isLast &&
          (isDark
            ? "border-b border-border-dark/20"
            : "border-b border-border-light/40")
      )}
    >
      <View
        className={clsx(
          "w-10 h-10 rounded-full flex items-center justify-center",
          isDark ? "bg-primary-500/20" : "bg-primary-50"
        )}
      >
        <MaterialIcons
          name="calculate"
          size={22}
          color={isDark ? "#4CAF84" : "#1F8F5F"}
        />
      </View>
      <View className="flex-1">
        <Text
          className={clsx(
            "text-base font-semibold",
            isDark ? "text-text-primaryDark" : "text-text-primaryLight"
          )}
        >
          {method.label}
        </Text>
        {method.description && (
          <Text
            className={clsx(
              "text-sm mt-0.5",
              isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
            )}
          >
            {method.description}
          </Text>
        )}
        {method.requiresShafaq && (
          <Text
            className={clsx(
              "text-xs mt-1 font-medium",
              isDark ? "text-orange-400" : "text-orange-600"
            )}
          >
            Ek parametre gerektirir (shafaq)
          </Text>
        )}
      </View>
      <MaterialIcons
        name="chevron-right"
        size={20}
        color={isDark ? "#8FA6A0" : "#9CA3AF"}
      />
    </Pressable>
  );
}

type MethodsListProps = {
  readonly methods: typeof PRAYER_CALCULATION_METHODS;
  readonly isDark: boolean;
  readonly onSelectMethod: (method: PrayerCalculationMethod) => void;
};

function MethodsList({
  methods,
  isDark,
  onSelectMethod,
}: MethodsListProps) {
  return (
    <>
      {methods.map((method, index) => (
        <MethodListItem
          key={method.id}
          method={method}
          isDark={isDark}
          onPress={() => onSelectMethod(method)}
          isLast={index === methods.length - 1}
        />
      ))}
    </>
  );
}

export default function CalculationMethodModal({
  visible,
  onClose,
  onSelect,
}: CalculationMethodModalProps) {
  const { isDark } = useTheme();

  const handleSelect = (method: PrayerCalculationMethod) => {
    onSelect(method);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60">
        <View
          className={clsx(
            "absolute bottom-0 left-0 right-0 rounded-t-3xl max-h-[90%]",
            isDark ? "bg-background-dark" : "bg-background-light"
          )}
        >
          <ModalHeader isDark={isDark} onClose={onClose} />

          <View
            className="h-px w-full"
            style={{
              backgroundColor: isDark
                ? "rgba(34, 56, 51, 0.4)"
                : "rgba(226, 236, 232, 0.6)",
            }}
          />

      <ScrollView
            className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
            <MethodsList
              methods={PRAYER_CALCULATION_METHODS}
              isDark={isDark}
              onSelectMethod={handleSelect}
            />
      </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
