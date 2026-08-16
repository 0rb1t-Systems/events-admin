import {
    LayoutDashboard,
    Users,
    Settings,
    Trash2,
    ClipboardList,
    Briefcase,
    CalendarDays,
    QrCode,
    Wallet,
    MessageSquare,
    CreditCard,
    Award,
    Package,
} from "lucide-react";

import { MenuItem } from "../types/sidebar";

export const sidebarMenu: MenuItem[] = [
    {
        title: "dashboard",
        icon: LayoutDashboard,
        path: "/dashboard",
        permissions: ["view dashboard"],
    },

    {
        title: "configuration",
        isSection: true,
        permissions: [
            "view users",
            "view organizers",
            "view organizer subscriptions",
            "view events",
            "view payments",
            "view payouts",
            "view event feedback",
            "manage settings",
            "view packages",
            "view event categories",
            "view organizations",
        ],
    },
    {
        title: "users",
        icon: Users,
        children: [{ title: "all_users", path: "/users" }],
        permissions: ["view users"],
    },
    {
        title: "organizers",
        icon: Briefcase,
        path: "/organizers",
        permissions: ["view organizers"],
    },
    {
        title: "subscriptions",
        icon: Package,
        path: "/subscriptions",
        permissions: ["view organizer subscriptions"],
    },
    {
        title: "events",
        icon: CalendarDays,
        path: "/events",
        permissions: ["view events"],
    },
    {
        title: "payments",
        icon: CreditCard,
        path: "/payments",
        permissions: ["view payments"],
    },
    {
        title: "payouts",
        icon: Wallet,
        path: "/payouts",
        permissions: ["view payouts"],
    },
    {
        title: "feedback",
        icon: MessageSquare,
        path: "/feedback",
        permissions: ["view event feedback"],
    },
    {
        title: "settings",
        icon: Settings,
        permissions: [
            "manage settings",
            "view packages",
            "view event categories",
            "view invitation templates",
            "view organizations",
        ],
        children: [
            { title: "mail_settings", path: "/settings/mail", permissions: ["manage settings"] },
            { title: "roles", path: "/settings/roles", permissions: ["manage settings"] },
            { title: "packages", path: "/settings/packages", permissions: ["view packages"] },
            {
                title: "event_categories",
                path: "/settings/event-categories",
                permissions: ["view event categories"],
            },
            {
                title: "invitation_templates",
                path: "/settings/invitation-templates",
                permissions: ["view invitation templates"],
            },
            { title: "commission", path: "/settings/commission", permissions: ["manage settings"] },
            {
                title: "organization",
                path: "/settings/organization",
                permissions: ["view organizations"],
            },
        ],
    },

    {
        title: "system_monitoring",
        isSection: true,
        permissions: [
            "view logs",
            "view trash items",
            "view qr scan logs",
            "view certificates",
        ],
    },
    {
        title: "logs",
        icon: ClipboardList,
        path: "/logs",
        permissions: ["view logs"],
    },
    {
        title: "certificates",
        icon: Award,
        path: "/certificates",
        permissions: ["view certificates"],
    },
    {
        title: "qr_scan_history",
        icon: QrCode,
        path: "/qr-scan-logs",
        permissions: ["view qr scan logs"],
    },
    {
        title: "trash_items",
        icon: Trash2,
        path: "/trash",
        permissions: ["view trash items"],
    },
];

/**
 * Filter sidebar menu items based on user permissions
 * @param menuItems - Array of menu items to filter
 * @param hasAnyPermission - Function to check if user has any of the required permissions
 * @returns Filtered array of menu items
 */
export const filterMenuByPermissions = (
    menuItems: MenuItem[],
    hasAnyPermission: (permissions: string[]) => boolean
): MenuItem[] => {
    return menuItems
        .map((item) => {
            // If item has no permissions, show it
            if (!item.permissions || item.permissions.length === 0) {
                return item;
            }

            // Check if user has any of the required permissions
            if (!hasAnyPermission(item.permissions)) {
                return null;
            }

            // If item has children, filter them too
            if (item.children) {
                const filteredChildren = filterMenuByPermissions(
                    item.children,
                    hasAnyPermission
                );
                if (filteredChildren.length === 0) {
                    return null;
                }
                return {
                    ...item,
                    children: filteredChildren,
                };
            }

            return item;
        })
        .filter((item): item is MenuItem => item !== null);
};

/**
 * Clean up empty sections after permission filtering
 * @param menuItems - Array of menu items to clean
 * @returns Cleaned array of menu items
 */
export const cleanEmptySections = (menuItems: MenuItem[]): MenuItem[] => {
    const cleaned = menuItems.filter((item, index) => {
        // If it's a section, check if there are any non-section items after it
        if (item.isSection) {
            const nextNonSectionIndex = menuItems.findIndex(
                (nextItem, nextIndex) =>
                    nextIndex > index && !nextItem.isSection
            );

            // If there's no next non-section item, or if the next non-section item is after another section, remove this section
            if (nextNonSectionIndex === -1) {
                return false;
            }

            const nextSectionIndex = menuItems.findIndex(
                (nextItem, nextIndex) => nextIndex > index && nextItem.isSection
            );

            if (
                nextSectionIndex !== -1 &&
                nextSectionIndex < nextNonSectionIndex
            ) {
                return false;
            }
        }

        return true;
    });

    return cleaned;
};

/**
 * Example function to demonstrate permission filtering
 * This can be used for testing or documentation purposes
 * @param userPermissions - Array of permission names the user has
 * @returns Filtered sidebar menu for the user
 */
export const getFilteredMenuForUser = (
    userPermissions: string[]
): MenuItem[] => {
    const mockHasAnyPermission = (requiredPermissions: string[]): boolean => {
        return requiredPermissions.some((permission) =>
            userPermissions.includes(permission)
        );
    };

    return cleanEmptySections(
        filterMenuByPermissions(sidebarMenu, mockHasAnyPermission)
    );
};
