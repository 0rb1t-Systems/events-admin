import { IconRefresh, IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import CustomDataTable from "../../components/datatable";
import { useConfirmDialog } from "../../hooks";
import { eventApi } from "../../services/event";
import { IEvent } from "../../types";
import { ColumnConfig } from "../../types/columns";

const TrashEvents = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [selectedItems, setSelectedItems] = useState<IEvent[]>([]);
    const { confirmDelete } = useConfirmDialog();

    const restoreMutation = useMutation({
        mutationFn: (id: number) => eventApi.restore(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [t("trashed_events")] });
            queryClient.invalidateQueries({ queryKey: ["Event Table"] });
            toast.success("Event restored");
        },
        onError: (error: Error) => toast.error(error.message || "Error restoring"),
    });

    const forceDeleteMutation = useMutation({
        mutationFn: (id: number) => eventApi.forceDelete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [t("trashed_events")] });
            toast.success("Event permanently deleted");
        },
        onError: (error: Error) =>
            toast.error(
                error.message ||
                    "Cannot permanently delete (cancelled events are protected)"
            ),
    });

    const columns: ColumnConfig<IEvent>[] = [
        {
            accessor: "title",
            title: "Title",
            type: "text",
            sortable: true,
            render: ({ title }) => <div className="font-medium">{title}</div>,
        },
        {
            accessor: "status",
            title: "Status",
            type: "text",
            sortable: true,
            render: ({ status }) => (
                <span className="capitalize text-xs">{String(status).replace(/_/g, " ")}</span>
            ),
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
                    type: "edit",
                    label: "Restore",
                    onClick: (record) => restoreMutation.mutate(record.id),
                },
                {
                    type: "delete",
                    onClick: async (record) => {
                        const ok = await confirmDelete({
                            title: "Permanently delete?",
                            text:
                                record.status === "cancelled"
                                    ? "Cancelled events cannot be hard-deleted."
                                    : "This cannot be undone.",
                        });
                        if (ok) forceDeleteMutation.mutate(record.id);
                    },
                },
            ],
        },
    ];

    return (
        <CustomDataTable<IEvent>
            title={t("trashed_events")}
            columns={columns}
            fetchData={(params) => eventApi.getTrashed(params)}
            searchFields={["title"]}
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
                                eventApi
                                    .bulkRestore(selectedItems.map((i) => i.id))
                                    .then((data) => {
                                        queryClient.invalidateQueries({
                                            queryKey: [t("trashed_events")],
                                        });
                                        toast.success(`${data.restored_count} restored`);
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
                                    text: "Cancelled events will be refused by the API.",
                                });
                                if (!ok) return;
                                eventApi
                                    .bulkForceDelete(selectedItems.map((i) => i.id))
                                    .then((data) => {
                                        queryClient.invalidateQueries({
                                            queryKey: [t("trashed_events")],
                                        });
                                        toast.success(`${data.deleted_count} deleted`);
                                        setSelectedItems([]);
                                    })
                                    .catch((e: Error) => toast.error(e.message));
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

export default TrashEvents;
