export interface IApiClient {
    id: number;
    name: string;
    public_key: string;
    public_key_masked?: string;
    active: boolean;
    created_at: string;
    updated_at: string;
}
