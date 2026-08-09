import {
    Trash2,
    Users,
    Shield,
} from "lucide-react";
import React, { Suspense } from "react";
import { useLocation, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Breadcrumb from "../../components/Breadcrumb";
import MobileToggle from "./components/MobileToggle";
import Sidebar from "./components/Sidebar";
import Loader from "../../components/Loader";

const TrashIndex: React.FC = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    const trashItems = [
        {
            id: "users",
            title: t("trashed_users"),
            icon: <Users className="w-5 h-5" />,
            path: "/trash/users",
        },
        {
            id: "roles",
            title: t("trashed_roles"),
            icon: <Shield className="w-5 h-5" />,
            path: "/trash/roles",
        },
    ];

    const breadcrumbItems = [
        { title: "Dashboard", path: "/" },
        { title: t("trash_items") },
    ];

    // Determine active tab from the current route
    const activeTab = trashItems.find(item => location.pathname.startsWith(item.path))?.id || trashItems[0].id;
    const [showMobileMenu, setShowMobileMenu] = React.useState(false);
    const activeTitle = trashItems.find(item => item.id === activeTab)?.title || '';

    // Redirect to default tab if at /trash
    React.useEffect(() => {
        if (location.pathname === "/trash" || location.pathname === "/trash/") {
            navigate(trashItems[0].path, { replace: true });
        }
    }, [location.pathname, navigate, trashItems]);

    return (
        <div>
            <Breadcrumb items={breadcrumbItems} />
            <div className="mt-5">
                <div className="panel">
                    <div className="mb-6">
                        <h5 className="font-semibold text-xl dark:text-white-light flex items-center">
                            <Trash2 className="inline-block mr-2 w-6 h-6" />
                            {t("trash_items")}
                        </h5>
                    </div>
                    <MobileToggle
                        activeTitle={activeTitle}
                        showMobileMenu={showMobileMenu}
                        setShowMobileMenu={setShowMobileMenu}
                    />
                    <div className="flex flex-col md:flex-row h-[60vh] md:h-[70vh]">
                        {/* Sidebar */}
                        <Sidebar
                            items={trashItems}
                            activeTab={activeTab}
                            showMobileMenu={showMobileMenu}
                            linkComponent={NavLink}
                        />
                        {/* Content area */}
                        <main className="flex-1 min-w-0 h-full flex flex-col">
                            <Suspense fallback={<Loader />}>
                                <Outlet />
                            </Suspense>
                        </main>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrashIndex;
