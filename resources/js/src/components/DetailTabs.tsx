import React from "react";

export interface DetailTab {
    id: string;
    label: string;
}

interface Props {
    tabs: DetailTab[];
    active: string;
    onChange: (id: string) => void;
}

const DetailTabs: React.FC<Props> = ({ tabs, active, onChange }) => {
    return (
        <div className="mb-4 overflow-x-auto border-b border-gray-200 dark:border-[#1b2e4b]">
            <div className="flex min-w-max gap-1">
                {tabs.map((tab) => {
                    const isActive = tab.id === active;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            className={`whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors ${
                                isActive
                                    ? "border-b-2 border-primary text-primary"
                                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                            }`}
                            onClick={() => onChange(tab.id)}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default DetailTabs;
