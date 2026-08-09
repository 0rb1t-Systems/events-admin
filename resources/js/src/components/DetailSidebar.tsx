import { ChevronsRight, X } from "lucide-react";
import React, { ReactNode } from "react";

interface DetailSidebarProps {
    isVisible: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
    isLoading?: boolean;
}

const DetailSidebar: React.FC<DetailSidebarProps> = ({
    isVisible,
    title,
    onClose,
    children,
    isLoading = false,
}) => {
    return (
        <div
            className={`${
                isVisible
                    ? "w-1/2 opacity-100 visible"
                    : "w-0 opacity-0 invisible"
            } transition-all duration-300 ease-in-out overflow-hidden`}
        >
            {isVisible && (
                <div className="border border-gray-200 dark:border-[#232a3b] rounded-2xl shadow-lg dark:shadow-[0_8px_32px_0_rgba(10,20,50,0.85)] mt-5 bg-white dark:bg-[#1a2236] h-full">
                    <div className="h-full flex flex-col animate__animated animate__fadeInRight animate__faster">
                        <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#232a3b] p-4 bg-[#fbfbfb] dark:bg-[#232a3b] rounded-t-2xl">
                            <div className="flex items-center">
                                <button
                                    onClick={onClose}
                                    className="mr-3 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#2d3953] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary"
                                    aria-label="Back"
                                >
                                    <ChevronsRight
                                        className="w-7 h-7 text-gray-500 dark:text-gray-300"
                                        strokeWidth={1.5}
                                    />
                                </button>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                    {title}
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-red-400 dark:text-gray-400 dark:hover:text-red-400 transition-colors duration-150 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-6 bg-white dark:bg-[#202940] text-gray-900 dark:text-gray-100 rounded-b-2xl">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin w-8 h-8 border-4 border-primary border-l-transparent rounded-full"></div>
                                </div>
                            ) : (
                                children
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DetailSidebar;
