import { BaseApi } from "./baseApi";
import { IPackage } from "../types/package";
import axiosInstance from "../utils/axios";

class PackageApi extends BaseApi<IPackage> {
    constructor() {
        super("/packages");
    }

    async archive(id: number | string): Promise<IPackage> {
        const response = await axiosInstance.post(`${this.endpoint}/${id}/archive`);
        return response.data.data || response.data;
    }
}

export const packageApi = new PackageApi();
