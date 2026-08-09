// services/BaseApi.ts
import { IApiResponse, IQueryParams } from "../types";
import axiosInstance from "../utils/axios";

type ID = number | string;

export class BaseApi<T> {
    protected endpoint: string;

    constructor(endpoint: string) {
        this.endpoint = endpoint;
    }

    async getAll(params: IQueryParams): Promise<IApiResponse<T>> {
        const response = await axiosInstance.get(this.endpoint, { params });
        return response.data;
    }

    async getById(id: ID): Promise<T> {
        const response = await axiosInstance.get(`${this.endpoint}/${id}`);
        return response.data.data || response.data;
    }

    async create(data: Partial<T> | FormData): Promise<T> {
        const isFormData = data instanceof FormData;
        const response = await axiosInstance.post(this.endpoint, data, {
            headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
        });
        return response.data;
    }

    async update(id: ID, data: Partial<T>): Promise<T> {
        const response = await axiosInstance.patch(`${this.endpoint}/${id}`, data);
        return response.data;
    }

    async delete(id: ID): Promise<void> {
        await axiosInstance.delete(`${this.endpoint}/${id}`);
    }

    async forceDelete(id: ID): Promise<void> {
        await axiosInstance.delete(`${this.endpoint}/${id}/force`);
    }

    async getTrashed(params: IQueryParams): Promise<IApiResponse<T>> {
        const response = await axiosInstance.get(`${this.endpoint}/trashed/list`, { params });
        return response.data;
    }

    async getTrashedById(id: ID): Promise<T> {
        const response = await axiosInstance.get(`${this.endpoint}/${id}/trashed`);
        return response.data;
    }

    async restore(id: ID): Promise<T> {
        const response = await axiosInstance.post(`${this.endpoint}/${id}/restore`);
        return response.data;
    }

    async search(params: any): Promise<IApiResponse<T>> {
        const response = await axiosInstance.get(`${this.endpoint}/search`, { params });
        return response.data;
    }

    async bulkDelete(ids: ID[]): Promise<{ deleted_count: number; message: string }> {
        const response = await axiosInstance.delete(`${this.endpoint}/bulk/delete`, { data: { ids } });
        return response.data;
    }

    async bulkRestore(ids: ID[]): Promise<{ restored_count: number; message: string }> {
        const response = await axiosInstance.post(`${this.endpoint}/bulk/restore`, { ids });
        return response.data;
    }

    async bulkForceDelete(ids: ID[]): Promise<{ deleted_count: number; message: string }> {
        const response = await axiosInstance.delete(`${this.endpoint}/bulk/force-delete`, {
            data: { ids },
        });
        return response.data;
    }

    async bulkStore(data: { entries: Partial<T>[] }): Promise<{ created_count: number }> {
        const response = await axiosInstance.post(`${this.endpoint}/bulk`, data);
        return response.data;
    }
}
