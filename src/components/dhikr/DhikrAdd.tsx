import { KeyboardAvoidingView, Platform, Text, TextInput, View, useColorScheme, Alert, ActivityIndicator } from "react-native";
import ModalComponent from "@/components/modal/ModalComponent";
import clsx from "clsx";
import { useState } from "react";
import { dhikrRepo } from "@/lib/database/sqlite/dhikr/repository";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Dhikr } from "@/types/dhikir";
import Button from "@/components/button/Button";

type DhikrAddProps = Readonly<{
    readonly openAddDhikrModal: boolean;
    readonly setOpenAddDhikrModal: (value: boolean) => void;
    readonly onDhikrAdded?: (dhikr: Dhikr) => void;
}>;

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

/**
 * Generate slug from label
 * - Lowercase
 * - Replace spaces with hyphens
 * - Remove special characters
 */
function generateSlug(label: string): string {
    return label
        .toLowerCase()
        .trim()
        .replaceAll(/\s+/g, '-')
        .replaceAll(/[^a-z0-9-]/g, '');
}

export default function DhikrAdd({ openAddDhikrModal, setOpenAddDhikrModal, onDhikrAdded }: DhikrAddProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const { user } = useAuth();
    const userId = user?.id || null;

    const [label, setLabel] = useState("");
    const [targetCount, setTargetCount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<{ label?: string; targetCount?: string }>({});

    const validate = (): boolean => {
        const newErrors: { label?: string; targetCount?: string } = {};

        if (!label.trim()) {
            newErrors.label = "Dhikr name is required";
        }

        const target = Number.parseInt(targetCount, 10);
        if (!targetCount.trim()) {
            newErrors.targetCount = "Target count is required";
        } else if (Number.isNaN(target) || target <= 0) {
            newErrors.targetCount = "Target count must be a positive number";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) {
            return;
        }

        if (!userId) {
            Alert.alert("Error", "Please log in to create a dhikr");
            return;
        }

        setIsSubmitting(true);

        try {
            // Generate UUID and slug
            const id = generateUUID();
            const slug = generateSlug(label.trim());

            // Check if slug already exists for this user
            const existing = await dhikrRepo.getDhikrBySlug(userId, slug);
            if (existing) {
                Alert.alert("Error", "A dhikr with this name already exists");
                setIsSubmitting(false);
                return;
            }

            // Create new dhikr
            const target = Number.parseInt(targetCount.trim(), 10);
            const now = Date.now();
            const newDhikr: Dhikr = {
                id,
                slug,
                label: label.trim(),
                target_count: target,
                current_count: 0,
                status: 'active',
                started_at: now,
                completed_at: null,
            };

            // Save to SQLite
            await dhikrRepo.upsertDhikr({
                ...newDhikr,
                user_id: userId,
                is_dirty: true,
                last_synced_at: null,
                updated_at: now,
            });

            // Notify parent
            if (onDhikrAdded) {
                onDhikrAdded(newDhikr);
            }

            // Reset form and close modal
            setLabel("");
            setTargetCount("");
            setErrors({});
            setOpenAddDhikrModal(false);
        } catch (error) {
            console.error('[DhikrAdd] Error creating dhikr:', error);
            Alert.alert("Error", "Failed to create dhikr. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (isSubmitting) return;
        setLabel("");
        setTargetCount("");
        setErrors({});
        setOpenAddDhikrModal(false);
    };

    return (
        <ModalComponent isDark={isDark} visible={openAddDhikrModal} onClose={handleClose} title="Add Dhikr">
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className={clsx(
                    "flex-1 w-full gap-4",
                    isDark ? "bg-background-dark" : "bg-background-light"
                )}
            >
                <View className="gap-4">
                    <View>
                        <Text className={clsx(
                            "text-sm font-medium mb-2",
                            isDark ? "text-text-primaryDark" : "text-text-primaryLight"
                        )}>
                            Dhikr Name
                        </Text>
                        <TextInput
                            value={label}
                            onChangeText={(text) => {
                                setLabel(text);
                                if (errors.label) {
                                    setErrors(prev => ({ ...prev, label: undefined }));
                                }
                            }}
                            autoCapitalize="words"
                            keyboardType="default"
                            inputMode="text"
                            editable={!isSubmitting}
                            className={clsx(
                                "w-full h-14 rounded-xl border px-4 text-base",
                                errors.label ? "border-error" : "",
                                isDark ? "bg-background-cardDark border-border-dark text-text-primaryDark" : "bg-white border-gray-200 text-text-primaryLight"
                            )}
                            placeholder="e.g., Subhanallah"
                            placeholderTextColor={isDark ? "#8FA6A0" : "#6B7F78"}
                        />
                        {errors.label && (
                            <Text className="text-error text-xs mt-1 ml-1">{errors.label}</Text>
                        )}
                    </View>

                    <View>
                        <Text className={clsx(
                            "text-sm font-medium mb-2",
                            isDark ? "text-text-primaryDark" : "text-text-primaryLight"
                        )}>
                            Target Count
                        </Text>
                        <TextInput
                            value={targetCount}
                            onChangeText={(text) => {
                                // Only allow numbers
                                const numericText = text.replaceAll(/\D/g, '');
                                setTargetCount(numericText);
                                if (errors.targetCount) {
                                    setErrors(prev => ({ ...prev, targetCount: undefined }));
                                }
                            }}
                            inputMode="numeric"
                            autoCapitalize="none"
                            keyboardType="numeric"
                            editable={!isSubmitting}
                            className={clsx(
                                "w-full h-14 rounded-xl border px-4 text-base",
                                errors.targetCount ? "border-error" : "",
                                isDark ? "bg-background-cardDark border-border-dark text-text-primaryDark" : "bg-white border-gray-200 text-text-primaryLight"
                            )}
                            placeholder="e.g., 33"
                            placeholderTextColor={isDark ? "#8FA6A0" : "#6B7F78"}
                        />
                        {errors.targetCount && (
                            <Text className="text-error text-xs mt-1 ml-1">{errors.targetCount}</Text>
                        )}
                    </View>

                    <View className="mt-4">
                        <Button
                            onPress={handleSubmit}
                            isDark={isDark}
                            disabled={isSubmitting}
                            size="large"
                            backgroundColor="primary"
                        >
                            {isSubmitting ? (
                                <View className="flex-row items-center gap-2">
                                    <ActivityIndicator size="small" color="white" />
                                    <Text className="text-white font-semibold">Creating...</Text>
                                </View>
                            ) : (
                                <Text className="text-white font-semibold">Create Dhikr</Text>
                            )}
                        </Button>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </ModalComponent>
    );
}
