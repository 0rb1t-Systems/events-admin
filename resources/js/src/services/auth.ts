import {
    AuthResponse,
    CheckLockResponse,
    CurrentUserResponse,
    LoginCredentials,
    LoginResponse,
} from "../types/auth";
import axiosInstance, { fetcher, fetcherPost } from "../utils/axios";

/**
 * Authentication service using secure cookie-based authentication with Laravel Sanctum
 */
export const authService = {
    /**
     * Log in user with email and password
     * @param credentials User credentials
     * @returns Promise with user data
     */
    login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
        return await fetcherPost<LoginResponse>(
            "/auth/admin/login",
            credentials
        );
    },

    /**
     * Log out the current user
     * @returns Promise with logout confirmation
     */
    logout: async (): Promise<AuthResponse> => {
        return await fetcherPost<AuthResponse>("/auth/logout");
    },

    /**
     * Get the current authenticated user
     * @returns Promise with user data
     */
    getCurrentUser: async (): Promise<CurrentUserResponse> => {
        return await fetcher<CurrentUserResponse>("/auth/me");
    },

    /**
     * Check if user is authenticated
     * @returns Promise with boolean indicating authentication status
     */
    isAuthenticated: async (): Promise<boolean> => {
        try {
            await fetcher("/auth/me");
            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * Request password reset link
     * @param email User email
     * @returns Promise with reset link response
     */
    forgotPassword: async (email: string): Promise<AuthResponse> => {
        return await fetcherPost<AuthResponse>("/auth/forgot-password", {
            email,
        });
    },

    /**
     * Reset password with token
     * @param resetData Password reset data
     * @returns Promise with reset response
     */
    resetPassword: async (resetData: {
        token: string;
        email: string;
        password: string;
        password_confirmation: string;
    }): Promise<AuthResponse> => {
        return await fetcherPost<AuthResponse>(
            "/auth/reset-password",
            resetData
        );
    },

    /**
     * Lock user session
     * @param password User password for verification
     * @returns Promise with lock response
     */
    lock: async (password: string): Promise<AuthResponse> => {
        return await fetcherPost<AuthResponse>("/auth/lock", { password });
    },

    /**
     * Unlock user session
     * @param password User password for verification
     * @returns Promise with unlock response
     */
    unlock: async (password: string): Promise<AuthResponse> => {
        return await fetcherPost<AuthResponse>("/auth/unlock", { password });
    },

    /**
     * Check if user session is locked
     * @returns Promise with lock status
     */
    checkLock: async (): Promise<CheckLockResponse> => {
        return await fetcher<CheckLockResponse>("/auth/check-lock");
    },

    updateProfile: async (data: {
        name: string;
        email: string;
        phone?: string;
        address?: string;
    }) => {
        return await axiosInstance.put("/auth/profile", data);
    },

    updateProfilePicture: async (file: File) => {
        const formData = new FormData();
        formData.append("profile_image", file);
        return await axiosInstance.post("/auth/profile-picture", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },

    changePassword: async (data: {
        current_password: string;
        new_password: string;
        new_password_confirmation: string;
    }) => {
        return await axiosInstance.post("/auth/change-password", data);
    },
};
