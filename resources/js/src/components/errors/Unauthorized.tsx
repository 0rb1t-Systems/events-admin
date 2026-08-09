import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { setPageTitle } from "../../store/themeConfigSlice";
import { IRootState } from "../../store";
import { authUtils } from "../../utils/auth";

const Unauthorized = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle("Unauthorized Access"));
    });
    const isDark = useSelector(
        (state: IRootState) =>
            state.themeConfig.theme === "dark" || state.themeConfig.isDarkMode
    );

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
            <div className="ppx-6 py-16 text-center font-semibold before:container before:absolute before:left-1/2 before:-translate-x-1/2 before:rounded-full before:bg-[linear-gradient(180deg,#4361EE_0%,rgba(67,97,238,0)_50.73%)] before:aspect-square before:opacity-10 md:py-20">
                <div className="relative">
                    <div className="mx-auto mb-8 flex h-56 w-56 items-center justify-center rounded-full bg-white/[0.05] dark:bg-dark/20">
                        <svg
                            width="120"
                            height="120"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="text-primary"
                        >
                            <path
                                d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"
                                fill="currentColor"
                            />
                            <path
                                d="M12 17C12.5523 17 13 16.5523 13 16C13 15.4477 12.5523 15 12 15C11.4477 15 11 15.4477 11 16C11 16.5523 11.4477 17 12 17Z"
                                fill="currentColor"
                            />
                            <path
                                d="M12 14C12.5523 14 13 13.5523 13 13L13 8C13 7.44772 12.5523 7 12 7C11.4477 7 11 7.44772 11 8L11 13C11 13.5523 11.4477 14 12 14Z"
                                fill="currentColor"
                            />
                        </svg>
                    </div>
                    <h2 className="mb-2 text-xl font-bold text-primary md:text-3xl">Unauthorized Access</h2>
                    <p className="mb-6 text-base dark:text-white">
                        Sorry, you do not have permission to access this page.
                    </p>
                    <Link
                        to={authUtils.getHomePage()}
                        className="btn btn-gradient mx-auto !mt-7 w-max border-0 uppercase shadow-none"
                    >
                        Go Back
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Unauthorized;
