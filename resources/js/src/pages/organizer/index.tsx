import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Breadcrumb from "../../components/Breadcrumb";
import DataTableWithSidebar from "../../components/DataTableWithSidebar";
import StatusFilterBar from "../../components/StatusFilterBar";
import { useConfirmDialog } from "../../hooks";
import { organizerApi } from "../../services/organizer";
import { IOrganizer } from "../../types";
import { ColumnConfig } from "../../types/columns";
import OrganizerModal from "./components/OrganizerModal";
import OrganizerStatusModal from "./components/OrganizerStatusModal";

type StatusFilter = "" | "active" | "suspended";

const OrganizerList = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedRecords, setSelectedRecords] = useState<IOrganizer[]>([]);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [organizerToEdit, setOrganizerToEdit] = useState<IOrganizer | null>(null);
    const [organizerForStatus, setOrganizerForStatus] = useState<IOrganizer | null>(null);
    const { confirmDelete } = useConfirmDialog();

    const { mutate: deleteOrganizer } = useMutation({
        mutationFn: (id: number) => organizerApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["Organizer Table"] });
            queryClient.invalidateQueries({ queryKey: [t("trashed_organizers")] });
            toast.success("Organizer moved to trash");
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
        },
        onError: (error: Error) => toast.error(error.message || "Failed to delete"),
    });

    const openDetail = (id: number) => navigate(`/organizers/${id}`);

    const columns: ColumnConfig<IOrganizer>[] = [
        {
            accessor: "business_name",
            title: "Business",
            type: "text",
            sortable: true,
            width: 200,
            render: ({ business_name }) => (
                <div className="font-medium">{business_name}</div>
            ),
        },
        {
            accessor: "contact_name",
            title: "Contact",
            type: "text",
            sortable: true,
            hideBelow: "lg",
        },
        {
            accessor: "email",
            title: "Email",
            type: "text",
            sortable: true,
            hideBelow: "lg",
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
            hideBelow: "lg",
            render: (row) => {
                const name =
                    row.active_subscription?.package?.name ?? row.subscription_package;
                return name ? (
                    <span className="font-medium">{name}</span>
                ) : (
                    <span className="text-gray-400">—</span>
                );
            },
        },
        {
            accessor: "events_count",
            title: "Events",
            type: "custom",
            sortable: false,
            width: 80,
            hideBelow: "lg",
            render: ({ events_count }) => (
                <span>{events_count ?? 0}</span>
            ),
        },
        {
            accessor: "created_at",
            title: "Created",
            type: "date",
            sortable: true,
            width: 110,
            hideBelow: "lg",
            render: ({ created_at }) => (
                <div>{created_at ? moment(created_at).format("MM/DD/YYYY") : "-"}</div>
            ),
        },
        {
            accessor: "actions",
            title: "Actions",
            type: "actions",
            sortable: false,
            width: 176,
            textAlignment: "center",
            actions: [
                { type: "view", onClick: (record) => openDetail(record.id) },
                {
                    type: "edit",
                    onClick: (record) => {
                        setOrganizerToEdit(record);
                        setEditModalOpen(true);
                    },
                },
                {
                    type: "status",
                    label: "Status",
                    onClick: (record) => {
                        setOrganizerForStatus(record);
                        setStatusModalOpen(true);
                    },
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

            <StatusFilterBar
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as StatusFilter)}
                options={[
                    { value: "", label: "All" },
                    { value: "active", label: "Active" },
                    { value: "suspended", label: "Suspended" },
                ]}
            />

            <DataTableWithSidebar<IOrganizer>
                title="Organizer Table"
                columns={columns}
                fetchData={(params) => organizerApi.getAll(params)}
                searchFields={["business_name", "contact_name", "email"]}
                sortCol="created_at"
                query={tableQuery}
                rowSelectionEnabled
                onSelectionChange={setSelectedRecords}
                searchable
                className="mt-0"
                onRowClick={(record) => openDetail(record.id)}
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
