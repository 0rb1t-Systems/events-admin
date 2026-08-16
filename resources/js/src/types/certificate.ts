export interface ICertificate {
    id: number;
    participation_id: number;
    issued_at?: string | null;
    file_path?: string | null;
    file_url?: string | null;
    verified?: boolean;
    created_at?: string;
    updated_at?: string;
    participation?: {
        id: number;
        user?: { id: number; name?: string; email?: string } | null;
        event?: { id: number; title?: string } | null;
    } | null;
}
