import { BaseApi } from "./baseApi";
import { IPayment } from "../types/payment";
import { IApiResponse, IQueryParams } from "../types";
import axiosInstance from "../utils/axios";

class PaymentApi extends BaseApi<IPayment> {
    constructor() {
        super("/payments");
    }

    async getEventPayments(
        eventId: number | string,
        params: IQueryParams = {}
    ): Promise<IApiResponse<IPayment>> {
        return this.getAll({ ...params, event_id: eventId });
    }

    async refund(
        id: number | string,
        payload: { reason?: string | null } = {}
    ): Promise<IPayment> {
        const response = await axiosInstance.post(`${this.endpoint}/${id}/refund`, payload);
        return response.data.data || response.data;
    }
}

export const paymentApi = new PaymentApi();
