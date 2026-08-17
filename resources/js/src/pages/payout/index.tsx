import { useMutation, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Breadcrumb from "../../components/Breadcrumb";
import DataTableWithSidebar from "../../components/DataTableWithSidebar";
import StatusFilterBar from "../../components/StatusFilterBar";
import { useConfirmDialog } from "../../hooks";
import { payoutRequestApi } from "../../services/payout";
import { ColumnConfig } from "../../types/columns";
import { IPayoutRequest } from "../../types/payment";
import { formatMoney } from "../../utils/money";
import PayoutRequestModal from "./components/PayoutRequestModal";

const PayoutList = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
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

    const openDetail = (id: number) => navigate(`/payouts/${id}`);

    const columns: ColumnConfig<IPayoutRequest>[] = [
        {
            accessor: "event",
            title: "Event",
            type: "custom",
            sortable: false,
            width: 220,
            render: (r) => (
                <span className="font-medium">{r.event?.title ?? `#${r.event_id}`}</span>
            ),
        },
        {
            accessor: "requested_amount",
            title: "Amount",
            type: "custom",
            sortable: true,
            width: 130,
            minWidth: 120,
            textAlignment: "right",
            render: (r) => (
                <span className="whitespace-nowrap">{formatMoney(r.requested_amount)}</span>
            ),
        },
        {
            accessor: "commission_rate",
            title: "Rate %",
            type: "custom",
            sortable: true,
            width: 80,
            hideBelow: "lg",
            render: (r) => Number(r.commission_rate).toFixed(1),
        },
        {
            accessor: "status",
            title: "Status",
            type: "text",
            sortable: true,
            width: 110,
            render: ({ status }) => (
                <span className="capitalize">{String(status).replace(/_/g, " ")}</span>
            ),
        },
        {
            accessor: "created_at",
            title: "Requested",
            type: "date",
            sortable: true,
            width: 110,
            hideBelow: "lg",
            render: ({ created_at }) =>
                created_at ? moment(created_at).format("MM/DD/YYYY") : "—",
        },
        {
            accessor: "actions",
            title: "Actions",
            type: "actions",
            sortable: false,
            width: 80,
            textAlignment: "center",
            actions: [{ type: "view", onClick: (r) => openDetail(r.id) }],
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

            <StatusFilterBar
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                    { value: "", label: "All" },
                    { value: "requested", label: "Requested" },
                    { value: "approved", label: "Approved" },
                    { value: "paid", label: "Paid" },
                    { value: "rejected", label: "Rejected" },
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
                className="mt-0"
                onRowClick={(r) => openDetail(r.id)}
                buttons={
                    <button
                        type="button"
                        className="btn btn-primary gap-2"
                        onClick={() => setModalOpen(true)}
                    >
                        New payout request
                    </button>
                }
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
