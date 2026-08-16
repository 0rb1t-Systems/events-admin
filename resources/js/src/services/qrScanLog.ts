import { BaseApi } from "./baseApi";
import { ICheckInStats, IQrScanLog } from "../types/qrScan";
import axiosInstance from "../utils/axios";

class QrScanLogApi extends BaseApi<IQrScanLog> {
    constructor() {
        super("/qr-scan-logs");
    }
}

export const qrScanLogApi = new QrScanLogApi();

export async function fetchCheckInStats(eventId: number | string): Promise<ICheckInStats> {
    const response = await axiosInstance.get(`/events/${eventId}/check-in-stats`);
    return response.data.data || response.data;
}
