import React from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Menu } from "lucide-react";
import { toggleSidebar } from "../../store/themeConfigSlice";
import { authUtils } from "../../utils/auth";
import { useOrganization } from "../../contexts/OrganizationContext";
import { IRootState } from "../../store";

const Logo = () => {
    const dispatch = useDispatch();
    const { organization } = useOrganization();
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);

    // Determine which logo to use based on theme
    const logoUrl = isDark
        ? (organization?.logo_dark_url || organization?.logo_url)
        : organization?.logo_url;

    return (
        <div className="horizontal-logo flex lg:hidden justify-between items-center ltr:mr-2 rtl:ml-2">
            <Link
                to={authUtils.getHomePage()}
                className="main-logo flex items-center shrink-0"
            >
                {logoUrl ? (
                <img
                    className="w-8 ltr:-ml-1 rtl:-mr-1 inline"
                        src={logoUrl}
                    alt="logo"
                    onError={(e) => {
                        // Fallback to default logo if organization logo fails to load
                        (e.target as HTMLImageElement).src = "/assets/images/logo.svg";
                    }}
                />
                ) : (
                    <div className="w-8 h-8 flex items-center justify-center text-gray-400 dark:text-gray-500">
                        {organization?.name?.charAt(0).toUpperCase() || 'O'}
                    </div>
                )}
                <span className="text-2xl ltr:ml-1.5 rtl:mr-1.5 font-semibold align-middle hidden md:inline dark:text-white-light transition-all duration-300">
                    {organization?.name || "Start Kit"}
                </span>
            </Link>
            <button
                type="button"
                className="collapse-icon flex-none dark:text-[#d0d2d6] hover:text-primary dark:hover:text-primary flex lg:hidden ltr:ml-2 rtl:mr-2 p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:bg-white-light/90 dark:hover:bg-dark/60"
                onClick={() => {
                    dispatch(toggleSidebar());
                }}
            >
                <Menu size={20} className="w-5 h-5" />
            </button>
        </div>
    );
};

export default Logo;
