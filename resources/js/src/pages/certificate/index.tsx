import moment from "moment";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "../../components/Breadcrumb";
import DataTableWithSidebar from "../../components/DataTableWithSidebar";
import FormCombobox from "../../components/form/FormCombobox";
import StatusFilterBar from "../../components/StatusFilterBar";
import {
    formatEventOption,
    useEventSearch,
} from "../../hooks/useEntitySearch";
import { certificateApi } from "../../services/certificate";
import { ColumnConfig } from "../../types/columns";
import { ICertificate } from "../../types/certificate";
import { IEvent } from "../../types/event";

const CertificatesPage = () => {
    const navigate = useNavigate();
    const [verifiedFilter, setVerifiedFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [selectedEvent, setSelectedEvent] = useState<IEvent | null>(null);
    const eventSearch = useEventSearch();

    const openDetail = (id: number) => navigate(`/certificates/${id}`);

    const columns: ColumnConfig<ICertificate>[] = [
        {
            accessor: "participant",
            title: "Participant",
            type: "custom",
            sortable: false,
            minWidth: 140,
            render: (r) => (
                <span className="font-medium">
                    {r.participation?.user?.name ?? `P#${r.participation_id}`}
                </span>
            ),
        },
        {
            accessor: "event",
            title: "Event",
            type: "custom",
            sortable: false,
            minWidth: 140,
            render: (r) => (
                <span>{r.participation?.event?.title ?? "—"}</span>
            ),
        },
        {
            accessor: "issued_at",
            title: "Issued",
            type: "date",
            sortable: true,
            width: 120,
            hideBelow: "lg",
            render: ({ issued_at }) =>
                issued_at ? moment(issued_at).format("MMM DD, YYYY") : "—",
        },
        {
            accessor: "verified",
            title: "Verified",
            type: "custom",
            sortable: true,
            width: 100,
            render: ({ verified }) => (
                <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                        verified
                            ? "bg-success/10 text-success"
                            : "bg-gray-500/10 text-gray-600 dark:text-gray-300"
                    }`}
                >
                    {verified ? "Yes" : "No"}
                </span>
            ),
        },
        {
            accessor: "file",
            title: "File",
            type: "custom",
            sortable: false,
            width: 80,
            hideBelow: "lg",
            render: (r) => {
                const href = r.file_url || r.file_path;
                if (!href) return <span className="text-gray-400">—</span>;
                return (
                    <a
                        href={href.startsWith("http") ? href : `/${href}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        View
                    </a>
                );
            },
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

    const tableQuery: Record<string, string> = {};
    if (selectedEvent) tableQuery.event_id = String(selectedEvent.id);
    if (verifiedFilter === "yes") tableQuery.verified = "true";
    if (verifiedFilter === "no") tableQuery.verified = "false";
    if (dateFrom) tableQuery.date_from = dateFrom;
    if (dateTo) tableQuery.date_to = dateTo;

    return (
        <div>
            <Breadcrumb
                items={[
                    { title: "Dashboard", path: "/" },
                    { title: "Certificates" },
                ]}
            />

            <StatusFilterBar
                value={verifiedFilter}
                onChange={setVerifiedFilter}
                options={[
                    { value: "", label: "All" },
                    { value: "yes", label: "Verified" },
                    { value: "no", label: "Not verified" },
                ]}
                extra={
                    <>
                        <div className="w-56">
                            <FormCombobox<IEvent>
                                id="cert_event_filter"
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

            <DataTableWithSidebar<ICertificate>
                title="Certificates"
                columns={columns}
                fetchData={(params) => certificateApi.getAll(params)}
                sortCol="issued_at"
                query={tableQuery}
                rowSelectionEnabled={false}
                searchable={false}
                className="mt-0"
                onRowClick={(r) => openDetail(r.id)}
            />
        </div>
    );
};

export default CertificatesPage;
