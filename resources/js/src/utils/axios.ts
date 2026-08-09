import axios, {
    AxiosResponse,
    AxiosError,
    InternalAxiosRequestConfig,
} from "axios";
import { storageUtil } from "./storage";

// Determine base URL - use relative path for same-origin API
const API_BASE_URL = "/api/v1";

/**
 * Custom Axios instance configured for the application
 * This uses Laravel Sanctum for authentication with cookies
 */
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest", // Required for Laravel to recognize the request as AJAX
    },
    // Removed withCredentials: true, as we are using Bearer token authentication
    timeout: 30000, // 30 seconds timeout
});

// Store reference to get Redux store state
let getReduxState: (() => any) | null = null;

/**
 * Set the Redux store getter function
 * This should be called from the main app to provide access to the store
 */
export const setReduxStoreGetter = (storeGetter: () => any) => {
    getReduxState = storeGetter;
};

// Request interceptor
axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
        // Get CSRF token from the meta tag if it exists (for non-GET requests)
        const csrfToken = document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content");

        if (csrfToken && config.headers) {
            config.headers["X-CSRF-TOKEN"] = csrfToken;
        }

        // Get auth token from Redux store first, then fallback to storage
        let accessToken: string | null = null;

        try {
            // Try to get token from Redux store
            if (getReduxState) {
                const state = getReduxState();
                accessToken = state.auth?.token;
            }
        } catch (error) {
            console.warn("Could not get token from Redux store:", error);
        }

        // Fallback to storage if Redux store token is not available
        if (!accessToken) {
            accessToken = storageUtil.getToken();
        }

        if (accessToken && config.headers) {
            config.headers["Authorization"] = `Bearer ${accessToken}`;
        }

        return config;
    },
    (error: AxiosError): Promise<AxiosError> => {
        return Promise.reject(error);
    }
);

// Response interceptor
axiosInstance.interceptors.response.use(
    (response: AxiosResponse): AxiosResponse => {
        return response;
    },
    (error: AxiosError): Promise<any> => {
        const statusCode = error.response?.status;

        // Handle specific error scenarios
        if (error.code === "ECONNABORTED") {
            return Promise.reject({
                message: "Request timeout exceeded. Please try again.",
            });
        }

        if (error.code === "ERR_NETWORK") {
            return Promise.reject({
                message: "Network error. Please check your connection.",
            });
        }

        // Handle authentication errors
        if (statusCode === 401) {
            // Check if this is a login request - if so, preserve the original error response
            const isLoginRequest =
                error.config?.url?.includes("/auth/login") ||
                error.config?.url?.includes("/auth/admin/login");

            if (isLoginRequest) {
                // For login requests, return the original error response from backend
                return Promise.reject(
                    error.response?.data || {
                        message:
                            "Authentication failed. Please check your credentials.",
                        status: 401,
                    }
                );
            }

            // For other routes, handle as session expiration
            if (!window.location.pathname.includes("/auth/login")) {
                // Clear auth data on 401
                storageUtil.clearAuth();

                // Redirect to login page
                window.location.href = "/auth/login";
            }

            return Promise.reject({
                message: "Your session has expired. Please login again.",
                status: 401,
            });
        }

        // Handle forbidden errors
        if (statusCode === 403) {
            return Promise.reject({
                message: "You do not have permission to perform this action.",
                status: 403,
            });
        }

        // Handle not found errors
        if (statusCode === 404) {
            return Promise.reject({
                message: "The requested resource was not found.",
                status: 404,
            });
        }

        // Handle validation errors
        if (statusCode === 422) {
            return Promise.reject(
                error.response?.data || {
                    message: "Validation failed. Please check your inputs.",
                    status: 422,
                }
            );
        }

        // Handle server errors
        if (statusCode && statusCode >= 500) {
            return Promise.reject({
                message: "Server error. Please try again later.",
                status: statusCode,
            });
        }

        // Default error handling
        return Promise.reject(
            error.response?.data || {
                message: "An unexpected error occurred.",
                status: statusCode || 0,
            }
        );
    }
);

/**
 * Helper function for GET requests
 * @param url The API endpoint
 * @param config Additional axios config
 * @returns Promise with the response data
 */
export const fetcher = async <T>(url: string, config?: any): Promise<T> => {
    const response = await axiosInstance.get<T>(url, config);
    return response.data;
};

/**
 * Helper function for POST requests
 * @param url The API endpoint
 * @param data The data to post
 * @param config Additional axios config
 * @returns Promise with the response data
 */
export const fetcherPost = async <T>(
    url: string,
    data?: any,
    config?: any
): Promise<T> => {
    const response = await axiosInstance.post<T>(url, data, config);
    return response.data;
};

/**
 * Helper function for PUT requests
 * @param url The API endpoint
 * @param data The data to update
 * @param config Additional axios config
 * @returns Promise with the response data
 */
export const fetcherPut = async <T>(
    url: string,
    data?: any,
    config?: any
): Promise<T> => {
    const response = await axiosInstance.put<T>(url, data, config);
    return response.data;
};

/**
 * Helper function for DELETE requests
 * @param url The API endpoint
 * @param config Additional axios config
 * @returns Promise with the response data
 */
export const fetcherDelete = async <T>(
    url: string,
    config?: any
): Promise<T> => {
    const response = await axiosInstance.delete<T>(url, config);
    return response.data;
};

export default axiosInstance;
