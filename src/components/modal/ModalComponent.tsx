import { ModalHeader } from "@/components/modal/ModalHeader";
import clsx from "clsx";
import { ActivityIndicator, Modal, Pressable, useColorScheme, View } from "react-native";

type ModalComponentProps = {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly children: React.ReactNode;
  readonly title: string;
  readonly isLoading?: boolean;
};

export default function ModalComponent({
  visible,
  onClose,
  children,
  title,
  isLoading,
}: ModalComponentProps) {
  const isDark = useColorScheme() === 'dark';
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1">
        <Pressable onPress={onClose} className="absolute inset-0">
          <View className="absolute inset-0 bg-black/40" />
        </Pressable>
        <View className="flex-1 absolute"></View>
      </View>
      <View
        className={clsx(
          "absolute left-0 right-0 bottom-0 rounded-t-3xl shadow-2xl h-[700px]",
          isDark ? "bg-background-cardDark" : "bg-background-light"
        )}
      >
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <>
            <ModalHeader isDark={isDark} onClose={onClose} title={title} />
            <View className="flex-1 items-center gap-2 px-6">
              {children}
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}
