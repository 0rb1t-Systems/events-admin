import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AuthState, LoginMutationResponse } from "../types/auth";
import { storageUtil } from "../utils/storage";
import { IUser } from "../types";

// Helper functions
const getInitialAuthState = (): AuthState => {
    const token = storageUtil.getToken();
    const user = storageUtil.getUser<IUser>();
    const isLocked = storageUtil.getLockStatus();

    return {
        user,
        token,
        isAuthenticated: !!token,
        isLocked,
        loading: false,
        error: null,
    };
};

const clearAuthState = (state: AuthState) => {
    state.user = null;
    state.token = null;
    state.isAuthenticated = false;
    state.isLocked = false;
    state.error = null;
    storageUtil.clearAuth();
};

const setAuthState = (state: AuthState, user: IUser, token: string) => {
    state.user = user;
    state.token = token;
    state.isAuthenticated = true;
    state.isLocked = false;
    state.error = null;
};

// Initial state
const initialState: AuthState = getInitialAuthState();

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        // Set credentials after successful login
        setCredentials: (
            state,
            action: PayloadAction<LoginMutationResponse>
        ) => {
            const { user, token } = action.payload;
            setAuthState(state, user, token);
        },

        // Clear credentials on logout
        logout: (state) => {
            clearAuthState(state);
        },

        // Update user data (for profile updates)
        updateUser: (state, action: PayloadAction<IUser>) => {
            state.user = action.payload;

            // Update storage if token exists
            if (state.token) {
                storageUtil.setUser(action.payload, true);
            }
        },

        // Set loading state
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },

        // Set error state
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },

        // Clear error
        clearError: (state) => {
            state.error = null;
        },

        // Hydrate auth state from storage (on app init)
        hydrateAuth: (state) => {
            const token = storageUtil.getToken();
            const user = storageUtil.getUser<IUser>();

            if (token && user) {
                setAuthState(state, user, token);
            } else {
                clearAuthState(state);
            }
        },

        // Lock session
        lockSession: (state) => {
            state.isLocked = true;
            state.error = null;
            storageUtil.setLockStatus(true);
        },

        // Unlock session
        unlockSession: (state) => {
            state.isLocked = false;
            state.error = null;
            storageUtil.setLockStatus(false);
        },

        // Set lock status
        setLockStatus: (state, action: PayloadAction<boolean>) => {
            state.isLocked = action.payload;
            storageUtil.setLockStatus(action.payload);
        },
    },
});

export const {
    setCredentials,
    logout,
    updateUser,
    setLoading,
    setError,
    clearError,
    hydrateAuth,
    lockSession,
    unlockSession,
    setLockStatus,
} = authSlice.actions;

export default authSlice.reducer;
