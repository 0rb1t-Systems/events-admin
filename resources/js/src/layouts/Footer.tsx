import React from "react";
import { useOrganization } from "../contexts/OrganizationContext";

const Footer = () => {
    const { organization } = useOrganization();

    const formatFoundedDate = (dateString?: string) => {
        if (!dateString) return null;
        try {
            const date = new Date(dateString);
            return date.getFullYear();
        } catch {
            return null;
        }
    };

    const foundedYear = formatFoundedDate(organization?.founded_date);

    return (
        <div className="dark:text-white-dark text-center ltr:sm:text-left rtl:sm:text-right p-6 pt-0 mt-auto">
            <div className="text-sm flex flex-wrap items-center justify-center gap-2">
                <span>
                    {"\u00A9"} {new Date().getFullYear()}.{" "}
                    {organization?.name || "Start Kit"} All rights reserved.
                </span>
                {foundedYear && (
                    <span className="text-gray-500 dark:text-gray-400">
                        {"\u2022"} Founded {foundedYear}
                    </span>
                )}
            </div>
        </div>
    );
};

export default Footer;
