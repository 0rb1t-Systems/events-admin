import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import moment from "moment";
import { useState } from "react";
import { toast } from "sonner";
import Breadcrumb from "../../components/Breadcrumb";
import DataTableWithSidebar from "../../components/DataTableWithSidebar";
import StatusFilterBar from "../../components/StatusFilterBar";
import { useConfirmDialog, useSidebarDetail } from "../../hooks";
import { userApi } from "../../services/user";
import { ColumnConfig } from "../../types/columns";
import UserDetail from "./components/UserDetail";
import UserModal from "./components/UserModal";
import { IUser } from "../../types";
import { useTranslation } from "react-i18next";

type UserTypeFilter = "" | "admin" | "user";
type StatusFilter = "" | "active" | "inactive" | "suspended";

const UserList = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [selectedRecords, setSelectedRecords] = useState<IUser[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<IUser | null>(null);
    const [userTypeFilter, setUserTypeFilter] = useState<UserTypeFilter>("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("");

    const {
        selectedId: selectedUserId,
        showSidebar,
        openSidebar,
        closeSidebar,
    } = useSidebarDetail();

    const { confirmDelete } = useConfirmDialog();

    const { mutate: deleteUser } = useMutation({
        mutationFn: (id: number) => userApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["User Table"] });
            queryClient.invalidateQueries({ queryKey: [t("trashed_users")] });
            toast.success("User deleted successfully");
            if (selectedUserId) {
                closeSidebar();
            }
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete user");
        },
    });

    const { mutate: bulkDeleteUser } = useMutation({
        mutationFn: (ids: number[]) => userApi.bulkDelete(ids),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["User Table"] });
            queryClient.invalidateQueries({ queryKey: [t("trashed_users")] });
            toast.success(`${data.deleted_count} users deleted successfully`);
            if (selectedUserId) {
                closeSidebar();
            }
            setSelectedRecords([]);
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete users");
        },
    });

    const breadcrumbItems = [
        { title: "Dashboard", path: "/" },
        { title: "Users" },
    ];

    const handleDelete = async (id: number) => {
        const confirmed = await confirmDelete();
        if (confirmed) {
            deleteUser(id);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedRecords.length === 0) {
            toast.error("Please select items to delete");
            return;
        }

        const confirmed = await confirmDelete({
            title: "Delete Multiple Users",
            text: `Are you sure you want to delete ${selectedRecords.length} selected users?`,
        });

        if (confirmed) {
            const ids = selectedRecords.map((record) => record.id);
            bulkDeleteUser(ids);
        }
    };

    const openCreateModal = () => {
        setUserToEdit(null);
        setIsOpen(true);
    };

    const openEditModal = (user: IUser) => {
        setUserToEdit(user);
        setIsOpen(true);
    };

    const handleViewUser = (user: IUser) => {
        openSidebar(user.id);
    };

    const columns: ColumnConfig<IUser>[] = [
        {
            accessor: "id",
            title: "ID",
            type: "number",
            sortable: true,
            width: 70,
        },
        {
            accessor: "name",
            title: "Name",
            type: "text",
            sortable: true,
            width: 180,
            render: ({ name }) => (
                <div className="font-medium text-gray-900 dark:text-white">{name}</div>
            ),
        },
        {
            accessor: "email",
            title: "Email",
            type: "text",
            sortable: true,
            width: 220,
        },
        {
            accessor: "user_type",
            title: "Type",
            type: "status",
            sortable: true,
            width: 130,
            options: [
                { value: "admin", label: "Admin", color: "primary" },
                { value: "user", label: "Participant", color: "info" },
            ],
        },
        {
            accessor: "status",
            title: "Status",
            type: "status",
            sortable: true,
            width: 100,
            options: [
                { value: "active", label: "Active", color: "success" },
                { value: "inactive", label: "Inactive", color: "warning" },
                { value: "suspended", label: "Suspended", color: "danger" },
            ],
        },
        {
            accessor: "created_at",
            title: "Created",
            type: "date",
            sortable: true,
            width: 110,
            hideBelow: "lg",
            render: ({ created_at }) => (
                <div>
                    {created_at ? moment(created_at).format("MM/DD/YYYY") : "-"}
                </div>
            ),
        },
        {
            accessor: "actions",
            title: "Actions",
            type: "actions",
            sortable: false,
            width: 150,
            textAlignment: "center",
            actions: [
                {
                    type: "view",
                    onClick: (record) => handleViewUser(record),
                },
                {
                    type: "edit",
                    onClick: (record) => openEditModal(record),
                },
                {
                    type: "delete",
                    onClick: (record) => handleDelete(record.id),
                },
            ],
        },
    ];

    const tableQuery: Record<string, string> = {};
    if (userTypeFilter) tableQuery.user_type = userTypeFilter;
    if (statusFilter) tableQuery.status = statusFilter;

    return (
        <div>
            <Breadcrumb items={breadcrumbItems} />

            <StatusFilterBar
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as StatusFilter)}
                options={[
                    { value: "", label: "All" },
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                    { value: "suspended", label: "Suspended" },
                ]}
                extra={
                    <div className="flex flex-wrap gap-2">
                        {(
                            [
                                { value: "", label: "All types" },
                                { value: "admin", label: "Admin" },
                                { value: "user", label: "Participant" },
                            ] as { value: UserTypeFilter; label: string }[]
                        ).map((option) => (
                            <button
                                key={option.label}
                                type="button"
                                className={`btn btn-sm ${
                                    userTypeFilter === option.value
                                        ? "btn-primary"
                                        : "btn-outline-primary"
                                }`}
                                onClick={() => setUserTypeFilter(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                }
            />

            <DataTableWithSidebar<IUser>
                title="User Table"
                columns={columns}
                fetchData={(params) => userApi.getAll(params)}
                searchFields={["name", "email"]}
                sortCol="created_at"
                query={tableQuery}
                rowSelectionEnabled={true}
                onSelectionChange={setSelectedRecords}
                searchable={true}
                exportable={{
                    enabled: true,
                    name: "Users",
                    formats: ["csv", "excel", "pdf"],
                }}
                className="mt-0"
                bulkActions={[
                    {
                        label: "Delete Selected",
                        icon: <IconTrash size={18} />,
                        color: "red",
                        onClick: () => handleBulkDelete(),
                    },
                ]}
                buttons={
                    <button
                        type="button"
                        className="btn btn-primary gap-2"
                        onClick={openCreateModal}
                    >
                        <Plus size={16} />
                        Add New
                    </button>
                }
                showSidebar={showSidebar}
                sidebarTitle="User Details"
                onCloseSidebar={closeSidebar}
                sidebarContent={<UserDetail userId={selectedUserId} />}
            />

            <UserModal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                userToEdit={userToEdit}
                userType="admin"
            />
        </div>
    );
};

export default UserList;
