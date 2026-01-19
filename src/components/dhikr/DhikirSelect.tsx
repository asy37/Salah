import { FlatList, Text, useColorScheme } from "react-native";
import ModalComponent from "../modal/ModalComponent";
import Button from "../button/Button";
import React from "react";
import { Dhikr } from "@/types/dhikir";
import { dhikrRepo } from "@/lib/database/sqlite/dhikr/repository";
import { useAuth } from "@/lib/hooks/useAuth";
import { DHIKR_PRESETS } from "@/constants/dhikr-presets";
import clsx from "clsx";

/**
 * Generate UUID v4
 * React Native compatible UUID generator
 */
function generateUUID(): string {
    // eslint-disable-next-line prefer-replace-all
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.trunc(Math.random() * 16);
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

type DhikirSelectProps = Readonly<{
    readonly currentDhikr: Dhikr | null;
    readonly openDhikrSelect: boolean;
    readonly setOpenDhikrSelect: (value: boolean) => void;
    readonly setCurrentDhikr: (dhikr: Dhikr) => void;
}>

export default function DhikirSelect({ currentDhikr, openDhikrSelect, setCurrentDhikr, setOpenDhikrSelect }: DhikirSelectProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const { user } = useAuth();
    const userId = user?.id || null;
    const [availableDhikrs, setAvailableDhikrs] = React.useState<Dhikr[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const loadDhikrs = async () => {
            if (!userId) {
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const records = await dhikrRepo.getAllDhikrs(userId);
                const userDhikrs: Dhikr[] = records.map((record) => ({
                    id: record.id,
                    slug: record.slug,
                    label: record.label,
                    target_count: record.target_count,
                    current_count: record.current_count,
                    status: record.status,
                    started_at: record.started_at,
                    completed_at: record.completed_at,
                }));

                // Get user's slug set to filter templates
                const userSlugs = new Set(userDhikrs.map(d => d.slug));

                // Filter templates: only show templates that user hasn't created
                const availableTemplates = DHIKR_PRESETS.filter(
                    template => !userSlugs.has(template.slug)
                );

                // Merge: user's dhikrs first, then templates
                const allDhikrs = [...userDhikrs, ...availableTemplates];
                setAvailableDhikrs(allDhikrs);
            } catch (error) {
                console.error('[DhikirSelect] Error loading dhikrs:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (openDhikrSelect) {
            loadDhikrs();
        }
    }, [userId, openDhikrSelect]);

    const handleSelectDhikr = React.useCallback(async (item: Dhikr) => {
        if (!userId) {
            setCurrentDhikr(item);
            setOpenDhikrSelect(false);
            return;
        }

        try {
            // Check if dhikr exists in SQLite
            const existing = await dhikrRepo.getDhikrBySlug(userId, item.slug);
            
            // If it's a template and doesn't exist, save it to SQLite with new UUID
            if (!existing && DHIKR_PRESETS.some(t => t.slug === item.slug)) {
                const now = Date.now();
                await dhikrRepo.upsertDhikr({
                    id: generateUUID(), // Generate new UUID for template
                    user_id: userId,
                    slug: item.slug,
                    label: item.label,
                    target_count: item.target_count,
                    current_count: 0, // Reset count for new template
                    status: 'active',
                    started_at: now,
                    completed_at: null,
                    is_dirty: true,
                    last_synced_at: null,
                    updated_at: now,
                });
            }
        } catch (error) {
            console.error('[DhikirSelect] Error saving template:', error);
        }

        setCurrentDhikr(item);
        setOpenDhikrSelect(false);
    }, [setCurrentDhikr, setOpenDhikrSelect, userId]);

    return (
        <ModalComponent
            isDark={isDark}
            visible={openDhikrSelect}
            onClose={() => setOpenDhikrSelect(false)}
            title="Select Dhikr"
        >
            {isLoading ? (
                <Text className={clsx("text-center py-4", isDark ? "text-text-primaryDark" : "text-text-primaryLight")}>
                    Loading...
                </Text>
            ) : availableDhikrs.length === 0 ? (
                <Text className={clsx("text-center py-4", isDark ? "text-text-primaryDark" : "text-text-primaryLight")}>
                    No dhikrs found. Add a new one!
                </Text>
            ) : (
                <FlatList
                    data={availableDhikrs}
                    className="w-full"
                    contentContainerClassName="gap-2 pb-4"
                    renderItem={({ item }) => (
                        <Button 
                            isActive={currentDhikr?.id === item.id} 
                            size="large" 
                            onPress={() => handleSelectDhikr(item)} 
                            isDark={isDark}
                        >
                            <Text>{item.label}</Text>
                        </Button>
                    )}
                />
            )}
        </ModalComponent>
    );
}