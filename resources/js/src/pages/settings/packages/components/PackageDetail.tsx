import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import React from "react";
import Loader from "../../../../components/Loader";
import { packageApi } from "../../../../services/package";
import { formatQuotaLabel } from "../../../../services/organizerSubscription";
import { IPackage } from "../../../../types";

interface PackageDetailProps {
    packageId?: number | null;
}

const PackageDetail: React.FC<PackageDetailProps> = ({ packageId }) => {
    const {
        data: pkg,
        isLoading,
        error,
    } = useQuery<IPackage>({
        queryKey: ["package", packageId],
        queryFn: () => packageApi.getById(packageId!),
        enabled: !!packageId,
    });

    if (!packageId) {
        return (
            <div className="p-6 text-center text-gray-500">
                Select a package to view details
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-6">
                <Loader />
            </div>
        );
    }

    if (error || !pkg) {
        return (
            <div className="p-6 text-center text-red-500">
                Failed to load package details
            </div>
        );
    }

    return (
        <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {pkg.name}
            </h3>
            <div className="space-y-3 text-sm">
                <div>
                    <div className="text-xs font-medium uppercase text-gray-500">Description</div>
                    <p className="mt-0.5 text-gray-900 dark:text-white">
                        {pkg.description || "—"}
                    </p>
                </div>
                <div>
                    <div className="text-xs font-medium uppercase text-gray-500">Price</div>
                    <p className="mt-0.5 text-gray-900 dark:text-white">
                        {Number(pkg.price).toFixed(2)}
                    </p>
                </div>
                <div>
                    <div className="text-xs font-medium uppercase text-gray-500">Event quota</div>
                    <p className="mt-0.5 text-gray-900 dark:text-white">
                        {pkg.event_quota === null
                            ? "Unlimited"
                            : pkg.event_quota === 0
                              ? "0 (no events allowed)"
                              : formatQuotaLabel(pkg.event_quota, 0).replace("0 / ", "")}
                    </p>
                </div>
                <div>
                    <div className="text-xs font-medium uppercase text-gray-500">Duration</div>
                    <p className="mt-0.5 text-gray-900 dark:text-white">
                        {pkg.duration_label || "Non-expiring"}
                    </p>
                </div>
                <div>
                    <div className="text-xs font-medium uppercase text-gray-500">Tier rank</div>
                    <p className="mt-0.5 text-gray-900 dark:text-white">{pkg.tier_rank ?? 0}</p>
                </div>
                <div>
                    <div className="text-xs font-medium uppercase text-gray-500">Status</div>
                    <p className="mt-0.5 capitalize text-gray-900 dark:text-white">{pkg.status}</p>
                </div>
                <div>
                    <div className="text-xs font-medium uppercase text-gray-500">Created</div>
                    <p className="mt-0.5 text-gray-900 dark:text-white">
                        {pkg.created_at
                            ? moment(pkg.created_at).format("MMM DD, YYYY HH:mm")
                            : "—"}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PackageDetail;
