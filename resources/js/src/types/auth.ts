import { IUser } from "./user";

export interface AuthState {
    user: IUser | null;
    token: string | null;
    isAuthenticated: boolean;
    isLocked: boolean;
    loading: boolean;
    error: string | null;
}

export interface LoginCredentials {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    data: {
        user: IUser;
        token: string;
    };
}

export interface CurrentUserResponse {
    success: boolean;
    message: string;
    data: {
        user: IUser;
    };
}

export interface AuthResponse {
    success: boolean;
    message: string;
    data?: any;
}

export interface LockResponse {
    success: boolean;
    message: string;
    data: {
        locked_at: number;
        user: IUser;
    };
}

export interface UnlockResponse {
    success: boolean;
    message: string;
}

export interface CheckLockResponse {
    success: boolean;
    data: {
        is_locked: boolean;
        locked_at?: number;
        user?: IUser;
    };
}

export interface ApiErrorResponse {
    message: string;
    status?: number;
    errors?: Record<string, string[]>;
}

// For React Query mutations
export interface LoginMutationResponse {
    user: IUser;
    token: string;
}
