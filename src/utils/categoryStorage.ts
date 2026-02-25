
const STORAGE_KEY = 'budget_category_overrides';

export type CategoryOverrides = Record<string, string>;

export const getCategoryOverrides = (): CategoryOverrides => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error('Failed to load category overrides', e);
        return {};
    }
};

export const saveCategoryOverride = (description: string, category: string): void => {
    const overrides = getCategoryOverrides();
    // Use normalized description as key
    const key = description.toLowerCase().trim();
    overrides[key] = category;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
};

export const removeCategoryOverride = (description: string): void => {
    const overrides = getCategoryOverrides();
    const key = description.toLowerCase().trim();
    delete overrides[key];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
};
