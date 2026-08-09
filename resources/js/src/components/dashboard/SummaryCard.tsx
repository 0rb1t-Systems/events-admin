import React from "react";
import { BarChart2 } from "lucide-react";
import { Link } from "react-router-dom";

interface SummaryCardProps {
    totalWords: number;
    totalBooks: number;
    totalCategories: number;
    totalUsers: number;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
    totalWords,
    totalBooks,
    totalCategories,
    totalUsers,
}) => {
    return (
        <div className="panel h-full xl:col-span-2 p-0 overflow-hidden flex flex-col">
            <div className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 flex-grow">
                <div className="flex justify-between items-center mb-6">
                    <div className="bg-black/30 backdrop-blur-sm rounded-full p-1.5 pl-2 pr-3 flex items-center text-white font-semibold">
                        <span className="w-7 h-7 rounded-full bg-primary border border-white/50 flex items-center justify-center text-white mr-2">
                            Q
                        </span>
                        <span>Qaamus</span>
                    </div>
                    <div className="h-10 w-10 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full">
                        <BarChart2 className="w-5 h-5 text-white" />
                    </div>
                </div>
                <div className="text-white">
                    <h5 className="text-xl font-semibold mb-1">
                        Performance Dashboard
                    </h5>
                    <p className="text-sm text-white/80 mb-5">
                        Track and analyze your dictionary metrics
                    </p>
                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <p className="text-sm text-white/70">Total Words</p>
                            <h3 className="text-2xl font-bold">{totalWords}</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-white/70">Total Books</p>
                            <h3 className="text-2xl font-bold">{totalBooks}</h3>
                        </div>
                    </div>
                </div>
            </div>
            <div className="px-6 relative z-10 mt-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 shadow-lg rounded-lg border border-gray-100 dark:border-gray-800">
                        <div>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Categories
                            </span>
                            <span className="text-xl font-bold text-gray-800 dark:text-white">
                                {totalCategories}
                            </span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-success-light dark:bg-success/20 text-success grid place-content-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="feather feather-tag"
                            >
                                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                                <line x1="7" y1="7" x2="7.01" y2="7"></line>
                            </svg>
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 shadow-lg rounded-lg border border-gray-100 dark:border-gray-800">
                        <div>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Users
                            </span>
                            <span className="text-xl font-bold text-gray-800 dark:text-white">
                                {totalUsers}
                            </span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-warning-light dark:bg-warning/20 text-warning grid place-content-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="feather feather-user"
                            >
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
            <div className="p-6 flex mt-auto gap-3">
                <Link
                    to="/vocabularies"
                    className="flex-1 btn btn-primary shadow-lg hover:shadow-blue-500/30"
                >
                    View Dictionary
                </Link>
                <Link
                    to="/books"
                    className="flex-1 btn btn-info shadow-lg hover:shadow-blue-400/30"
                >
                    View Books
                </Link>
            </div>
        </div>
    );
};

export default SummaryCard;
