import axiosInstance from "../utils/axios";

export interface DashboardStats {
    total_organizers: number;
    events_by_status: Record<string, number>;
    total_events: number;
    total_collected_funds: number;
    currency: string;
    pending_payout_requests: number;
    approved_awaiting_payment: number;
}

class DashboardApi {
    async getStats(): Promise<DashboardStats> {
        const response = await axiosInstance.get("/dashboard/stats");
        return response.data.data;
    }
}

export const dashboardApi = new DashboardApi();
export default dashboardApi;
