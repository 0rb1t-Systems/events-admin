import { useSelector } from "react-redux";
import { IRootState } from "../store";

/**
 * Custom hook for permission checking with multiple utility functions
 * @returns Object containing permission checking functions
 */
export const usePermission = () => {
    const user = useSelector((state: IRootState) => state.auth.user);

    const hasPermission = (permission: string): boolean => {
        if (!user || !user.permissions) return false;
        return user.permissions.some((perm) => perm.name === permission);
    };

    const hasAnyPermission = (permissions: string[]): boolean => {
        if (!user || !user.permissions) return false;
        return permissions.some((permission) =>
            user.permissions!.some((perm) => perm.name === permission)
        );
    };

    const hasAllPermissions = (permissions: string[]): boolean => {
        if (!user || !user.permissions) return false;
        return permissions.every((permission) =>
            user.permissions!.some((perm) => perm.name === permission)
        );
    };

    return {
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
    };
};
