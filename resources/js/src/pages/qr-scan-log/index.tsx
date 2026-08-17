import moment from "moment";
import React, { useState } from "react";
import Breadcrumb from "../../components/Breadcrumb";
import DataTableWithSidebar from "../../components/DataTableWithSidebar";
import FormCombobox from "../../components/form/FormCombobox";
import StatusFilterBar from "../../components/StatusFilterBar";
import { useSidebarDetail } from "../../hooks";
import {
    formatEventOption,
    useEventSearch,
} from "../../hooks/useEntitySearch";
import { qrScanLogApi } from "../../services/qrScanLog";
import { ColumnConfig } from "../../types/columns";
import { IEvent } from "../../types/event";
import { IQrScanLog } from "../../types/qrScan";
import QrScanLogDetail from "./components/QrScanLogDetail";

const QrScanLogsPage = () => {
    const [resultFilter, setResultFilter] = useState<string>("");
    const [selectedEvent, setSelectedEvent] = useState<IEvent | null>(null);
    const eventSearch = useEventSearch();

    const { selectedId, showSidebar, openSidebar, closeSidebar } =
        useSidebarDetail();

    const columns: ColumnConfig<IQrScanLog>[] = [
        {
            accessor: "result",
            title: "Result",
            type: "custom",
            sortable: true,
            width: 120,
            minWidth: 110,
            render: ({ result }) => (
                <span className="capitalize">
                    {String(result).replace(/_/g, " ")}
                </span>
            ),
        },
        {
            accessor: "event",
            title: "Event",
            type: "custom",
            sortable: false,
            minWidth: 140,
            render: (row) => (
                <span className="font-medium">
                    {row.event?.title ??
                        (row.event_id ? `#${row.event_id}` : "—")}
                </span>
            ),
        },
        {
            accessor: "participant",
            title: "Participant",
            type: "custom",
            sortable: false,
            width: 140,
            render: (row) => (
                <span>
                    {row.participation?.user?.name ?? "—"}
                </span>
            ),
        },
        {
            accessor: "gate",
            title: "Gate",
            type: "text",
            sortable: true,
            width: 90,
            hideBelow: "lg",
            render: ({ gate }) => gate || "—",
        },
        {
            accessor: "created_at",
            title: "When",
            type: "date",
            sortable: true,
            width: 140,
            hideBelow: "lg",
            render: ({ created_at }) =>
                created_at
                    ? moment(created_at).format("MMM DD, YYYY HH:mm")
                    : "—",
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
    if (resultFilter) tableQuery.result = resultFilter;
    if (selectedEvent) tableQuery.event_id = String(selectedEvent.id);

    return (
        <div>
            <Breadcrumb
                items={[
                    { title: "Dashboard", path: "/" },
                    { title: "QR Scan History" },
                ]}
            />

            <StatusFilterBar
                value={resultFilter}
                onChange={setResultFilter}
                options={[
                    { value: "", label: "All" },
                    { value: "valid", label: "Valid" },
                    { value: "already_used", label: "Already used" },
                    { value: "invalid", label: "Invalid" },
                ]}
                extra={
                    <div className="w-56">
                        <FormCombobox<IEvent>
                            id="qr_event_filter"
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
                }
            />

            <DataTableWithSidebar<IQrScanLog>
                title="QR Scan History"
                columns={columns}
                fetchData={(params) => qrScanLogApi.getAll(params)}
                searchFields={["scanned_token", "gate", "result"]}
                sortCol="created_at"
                query={tableQuery}
                rowSelectionEnabled={false}
                searchable
                className="mt-0"
                showSidebar={showSidebar}
                sidebarTitle="Scan Detail"
                onCloseSidebar={closeSidebar}
                sidebarContent={<QrScanLogDetail scanId={selectedId} />}
            />
        </div>
    );
};

export default QrScanLogsPage;
