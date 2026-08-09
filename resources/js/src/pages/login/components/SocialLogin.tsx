import React from "react";
import { Link } from "react-router-dom";
import { Instagram, Facebook, Twitter, Mail } from "lucide-react";

const SocialLogin: React.FC = () => {
    const socialLinks = [
        { icon: Instagram, href: "#", label: "Continue with Instagram" },
        { icon: Facebook, href: "#", label: "Continue with Facebook" },
        { icon: Twitter, href: "#", label: "Continue with Twitter" },
        { icon: Mail, href: "#", label: "Continue with Email" },
    ];

    return (
        <div className="grid grid-cols-2 gap-4">
            {socialLinks.map(({ icon: Icon, href, label }, index) => (
                <Link
                    key={index}
                    to={href}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-black/30 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-black/50 transition-colors duration-200"
                >
                    <Icon className="h-5 w-5" />
                    <span className="hidden sm:inline">{label}</span>
                </Link>
            ))}
        </div>
    );
};

export default SocialLogin;
