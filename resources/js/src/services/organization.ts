import { BaseApi } from './baseApi';
import { IApiResponse } from '../types';
import axiosInstance from '../utils/axios';

export interface Organization {
    id?: number;
    name: string;
    founded_date?: string;
    logo_url?: string;
    logo_dark_url?: string;
    icon_url?: string;
    website_url?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    created_at?: string;
    updated_at?: string;
}

export class OrganizationApi extends BaseApi<Organization> {
    constructor() {
        super('/organizations');
    }

    /**
     * Get organization profile
     */
    async getProfile(): Promise<Organization> {
        const response = await axiosInstance.get(`${this.endpoint}/profile`);
        return response.data.data;
    }

    /**
     * Update organization profile
     */
    async updateProfile(data: Partial<Organization>): Promise<Organization> {
        const response = await axiosInstance.post(`${this.endpoint}/profile`, data);
        return response.data.data;
    }

    /**
     * Upload organization logo
     */
    async uploadLogo(formData: FormData): Promise<{ logo_url: string }> {
        const response = await axiosInstance.post(`${this.endpoint}/logo`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.data;
    }

    /**
     * Remove organization logo
     */
    async removeLogo(): Promise<null> {
        const response = await axiosInstance.delete(`${this.endpoint}/logo`);
        return response.data.data;
    }

    /**
     * Upload organization dark logo
     */
    async uploadDarkLogo(formData: FormData): Promise<{ logo_dark_url: string }> {
        const response = await axiosInstance.post(`${this.endpoint}/logo-dark`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.data;
    }

    /**
     * Remove organization dark logo
     */
    async removeDarkLogo(): Promise<null> {
        const response = await axiosInstance.delete(`${this.endpoint}/logo-dark`);
        return response.data.data;
    }

    /**
     * Upload organization favicon/icon
     */
    async uploadIcon(formData: FormData): Promise<{ icon_url: string }> {
        const response = await axiosInstance.post(`${this.endpoint}/icon`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.data;
    }

    /**
     * Remove organization favicon/icon
     */
    async removeIcon(): Promise<null> {
        const response = await axiosInstance.delete(`${this.endpoint}/icon`);
        return response.data.data;
    }
}

export const organizationApi = new OrganizationApi();
