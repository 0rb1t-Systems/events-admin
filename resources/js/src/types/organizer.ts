import { ITimestamped } from "./common";
import { IOrganizerSubscription } from "./package";

/** Admin oversight view of an organizer (separate from User identity). */
export interface IOrganizer extends ITimestamped {
    id: number;
    business_name: string;
    contact_name: string;
    email: string;
    phone?: string | null;
    status: "active" | "suspended" | string;
    /** Loaded from active history row (not a column on organizers) */
    active_subscription?: IOrganizerSubscription | null;
    /** Convenience / legacy label from active package name */
    subscription_package?: string | null;
    events_count?: number | null;
}
