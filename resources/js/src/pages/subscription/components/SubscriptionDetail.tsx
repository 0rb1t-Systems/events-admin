import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import React from "react";
import Loader from "../../../components/Loader";
import {
    formatQuotaUsage,
    subscriptionApi,
} from "../../../services/subscription";
import { IOrganizerSubscription } from "../../../types/package";
import axiosInstance from "../../../utils/axios";

interface Props {
    subscriptionId: number | null;
}

type ShowPayload = {
    subscription: IOrganizerSubscription;
    history: IOrganizerSubscription[];
};

const Field = ({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) => (
    <div>
        <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {label}
        </label>
        <div className="mt-0.5 text-sm text-gray-900 dark:text-white">{children}</div>
    </div>
);

const SubscriptionDetail: React.FC<Props> = ({ subscriptionId }) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["subscription", subscriptionId],
        queryFn: async () => {
            const response = await axiosInstance.get(
                `/organizers/subscriptions/${subscriptionId}`
            );
            return (response.data.data || response.data) as ShowPayload;
        },
        enabled: !!subscriptionId,
    });

    if (!subscriptionId) {
        return (
            <div className="p-4 text-center text-sm text-gray-500">
                Select a subscription to view details
            </div>
        );
    }
    if (isLoading) return <Loader />;
    if (error || !data?.subscription) {
        return <div className="p-4 text-center text-sm text-red-500">Failed to load</div>;
    }

    const current = data.subscription;
    const history = data.history || [];

    return (
        <div className="space-y-3 p-1">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {current.package?.name ?? `Package #${current.package_id}`}
                </h3>
                <p className="text-xs capitalize text-gray-500">
                    {String(current.status).replace(/_/g, " ")}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Organizer">
                    {current.organizer?.business_name ?? `Organizer #${current.organizer_id}`}
                </Field>
                <Field label="Package">{current.package?.name ?? "—"}</Field>
                <Field label="Quota">{formatQuotaUsage(current.quota_usage)}</Field>
                <Field label="Started">
                    {current.started_at
                        ? moment(current.started_at).format("MMM DD, YYYY")
                        : "—"}
                </Field>
                <Field label="Expires">
                    {current.expires_at
                        ? moment(current.expires_at).format("MMM DD, YYYY")
                        : "No expiry"}
                </Field>
                <Field label="ID">{current.id}</Field>
            </div>

            <div>
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Subscription history
                </label>
                {history.length === 0 ? (
                    <p className="mt-1 text-sm text-gray-500">No history</p>
                ) : (
                    <ul className="mt-1 max-h-48 space-y-1 overflow-y-auto text-xs">
                        {history.map((h) => (
                            <li
                                key={h.id}
                                className={`rounded border px-2 py-1 dark:border-[#1b2e4b] ${
                                    h.id === subscriptionId
                                        ? "border-primary"
                                        : "border-gray-100"
                                }`}
                            >
                                <span className="font-medium">{h.package?.name ?? "—"}</span>
                                {" - "}
                                <span className="capitalize">{h.status}</span>
                                {" - "}
                                {h.started_at
                                    ? moment(h.started_at).format("MMM DD, YYYY")
                                    : "—"}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
                Assign / cancel on Organizer Detail.
            </p>
        </div>
    );
};

export default SubscriptionDetail;
