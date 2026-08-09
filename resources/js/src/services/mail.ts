import axiosInstance from "../utils/axios";
import { IMailConfig, IMailConfigPayload, ITestMailPayload, ITestMailResponse } from "../types";

class MailApi {
    /**
     * Get current mail config
     */
    async getConfig(): Promise<IMailConfig> {
        const response = await axiosInstance.get("/settings/mail-config");
        return response.data.data || response.data;
    }

    /**
     * Update mail config
     */
    async updateConfig(data: IMailConfigPayload): Promise<IMailConfig> {
        const response = await axiosInstance.post("/settings/mail-config", data);
        return response.data.data || response.data;
    }

    /**
     * Send test email
     */
    async sendTestEmail(data: ITestMailPayload): Promise<ITestMailResponse> {
        const response = await axiosInstance.post("/settings/mail-config/test", data);
        return response.data;
    }
}

export const mailApi = new MailApi();
