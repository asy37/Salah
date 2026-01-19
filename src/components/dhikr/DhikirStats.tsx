import { FlatList, Text, View, useColorScheme, ActivityIndicator } from "react-native";
import ModalComponent from "../modal/ModalComponent";
import { MaterialIcons } from "@expo/vector-icons";
import { useDhikrStats } from "@/lib/hooks/dhikir/useDhikirStats";
import clsx from "clsx";

type DhikirStatsProps = Readonly<{
    readonly visible: boolean;
    readonly onClose: () => void;
}>;

export default function DhikirStats({ visible, onClose }: DhikirStatsProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const { stats, loading } = useDhikrStats();

    const statsList = stats
        ? [
              {
                  key: "week",
                  label: "This Week",
                  completed: stats.week.completed,
                  continued: stats.week.active,
                  streak: 0, // Streak calculation not implemented yet
              },
              {
                  key: "month",
                  label: "This Month",
                  completed: stats.month.completed,
                  continued: stats.month.active,
                  streak: 0, // Streak calculation not implemented yet
              },
              {
                  key: "year",
                  label: "This Year",
                  completed: stats.year.completed,
                  continued: stats.year.active,
                  streak: 0, // Streak calculation not implemented yet
              },
          ]
        : [];

    return (
        <ModalComponent
            isDark={isDark}
            visible={visible}
            onClose={onClose}
            title="Dhikir Stats"
        >
            {(() => {
                if (loading) {
                    return (
                        <View className="flex-1 items-center justify-center py-8">
                            <ActivityIndicator size="large" color="#1F8F5F" />
                            <Text className={clsx("mt-4", isDark ? "text-text-primaryDark" : "text-text-primaryLight")}>
                                Loading statistics...
                            </Text>
                        </View>
                    );
                }

                if (!stats || statsList.length === 0) {
                    return (
                        <View className="flex-1 items-center justify-center py-8">
                            <Text className={clsx("text-center", isDark ? "text-text-primaryDark" : "text-text-primaryLight")}>
                                No statistics available yet.
                            </Text>
                            <Text className={clsx("text-center mt-2", isDark ? "text-text-secondaryDark" : "text-text-secondaryLight")}>
                                Start tracking your dhikrs to see your progress!
                            </Text>
                        </View>
                    );
                }

                return (
                <FlatList
                    className="w-full"
                    data={statsList}
                    keyExtractor={(item) => item.key}
                    contentContainerClassName="gap-4 pb-4"
                    renderItem={({ item }) => (
                        <View className="flex items-start gap-2">
                            <Text
                                className={clsx(
                                    "text-3xl font-bold",
                                    isDark ? "text-text-primaryDark" : "text-text-secondaryLight"
                                )}
                            >
                                {item.label}
                            </Text>
                            <View
                                className={clsx(
                                    "flex-1 justify-start items-start rounded-2xl shadow-sm p-4 gap-10 w-full",
                                    isDark ? "bg-background-cardDark" : "bg-white"
                                )}
                            >
                                {item.streak > 0 && (
                                    <View className="flex-row items-center justify-between w-full">
                                        <Text className={clsx(isDark ? "text-text-primaryDark" : "text-text-primaryLight")}>
                                            Continuous <Text className="font-bold text-primary-500">{item.streak}</Text> days.
                                        </Text>
                                        <View className="p-2 rounded-full bg-primary-500">
                                            <MaterialIcons name="calendar-month" size={24} color="white" />
                                        </View>
                                    </View>
                                )}
                                <View className="flex-row items-center justify-between w-full">
                                    <Text className={clsx(isDark ? "text-text-primaryDark" : "text-text-primaryLight")}>
                                        Completed : <Text className="font-bold text-primary-500">{item.completed}</Text>
                                    </Text>
                                    <Text className={clsx(isDark ? "text-text-primaryDark" : "text-text-primaryLight")}>
                                        Continued : <Text className="font-bold text-primary-500">{item.continued}</Text>
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                />
                );
            })()}
        </ModalComponent>
    )
}