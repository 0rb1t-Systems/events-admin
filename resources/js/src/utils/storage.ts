import Cookies from "js-cookie";

// Storage keys
const STORAGE_KEYS = {
    AUTH_TOKEN: "auth_token",
    AUTH_USER: "auth_user",
    LOCK_STATUS: "lock_status",
} as const;

// Cookie expiry settings
const COOKIE_EXPIRY = {
    SHORT: 1, // 1 day
    LONG: 30, // 30 days
} as const;

/**
 * Storage utility for handling auth data
 * - Tokens: Stored in cookies for security and automatic expiry
 * - User data: Stored in localStorage for persistence
 */
export const storageUtil = {
    // Cookie operations for tokens
    setToken: (token: string, remember: boolean = false): void => {
        const days = remember ? COOKIE_EXPIRY.LONG : COOKIE_EXPIRY.SHORT;
        Cookies.set(STORAGE_KEYS.AUTH_TOKEN, token, {
            expires: days,
            path: "/",
            sameSite: "strict",
        });
    },

    getToken: (): string | null => {
        return Cookies.get(STORAGE_KEYS.AUTH_TOKEN) || null;
    },

    deleteToken: (): void => {
        Cookies.remove(STORAGE_KEYS.AUTH_TOKEN, {
            path: "/",
            sameSite: "strict",
        });
    },

    // LocalStorage operations for user data
    setUser: (user: any, remember: boolean = false): void => {
        const userData = {
            user,
            expiry: remember
                ? Date.now() + COOKIE_EXPIRY.LONG * 24 * 60 * 60 * 1000
                : null,
        };
        localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(userData));
    },

    getUser: <T>(): T | null => {
        try {
            const userDataStr = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
            if (!userDataStr) return null;

            const userData = JSON.parse(userDataStr);

            // Check if data has expired
            if (userData.expiry && Date.now() > userData.expiry) {
                storageUtil.deleteUser();
                return null;
            }

            return userData.user as T;
        } catch (error) {
            console.warn("Failed to parse user data from localStorage:", error);
            storageUtil.deleteUser();
            return null;
        }
    },

    deleteUser: (): void => {
        localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    },

    // Check if user is authenticated
    isAuthenticated: (): boolean => {
        return !!storageUtil.getToken() && !!storageUtil.getUser();
    },

    // Lock state operations
    setLockStatus: (isLocked: boolean): void => {
        localStorage.setItem(
            STORAGE_KEYS.LOCK_STATUS,
            JSON.stringify(isLocked)
        );
    },

    getLockStatus: (): boolean => {
        try {
            const lockStatus = localStorage.getItem(STORAGE_KEYS.LOCK_STATUS);
            return lockStatus ? JSON.parse(lockStatus) : false;
        } catch (error) {
            console.warn(
                "Failed to parse lock status from localStorage:",
                error
            );
            return false;
        }
    },

    clearLockStatus: (): void => {
        localStorage.removeItem(STORAGE_KEYS.LOCK_STATUS);
    },

    // Combined operations
    clearAuth: (): void => {
        storageUtil.deleteToken();
        storageUtil.deleteUser();
        storageUtil.clearLockStatus();
    },
};
