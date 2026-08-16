import { BaseApi } from "./baseApi";
import { IOrganizerSubscription } from "../types/package";
import { IApiResponse, IQueryParams } from "../types";
import axiosInstance from "../utils/axios";
import {
    formatQuotaLabel,
    formatQuotaUsage,
    OrganizerSubscriptionsPayload,
} from "./organizerSubscription";

/**
 * Platform-wide subscription overview (read-only).
 * Assign/cancel remain on Organizer Detail via organizerSubscriptionApi.
 */
class SubscriptionApi extends BaseApi<IOrganizerSubscription> {
    constructor() {
        super("/organizers/subscriptions");
    }

    async getAll(params: IQueryParams): Promise<IApiResponse<IOrganizerSubscription>> {
        const response = await axiosInstance.get(this.endpoint, { params });
        return response.data;
    }

    async forOrganizer(organizerId: number | string): Promise<OrganizerSubscriptionsPayload> {
        const response = await axiosInstance.get(`/organizers/${organizerId}/subscriptions`);
        return response.data.data || response.data;
    }
}

export const subscriptionApi = new SubscriptionApi();
export { formatQuotaLabel, formatQuotaUsage };
