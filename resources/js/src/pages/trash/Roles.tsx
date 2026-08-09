import { IconRefresh, IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import moment from "moment";
import CustomDataTable from "../../components/datatable";
import { useConfirmDialog } from "../../hooks";
import { roleApi } from "../../services/role";
import { ColumnConfig } from "../../types/columns";
import { IRole } from "../../types";

const TrashRoles = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [selectedItems, setSelectedItems] = useState<IRole[]>([]);
    const { confirmDelete } = useConfirmDialog();

    // Restore mutation
    const restoreMutation = useMutation({
        mutationFn: (id: number) => roleApi.restore(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [t("trashed_roles")] });
            queryClient.invalidateQueries({ queryKey: ["Role Table"] });
            toast.success("Role restored successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Error restoring role");
        },
    });

    // Permanently delete mutation
    const forceDeleteMutation = useMutation({
        mutationFn: (id: number) => roleApi.forceDelete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [t("trashed_roles")] });
            toast.success("Role permanently deleted");
        },
        onError: (error) => {
            toast.error(error.message || "Error deleting role");
        },
    });

    // Bulk restore mutation
    const bulkRestoreMutation = useMutation({
        mutationFn: (ids: number[]) => roleApi.bulkRestore(ids),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [t("trashed_roles")] });
            queryClient.invalidateQueries({ queryKey: ["Role Table"] });
            toast.success(`${data.restored_count} roles restored successfully`);
            setSelectedItems([]);
        },
        onError: (error) => {
            toast.error(error.message || "Error restoring roles");
        },
    });

    // Bulk permanently delete mutation
    const bulkForceDeleteMutation = useMutation({
        mutationFn: (ids: number[]) => roleApi.bulkForceDelete(ids),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [t("trashed_roles")] });
            toast.success(`${data.deleted_count} roles permanently deleted`);
            setSelectedItems([]);
        },
        onError: (error) => {
            toast.error(error.message || "Error permanently deleting roles");
        },
    });

    const columns: ColumnConfig<IRole>[] = [
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
            accessor: "guard_name",
            title: "Guard Name",
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
                toast.error(error?.message || "Error restoring role");
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
                    toast.error(error?.message || "Error deleting role");
                }
            }
        }
    };

    const handleSelectionChange = (items: IRole[]) => {
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
                    error.response?.data?.message || "Error restoring roles"
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
            title: "Delete Multiple Roles",
            text: `Are you sure you want to permanently delete ${selectedItems.length} selected items?`,
        });

        if (confirmed) {
            try {
                const ids = selectedItems.map((item) => item.id);
                bulkForceDeleteMutation.mutate(ids);
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    toast.error(
                        error.response?.data?.message || "Error deleting roles"
                    );
                }
            }
        }
    };

    return (
        <CustomDataTable<IRole>
            title={t("trashed_roles")}
            columns={columns}
            fetchData={(params) => roleApi.getTrashed(params)}
            searchFields={["name", "guard_name"]}
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

export default TrashRoles;
