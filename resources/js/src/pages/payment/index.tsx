import moment from "moment";
import React, { useState } from "react";
import Breadcrumb from "../../components/Breadcrumb";
import DataTableWithSidebar from "../../components/DataTableWithSidebar";
import FormCombobox from "../../components/form/FormCombobox";
import StatusFilterBar from "../../components/StatusFilterBar";
import { useSidebarDetail } from "../../hooks";
import {
    formatEventOption,
    formatOrganizerOption,
    useEventSearch,
    useOrganizerSearch,
} from "../../hooks/useEntitySearch";
import { paymentApi } from "../../services/payment";
import { ColumnConfig } from "../../types/columns";
import { IEvent } from "../../types/event";
import { IOrganizer } from "../../types";
import { IPayment } from "../../types/payment";
import { formatMoney } from "../../utils/money";
import PaymentDetail from "./components/PaymentDetail";

const PaymentsPage = () => {
    const { selectedId, showSidebar, openSidebar, closeSidebar } = useSidebarDetail();
    const [statusFilter, setStatusFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [selectedEvent, setSelectedEvent] = useState<IEvent | null>(null);
    const [selectedOrganizer, setSelectedOrganizer] = useState<IOrganizer | null>(null);
    const eventSearch = useEventSearch();
    const organizerSearch = useOrganizerSearch();

    const columns: ColumnConfig<IPayment>[] = [
        {
            accessor: "event",
            title: "Event",
            type: "custom",
            sortable: false,
            width: 200,
            render: (r) => (
                <span className="font-medium">
                    {r.participation?.event?.title ?? "—"}
                </span>
            ),
        },
        {
            accessor: "organizer",
            title: "Organizer",
            type: "custom",
            sortable: false,
            width: 130,
            hideBelow: "lg",
            render: (r) => (
                <span>
                    {r.participation?.event?.organizer?.business_name ?? "—"}
                </span>
            ),
        },
        {
            accessor: "participant",
            title: "Participant",
            type: "custom",
            sortable: false,
            width: 120,
            render: (r) => (
                <span>{r.participation?.user?.name ?? "—"}</span>
            ),
        },
        {
            accessor: "ticket",
            title: "Ticket",
            type: "custom",
            sortable: false,
            width: 100,
            hideBelow: "lg",
            render: (r) => <span>{r.ticket_type?.name ?? "—"}</span>,
        },
        {
            accessor: "amount",
            title: "Amount",
            type: "custom",
            sortable: true,
            width: 130,
            minWidth: 120,
            textAlignment: "right",
            render: (r) => (
                <span className="whitespace-nowrap">{formatMoney(r.amount)}</span>
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
            accessor: "gateway",
            title: "Method",
            type: "custom",
            sortable: false,
            width: 100,
            hideBelow: "lg",
            render: ({ gateway }) =>
                !gateway || gateway === "waafipay" ? "WaafiPay" : gateway,
        },
        {
            accessor: "created_at",
            title: "Created",
            type: "date",
            sortable: true,
            width: 110,
            hideBelow: "lg",
            render: ({ created_at }) =>
                created_at ? moment(created_at).format("MMM DD, YYYY") : "—",
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
    if (selectedEvent) tableQuery.event_id = String(selectedEvent.id);
    if (selectedOrganizer) tableQuery.organizer_id = String(selectedOrganizer.id);
    if (dateFrom) tableQuery.date_from = dateFrom;
    if (dateTo) tableQuery.date_to = dateTo;

    return (
        <div>
            <Breadcrumb
                items={[
                    { title: "Dashboard", path: "/" },
                    { title: "Payments" },
                ]}
            />

            <StatusFilterBar
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                    { value: "", label: "All" },
                    { value: "completed", label: "Completed" },
                    { value: "pending", label: "Pending" },
                    { value: "refunded", label: "Refunded" },
                    { value: "failed", label: "Failed" },
                ]}
                extra={
                    <>
                        <div className="w-56">
                            <FormCombobox<IEvent>
                                id="payment_event_filter"
                                label="Event"
                                value={selectedEvent}
                                onChange={setSelectedEvent}
                                onSearch={eventSearch.setQuery}
                                options={eventSearch.options}
                                displayValue={formatEventOption}
                                loading={eventSearch.loading}
                                placeholder="Search events…"
                            />
                        </div>
                        <div className="w-56">
                            <FormCombobox<IOrganizer>
                                id="payment_organizer_filter"
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
                        <div>
                            <label className="mb-1 block text-[10px] uppercase text-gray-500">
                                From
                            </label>
                            <input
                                type="date"
                                className="form-input text-xs"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[10px] uppercase text-gray-500">
                                To
                            </label>
                            <input
                                type="date"
                                className="form-input text-xs"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                    </>
                }
            />

            <DataTableWithSidebar<IPayment>
                title="Payments"
                columns={columns}
                fetchData={(params) => paymentApi.getAll(params)}
                searchFields={["reference_id", "payer_phone"]}
                sortCol="created_at"
                query={tableQuery}
                rowSelectionEnabled={false}
                searchable
                className="mt-0"
                showSidebar={showSidebar}
                sidebarTitle="Payment Detail"
                onCloseSidebar={closeSidebar}
                sidebarContent={<PaymentDetail paymentId={selectedId} />}
            />
        </div>
    );
};

export default PaymentsPage;
