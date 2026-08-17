import { ArrowLeft } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import Breadcrumb from "./Breadcrumb";

interface Props {
    backTo: string;
    backLabel: string;
    crumbs: { title: string; path?: string }[];
    actions?: React.ReactNode;
}

const DetailPageHeader: React.FC<Props> = ({ backTo, backLabel, crumbs, actions }) => {
    return (
        <div className="mb-4">
            <Breadcrumb items={crumbs} />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <Link
                    to={backTo}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                    <ArrowLeft size={16} />
                    {backLabel}
                </Link>
                {actions}
            </div>
        </div>
    );
};

export default DetailPageHeader;
