import { IconRefresh, IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import moment from "moment";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import CustomDataTable from "../../components/datatable";
import { useConfirmDialog } from "../../hooks";
import { userApi } from "../../services/user";
import { IUser } from "../../types";
import { ColumnConfig } from "../../types/columns";

const TrashUsers = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [selectedItems, setSelectedItems] = useState<IUser[]>([]);
    const { confirmDelete } = useConfirmDialog();

    // Restore mutation
    const restoreMutation = useMutation({
        mutationFn: (id: number) => userApi.restore(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [t("trashed_users")] });
            queryClient.invalidateQueries({ queryKey: ["User Table"] });
            toast.success("User restored successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Error restoring user");
        },
    });

    // Permanently delete mutation
    const forceDeleteMutation = useMutation({
        mutationFn: (id: number) => userApi.forceDelete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [t("trashed_users")] });
            toast.success("User permanently deleted");
        },
        onError: (error) => {
            toast.error(error.message || "Error deleting user");
        },
    });

    // Bulk restore mutation
    const bulkRestoreMutation = useMutation({
        mutationFn: (ids: number[]) => userApi.bulkRestore(ids),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [t("trashed_users")] });
            queryClient.invalidateQueries({ queryKey: ["User Table"] });
            toast.success(`${data.restored_count} users restored successfully`);
            setSelectedItems([]);
        },
        onError: (error) => {
            toast.error(error.message || "Error restoring users");
        },
    });

    // Bulk permanently delete mutation
    const bulkForceDeleteMutation = useMutation({
        mutationFn: (ids: number[]) => userApi.bulkForceDelete(ids),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [t("trashed_users")] });
            toast.success(`${data.deleted_count} users permanently deleted`);
            setSelectedItems([]);
        },
        onError: (error) => {
            toast.error(error.message || "Error permanently deleting users");
        },
    });

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
            accessor: "role",
            title: "Role",
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
            accessor: "deleted_at",
            title: "Deleted At",
            type: "date",
            sortable: true,
            render: ({ deleted_at }) => (
                <div>
                    {deleted_at ? moment(deleted_at).format("MM/DD/YYYY") : "-"}
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
                    type: "restore",
                    onClick: (record) => handleRestore(record.id),
                },
                {
                    type: "delete",
                    onClick: (record) => handlePermanentDelete(record.id),
                },
            ],
        },
    ];

    const handleRestore = async (id: number) => {
        try {
            restoreMutation.mutate(id);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error?.message || "Error restoring user");
            }
        }
    };

    const handlePermanentDelete = async (id: number) => {
        const confirmed = await confirmDelete();
        if (confirmed) {
            try {
                forceDeleteMutation.mutate(id);
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    toast.error(error?.message || "Error deleting user");
                }
            }
        }
    };

    const handleSelectionChange = (items: IUser[]) => {
        setSelectedItems(items);
    };

    const handleBulkRestore = async () => {
        if (selectedItems.length === 0) {
            toast.error("Please select items to restore");
            return;
        }

        try {
            const ids = selectedItems.map((item) => item.id);
            bulkRestoreMutation.mutate(ids);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(
                    error.response?.data?.message || "Error restoring users"
                );
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedItems.length === 0) {
            toast.error("Please select items to delete");
            return;
        }

        const confirmed = await confirmDelete({
            title: "Delete Multiple Users",
            text: `Are you sure you want to permanently delete ${selectedItems.length} selected items?`,
        });

        if (confirmed) {
            try {
                const ids = selectedItems.map((item) => item.id);
                bulkForceDeleteMutation.mutate(ids);
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    toast.error(
                        error.response?.data?.message || "Error deleting users"
                    );
                }
            }
        }
    };

    return (
        <CustomDataTable<IUser>
            title={t("trashed_users")}
            columns={columns}
            fetchData={(params) => userApi.getTrashed(params)}
            searchFields={["name", "email"]}
            rowSelectionEnabled={true}
            onSelectionChange={handleSelectionChange}
            bulkActions={[
                {
                    label: "Restore Selected",
                    icon: <IconRefresh size={18} />,
                    color: "primary",
                    onClick: () => handleBulkRestore(),
                },
                {
                    label: "Delete Permanently",
                    icon: <IconTrash size={18} />,
                    color: "red",
                    onClick: () => handleBulkDelete(),
                },
            ]}
        />
    );
};

export default TrashUsers;
