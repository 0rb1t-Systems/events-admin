import { ITimestamped } from "./common";

export type PackageStatus = "active" | "archived";

export interface IPackage extends ITimestamped {
    id: number;
    name: string;
    description?: string | null;
    price: number | string;
    /** null = unlimited; 0 = zero events allowed (distinct from unlimited) */
    event_quota: number | null;
    status: PackageStatus | string;
}

export interface IQuotaUsage {
    quota: number | null;
    unlimited: boolean;
    zero_quota: boolean;
    events_created: number;
    can_create_event: boolean;
    remaining: number | null;
}

export interface IOrganizerSubscription {
    id: number;
    organizer_id: number;
    package_id: number;
    status: "active" | "expired" | "cancelled" | string;
    started_at: string;
    expires_at?: string | null;
    organizer?: {
        id: number;
        business_name?: string;
        contact_name?: string;
        email?: string;
    } | null;
    package?: IPackage | null;
    quota_usage?: IQuotaUsage;
}
