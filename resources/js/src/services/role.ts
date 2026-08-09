import { BaseApi } from "./baseApi";
import { IPermission, IRole } from "../types";
import axiosInstance from "../utils/axios";

class RoleApi extends BaseApi<IRole> {
    constructor() {
        super("/roles");
    }

    async getAvailablePermissions(): Promise<IPermission[]> {
        const response = await axiosInstance.get("roles/permissions/available");
        return response.data.data || response.data;
    }

    async assignPermissions(roleId: number, permissionNames: string[]): Promise<any> {
        const response = await axiosInstance.post(`/roles/${roleId}/assign-permissions`, {
            permissions: permissionNames,
        });
        return response.data;
    }
}

export const roleApi = new RoleApi();
