import { type Profile, DEFAULT_SETTINGS, DEFAULT_SCHOOL_SETTINGS } from './types';

const PROFILES_KEY = 'matematik_profiles';
const ACTIVE_PROFILE_KEY = 'matematik_active_profile_id';

export const getProfiles = (): Profile[] => {
    const data = localStorage.getItem(PROFILES_KEY);
    if (!data) return [];
    try {
        return JSON.parse(data).map((profile: Profile) => {
            const schoolSettings = profile.schoolSettings
                ? {
                    ...DEFAULT_SCHOOL_SETTINGS,
                    ...profile.schoolSettings,
                    enabledTopics: Array.isArray(profile.schoolSettings.enabledTopics)
                        ? profile.schoolSettings.enabledTopics
                        : DEFAULT_SCHOOL_SETTINGS.enabledTopics,
                    multiplicationTables: profile.schoolSettings.multiplicationTables?.length
                        ? profile.schoolSettings.multiplicationTables
                        : DEFAULT_SCHOOL_SETTINGS.multiplicationTables,
                    divisionDivisors: profile.schoolSettings.divisionDivisors?.length
                        ? profile.schoolSettings.divisionDivisors
                        : DEFAULT_SCHOOL_SETTINGS.divisionDivisors,
                }
                : undefined;

            return {
                ...profile,
                mode: profile.mode ?? 'custom',
                schoolSettings,
            };
        });
    } catch (e) {
        console.error("Failed to parse profiles", e);
        return [];
    }
};

export const saveProfile = (profile: Profile) => {
    const profiles = getProfiles();
    const index = profiles.findIndex(p => p.id === profile.id);
    if (index >= 0) {
        profiles[index] = profile;
    } else {
        profiles.push(profile);
    }
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
};

export const getActiveProfileId = (): string | null => {
    return localStorage.getItem(ACTIVE_PROFILE_KEY);
};

export const setActiveProfileId = (id: string) => {
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
};

export const createProfile = (name: string, overrides?: Partial<Profile>): Profile => {
    const newProfile: Profile = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2),
        name,
        mode: 'custom',
        settings: { ...DEFAULT_SETTINGS },
        schoolSettings: { ...DEFAULT_SCHOOL_SETTINGS },
        ...overrides,
    };
    saveProfile(newProfile);
    return newProfile;
};
