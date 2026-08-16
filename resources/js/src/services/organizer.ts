import { BaseApi } from "./baseApi";
import { IOrganizer } from "../types";
import axiosInstance from "../utils/axios";

class OrganizerApi extends BaseApi<IOrganizer> {
    constructor() {
        super("/organizers");
    }

    async suspend(id: number | string): Promise<IOrganizer> {
        const response = await axiosInstance.post(`${this.endpoint}/${id}/suspend`);
        return response.data.data || response.data;
    }

    async reactivate(id: number | string): Promise<IOrganizer> {
        const response = await axiosInstance.post(`${this.endpoint}/${id}/reactivate`);
        return response.data.data || response.data;
    }
}

export const organizerApi = new OrganizerApi();
