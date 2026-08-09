/**
 * Interface for sidebar menu items
 */
export interface MenuItem {
    title: string;
    icon?: any;
    path?: string;
    children?: MenuItem[];
    isSection?: boolean;
    target?: string;
    permissions?: string[];
}
