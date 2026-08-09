import { IUser } from "../types";
import { storageUtil } from "./storage";
import { sidebarMenu, filterMenuByPermissions, cleanEmptySections } from "../lib/sidebar";
import { MenuItem } from "../types/sidebar";

/**
 * Authentication utility functions for user management and security
 */
export const authUtils = {
    /**
     * Check if user is authenticated based on token presence
     */
    isAuthenticated(): boolean {
        return !!storageUtil.getToken();
    },

    /**
     * Get current user from storage
     */
    getCurrentUser(): IUser | null {
        return storageUtil.getUser<IUser>();
    },

    /**
     * Check if user has specific role
     */
    hasRole(role: string): boolean {
        const user = this.getCurrentUser();
        return !!user;
    },

    /**
     * Check if user has specific permission
     */
    hasPermission(permission: string): boolean {
        const user = this.getCurrentUser();

        if (!user || !user.permissions) {
            return false;
        }

        return user.permissions.some((perm) => perm.name === permission);
    },

    /**
     * Check if user has any of the required permissions
     */
    hasAnyPermission(permissions: string[]): boolean {
        const user = this.getCurrentUser();

        if (!user || !user.permissions) {
            return false;
        }

        return permissions.some((permission) =>
            user.permissions!.some((perm) => perm.name === permission)
        );
    },

    /**
     * Get user's first accessible page based on sidebar menu and permissions
     * @returns The path of the first accessible page, or '/dashboard' as fallback
     */
    getHomePage(): string {
        // Filter menu items based on user permissions
        const filteredMenu = cleanEmptySections(
            filterMenuByPermissions(sidebarMenu, (permissions) => this.hasAnyPermission(permissions))
        );

        // Find the first menu item with a path (excluding sections)
        const findFirstPath = (items: MenuItem[]): string | null => {
            for (const item of items) {
                // Skip sections
                if (item.isSection) {
                    continue;
                }

                // If item has a direct path, return it
                if (item.path) {
                    return item.path;
                }

                // If item has children, check them
                if (item.children && item.children.length > 0) {
                    const childPath = findFirstPath(item.children);
                    if (childPath) {
                        return childPath;
                    }
                }
            }
            return null;
        };

        const firstPath = findFirstPath(filteredMenu);

        // Return the first accessible path or dashboard as fallback
        return firstPath || '/dashboard';
    },

    /**
     * Log security events for auditing
     */
    logSecurityEvent(eventType: string, eventData: Record<string, any>): void {
        // In production, implement actual logging to server or monitoring service
        // For development, just log to console
        if (process.env.NODE_ENV !== "production") {
            console.log(`[Security Event] ${eventType}:`, eventData);
        }
    },
};
