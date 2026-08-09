import { ITimestamped } from "./common";
import { IPermission, IRole } from "./role";

// User interface
export interface IUser extends ITimestamped {
    id: number;
    name: string;
    email: string;
    user_type?: string;
    email_verified_at: string | null;
    phone?: string | null;
    address?: string | null;
    profile_image?: string | null;
    fcm_token?: string | null;
    provider?: string | null;
    status?: string;
    roles?: IRole[] | null;
    permissions?: IPermission[];
}
