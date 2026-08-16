import { IconRefresh, IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import CustomDataTable from "../../components/datatable";
import { useConfirmDialog } from "../../hooks";
import { organizerApi } from "../../services/organizer";
import { IOrganizer } from "../../types";
import { ColumnConfig } from "../../types/columns";

const TrashOrganizers = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [selectedItems, setSelectedItems] = useState<IOrganizer[]>([]);
    const { confirmDelete } = useConfirmDialog();

    const restoreMutation = useMutation({
        mutationFn: (id: number) => organizerApi.restore(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [t("trashed_organizers")] });
            queryClient.invalidateQueries({ queryKey: ["Organizer Table"] });
            toast.success("Organizer restored successfully");
        },
        onError: (error: Error) => toast.error(error.message || "Error restoring"),
    });

    const forceDeleteMutation = useMutation({
        mutationFn: (id: number) => organizerApi.forceDelete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [t("trashed_organizers")] });
            toast.success("Organizer permanently deleted");
        },
        onError: (error: Error) => toast.error(error.message || "Error deleting"),
    });

    const bulkRestoreMutation = useMutation({
        mutationFn: (ids: number[]) => organizerApi.bulkRestore(ids),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [t("trashed_organizers")] });
            queryClient.invalidateQueries({ queryKey: ["Organizer Table"] });
            toast.success(`${data.restored_count} organizers restored`);
            setSelectedItems([]);
        },
        onError: (error: Error) => toast.error(error.message || "Error restoring"),
    });

    const bulkForceDeleteMutation = useMutation({
        mutationFn: (ids: number[]) => organizerApi.bulkForceDelete(ids),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [t("trashed_organizers")] });
            toast.success(`${data.deleted_count} organizers permanently deleted`);
            setSelectedItems([]);
        },
        onError: (error: Error) => toast.error(error.message || "Error deleting"),
    });

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
            accessor: "email",
            title: "Email",
            type: "text",
            sortable: true,
        },
        {
            accessor: "deleted_at",
            title: "Deleted At",
            type: "date",
            sortable: true,
            render: ({ deleted_at }) => (
                <div>{deleted_at ? moment(deleted_at).format("MM/DD/YYYY") : "-"}</div>
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
                    onClick: (record) => restoreMutation.mutate(record.id),
                },
                {
                    type: "delete",
                    onClick: async (record) => {
                        const ok = await confirmDelete();
                        if (ok) forceDeleteMutation.mutate(record.id);
                    },
                },
            ],
        },
    ];

    return (
        <CustomDataTable<IOrganizer>
            title={t("trashed_organizers")}
            columns={columns}
            fetchData={(params) => organizerApi.getTrashed(params)}
            searchFields={["business_name", "contact_name", "email"]}
            rowSelectionEnabled={true}
            onSelectionChange={setSelectedItems}
            bulkActions={[
                {
                    label: "Restore Selected",
                    icon: <IconRefresh size={18} />,
                    color: "primary",
                    onClick: () => {
                        if (!selectedItems.length) {
                            toast.error("Please select items to restore");
                            return;
                        }
                        bulkRestoreMutation.mutate(selectedItems.map((i) => i.id));
                    },
                },
                {
                    label: "Delete Permanently",
                    icon: <IconTrash size={18} />,
                    color: "red",
                    onClick: async () => {
                        if (!selectedItems.length) {
                            toast.error("Please select items to delete");
                            return;
                        }
                        const ok = await confirmDelete({
                            title: "Delete Multiple Organizers",
                            text: `Permanently delete ${selectedItems.length} organizers?`,
                        });
                        if (ok) {
                            bulkForceDeleteMutation.mutate(
                                selectedItems.map((i) => i.id)
                            );
                        }
                    },
                },
            ]}
        />
    );
};

export default TrashOrganizers;
