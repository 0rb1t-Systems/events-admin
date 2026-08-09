import React from "react";

interface SidebarItem {
    id: string;
    title: string;
    icon: React.ReactNode;
    path?: string;
}

interface SidebarProps {
    items: SidebarItem[];
    activeTab: string;
    onTabChange?: (tabId: string) => void;
    showMobileMenu: boolean;
    linkComponent?: React.ElementType;
}

const Sidebar: React.FC<SidebarProps> = ({ items, activeTab, onTabChange, showMobileMenu, linkComponent: LinkComponent }) => (
    <nav
        id="mobile-menu"
        className={`md:w-64 md:block mb-4 md:mb-0 md:mr-6 border-r border-gray-200 dark:border-gray-800 ${showMobileMenu ? "block" : "hidden"} md:block`}
        aria-label="Settings navigation"
    >
        <ul className="space-y-1">
            {items.map((item) => (
                <li key={item.id}>
                    {LinkComponent && item.path ? (
                        <LinkComponent
                            to={item.path}
                            className={({ isActive }: any) =>
                                `flex items-center w-full p-4 rounded-lg transition-colors ${
                                    isActive || activeTab === item.id
                                        ? "bg-gray-100 dark:bg-gray-700 text-primary dark:text-primary-light font-medium"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                }`
                            }
                            aria-current={activeTab === item.id ? "page" : undefined}
                            onClick={() => onTabChange && onTabChange(item.id)}
                        >
                            <span className="mr-3">{item.icon}</span>
                            <span>{item.title}</span>
                        </LinkComponent>
                    ) : (
                        <button
                            className={`flex items-center w-full p-4 rounded-lg transition-colors ${
                                activeTab === item.id
                                    ? "bg-gray-100 dark:bg-gray-700 text-primary dark:text-primary-light font-medium"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                            }`}
                            onClick={() => onTabChange && onTabChange(item.id)}
                            aria-current={activeTab === item.id ? "page" : undefined}
                        >
                            <span className="mr-3">{item.icon}</span>
                            <span>{item.title}</span>
                        </button>
                    )}
                </li>
            ))}
        </ul>
    </nav>
);

export default Sidebar;
