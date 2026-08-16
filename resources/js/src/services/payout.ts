import { BaseApi } from "./baseApi";
import { IEventFinance, IPayoutRequest } from "../types/payment";
import axiosInstance from "../utils/axios";

class PayoutRequestApi extends BaseApi<IPayoutRequest> {
    constructor() {
        super("/payout-requests");
    }

    async approve(id: number | string, admin_notes?: string) {
        const response = await axiosInstance.post(`${this.endpoint}/${id}/approve`, {
            admin_notes,
        });
        return response.data.data || response.data;
    }

    async reject(id: number | string, admin_notes?: string) {
        const response = await axiosInstance.post(`${this.endpoint}/${id}/reject`, {
            admin_notes,
        });
        return response.data.data || response.data;
    }

    async recordPayment(id: number | string, confirmed_amount?: number, admin_notes?: string) {
        const response = await axiosInstance.post(`${this.endpoint}/${id}/record-payment`, {
            confirmed_amount,
            admin_notes,
        });
        return response.data.data || response.data;
    }
}

export const payoutRequestApi = new PayoutRequestApi();

export async function fetchEventFinance(eventId: number | string): Promise<IEventFinance> {
    const response = await axiosInstance.get(`/events/${eventId}/finance`);
    return response.data.data || response.data;
}

export async function fetchCommissionRate(): Promise<number> {
    const response = await axiosInstance.get("/settings/commission-rate");
    return Number(response.data.data?.rate ?? 10);
}

export async function updateCommissionRate(rate: number): Promise<number> {
    const response = await axiosInstance.put("/settings/commission-rate", { rate });
    return Number(response.data.data?.rate ?? rate);
}
