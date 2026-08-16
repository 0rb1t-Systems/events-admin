import axiosInstance from "../utils/axios";
import { IOrganizerSubscription, IQuotaUsage } from "../types/package";

export interface OrganizerSubscriptionsPayload {
    organizer_id: number;
    active: IOrganizerSubscription | null;
    history: IOrganizerSubscription[];
}

class OrganizerSubscriptionApi {
    async forOrganizer(organizerId: number | string): Promise<OrganizerSubscriptionsPayload> {
        const response = await axiosInstance.get(`/organizers/${organizerId}/subscriptions`);
        return response.data.data || response.data;
    }

    async assign(
        organizerId: number | string,
        data: { package_id: number; expires_at?: string | null }
    ): Promise<IOrganizerSubscription> {
        const response = await axiosInstance.post(`/organizers/${organizerId}/subscriptions`, data);
        return response.data.data || response.data;
    }

    async cancel(subscriptionId: number | string): Promise<IOrganizerSubscription> {
        const response = await axiosInstance.post(
            `/organizers/subscriptions/${subscriptionId}/cancel`
        );
        return response.data.data || response.data;
    }

    async list(params: Record<string, unknown> = {}): Promise<{ data: IOrganizerSubscription[] }> {
        const response = await axiosInstance.get("/organizers/subscriptions", { params });
        return response.data;
    }
}

export const organizerSubscriptionApi = new OrganizerSubscriptionApi();

/** Format quota for display — never collapse null and 0. */
export function formatQuotaLabel(quota: number | null | undefined, eventsCreated = 0): string {
    if (quota === null || quota === undefined) {
        return `${eventsCreated} / Unlimited`;
    }
    if (quota === 0) {
        return `${eventsCreated} / 0 (none)`;
    }
    return `${eventsCreated} / ${quota}`;
}

export function formatQuotaUsage(usage?: IQuotaUsage | null): string {
    if (!usage) return "—";
    return formatQuotaLabel(usage.quota, usage.events_created);
}
