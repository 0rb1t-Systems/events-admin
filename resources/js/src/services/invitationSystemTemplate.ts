import { BaseApi } from "./baseApi";
import { IInvitationSystemTemplate } from "../types/invitationTemplate";
import axiosInstance from "../utils/axios";

class InvitationSystemTemplateApi extends BaseApi<IInvitationSystemTemplate> {
    constructor() {
        super("/invitation-system-templates");
    }

    async createWithFiles(form: FormData): Promise<IInvitationSystemTemplate> {
        const response = await axiosInstance.post(this.endpoint, form, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data.data || response.data;
    }

    async updateWithFiles(
        id: number | string,
        form: FormData
    ): Promise<IInvitationSystemTemplate> {
        form.append("_method", "PATCH");
        const response = await axiosInstance.post(`${this.endpoint}/${id}`, form, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data.data || response.data;
    }
}

export const invitationSystemTemplateApi = new InvitationSystemTemplateApi();
