import React from "react";
import { Link } from "react-router-dom";

interface BreadcrumbItem {
    title: string;
    path?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
    return (
        <ul className="flex space-x-2 rtl:space-x-reverse">
            {items.map((item, index) => (
                <li
                    key={index}
                    className={`${
                        index > 0
                            ? 'before:content-["/"] ltr:before:mr-2 rtl:before:ml-2'
                            : ""
                    }`}
                >
                    {item.path ? (
                        <Link to={item.path} className="text-primary hover:underline">
                            {item.title}
                        </Link>
                    ) : (
                        <span>{item.title}</span>
                    )}
                </li>
            ))}
        </ul>
    );
};

export default Breadcrumb;
