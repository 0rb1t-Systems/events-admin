import { ChevronDown, Plus, Shield, UserCog, Users } from "lucide-react";
import React, { useState } from "react";

interface QuickLinksProps {
    onOpenModal: (modalType: string) => void;
}

const QuickLinks: React.FC<QuickLinksProps> = ({ onOpenModal }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    const handleItemClick = (modalType: string) => {
        onOpenModal(modalType);
        setIsDropdownOpen(false);
    };

    const menuItems = [
        {
            id: "user",
            label: "Create User",
            icon: <Users size={16} />,
            description: "Add a new regular user account",
            modalType: "user",
        },
        {
            id: "admin",
            label: "Create Admin",
            icon: <UserCog size={16} />,
            description: "Add a new admin user account",
            modalType: "admin",
        },
        {
            id: "role",
            label: "Create Role",
            icon: <Shield size={16} />,
            description: "Add a new user role",
            modalType: "role",
        },
    ];

    return (
        <div className="ltr:mr-2 rtl:ml-2 hidden sm:block relative z-[9999]">
            <button
                onClick={toggleDropdown}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60 transition-all duration-200"
            >
                <Plus size={20} />
                <span className="text-sm font-medium">Add</span>
                <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${
                        isDropdownOpen ? "rotate-180" : ""
                    }`}
                />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => setIsDropdownOpen(false)}
                    />

                    {/* Dropdown Content */}
                    <div className="absolute left-0 top-full mt-2 w-80 bg-white dark:bg-dark border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[9999] overflow-hidden">
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                Quick Actions
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Create new entities in the system
                            </p>
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            {menuItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() =>
                                        handleItemClick(item.modalType)
                                    }
                                    className="w-full flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150 text-left border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                >
                                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
                                        {item.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {item.label}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {item.description}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default QuickLinks;
