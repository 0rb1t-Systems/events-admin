import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import moment from "moment";
import { useState } from "react";
import { toast } from "sonner";
import DataTableWithSidebar from "../../../components/DataTableWithSidebar";
import { useConfirmDialog, useSidebarDetail } from "../../../hooks";
import { eventCategoryApi } from "../../../services/eventCategory";
import { IEventCategory } from "../../../types";
import { ColumnConfig } from "../../../types/columns";
import EventCategoryDetail from "./components/EventCategoryDetail";
import EventCategoryModal from "./components/EventCategoryModal";

const EventCategoryList = () => {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [toEdit, setToEdit] = useState<IEventCategory | null>(null);
    const { selectedId, showSidebar, openSidebar, closeSidebar } = useSidebarDetail();
    const { confirmDelete } = useConfirmDialog();

    const { mutate: remove } = useMutation({
        mutationFn: (id: number) => eventCategoryApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["Event Category Table"] });
            toast.success("Category moved to trash");
            if (selectedId) closeSidebar();
        },
        onError: (e: Error) => toast.error(e.message || "Delete failed"),
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
            accessor: "created_at",
            title: "Created",
            type: "date",
            sortable: true,
            width: 120,
            render: ({ created_at }) =>
                created_at ? moment(created_at).format("MM/DD/YYYY") : "-",
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
                    onClick: (r) => {
                        setToEdit(r);
                        setIsOpen(true);
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

    return (
        <div>
            <DataTableWithSidebar<IEventCategory>
                title="Event Category Table"
                columns={columns}
                fetchData={(params) => eventCategoryApi.getAll(params)}
                searchFields={["name"]}
                sortCol="name"
                query={{}}
                searchable
                className="mt-0"
                buttons={
                    <button
                        type="button"
                        className="btn btn-primary gap-2"
                        onClick={() => {
                            setToEdit(null);
                            setIsOpen(true);
                        }}
                    >
                        <Plus size={16} />
                        Add Category
                    </button>
                }
                showSidebar={showSidebar}
                sidebarTitle="Category Details"
                onCloseSidebar={closeSidebar}
                sidebarContent={<EventCategoryDetail categoryId={selectedId} />}
            />
            <EventCategoryModal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                categoryToEdit={toEdit}
            />
        </div>
    );
};

export default EventCategoryList;
