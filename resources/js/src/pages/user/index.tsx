import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import moment from "moment";
import { useState } from "react";
import { toast } from "sonner";
import Breadcrumb from "../../components/Breadcrumb";
import DataTableWithSidebar from "../../components/DataTableWithSidebar";
import { useConfirmDialog, useSidebarDetail } from "../../hooks";
import { userApi } from "../../services/user";
import { ColumnConfig } from "../../types/columns";
import UserDetail from "./components/UserDetail";
import UserModal from "./components/UserModal";
import { IUser } from "../../types";
import { useTranslation } from "react-i18next";

const UserList = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [selectedRecords, setSelectedRecords] = useState<IUser[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<IUser | null>(null);

    // Use shared sidebar detail hook
    const {
        selectedId: selectedUserId,
        showSidebar,
        openSidebar,
        closeSidebar,
    } = useSidebarDetail();

    const { confirmDelete } = useConfirmDialog();

    // Delete mutation
    const { mutate: deleteUser } = useMutation({
        mutationFn: (id: number) => userApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["User Table"] });
            queryClient.invalidateQueries({ queryKey: [t("trashed_users")] });

            toast.success("User deleted successfully");

            // If the deleted user was being viewed, close the sidebar
            if (selectedUserId) {
                closeSidebar();
            }
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete user");
        },
    });

    // Bulk Delete mutation
    const { mutate: bulkDeleteUser } = useMutation({
        mutationFn: (ids: number[]) => userApi.bulkDelete(ids),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["User Table"] });
            queryClient.invalidateQueries({ queryKey: [t("trashed_users")] });

            toast.success(`${data.deleted_count} users deleted successfully`);

            // If any deleted user was being viewed, close the sidebar
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
            width: 80,
        },
        {
            accessor: "name",
            title: "Name",
            type: "text",
            sortable: true,
            render: ({ name }) => <div className="font-medium">{name}</div>,
        },
        {
            accessor: "email",
            title: "Email",
            type: "text",
            sortable: true,
        },
        {
            accessor: "created_at",
            title: "Created At",
            type: "date",
            sortable: true,
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

    return (
        <div>
            <Breadcrumb items={breadcrumbItems} />

            <DataTableWithSidebar<IUser>
                title="User Table"
                columns={columns}
                fetchData={(params) => userApi.getAll(params)}
                searchFields={["name", "email", "role"]}
                sortCol="created_at"
                query={{}}
                rowSelectionEnabled={true}
                onSelectionChange={setSelectedRecords}
                searchable={true}
                exportable={{
                    enabled: true,
                    name: "Users",
                    formats: ["csv", "excel", "pdf"],
                }}
                className="mt-5"
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
