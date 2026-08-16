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

export interface ITicketType extends ITimestamped {
    id: number;
    event_id: number;
    name: string;
    price: number | string;
    /** null = unlimited */
    quantity_limit: number | null;
    quantity_sold: number;
    sort_order: number;
    sales_enabled: boolean;
    deleted_at?: string | null;
}

export interface IDiscountCode extends ITimestamped {
    id: number;
    code: string;
    event_id?: number | null;
    organizer_id?: number | null;
    type: "percent" | "fixed" | string;
    value: number | string;
    usage_limit?: number | null;
    usage_count: number;
    expires_at?: string | null;
    active: boolean;
}

export interface IParticipation {
    id: number;
    user_id: number;
    event_id: number;
    ticket_type_id?: number | null;
    status: "waitlisted" | "joined" | "paid" | "checked_in" | "cancelled" | string;
    payment_status: "not_required" | "pending" | "paid" | "refunded" | "failed" | string;
    custom_field_answers?: Record<string, unknown> | null;
    qr_token?: string | null;
    created_at?: string;
    updated_at?: string;
    user?: { id: number; name: string; email: string } | null;
    ticket_type?: ITicketType | null;
}

export type FormFieldType = "text" | "number" | "select" | "checkbox" | "date";

export interface IEventFormField extends ITimestamped {
    id: number;
    event_id: number;
    key: string;
    label: string;
    type: FormFieldType | string;
    options?: Array<string | { value?: string; label?: string }> | null;
    required: boolean;
    sort_order: number;
    active: boolean;
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
    registered_count?: number;
    waitlisted_count?: number;
    seats_remaining?: number | null;
    registration_deadline?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
    deleted_at?: string | null;
    organizer?: { id: number; business_name: string; email?: string } | null;
    category?: IEventCategory | null;
    images?: IEventImage[];
    ticket_types?: ITicketType[];
    discount_codes?: IDiscountCode[];
    registration_gates?: IRegistrationGates;
}
