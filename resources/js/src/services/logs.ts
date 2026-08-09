import axiosInstance from "../utils/axios";

class LogsApi {
    /**
     * Get all logs with pagination
     */
    async getAll(params = {}) {
        const response = await axiosInstance.get('/logs', { params });
        return response.data;
    }

    /**
     * Get log by ID
     */
    async getById(id: number) {
        const response = await axiosInstance.get(`/logs/${id}`);
        return response.data.data || response.data;
    }

    /**
     * Get all available log types
     */
    async getLogTypes() {
        const response = await axiosInstance.get('/logs/types');
        return response.data.data || response.data;
    }

    /**
     * Get authentication logs
     */
    async getAuthLogs(params = {}) {
        const response = await axiosInstance.get('/logs/auth', { params });
        return response.data;
    }

    /**
     * Get user management logs
     */
    async getUserLogs(params = {}) {
        const response = await axiosInstance.get('/logs/users', { params });
        return response.data;
    }

    /**
     * Get content management logs
     */
    async getContentLogs(params = {}) {
        const response = await axiosInstance.get('/logs/content', { params });
        return response.data;
    }
}

export const logsApi = new LogsApi();
