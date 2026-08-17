import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Breadcrumb from "../../components/Breadcrumb";
import DataTableWithSidebar from "../../components/DataTableWithSidebar";
import StatusFilterBar from "../../components/StatusFilterBar";
import { useConfirmDialog } from "../../hooks";
import { eventApi } from "../../services/event";
import { IEvent } from "../../types";
import { ColumnConfig } from "../../types/columns";
import { EVENT_STATUS_OPTIONS } from "./components/EventForm";
import EventModal from "./components/EventModal";
import { statusBadgeClass } from "../../utils/statusBadge";

type StatusFilter = "" | IEvent["status"];

const EVENT_STATUS_COLOR: Record<string, string> = {
    draft: "warning",
    published: "primary",
    registration_open: "success",
    sold_out: "danger",
    registration_closed: "info",
    ongoing: "info",
    completed: "success",
    cancelled: "danger",
};

const EventList = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedRecords, setSelectedRecords] = useState<IEvent[]>([]);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
    const [modalOpen, setModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<IEvent | null>(null);
    const { confirmDelete } = useConfirmDialog();

    const { mutate: remove } = useMutation({
        mutationFn: (id: number) => eventApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["Event Table"] });
            toast.success("Event moved to trash");
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const { mutate: bulkDelete } = useMutation({
        mutationFn: (ids: number[]) => eventApi.bulkDelete(ids),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["Event Table"] });
            toast.success(`${data.deleted_count} events moved to trash`);
            setSelectedRecords([]);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const formatCapacity = (e: IEvent) => {
        if (e.capacity === null) return `${e.registrations_count}/∞`;
        if (e.capacity === 0) return `${e.registrations_count}/0`;
        return `${e.registrations_count}/${e.capacity}`;
    };

    const openEvent = (id: number) => navigate(`/events/${id}`);

    const columns: ColumnConfig<IEvent>[] = [
        {
            accessor: "title",
            title: "Title",
            type: "text",
            sortable: true,
            width: 220,
            render: ({ title }) => (
                <div className="font-medium text-gray-900 dark:text-white">{title}</div>
            ),
        },
        {
            accessor: "organizer",
            title: "Organizer",
            type: "custom",
            sortable: false,
            width: 170,
            hideBelow: "lg",
            render: ({ organizer }) => (
                <span className="text-gray-800 dark:text-white-light">
                    {organizer?.business_name ?? "—"}
                </span>
            ),
        },
        {
            accessor: "status",
            title: "Status",
            type: "text",
            sortable: true,
            width: 160,
            render: ({ status }) => (
                <span className={statusBadgeClass(EVENT_STATUS_COLOR[status] || "primary")}>
                    {String(status).replace(/_/g, " ")}
                </span>
            ),
        },
        {
            accessor: "capacity",
            title: "Capacity",
            type: "custom",
            sortable: true,
            width: 110,
            hideBelow: "lg",
            render: (row) => <span>{formatCapacity(row)}</span>,
        },
        {
            accessor: "monetized",
            title: "Paid",
            type: "custom",
            sortable: true,
            width: 80,
            hideBelow: "lg",
            render: ({ monetized }) => (monetized ? "Yes" : "—"),
        },
        {
            accessor: "starts_at",
            title: "Starts",
            type: "date",
            sortable: true,
            width: 120,
            hideBelow: "lg",
            render: ({ starts_at }) =>
                starts_at ? moment(starts_at).format("MM/DD/YYYY") : "—",
        },
        {
            accessor: "actions",
            title: "Actions",
            type: "actions",
            sortable: false,
            width: 150,
            textAlignment: "center",
            actions: [
                { type: "view", onClick: (r) => openEvent(r.id) },
                {
                    type: "edit",
                    label: "Moderate",
                    onClick: (r) => {
                        setEventToEdit(r);
                        setModalOpen(true);
                    },
                },
                {
                    type: "delete",
                    onClick: async (r) => {
                        if (await confirmDelete()) remove(r.id);
                    },
                },
            ],
        },
    ];

    const tableQuery = statusFilter ? { status: statusFilter } : {};

    return (
        <div>
            <Breadcrumb
                items={[
                    { title: "Dashboard", path: "/" },
                    { title: "Events" },
                ]}
            />

            <StatusFilterBar
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as StatusFilter)}
                options={[
                    { value: "", label: "All" },
                    ...EVENT_STATUS_OPTIONS.map((o) => ({
                        value: o.value,
                        label: o.label,
                    })),
                ]}
            />

            <DataTableWithSidebar<IEvent>
                title="Event Table"
                columns={columns}
                fetchData={(params) => eventApi.getAll(params)}
                searchFields={["title", "city", "description"]}
                sortCol="created_at"
                query={tableQuery}
                rowSelectionEnabled
                onSelectionChange={setSelectedRecords}
                searchable
                className="mt-0"
                onRowClick={(r) => openEvent(r.id)}
                bulkActions={[
                    {
                        label: "Delete Selected",
                        icon: <IconTrash size={18} />,
                        color: "red",
                        onClick: async () => {
                            if (!selectedRecords.length) {
                                toast.error("Select items first");
                                return;
                            }
                            const ok = await confirmDelete({
                                title: "Trash events",
                                text: `Move ${selectedRecords.length} events to trash?`,
                            });
                            if (ok) bulkDelete(selectedRecords.map((r) => r.id));
                        },
                    },
                ]}
            />

            <EventModal
                isOpen={modalOpen}
                setIsOpen={setModalOpen}
                eventToEdit={eventToEdit}
            />
        </div>
    );
};

export default EventList;
