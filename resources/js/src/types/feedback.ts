export interface IEventFeedback {
    id: number;
    participation_id: number;
    rating: number;
    comment?: string | null;
    hidden: boolean;
    submitted_at?: string | null;
    created_at?: string;
    updated_at?: string;
    participation?: {
        id: number;
        event_id?: number;
        status?: string;
        user?: {
            id: number;
            name?: string;
            email?: string;
        } | null;
        event?: {
            id: number;
            title?: string;
        } | null;
    } | null;
}
