// Mail config types

export interface IMailConfig {
    from_name: string;
    from_email: string;
    host: string;
    port: string;
    encryption: 'ssl' | 'tls';
    username: string;
    password?: string; // Optional for GET, required for POST/PUT
}

export interface IMailConfigPayload {
    from_name: string;
    from_email: string;
    host: string;
    port: string;
    encryption: 'ssl' | 'tls';
    username: string;
    password: string;
}

export interface ITestMailPayload {
    test_email: string;
}

export interface ITestMailResponse {
    message: string;
}
