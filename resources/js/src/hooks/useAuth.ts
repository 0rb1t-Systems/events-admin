import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { authService } from "../services/auth";
import {
    clearError,
    logout as logoutAction,
    setCredentials,
    setError,
    updateUser,
    lockSession,
    unlockSession,
    setLockStatus,
} from "../store/authSlice";
import { IUser } from "../types";
import {
    ApiErrorResponse,
    LoginCredentials,
    LoginResponse,
    AuthResponse,
    CheckLockResponse,
    CurrentUserResponse,
} from "../types/auth";
import { storageUtil } from "../utils/storage";

// Query keys
export const authKeys = {
    me: ["auth", "me"] as const,
    all: ["auth"] as const,
};

// Helper functions
const transformApiUserToAppUser = (apiUser: any): IUser => ({
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    profile_image: apiUser.profile_image,
    phone: apiUser.phone,
    address: apiUser.address,
    user_type: apiUser.user_type || "user",
    created_at: apiUser.created_at || new Date().toISOString(),
    updated_at: apiUser.updated_at || new Date().toISOString(),
    deleted_at: null,
    email_verified_at: apiUser.email_verified_at,
    permissions: apiUser.permissions,
    roles: apiUser.roles,
});

const getErrorMessage = (error: any): string => {
    if (error.message) return error.message;
    if (error.errors?.auth) return error.errors.auth[0];
    return "An error occurred. Please try again.";
};

const handleAuthSuccess = (
    user: IUser,
    token: string,
    rememberMe: boolean,
    dispatch: any,
    queryClient: any
) => {
    // Store in storage
    storageUtil.setToken(token, rememberMe);
    storageUtil.setUser(user, rememberMe);

    // Update Redux state
    dispatch(setCredentials({ user, token }));
    dispatch(clearError());

    // Show success message
    toast.success(`Welcome back, ${user.name}!`);

    // Invalidate auth queries
    queryClient.invalidateQueries({ queryKey: authKeys.all });
};

const handleAuthError = (error: any, dispatch: any) => {
    const errorMessage = getErrorMessage(error);
    dispatch(setError(errorMessage));
    toast.error(errorMessage);
};

const handleLogoutSuccess = (
    dispatch: any,
    queryClient: any,
    navigate: any
) => {
    dispatch(logoutAction());
    queryClient.clear();
    toast.success("Logged out successfully");
    navigate("/auth/login");
};

/**
 * Hook for login mutation
 */
export const useLogin = () => {
    const dispatch = useDispatch();
    const queryClient = useQueryClient();

    return useMutation<LoginResponse, ApiErrorResponse, LoginCredentials>({
        mutationFn: authService.login,
        onSuccess: (data, variables) => {
            const { user: apiUser, token } = data.data;
            const user = transformApiUserToAppUser(apiUser);

            handleAuthSuccess(
                user,
                token,
                variables.rememberMe || false,
                dispatch,
                queryClient
            );
        },
        onError: (error) => {
            handleAuthError(error, dispatch);
        },
    });
};

/**
 * Hook for logout mutation
 */
export const useLogout = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: authService.logout,
        onSuccess: () => {
            handleLogoutSuccess(dispatch, queryClient, navigate);
        },
        onError: (error: any) => {
            // Still logout locally even if API call fails
            console.warn(
                "Logout API call failed, but logged out locally:",
                error
            );
            handleLogoutSuccess(dispatch, queryClient, navigate);
        },
    });
};

/**
 * Hook for getting current user
 */
export const useCurrentUser = (enabled: boolean = true) => {
    const dispatch = useDispatch();
    const hasToken = !!storageUtil.getToken();

    const query = useQuery<CurrentUserResponse>({
        queryKey: authKeys.me,
        queryFn: authService.getCurrentUser,
        enabled: enabled && hasToken,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: (failureCount, error: any) => {
            // Don't retry on auth errors
            if (error?.status === 401 || error?.status === 403) {
                return false;
            }
            return failureCount < 2;
        },
    });

    // Handle success case
    useEffect(() => {
        if (query.data?.data?.user) {
            const apiUser = query.data.data.user;
            const user = transformApiUserToAppUser(apiUser);

            dispatch(updateUser(user));
        }
    }, [query.data, dispatch]);

    // Handle error case
    useEffect(() => {
        if (query.error) {
            const error = query.error as any;
            if (error?.status === 401) {
                dispatch(logoutAction());
            }
        }
    }, [query.error, dispatch]);

    return query;
};

/**
 * Hook for checking authentication status
 */
export const useAuthCheck = () => {
    return useQuery({
        queryKey: ["auth", "check"],
        queryFn: authService.isAuthenticated,
        staleTime: 2 * 60 * 1000, // 2 minutes
        retry: false,
    });
};

/**
 * Hook for password reset request
 */
export const useForgotPassword = () => {
    return useMutation({
        mutationFn: (email: string) => authService.forgotPassword(email),
        onSuccess: () => {
            toast.success("Password reset link sent to your email");
        },
        onError: (error: any) => {
            const message = getErrorMessage(error);
            toast.error(message);
        },
    });
};

/**
 * Hook for password reset
 */
export const useResetPassword = () => {
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (resetData: {
            token: string;
            email: string;
            password: string;
            password_confirmation: string;
        }) => authService.resetPassword(resetData),
        onSuccess: () => {
            toast.success(
                "Password reset successfully. Please login with your new password."
            );
            navigate("/auth/login");
        },
        onError: (error: any) => {
            const message = getErrorMessage(error);
            toast.error(message);
        },
    });
};

/**
 * Hook for locking user session
 */
export const useLock = () => {
    const dispatch = useDispatch();
    const queryClient = useQueryClient();

    return useMutation<AuthResponse, ApiErrorResponse, string>({
        mutationFn: authService.lock,
        onSuccess: (data) => {
            dispatch(lockSession());
            queryClient.invalidateQueries({ queryKey: authKeys.all });
            toast.success("Session locked successfully");
        },
        onError: (error) => {
            handleAuthError(error, dispatch);
        },
    });
};

/**
 * Hook for unlocking user session
 */
export const useUnlock = () => {
    const dispatch = useDispatch();
    const queryClient = useQueryClient();

    return useMutation<AuthResponse, ApiErrorResponse, string>({
        mutationFn: authService.unlock,
        onSuccess: (data) => {
            dispatch(unlockSession());
            queryClient.invalidateQueries({ queryKey: authKeys.all });
            // Don't show success toast as we're redirecting
        },
        onError: (error) => {
            handleAuthError(error, dispatch);
        },
    });
};

/**
 * Hook for checking lock status
 */
export const useCheckLock = (enabled: boolean = true) => {
    const dispatch = useDispatch();
    const hasToken = !!storageUtil.getToken();

    const query = useQuery<CheckLockResponse>({
        queryKey: ["auth", "check-lock"],
        queryFn: authService.checkLock,
        enabled: enabled && hasToken,
        staleTime: 30 * 1000, // 30 seconds
        retry: (failureCount, error: any) => {
            // Don't retry on auth errors
            if (error?.status === 401 || error?.status === 403) {
                return false;
            }
            return failureCount < 2;
        },
    });

    // Handle success case
    useEffect(() => {
        if (query.data?.data) {
            dispatch(setLockStatus(query.data.data.is_locked));
        }
    }, [query.data, dispatch]);

    // Handle error case
    useEffect(() => {
        if (query.error) {
            const error = query.error as any;
            if (error?.status === 401) {
                dispatch(logoutAction());
            }
        }
    }, [query.error, dispatch]);

    return query;
};
