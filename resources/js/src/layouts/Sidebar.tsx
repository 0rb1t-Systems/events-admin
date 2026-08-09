import { ChevronDown, ChevronsDown, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import PerfectScrollbar from "react-perfect-scrollbar";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, useLocation } from "react-router-dom";

import { useEffect, useState } from "react";
import AnimateHeight from "react-animate-height";
import {
    sidebarMenu,
    filterMenuByPermissions,
    cleanEmptySections,
} from "../lib/sidebar";
import { IRootState } from "../store";
import { toggleSidebar } from "../store/themeConfigSlice";
import { MenuItem } from "../types/sidebar";
import { usePermission } from "../hooks";
import { authUtils } from "../utils/auth";
import { useOrganization } from "../contexts/OrganizationContext";

const Sidebar = () => {
    const [activeMenus, setActiveMenus] = useState<string[]>([]);
    const [errorSubMenu, setErrorSubMenu] = useState(false);
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const semidark = useSelector(
        (state: IRootState) => state.themeConfig.semidark
    );
    const { organization } = useOrganization();
    const location = useLocation();
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const { hasAnyPermission } = usePermission();
    const isDark = themeConfig.theme === 'dark' || themeConfig.isDarkMode;

    // Determine which logo to use based on theme
    const logoUrl = isDark
        ? (organization?.logo_dark_url || organization?.logo_url)
        : organization?.logo_url;

    // Filter sidebar menu based on user permissions
    const filteredSidebarMenu = cleanEmptySections(
        filterMenuByPermissions(sidebarMenu, hasAnyPermission)
    );



    // Toggle a menu's expanded state
    const toggleMenu = (menuId: string) => {
        setActiveMenus((prev) => {
            if (prev.includes(menuId)) {
                return prev.filter((id) => id !== menuId);
            } else {
                return [...prev, menuId];
            }
        });
    };

    // Find which menus should be active based on current URL
    const findActiveMenus = () => {
        const currentPath = location.pathname;
        const menuIdsToExpand: string[] = [];

        // Find all parent menu items that should be expanded
        const findMenusToExpand = (
            items: MenuItem[],
            parentId: string | null = null
        ) => {
            for (const item of items) {
                if (item.path === currentPath) {
                    // If this is the exact path and has a parent, add parent to expand list
                    if (parentId) {
                        menuIdsToExpand.push(parentId);
                    }
                    return true;
                }

                if (item.children) {
                    const foundInChildren = findMenusToExpand(
                        item.children,
                        item.title
                    );
                    if (foundInChildren && parentId) {
                        menuIdsToExpand.push(parentId);
                    }
                }
            }
            return false;
        };

        // Start search from filtered top-level items
        findMenusToExpand(filteredSidebarMenu);

        return menuIdsToExpand;
    };

    // Update active menus when location changes
    useEffect(() => {
        const activeMenuIds = findActiveMenus();
        setActiveMenus(activeMenuIds);
    }, [location.pathname]);

    useEffect(() => {
        if (window.innerWidth < 1024 && themeConfig.sidebar) {
            dispatch(toggleSidebar());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location]);

    const renderMenuItem = (item: MenuItem, index: number) => {
        if (item.isSection) {
            return (
                <h2
                    key={index}
                    className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1"
                >
                    <Minus size={20} className="w-4 h-5 flex-none hidden" />
                    <span>{t(item.title)}</span>
                </h2>
            );
        }

        // Check if this menu should be active based on current URL
        const isActive = activeMenus.includes(item.title);

        // Check if any child route is EXACTLY active
        let hasExactActiveChild = false;
        if (item.children) {
            hasExactActiveChild = item.children.some(
                (child) =>
                    location.pathname === child.path ||
                    (child.children &&
                        child.children.some(
                            (subChild) => location.pathname === subChild.path
                        ))
            );
        }

        // Check if the icon component is from Lucide
        const isLucideIcon =
            item.icon &&
            typeof item.icon === "function" &&
            (item.icon.toString().includes("lucide") ||
                item.icon.displayName?.includes("Lucide"));

        if (item.children) {
            return (
                <li key={index} className="menu nav-item">
                    <button
                        type="button"
                        className={`${
                            hasExactActiveChild ? "active" : ""
                        } nav-link group w-full`}
                        onClick={() => toggleMenu(item.title)}
                    >
                        <div className="flex items-center">
                            {item.icon && isLucideIcon ? (
                                <item.icon
                                    size={20}
                                    className="group-hover:!text-primary shrink-0"
                                />
                            ) : item.icon ? (
                                <item.icon className="group-hover:!text-primary shrink-0" />
                            ) : null}
                            <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">
                                {t(item.title)}
                            </span>
                        </div>

                        <div
                            className={
                                !isActive && !hasExactActiveChild
                                    ? "rtl:rotate-90 -rotate-90"
                                    : ""
                            }
                        >
                            <ChevronDown size={16} />
                        </div>
                    </button>

                    <AnimateHeight
                        duration={300}
                        height={isActive || hasExactActiveChild ? "auto" : 0}
                    >
                        <ul className="sub-menu text-gray-500">
                            {item.children.map((child, childIndex) => {
                                // Check if this item matches current path exactly
                                const isChildExactlyActive =
                                    location.pathname === child.path;
                                // Check if any subchild is active
                                const hasExactActiveSubChild =
                                    child.children &&
                                    child.children.some(
                                        (subChild) =>
                                            location.pathname === subChild.path
                                    );

                                return (
                                    <li key={childIndex}>
                                        {child.children ? (
                                            <>
                                                <button
                                                    type="button"
                                                    className={`${
                                                        isChildExactlyActive ||
                                                        hasExactActiveSubChild
                                                            ? "open"
                                                            : ""
                                                    } w-full before:bg-gray-300 before:w-[5px] before:h-[5px] before:rounded ltr:before:mr-2 rtl:before:ml-2 dark:text-[#888ea8] hover:bg-gray-100 dark:hover:bg-gray-900`}
                                                    onClick={() =>
                                                        setErrorSubMenu(
                                                            !errorSubMenu
                                                        )
                                                    }
                                                >
                                                    {t(child.title)}
                                                    <div
                                                        className={`${
                                                            errorSubMenu
                                                                ? "rtl:rotate-90 -rotate-90"
                                                                : ""
                                                        } ltr:ml-auto rtl:mr-auto`}
                                                    >
                                                        <ChevronsDown
                                                            size={14}
                                                            className="w-4 h-4"
                                                        />
                                                    </div>
                                                </button>
                                                <AnimateHeight
                                                    duration={300}
                                                    height={
                                                        errorSubMenu ||
                                                        isChildExactlyActive ||
                                                        hasExactActiveSubChild
                                                            ? "auto"
                                                            : 0
                                                    }
                                                >
                                                    <ul className="sub-menu text-gray-500">
                                                        {child.children.map(
                                                            (
                                                                subChild,
                                                                subChildIndex
                                                            ) => (
                                                                <li
                                                                    key={
                                                                        subChildIndex
                                                                    }
                                                                >
                                                                    <NavLink
                                                                        to={
                                                                            subChild.path ||
                                                                            "#"
                                                                        }
                                                                        target={
                                                                            subChild.target
                                                                        }
                                                                        className={({
                                                                            isActive,
                                                                        }) =>
                                                                            isActive
                                                                                ? "active"
                                                                                : ""
                                                                        }
                                                                    >
                                                                        {t(
                                                                            subChild.title
                                                                        )}
                                                                    </NavLink>
                                                                </li>
                                                            )
                                                        )}
                                                    </ul>
                                                </AnimateHeight>
                                            </>
                                        ) : (
                                            <NavLink
                                                to={child.path || "#"}
                                                target={child.target}
                                                className={({ isActive }) =>
                                                    isActive ? "active" : ""
                                                }
                                                end
                                            >
                                                {t(child.title)}
                                            </NavLink>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </AnimateHeight>
                </li>
            );
        }

        return (
            <li key={index} className="menu nav-item">
                <NavLink
                    to={item.path || "#"}
                    target={item.target}
                    className={({ isActive }) =>
                        isActive ? "active group" : "group"
                    }
                    end
                >
                    <div className="flex items-center">
                        {item.icon && isLucideIcon ? (
                            <item.icon
                                size={20}
                                className="group-hover:!text-primary shrink-0"
                            />
                        ) : item.icon ? (
                            <item.icon className="group-hover:!text-primary shrink-0" />
                        ) : null}
                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">
                            {t(item.title)}
                        </span>
                    </div>
                </NavLink>
            </li>
        );
    };

    return (
        <div className={semidark ? "dark" : ""}>
            <nav
                className={`sidebar fixed min-h-screen h-full top-0 bottom-0 w-[260px] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] z-50 transition-all duration-300 ${
                    semidark ? "text-white-dark" : ""
                }`}
            >
                <div className="bg-white dark:bg-black h-full">
                    <div className="flex justify-between items-center px-4 py-3">
                        <NavLink
                            to={authUtils.getHomePage()}
                            className="main-logo flex items-center shrink-0"
                        >
                            {logoUrl ? (
                            <img
                                className="w-8 ml-[5px] flex-none"
                                    src={logoUrl}
                                alt="logo"
                                onError={(e) => {
                                    // Fallback to default logo if organization logo fails to load
                                    (e.target as HTMLImageElement).src = "/assets/images/logo.svg";
                                }}
                            />
                            ) : (
                                <div className="w-8 h-8 ml-[5px] flex items-center justify-center text-gray-400 dark:text-gray-500">
                                    {organization?.name?.charAt(0).toUpperCase() || 'O'}
                                </div>
                            )}
                            <span className="text-2xl ltr:ml-1.5 rtl:mr-1.5 font-semibold align-middle lg:inline dark:text-white-light">
                                {organization?.name || t("Start Kit")}
                            </span>
                        </NavLink>

                        <button
                            type="button"
                            className="collapse-icon w-8 h-8 rounded-full flex items-center hover:bg-gray-500/10 dark:hover:bg-dark-light/10 dark:text-white-light transition duration-300 rtl:rotate-180"
                            onClick={() => dispatch(toggleSidebar())}
                        >
                            <ChevronsDown
                                size={18}
                                className="m-auto rotate-90"
                            />
                        </button>
                    </div>
                    <PerfectScrollbar className="h-[calc(100vh-80px)] relative">
                        <ul className="relative font-semibold space-y-0.5 p-4 py-0">
                            {filteredSidebarMenu.map((item, index) =>
                                renderMenuItem(item, index)
                            )}
                        </ul>
                    </PerfectScrollbar>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;
