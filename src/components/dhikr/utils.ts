/**
 * Generate UUID v4
 * React Native compatible UUID generator
 */
export function generateUUID(): string {
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
export function generateSlug(label: string): string {
    return label
        .toLowerCase()
        .trim()
        .replaceAll(/\s+/g, '-')
        .replaceAll(/[^a-z0-9-]/g, '');
}

export const validate = (label: string, targetCount: string, setErrors: (errors: { label?: string; targetCount?: string }) => void): boolean => {
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