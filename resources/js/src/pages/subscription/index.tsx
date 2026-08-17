import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import React, { useState } from "react";
import Breadcrumb from "../../components/Breadcrumb";
import DataTableWithSidebar from "../../components/DataTableWithSidebar";
import FormCombobox from "../../components/form/FormCombobox";
import StatusFilterBar from "../../components/StatusFilterBar";
import { useSidebarDetail } from "../../hooks";
import {
    formatOrganizerOption,
    useOrganizerSearch,
} from "../../hooks/useEntitySearch";
import { packageApi } from "../../services/package";
import {
    formatQuotaUsage,
    subscriptionApi,
} from "../../services/subscription";
import { ColumnConfig } from "../../types/columns";
import { IOrganizer } from "../../types";
import { IOrganizerSubscription, IPackage } from "../../types/package";
import SubscriptionDetail from "./components/SubscriptionDetail";

const SubscriptionsPage = () => {
    const { selectedId, showSidebar, openSidebar, closeSidebar } = useSidebarDetail();
    const [statusFilter, setStatusFilter] = useState("");
    const [packageId, setPackageId] = useState("");
    const [selectedOrganizer, setSelectedOrganizer] = useState<IOrganizer | null>(null);
    const organizerSearch = useOrganizerSearch();

    const packagesQuery = useQuery({
        queryKey: ["packages-for-subscription-filter"],
        queryFn: () => packageApi.getAll({ per_page: 100 } as any),
    });
    const packages = (packagesQuery.data?.data || []) as IPackage[];

    const columns: ColumnConfig<IOrganizerSubscription>[] = [
        {
            accessor: "organizer",
            title: "Organizer",
            type: "custom",
            sortable: false,
            width: 200,
            render: (r) => (
                <span className="font-medium">
                    {r.organizer?.business_name ?? `#${r.organizer_id}`}
                </span>
            ),
        },
        {
            accessor: "package",
            title: "Package",
            type: "custom",
            sortable: false,
            width: 140,
            render: (r) => (
                <span>{r.package?.name ?? `#${r.package_id}`}</span>
            ),
        },
        {
            accessor: "status",
            title: "Status",
            type: "custom",
            sortable: true,
            width: 110,
            render: ({ status }) => (
                <span className="capitalize">
                    {String(status).replace(/_/g, " ")}
                </span>
            ),
        },
        {
            accessor: "started_at",
            title: "Started",
            type: "date",
            sortable: true,
            width: 110,
            hideBelow: "lg",
            render: ({ started_at }) =>
                started_at ? moment(started_at).format("MMM DD, YYYY") : "—",
        },
        {
            accessor: "expires_at",
            title: "Expires",
            type: "custom",
            sortable: true,
            width: 110,
            hideBelow: "lg",
            render: ({ expires_at }) =>
                expires_at ? moment(expires_at).format("MMM DD, YYYY") : "No expiry",
        },
        {
            accessor: "quota",
            title: "Quota",
            type: "custom",
            sortable: false,
            width: 110,
            hideBelow: "lg",
            render: (r) => (
                <span>{formatQuotaUsage(r.quota_usage)}</span>
            ),
        },
        {
            accessor: "actions",
            title: "Actions",
            type: "actions",
            sortable: false,
            width: 80,
            textAlignment: "center",
            actions: [{ type: "view", onClick: (r) => openSidebar(r.id) }],
        },
    ];

    const tableQuery: Record<string, string> = {};
    if (statusFilter) tableQuery.status = statusFilter;
    if (packageId) tableQuery.package_id = packageId;
    if (selectedOrganizer) tableQuery.organizer_id = String(selectedOrganizer.id);

    return (
        <div>
            <Breadcrumb
                items={[
                    { title: "Dashboard", path: "/" },
                    { title: "Subscriptions" },
                ]}
            />

            <StatusFilterBar
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                    { value: "", label: "All" },
                    { value: "active", label: "Active" },
                    { value: "expired", label: "Expired" },
                    { value: "cancelled", label: "Cancelled" },
                ]}
                extra={
                    <>
                        <select
                            className="form-select w-auto text-xs"
                            value={packageId}
                            onChange={(e) => setPackageId(e.target.value)}
                        >
                            <option value="">All packages</option>
                            {packages.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                        <div className="w-56">
                            <FormCombobox<IOrganizer>
                                id="sub_organizer_filter"
                                label="Organizer"
                                value={selectedOrganizer}
                                onChange={setSelectedOrganizer}
                                onSearch={organizerSearch.setQuery}
                                options={organizerSearch.options}
                                displayValue={formatOrganizerOption}
                                loading={organizerSearch.loading}
                                placeholder="Search organizers…"
                            />
                        </div>
                    </>
                }
            />

            <DataTableWithSidebar<IOrganizerSubscription>
                title="Subscriptions"
                columns={columns}
                fetchData={(params) => subscriptionApi.getAll(params)}
                sortCol="started_at"
                query={tableQuery}
                rowSelectionEnabled={false}
                searchable={false}
                className="mt-0"
                showSidebar={showSidebar}
                sidebarTitle="Subscription Detail"
                onCloseSidebar={closeSidebar}
                sidebarContent={<SubscriptionDetail subscriptionId={selectedId} />}
            />
        </div>
    );
};

export default SubscriptionsPage;
