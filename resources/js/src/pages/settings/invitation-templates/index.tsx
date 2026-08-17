import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import moment from "moment";
import { useState } from "react";
import { toast } from "sonner";
import Breadcrumb from "../../../components/Breadcrumb";
import DataTableWithSidebar from "../../../components/DataTableWithSidebar";
import { useConfirmDialog, useSidebarDetail } from "../../../hooks";
import { invitationSystemTemplateApi } from "../../../services/invitationSystemTemplate";
import { IInvitationSystemTemplate } from "../../../types/invitationTemplate";
import { ColumnConfig } from "../../../types/columns";
import InvitationSystemTemplateDetail from "./components/InvitationSystemTemplateDetail";
import InvitationSystemTemplateModal from "./components/InvitationSystemTemplateModal";

const InvitationTemplatesPage = () => {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [toEdit, setToEdit] = useState<IInvitationSystemTemplate | null>(null);
    const { selectedId, showSidebar, openSidebar, closeSidebar } = useSidebarDetail();
    const { confirmDelete } = useConfirmDialog();

    const { mutate: remove } = useMutation({
        mutationFn: (id: number) => invitationSystemTemplateApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["Invitation Templates"] });
            toast.success("Template moved to trash");
            if (selectedId) closeSidebar();
        },
        onError: (e: Error) => toast.error(e.message || "Delete failed"),
    });

    const columns: ColumnConfig<IInvitationSystemTemplate>[] = [
        {
            accessor: "thumbnail",
            title: "Preview",
            type: "custom",
            sortable: false,
            width: 70,
            render: (row) =>
                row.thumbnail_path ? (
                    <img
                        src={row.thumbnail_path}
                        alt=""
                        className="h-10 w-10 rounded object-cover"
                    />
                ) : (
                    <span className="text-xs text-gray-400">—</span>
                ),
        },
        {
            accessor: "name",
            title: "Name",
            type: "text",
            sortable: true,
            render: ({ name }) => <span className="font-medium">{name}</span>,
        },
        {
            accessor: "slug",
            title: "Slug",
            type: "text",
            sortable: true,
            width: 140,
            hideBelow: "lg",
            render: ({ slug }) => (
                <code className="text-xs text-gray-600 dark:text-gray-300">{slug}</code>
            ),
        },
        {
            accessor: "active",
            title: "Status",
            type: "custom",
            sortable: true,
            width: 90,
            render: ({ active }) => (
                <span
                    className={`badge ${
                        active ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                    }`}
                >
                    {active ? "Active" : "Inactive"}
                </span>
            ),
        },
        {
            accessor: "created_at",
            title: "Created",
            type: "date",
            sortable: true,
            width: 110,
            hideBelow: "lg",
            render: ({ created_at }) =>
                created_at ? moment(created_at).format("MM/DD/YYYY") : "—",
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
                        const ok = await confirmDelete({
                            title: "Delete template?",
                            text: `Soft-delete "${r.name}"? Organizers will no longer see it. Force-delete is blocked if any event uses it.`,
                        });
                        if (ok) remove(r.id);
                    },
                },
            ],
        },
    ];

    return (
        <div>
            <Breadcrumb
                items={[
                    { title: "Dashboard", path: "/" },
                    { title: "Settings", path: "/settings" },
                    { title: "Invitation Templates" },
                ]}
            />

            <DataTableWithSidebar<IInvitationSystemTemplate>
                title="Invitation Templates"
                columns={columns}
                fetchData={(params) => invitationSystemTemplateApi.getAll(params)}
                searchFields={["name", "slug"]}
                sortCol="created_at"
                query={{}}
                rowSelectionEnabled={false}
                searchable
                className="mt-5"
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
                        Add Template
                    </button>
                }
                showSidebar={showSidebar}
                sidebarTitle="Template Detail"
                onCloseSidebar={closeSidebar}
                sidebarContent={
                    <InvitationSystemTemplateDetail templateId={selectedId} />
                }
            />

            <InvitationSystemTemplateModal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                templateToEdit={toEdit}
            />
        </div>
    );
};

export default InvitationTemplatesPage;
