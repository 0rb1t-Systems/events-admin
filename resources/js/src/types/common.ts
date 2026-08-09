// Base interfaces
export interface ITimestamped {
    created_at: string | null;
    updated_at: string | null;
    deleted_at: string | null;
}

// API Response types
export interface IApiResponse<T> {
    current_page: number;
    data: T[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: IPaginationLink[];
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
}

export interface IPaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface IPopulate {
    dir: string;
    path: string;
    select?: string;
}

export interface IQueryParams {
    page?: number;
    per_page?: number;
    filter?: Record<string, any>;
    search_term?: string;
    search_fields?: string | string[];
    sort_by?: string;
    sort_direction?: "asc" | "desc";
}
