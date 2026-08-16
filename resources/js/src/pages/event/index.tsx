import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Breadcrumb from "../../components/Breadcrumb";
import DataTableWithSidebar from "../../components/DataTableWithSidebar";
import { useConfirmDialog, useSidebarDetail } from "../../hooks";
import { eventApi } from "../../services/event";
import { IEvent } from "../../types";
import { ColumnConfig } from "../../types/columns";
import EventDetail from "./components/EventDetail";
import EventModal from "./components/EventModal";

type StatusFilter = "" | IEvent["status"];

const EventList = () => {
    const queryClient = useQueryClient();
    const [selectedRecords, setSelectedRecords] = useState<IEvent[]>([]);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
    const [showFilter, setShowFilter] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<IEvent | null>(null);
    const filterRef = useRef<HTMLDivElement>(null);

    const { selectedId, showSidebar, openSidebar, closeSidebar } = useSidebarDetail();
    const { confirmDelete } = useConfirmDialog();

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (showFilter && filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setShowFilter(false);
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [showFilter]);

    const { mutate: remove } = useMutation({
        mutationFn: (id: number) => eventApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["Event Table"] });
            toast.success("Event moved to trash");
            if (selectedId) closeSidebar();
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

    const columns: ColumnConfig<IEvent>[] = [
        {
            accessor: "title",
            title: "Title",
            type: "text",
            sortable: true,
            render: ({ title }) => <div className="font-medium">{title}</div>,
        },
        {
            accessor: "organizer",
            title: "Organizer",
            type: "custom",
            sortable: false,
            width: 130,
            render: ({ organizer }) => (
                <span className="text-xs">{organizer?.business_name ?? "—"}</span>
            ),
        },
        {
            accessor: "status",
            title: "Status",
            type: "text",
            sortable: true,
            width: 130,
            render: ({ status }) => (
                <span className="text-xs capitalize">{String(status).replace(/_/g, " ")}</span>
            ),
        },
        {
            accessor: "capacity",
            title: "Capacity",
            type: "custom",
            sortable: true,
            width: 90,
            render: (row) => <span className="text-xs">{formatCapacity(row)}</span>,
        },
        {
            accessor: "monetized",
            title: "Paid",
            type: "custom",
            sortable: true,
            width: 70,
            render: ({ monetized }) => (monetized ? "Yes" : "—"),
        },
        {
            accessor: "starts_at",
            title: "Starts",
            type: "date",
            sortable: true,
            width: 100,
            render: ({ starts_at }) =>
                starts_at ? moment(starts_at).format("MM/DD/YYYY") : "—",
        },
        {
            accessor: "actions",
            title: "Actions",
            type: "actions",
            sortable: false,
            textAlignment: "center",
            actions: [
                { type: "view", onClick: (r) => openSidebar(r.id) },
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
                className="mt-5"
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
                buttons={
                    <div className="relative" ref={filterRef}>
                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => setShowFilter((v) => !v)}
                        >
                            {statusFilter
                                ? String(statusFilter).replace(/_/g, " ")
                                : "All statuses"}
                        </button>
                        {showFilter && (
                            <div className="absolute right-0 z-20 mt-1 max-h-64 w-48 overflow-y-auto rounded border bg-white shadow dark:border-[#1b2e4b] dark:bg-[#0e1726]">
                                {(
                                    [
                                        "",
                                        "draft",
                                        "published",
                                        "registration_open",
                                        "sold_out",
                                        "registration_closed",
                                        "ongoing",
                                        "completed",
                                        "cancelled",
                                    ] as StatusFilter[]
                                ).map((s) => (
                                    <button
                                        key={s || "all"}
                                        type="button"
                                        className="block w-full px-3 py-1.5 text-left text-sm capitalize hover:bg-gray-50 dark:hover:bg-[#1b2e4b]"
                                        onClick={() => {
                                            setStatusFilter(s);
                                            setShowFilter(false);
                                        }}
                                    >
                                        {s ? String(s).replace(/_/g, " ") : "All statuses"}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                }
                showSidebar={showSidebar}
                sidebarTitle="Event Details"
                onCloseSidebar={closeSidebar}
                sidebarContent={<EventDetail eventId={selectedId} />}
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
