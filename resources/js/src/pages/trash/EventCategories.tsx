import { IconRefresh, IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import CustomDataTable from "../../components/datatable";
import { useConfirmDialog } from "../../hooks";
import { eventCategoryApi } from "../../services/eventCategory";
import { IEventCategory } from "../../types";
import { ColumnConfig } from "../../types/columns";

const TrashEventCategories = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [selectedItems, setSelectedItems] = useState<IEventCategory[]>([]);
    const { confirmDelete } = useConfirmDialog();

    const restoreMutation = useMutation({
        mutationFn: (id: number) => eventCategoryApi.restore(id),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [t("trashed_event_categories")],
            });
            queryClient.invalidateQueries({ queryKey: ["Event Categories"] });
            toast.success("Category restored");
        },
        onError: (error: Error) =>
            toast.error(error.message || "Error restoring"),
    });

    const forceDeleteMutation = useMutation({
        mutationFn: (id: number) => eventCategoryApi.forceDelete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [t("trashed_event_categories")],
            });
            toast.success("Category permanently deleted");
        },
        onError: (error: Error) =>
            toast.error(error.message || "Error deleting"),
    });

    const columns: ColumnConfig<IEventCategory>[] = [
        {
            accessor: "name",
            title: "Name",
            type: "text",
            sortable: true,
            render: ({ name }) => <div className="font-medium">{name}</div>,
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
                    type: "edit",
                    label: "Restore",
                    onClick: (record) => restoreMutation.mutate(record.id),
                },
                {
                    type: "delete",
                    onClick: async (record) => {
                        const ok = await confirmDelete({
                            title: "Permanently delete?",
                            text: "This cannot be undone.",
                        });
                        if (ok) forceDeleteMutation.mutate(record.id);
                    },
                },
            ],
        },
    ];

    return (
        <CustomDataTable<IEventCategory>
            title={t("trashed_event_categories")}
            columns={columns}
            fetchData={(params) => eventCategoryApi.getTrashed(params)}
            searchFields={["name"]}
            sortCol="deleted_at"
            query={{}}
            rowSelectionEnabled
            onSelectionChange={setSelectedItems}
            searchable
            className="mt-0"
            buttons={
                selectedItems.length > 0 ? (
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="btn btn-primary gap-2"
                            onClick={() =>
                                eventCategoryApi
                                    .bulkRestore(selectedItems.map((i) => i.id))
                                    .then((data) => {
                                        queryClient.invalidateQueries({
                                            queryKey: [
                                                t("trashed_event_categories"),
                                            ],
                                        });
                                        toast.success(
                                            `${data.restored_count} restored`
                                        );
                                        setSelectedItems([]);
                                    })
                            }
                        >
                            <IconRefresh size={16} />
                            Restore
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-danger gap-2"
                            onClick={async () => {
                                const ok = await confirmDelete({
                                    title: "Force delete selected?",
                                    text: "This cannot be undone.",
                                });
                                if (!ok) return;
                                eventCategoryApi
                                    .bulkForceDelete(
                                        selectedItems.map((i) => i.id)
                                    )
                                    .then((data) => {
                                        queryClient.invalidateQueries({
                                            queryKey: [
                                                t("trashed_event_categories"),
                                            ],
                                        });
                                        toast.success(
                                            `${data.deleted_count} deleted`
                                        );
                                        setSelectedItems([]);
                                    })
                                    .catch((e: Error) =>
                                        toast.error(e.message)
                                    );
                            }}
                        >
                            <IconTrash size={16} />
                            Delete forever
                        </button>
                    </div>
                ) : undefined
            }
        />
    );
};

export default TrashEventCategories;
