import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { IRootState } from "../../../store";
import LanguageSelector from "./LanguageSelector";

interface LoginCoverProps {
    children: React.ReactNode;
}

const LoginCover: React.FC<LoginCoverProps> = ({ children }) => {
    const isRtl =
        useSelector((state: IRootState) => state.themeConfig.rtlClass) ===
        "rtl";

    return (
        <div className="min-h-screen">
            {/* Background Pattern */}
            <div className="fixed inset-0 bg-gradient-to-br from-white to-gray-100 dark:from-gray-900 dark:to-black">
                <div className="absolute inset-0 bg-grid-slate-900/[0.04] dark:bg-grid-slate-400/[0.05] bg-[size:60px_60px]" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/50 dark:to-black/50" />
            </div>

            {/* Main Content */}
            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="absolute top-6 right-6">
                    <LanguageSelector isRtl={isRtl} />
                </div>

                <div className="w-full max-w-[1400px] grid lg:grid-cols-2 gap-8 items-center">
                    {/* Left Side - Branding */}
                    <div className="hidden lg:flex flex-col items-center justify-center p-8">
                        <Link to="/" className="mb-8">
                            <img
                                src="/assets/images/auth/logo-white.svg"
                                alt="Logo"
                                className="w-48 dark:hidden"
                            />
                            <img
                                src="/assets/images/auth/logo-white.svg"
                                alt="Logo"
                                className="w-48 hidden dark:block"
                            />
                        </Link>
                        <div className="relative">
                            <div className="absolute -inset-4">
                                <div className="w-full h-full mx-auto opacity-30 blur-lg filter bg-gradient-to-r from-primary/60 to-secondary/60" />
                            </div>
                            <img
                                src="/assets/images/auth/login.svg"
                                alt="Admin Dashboard"
                                className="relative w-full max-w-[600px]"
                            />
                        </div>
                    </div>

                    {/* Right Side - Login Form */}
                    <div className="w-full max-w-[440px] mx-auto lg:max-w-none">
                        {children}
                    </div>
                </div>

                {/* Footer */}
                <div className="absolute bottom-6 text-center w-full text-sm text-gray-600 dark:text-gray-400">
                    © {new Date().getFullYear()} Start Kit. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default LoginCover;
