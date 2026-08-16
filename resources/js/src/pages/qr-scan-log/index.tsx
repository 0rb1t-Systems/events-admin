import { Filter } from "lucide-react";
import moment from "moment";
import React, { useState } from "react";
import Breadcrumb from "../../components/Breadcrumb";
import DataTableWithSidebar from "../../components/DataTableWithSidebar";
import FormCombobox from "../../components/form/FormCombobox";
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
    const [showFilters, setShowFilters] = useState(false);
    const eventSearch = useEventSearch();

    const { selectedId, showSidebar, openSidebar, closeSidebar } =
        useSidebarDetail();

    const columns: ColumnConfig<IQrScanLog>[] = [
        {
            accessor: "result",
            title: "Result",
            type: "custom",
            sortable: true,
            width: 110,
            render: ({ result }) => (
                <span className="text-xs capitalize">
                    {String(result).replace(/_/g, " ")}
                </span>
            ),
        },
        {
            accessor: "event",
            title: "Event",
            type: "custom",
            sortable: false,
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
                <span className="text-xs">
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
            render: ({ gate }) => gate || "—",
        },
        {
            accessor: "created_at",
            title: "When",
            type: "date",
            sortable: true,
            width: 130,
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

            <DataTableWithSidebar<IQrScanLog>
                title="QR Scan History"
                columns={columns}
                fetchData={(params) => qrScanLogApi.getAll(params)}
                searchFields={["scanned_token", "gate", "result"]}
                sortCol="created_at"
                query={tableQuery}
                rowSelectionEnabled={false}
                searchable
                className="mt-5"
                buttons={
                    <div className="relative">
                        <button
                            type="button"
                            className="btn btn-outline-primary gap-2"
                            onClick={() => setShowFilters((v) => !v)}
                        >
                            <Filter className="h-4 w-4" />
                            Filters
                        </button>
                        {showFilters && (
                            <div className="absolute right-0 z-20 mt-2 w-72 space-y-3 rounded border border-gray-200 bg-white p-3 shadow dark:border-[#1b2e4b] dark:bg-[#0e1726]">
                                <div>
                                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                                        Result
                                    </label>
                                    <select
                                        className="form-select"
                                        value={resultFilter}
                                        onChange={(e) =>
                                            setResultFilter(e.target.value)
                                        }
                                    >
                                        <option value="">All</option>
                                        <option value="valid">Valid</option>
                                        <option value="already_used">
                                            Already used
                                        </option>
                                        <option value="invalid">Invalid</option>
                                    </select>
                                </div>
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
                                {selectedEvent && (
                                    <button
                                        type="button"
                                        className="btn btn-sm w-full"
                                        onClick={() => setSelectedEvent(null)}
                                    >
                                        Clear event
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                }
                showSidebar={showSidebar}
                sidebarTitle="Scan Detail"
                onCloseSidebar={closeSidebar}
                sidebarContent={<QrScanLogDetail scanId={selectedId} />}
            />
        </div>
    );
};

export default QrScanLogsPage;
