import { ITimestamped } from './common';

// Permission interface for role permissions
export interface IPermission extends ITimestamped {
    id: number;
    name: string;
    guard_name: string;
    pivot?: {
        role_id: number;
        permission_id: number;
    };
}

// Role interface
export interface IRole extends ITimestamped {
    id: number;
    name: string;
    guard_name: string;
    permissions?: IPermission[];
}

// Role creation/update payload
export interface IRolePayload {
    name: string;
    guard_name: string;
}
