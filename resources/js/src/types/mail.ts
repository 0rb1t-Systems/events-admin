// Mail config types (Resend — Admin Settings → Mail)

export interface IMailConfig {
    from_name: string;
    from_email: string;
    /** Always empty on GET — use has_api_key */
    api_key?: string;
    has_api_key?: boolean;
    configured?: boolean;
}

export interface IMailConfigPayload {
    from_name: string;
    from_email: string;
    /** Omit or empty to keep existing key */
    api_key?: string;
}

export interface ITestMailPayload {
    test_email: string;
}

export interface ITestMailResponse {
    message: string;
}
