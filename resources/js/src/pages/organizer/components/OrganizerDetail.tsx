import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import React, { useState } from "react";
import { toast } from "sonner";
import Loader from "../../../components/Loader";
import FormSelect from "../../../components/form/FormSelect";
import { useConfirmDialog } from "../../../hooks";
import { organizerApi } from "../../../services/organizer";
import { packageApi } from "../../../services/package";
import {
    formatQuotaUsage,
    organizerSubscriptionApi,
} from "../../../services/organizerSubscription";

interface OrganizerDetailProps {
    organizerId: number | null;
}

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

const OrganizerDetail: React.FC<OrganizerDetailProps> = ({ organizerId }) => {
    const queryClient = useQueryClient();
    const { confirmAction } = useConfirmDialog();
    const [packageId, setPackageId] = useState("");
    const [showAssign, setShowAssign] = useState(false);

    const { data: organizer, isLoading, error } = useQuery({
        queryKey: ["organizer", organizerId],
        queryFn: () => organizerApi.getById(organizerId!),
        enabled: !!organizerId,
    });

    const { data: subscriptions, isLoading: subsLoading } = useQuery({
        queryKey: ["organizer-subscriptions", organizerId],
        queryFn: () => organizerSubscriptionApi.forOrganizer(organizerId!),
        enabled: !!organizerId,
    });

    const { data: packagesResponse } = useQuery({
        queryKey: ["packages-active-options"],
        queryFn: () =>
            packageApi.getAll({
                page: 1,
                per_page: 100,
                sort_by: "name",
                sort_direction: "asc",
                filter: { status: "active" },
            } as any),
        enabled: showAssign,
    });

    const assignMutation = useMutation({
        mutationFn: () =>
            organizerSubscriptionApi.assign(organizerId!, {
                package_id: Number(packageId),
            }),
        onSuccess: () => {
            toast.success("Package assigned");
            setShowAssign(false);
            setPackageId("");
            queryClient.invalidateQueries({ queryKey: ["organizer", organizerId] });
            queryClient.invalidateQueries({ queryKey: ["organizer-subscriptions", organizerId] });
            queryClient.invalidateQueries({ queryKey: ["Organizer Table"] });
        },
        onError: (err: Error) => toast.error(err.message || "Assign failed"),
    });

    const cancelMutation = useMutation({
        mutationFn: (id: number) => organizerSubscriptionApi.cancel(id),
        onSuccess: () => {
            toast.success("Subscription cancelled");
            queryClient.invalidateQueries({ queryKey: ["organizer", organizerId] });
            queryClient.invalidateQueries({ queryKey: ["organizer-subscriptions", organizerId] });
            queryClient.invalidateQueries({ queryKey: ["Organizer Table"] });
        },
        onError: (err: Error) => toast.error(err.message || "Cancel failed"),
    });

    if (!organizerId) {
        return (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Select an organizer to view details
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-4">
                <Loader />
            </div>
        );
    }

    if (error || !organizer) {
        return (
            <div className="p-4 text-center text-sm text-red-500">
                Failed to load organizer details
            </div>
        );
    }

    const active = subscriptions?.active ?? organizer.active_subscription ?? null;
    const packageOptions = (packagesResponse?.data || [])
        .filter((p: any) => p.status === "active")
        .map((p: any) => ({
            value: String(p.id),
            label: `${p.name} (${
                p.event_quota === null
                    ? "Unlimited"
                    : p.event_quota === 0
                      ? "0 events"
                      : `${p.event_quota} events`
            })`,
        }));

    return (
        <div className="space-y-4 p-1">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {organizer.business_name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    {organizer.contact_name}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Email">{organizer.email}</Field>
                <Field label="Phone">{organizer.phone || "—"}</Field>
                <Field label="Status">
                    <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize ${
                            organizer.status === "active"
                                ? "bg-success/10 text-success"
                                : "bg-danger/10 text-danger"
                        }`}
                    >
                        {organizer.status}
                    </span>
                </Field>
                <Field label="ID">{organizer.id}</Field>
            </div>

            <div className="border-t border-gray-100 pt-3 dark:border-[#1b2e4b]">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Subscription
                    </h4>
                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => setShowAssign((v) => !v)}
                    >
                        {showAssign ? "Close" : "Assign package"}
                    </button>
                </div>

                {active ? (
                    <div className="space-y-1 text-sm">
                        <div>
                            <span className="text-gray-500">Package: </span>
                            {active.package?.name ?? "—"}
                        </div>
                        <div>
                            <span className="text-gray-500">Status: </span>
                            <span className="capitalize">{active.status}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Quota usage: </span>
                            {formatQuotaUsage(active.quota_usage) ||
                                formatQuotaUsage({
                                    quota: active.package?.event_quota ?? null,
                                    unlimited: active.package?.event_quota === null,
                                    zero_quota: active.package?.event_quota === 0,
                                    events_created: 0,
                                    can_create_event: true,
                                    remaining: active.package?.event_quota ?? null,
                                })}
                            <span className="ml-1 text-xs text-gray-400">
                                (events count Phase 4)
                            </span>
                        </div>
                        {active.status === "active" && (
                            <button
                                type="button"
                                className="btn btn-outline-danger btn-sm mt-2"
                                onClick={async () => {
                                    const ok = await confirmAction({
                                        title: "Cancel subscription?",
                                        text: "This ends the current active package for the organizer. History is retained.",
                                        confirmButtonText: "Cancel subscription",
                                    });
                                    if (ok) cancelMutation.mutate(active.id);
                                }}
                            >
                                Cancel active
                            </button>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">No active subscription</p>
                )}

                {showAssign && (
                    <div className="mt-3 space-y-2 rounded border border-gray-100 p-3 dark:border-[#1b2e4b]">
                        <FormSelect
                            label="Package"
                            value={packageId}
                            onChange={setPackageId}
                            onBlur={() => undefined}
                            options={[
                                { value: "", label: "Select package…" },
                                ...packageOptions,
                            ]}
                        />
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={!packageId || assignMutation.isPending}
                            onClick={() => assignMutation.mutate()}
                        >
                            Assign
                        </button>
                    </div>
                )}
            </div>

            <div className="border-t border-gray-100 pt-3 dark:border-[#1b2e4b]">
                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                    Subscription history
                </h4>
                {subsLoading ? (
                    <Loader />
                ) : (subscriptions?.history?.length ?? 0) === 0 ? (
                    <p className="text-sm text-gray-500">No subscription history</p>
                ) : (
                    <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
                        {subscriptions!.history.map((row) => (
                            <li
                                key={row.id}
                                className="rounded border border-gray-100 px-2 py-1.5 dark:border-[#1b2e4b]"
                            >
                                <div className="font-medium">
                                    {row.package?.name ?? `Package #${row.package_id}`}
                                </div>
                                <div className="capitalize text-gray-500">
                                    {row.status} ·{" "}
                                    {moment(row.started_at).format("MMM DD, YYYY")}
                                    {row.expires_at
                                        ? ` → ${moment(row.expires_at).format("MMM DD, YYYY")}`
                                        : " · no expiry"}
                                </div>
                                <div className="text-gray-500">
                                    Quota: {formatQuotaUsage(row.quota_usage)}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 dark:border-[#1b2e4b]">
                <Field label="Events">{organizer.events_count ?? 0}</Field>
                <Field label="Created">
                    {organizer.created_at
                        ? moment(organizer.created_at).format("MMM DD, YYYY HH:mm")
                        : "—"}
                </Field>
            </div>
        </div>
    );
};

export default OrganizerDetail;
