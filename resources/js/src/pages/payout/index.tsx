import { useMutation, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import React, { useState } from "react";
import { toast } from "sonner";
import Breadcrumb from "../../components/Breadcrumb";
import DataTableWithSidebar from "../../components/DataTableWithSidebar";
import { useConfirmDialog, useSidebarDetail } from "../../hooks";
import { payoutRequestApi } from "../../services/payout";
import { ColumnConfig } from "../../types/columns";
import { IPayoutRequest } from "../../types/payment";
import PayoutDetail from "./components/PayoutDetail";
import PayoutRequestModal from "./components/PayoutRequestModal";

const PayoutList = () => {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const { selectedId, showSidebar, openSidebar, closeSidebar } = useSidebarDetail();
    const { confirmAction } = useConfirmDialog();

    const createMut = useMutation({
        mutationFn: (payload: { event_id: number; requested_amount: number }) =>
            payoutRequestApi.create(payload),
        onSuccess: () => {
            toast.success("Payout request created (commission rate snapshotted)");
            queryClient.invalidateQueries({ queryKey: ["Payout Request Table"] });
            setModalOpen(false);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const columns: ColumnConfig<IPayoutRequest>[] = [
        {
            accessor: "event",
            title: "Event",
            type: "custom",
            sortable: false,
            render: (r) => (
                <span className="font-medium">{r.event?.title ?? `#${r.event_id}`}</span>
            ),
        },
        {
            accessor: "requested_amount",
            title: "Amount",
            type: "custom",
            sortable: true,
            width: 90,
            render: (r) => Number(r.requested_amount).toFixed(2),
        },
        {
            accessor: "commission_rate",
            title: "Rate %",
            type: "custom",
            sortable: true,
            width: 70,
            render: (r) => Number(r.commission_rate).toFixed(1),
        },
        {
            accessor: "status",
            title: "Status",
            type: "text",
            sortable: true,
            width: 100,
            render: ({ status }) => (
                <span className="text-xs capitalize">{String(status).replace(/_/g, " ")}</span>
            ),
        },
        {
            accessor: "created_at",
            title: "Requested",
            type: "date",
            sortable: true,
            width: 110,
            render: ({ created_at }) =>
                created_at ? moment(created_at).format("MM/DD/YYYY") : "—",
        },
        {
            accessor: "actions",
            title: "Actions",
            type: "actions",
            sortable: false,
            textAlignment: "center",
            actions: [{ type: "view", onClick: (r) => openSidebar(r.id) }],
        },
    ];

    const tableQuery = statusFilter ? { status: statusFilter } : {};

    return (
        <div>
            <Breadcrumb
                items={[
                    { title: "Dashboard", path: "/" },
                    { title: "Payouts" },
                ]}
            />

            <DataTableWithSidebar<IPayoutRequest>
                title="Payout Request Table"
                columns={columns}
                fetchData={(params) => payoutRequestApi.getAll(params)}
                searchFields={["status", "admin_notes"]}
                sortCol="created_at"
                query={tableQuery}
                rowSelectionEnabled={false}
                searchable
                className="mt-5"
                buttons={
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            className="form-select form-select-sm w-auto"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All statuses</option>
                            <option value="requested">Requested</option>
                            <option value="approved">Approved</option>
                            <option value="paid">Paid</option>
                            <option value="rejected">Rejected</option>
                        </select>
                        <button
                            type="button"
                            className="btn btn-primary gap-2"
                            onClick={() => setModalOpen(true)}
                        >
                            New payout request
                        </button>
                    </div>
                }
                showSidebar={showSidebar}
                sidebarTitle="Payout Detail"
                onCloseSidebar={closeSidebar}
                sidebarContent={<PayoutDetail payoutId={selectedId} />}
            />

            <PayoutRequestModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={async (values) => {
                    const ok = await confirmAction({
                        title: "Create payout request?",
                        text: "Commission rate will be snapshotted now from platform settings.",
                        confirmButtonText: "Create",
                    });
                    if (ok) createMut.mutate(values);
                }}
                loading={createMut.isPending}
            />
        </div>
    );
};

export default PayoutList;
