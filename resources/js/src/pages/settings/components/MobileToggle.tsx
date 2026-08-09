import React from "react";

interface MobileToggleProps {
    activeTitle: string;
    showMobileMenu: boolean;
    setShowMobileMenu: (show: boolean) => void;
}

const MobileToggle: React.FC<MobileToggleProps> = ({ activeTitle, showMobileMenu, setShowMobileMenu }) => (
    <div className="md:hidden mb-4">
        <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors hover:bg-gray-200 dark:hover:bg-gray-600"
            aria-expanded={showMobileMenu}
            aria-controls="mobile-menu"
        >
            <span className="font-medium text-gray-900 dark:text-white">
                {activeTitle}
            </span>
            <svg className={`w-5 h-5 transform transition-transform ${showMobileMenu ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
    </div>
);

export default MobileToggle;
