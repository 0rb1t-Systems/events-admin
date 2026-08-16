import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Breadcrumb from "../../components/Breadcrumb";
import DataTableWithSidebar from "../../components/DataTableWithSidebar";
import { useConfirmDialog, useSidebarDetail } from "../../hooks";
import { organizerApi } from "../../services/organizer";
import { IOrganizer } from "../../types";
import { ColumnConfig } from "../../types/columns";
import OrganizerDetail from "./components/OrganizerDetail";
import OrganizerModal from "./components/OrganizerModal";
import OrganizerStatusModal from "./components/OrganizerStatusModal";

type StatusFilter = "" | "active" | "suspended";

const OrganizerList = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [selectedRecords, setSelectedRecords] = useState<IOrganizer[]>([]);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
    const [showFilter, setShowFilter] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [organizerToEdit, setOrganizerToEdit] = useState<IOrganizer | null>(null);
    const [organizerForStatus, setOrganizerForStatus] = useState<IOrganizer | null>(null);
    const filterRef = useRef<HTMLDivElement>(null);

    const {
        selectedId: selectedOrganizerId,
        showSidebar,
        openSidebar,
        closeSidebar,
    } = useSidebarDetail();

    const { confirmDelete } = useConfirmDialog();

    useEffect(() => {
        const onClickOutside = (event: MouseEvent) => {
            if (
                showFilter &&
                filterRef.current &&
                !filterRef.current.contains(event.target as Node)
            ) {
                setShowFilter(false);
            }
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, [showFilter]);

    const { mutate: deleteOrganizer } = useMutation({
        mutationFn: (id: number) => organizerApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["Organizer Table"] });
            queryClient.invalidateQueries({ queryKey: [t("trashed_organizers")] });
            toast.success("Organizer moved to trash");
            if (selectedOrganizerId) closeSidebar();
        },
        onError: (error: Error) => toast.error(error.message || "Failed to delete"),
    });

    const { mutate: bulkDelete } = useMutation({
        mutationFn: (ids: number[]) => organizerApi.bulkDelete(ids),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["Organizer Table"] });
            queryClient.invalidateQueries({ queryKey: [t("trashed_organizers")] });
            toast.success(`${data.deleted_count} organizers moved to trash`);
            setSelectedRecords([]);
            if (selectedOrganizerId) closeSidebar();
        },
        onError: (error: Error) => toast.error(error.message || "Failed to delete"),
    });

    const openEditModal = (organizer: IOrganizer) => {
        setOrganizerToEdit(organizer);
        setEditModalOpen(true);
    };

    const openStatusModal = (organizer: IOrganizer) => {
        setOrganizerForStatus(organizer);
        setStatusModalOpen(true);
    };

    const columns: ColumnConfig<IOrganizer>[] = [
        {
            accessor: "business_name",
            title: "Business",
            type: "text",
            sortable: true,
            render: ({ business_name }) => (
                <div className="font-medium">{business_name}</div>
            ),
        },
        {
            accessor: "contact_name",
            title: "Contact",
            type: "text",
            sortable: true,
        },
        {
            accessor: "email",
            title: "Email",
            type: "text",
            sortable: true,
        },
        {
            accessor: "status",
            title: "Status",
            type: "status",
            sortable: true,
            width: 110,
            options: [
                { value: "active", label: "Active", color: "success" },
                { value: "suspended", label: "Suspended", color: "danger" },
            ],
        },
        {
            accessor: "subscription_package",
            title: "Package",
            type: "custom",
            sortable: false,
            width: 120,
            render: (row) => {
                const name =
                    row.active_subscription?.package?.name ??
                    row.subscription_package;
                return name ? (
                    <span className="text-xs font-medium">{name}</span>
                ) : (
                    <span className="text-gray-400 text-xs">—</span>
                );
            },
        },
        {
            accessor: "events_count",
            title: "Events",
            type: "custom",
            sortable: false,
            width: 80,
            render: ({ events_count }) => (
                <span className="text-xs">{events_count ?? 0}</span>
            ),
        },
        {
            accessor: "created_at",
            title: "Created",
            type: "date",
            sortable: true,
            width: 110,
            render: ({ created_at }) => (
                <div>{created_at ? moment(created_at).format("MM/DD/YYYY") : "-"}</div>
            ),
        },
        {
            accessor: "actions",
            title: "Actions",
            type: "actions",
            sortable: false,
            textAlignment: "center",
            actions: [
                {
                    type: "view",
                    onClick: (record) => openSidebar(record.id),
                },
                {
                    type: "edit",
                    onClick: (record) => openEditModal(record),
                },
                {
                    type: "edit",
                    label: "Status",
                    onClick: (record) => openStatusModal(record),
                },
                {
                    type: "delete",
                    onClick: async (record) => {
                        const ok = await confirmDelete();
                        if (ok) deleteOrganizer(record.id);
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
                    { title: "Organizers" },
                ]}
            />

            <DataTableWithSidebar<IOrganizer>
                title="Organizer Table"
                columns={columns}
                fetchData={(params) => organizerApi.getAll(params)}
                searchFields={["business_name", "contact_name", "email"]}
                sortCol="created_at"
                query={tableQuery}
                rowSelectionEnabled={true}
                onSelectionChange={setSelectedRecords}
                searchable={true}
                className="mt-5"
                bulkActions={[
                    {
                        label: "Delete Selected",
                        icon: <IconTrash size={18} />,
                        color: "red",
                        onClick: async () => {
                            if (!selectedRecords.length) {
                                toast.error("Please select items to delete");
                                return;
                            }
                            const ok = await confirmDelete({
                                title: "Trash organizers",
                                text: `Move ${selectedRecords.length} organizers to trash?`,
                            });
                            if (ok) {
                                bulkDelete(selectedRecords.map((r) => r.id));
                            }
                        },
                    },
                ]}
                buttons={
                    <div className="filter-dropdown relative" ref={filterRef}>
                        <button
                            type="button"
                            className={`px-3 py-2 rounded-lg border flex items-center gap-2 text-sm ${
                                statusFilter
                                    ? "bg-primary text-white border-primary"
                                    : "border-gray-300 bg-white text-gray-700 dark:bg-[#1b2e4b] dark:border-[#1b2e4b] dark:text-white-light"
                            }`}
                            onClick={() => setShowFilter((v) => !v)}
                        >
                            <Filter size={16} />
                            <span>
                                {statusFilter === "active"
                                    ? "Active"
                                    : statusFilter === "suspended"
                                      ? "Suspended"
                                      : "All statuses"}
                            </span>
                        </button>
                        {showFilter && (
                            <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-[#1b2e4b] dark:bg-[#0e1726]">
                                {(
                                    [
                                        { value: "", label: "All statuses" },
                                        { value: "active", label: "Active" },
                                        { value: "suspended", label: "Suspended" },
                                    ] as { value: StatusFilter; label: string }[]
                                ).map((option) => (
                                    <button
                                        key={option.label}
                                        type="button"
                                        className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[#1b2e4b] ${
                                            statusFilter === option.value
                                                ? "text-primary font-medium"
                                                : "text-gray-700 dark:text-white-light"
                                        }`}
                                        onClick={() => {
                                            setStatusFilter(option.value);
                                            setShowFilter(false);
                                        }}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                }
                showSidebar={showSidebar}
                sidebarTitle="Organizer Details"
                onCloseSidebar={closeSidebar}
                sidebarContent={
                    <OrganizerDetail organizerId={selectedOrganizerId} />
                }
            />

            <OrganizerModal
                isOpen={editModalOpen}
                setIsOpen={setEditModalOpen}
                organizer={organizerToEdit}
            />

            <OrganizerStatusModal
                isOpen={statusModalOpen}
                setIsOpen={setStatusModalOpen}
                organizer={organizerForStatus}
            />
        </div>
    );
};

export default OrganizerList;
