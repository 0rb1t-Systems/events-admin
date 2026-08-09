import axiosInstance from "../utils/axios";


// Define interfaces for search results
export interface IGlobalSearchItem {
    id: number;
    type: 'word-entry' | 'book' | 'content-item' | 'category';
    title: string;
    description: string | null;
    url: string;
    match_field: string;
    match_score: number;
    created_at: string | null;
}

export interface IGlobalSearchResponse {
    total_results: number;
    results: {
        word_entries: IGlobalSearchItem[];
        books: IGlobalSearchItem[];
        content_items: IGlobalSearchItem[];
        categories: IGlobalSearchItem[];
    };
    total_per_category: {
        word_entries: number;
        books: number;
        content_items: number;
        categories: number;
    };
}

const API_BASE_URL = "";

export const globalSearchApi = {
    // Search across all entities
    search: async (params: {
        q: string;
        limit_per_type?: number;
        include_types?: string[];
    }): Promise<IGlobalSearchResponse> => {
        const response = await axiosInstance.get(`${API_BASE_URL}/global-search`, {
            params,
        });
        return response.data;
    },

    // Search specific entity type
    searchEntityType: async (entityType: string, params: {
        q: string;
        page?: number;
        per_page?: number;
        sort_by?: string;
        sort_direction?: "asc" | "desc";
    }) => {
        const response = await axiosInstance.get(`${API_BASE_URL}/global-search/${entityType}`, {
            params,
        });
        return response.data;
    }
};
