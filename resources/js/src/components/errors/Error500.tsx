import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { setPageTitle } from "../../store/themeConfigSlice";
import { IRootState } from "../../store";
import { authUtils } from "../../utils/auth";

const Error500 = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle("Error 500"));
    });
    const isDark = useSelector(
        (state: IRootState) =>
            state.themeConfig.theme === "dark" || state.themeConfig.isDarkMode
    );

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-r from-red-50 to-orange-50 dark:from-gray-900 dark:to-red-900">
            <div className="container mx-auto px-4">
                <div className="relative z-10 flex flex-col items-center">
                    {/* Animated 500 Text */}
                    <div className="mb-8 flex items-center justify-center">
                        <h1 className="animate-pulse text-[150px] font-extrabold tracking-widest text-red-600 dark:text-red-400 md:text-[200px]">
                            5
                            <span className="inline-block animate-bounce text-primary">0</span>
                            0
                        </h1>
                    </div>

                    {/* Decorative elements */}
                    <div className="absolute left-0 top-0 opacity-20">
                        <div className="h-40 w-40 rounded-full bg-red-500 opacity-20"></div>
                    </div>
                    <div className="absolute bottom-0 right-0 opacity-20">
                        <div className="h-40 w-40 rounded-full bg-orange-500 opacity-20"></div>
                    </div>

                    {/* Error message */}
                    <div className="text-center">
                        <h2 className="mb-4 text-2xl font-bold text-gray-800 dark:text-white md:text-4xl">
                            Internal Server Error
                        </h2>
                        <p className="mb-8 text-center text-gray-600 dark:text-gray-300 md:text-lg">
                            Something went wrong on our servers. We're working to fix the issue.
                        </p>

                        {/* Buttons */}
                        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <button
                                onClick={() => window.history.back()}
                                className="btn rounded-md border border-gray-300 bg-white px-8 py-3 text-base font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                            >
                                Go Back
                            </button>
                            <Link
                                to={authUtils.getHomePage()}

                                className="btn btn-gradient rounded-md bg-gradient-to-r from-red-500 to-orange-600 px-8 py-3 text-base font-medium text-white shadow-md transition-all hover:from-red-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                            >
                                Back to Home
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating elements for visual interest */}
            <div className="float-animation absolute left-1/4 top-1/4 h-16 w-16 rounded-full bg-red-200 opacity-30 dark:bg-red-700"></div>
            <div className="float-animation-delay absolute bottom-1/4 right-1/3 h-20 w-20 rounded-full bg-orange-200 opacity-30 dark:bg-orange-700"></div>
            <div className="float-animation-slow absolute bottom-1/2 right-1/4 h-12 w-12 rounded-full bg-yellow-200 opacity-30 dark:bg-yellow-700"></div>

            {/* Add custom CSS for animations using standard style tag */}
            <style>
                {`
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                    100% { transform: translateY(0px); }
                }

                .float-animation {
                    animation: float 6s ease-in-out infinite;
                }

                .float-animation-delay {
                    animation: float 8s ease-in-out 1s infinite;
                }

                .float-animation-slow {
                    animation: float 10s ease-in-out 2s infinite;
                }
                `}
            </style>
        </div>
    );
};

export default Error500;
