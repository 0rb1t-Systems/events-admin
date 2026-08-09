import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { IRootState } from "../../store";
import { setPageTitle } from "../../store/themeConfigSlice";
import { authUtils } from "../../utils/auth";

const Error404 = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle("Page Not Found"));
    });
    const isDark = useSelector(
        (state: IRootState) =>
            state.themeConfig.theme === "dark" || state.themeConfig.isDarkMode
    );

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
            <div className="container mx-auto px-4">
                <div className="relative z-10 flex flex-col items-center">
                    {/* Animated 404 Text */}
                    <div className="mb-8 flex items-center justify-center">
                        <h1 className="animate-pulse text-[150px] font-extrabold tracking-widest text-indigo-600 dark:text-indigo-400 md:text-[200px]">
                            4
                            <span className="inline-block animate-bounce text-primary">0</span>
                            4
                        </h1>
                    </div>

                    {/* Decorative elements */}
                    <div className="absolute left-0 top-0 opacity-20">
                        <div className="h-40 w-40 rounded-full bg-primary opacity-20"></div>
                    </div>
                    <div className="absolute bottom-0 right-0 opacity-20">
                        <div className="h-40 w-40 rounded-full bg-secondary opacity-20"></div>
                    </div>

                    {/* Error message */}
                    <div className="text-center">
                        <h2 className="mb-4 text-2xl font-bold text-gray-800 dark:text-white md:text-4xl">
                            Oops! Page Not Found
                        </h2>
                        <p className="mb-8 text-center text-gray-600 dark:text-gray-300 md:text-lg">
                            The page you're looking for doesn't exist or has been moved.
                        </p>

                        {/* Back button */}
                        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <button
                                onClick={() => window.history.back()}
                                className="btn rounded-md border border-gray-300 bg-white px-8 py-3 text-base font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                            >
                                Go Back
                            </button>
                            <Link
                                to={authUtils.getHomePage()}
                                className="btn btn-gradient rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-3 text-base font-medium text-white shadow-md transition-all hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                            >
                                Back to Home
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating elements for visual interest */}
            <div className="float-animation absolute left-1/4 top-1/4 h-16 w-16 rounded-full bg-purple-200 opacity-30 dark:bg-purple-700"></div>
            <div className="float-animation-delay absolute bottom-1/4 right-1/3 h-20 w-20 rounded-full bg-blue-200 opacity-30 dark:bg-blue-700"></div>
            <div className="float-animation-slow absolute bottom-1/2 right-1/4 h-12 w-12 rounded-full bg-pink-200 opacity-30 dark:bg-pink-700"></div>

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

export default Error404;
