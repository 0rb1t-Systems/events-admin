import { ITimestamped } from "./common";

export type EventStatus =
    | "draft"
    | "published"
    | "registration_open"
    | "sold_out"
    | "registration_closed"
    | "ongoing"
    | "completed"
    | "cancelled";

export interface IEventCategory extends ITimestamped {
    id: number;
    name: string;
    deleted_at?: string | null;
}

export interface IEventImage {
    id: number;
    event_id: number;
    path: string;
    sort_order: number;
}

export interface IRegistrationGates {
    allowed: boolean;
    reason: string | null;
    capacity_reached: boolean;
    deadline_passed: boolean;
}

export interface IEvent extends ITimestamped {
    id: number;
    organizer_id: number;
    event_category_id?: number | null;
    title: string;
    description?: string | null;
    city?: string | null;
    address?: string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
    banner_path?: string | null;
    featured: boolean;
    monetized: boolean;
    status: EventStatus | string;
    /** null = unlimited; 0 = no seats */
    capacity: number | null;
    registrations_count: number;
    registration_deadline?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
    deleted_at?: string | null;
    organizer?: { id: number; business_name: string; email?: string } | null;
    category?: IEventCategory | null;
    images?: IEventImage[];
    registration_gates?: IRegistrationGates;
}
