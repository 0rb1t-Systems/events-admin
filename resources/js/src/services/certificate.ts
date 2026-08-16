import { BaseApi } from "./baseApi";
import { ICertificate } from "../types/certificate";
import axiosInstance from "../utils/axios";

class CertificateApi extends BaseApi<ICertificate> {
    constructor() {
        super("/certificates");
    }

    async reissue(participationId: number | string): Promise<ICertificate> {
        const response = await axiosInstance.post(
            `${this.endpoint}/${participationId}/reissue`
        );
        return response.data.data || response.data;
    }
}

export const certificateApi = new CertificateApi();
