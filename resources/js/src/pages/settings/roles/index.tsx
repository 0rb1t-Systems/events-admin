import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import moment from "moment";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Breadcrumb from "../../../components/Breadcrumb";
import DataTableWithSidebar from "../../../components/DataTableWithSidebar";
import { useConfirmDialog, useSidebarDetail } from "../../../hooks";
import { roleApi } from "../../../services/role";
import { IRole } from "../../../types";
import { ColumnConfig } from "../../../types/columns";
import RoleDetail from "./components/RoleDetail";
import RoleModal from "./components/RoleModal";
import RolePermissionsSidebar from "./components/RolePermissionsSidebar";

const RoleList = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [selectedRecords, setSelectedRecords] = useState<IRole[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [roleToEdit, setRoleToEdit] = useState<IRole | null>(null);
    // view role permissions
    const [viewRolePermissions, setViewRolePermissions] = useState<IRole | null>(null);

    // Use shared sidebar detail hook
    const {
        selectedId: selectedRoleId,
        showSidebar,
        openSidebar,
        closeSidebar,
    } = useSidebarDetail();

    const { confirmDelete } = useConfirmDialog();

    // Delete mutation
    const { mutate: deleteRole } = useMutation({
        mutationFn: (id: number) => roleApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["Role Table"] });
            queryClient.invalidateQueries({ queryKey: [t("trashed_roles")] });

            toast.success("Role deleted successfully");

            // If the deleted role was being viewed, close the sidebar
            if (selectedRoleId) {
                closeSidebar();
            }
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete role");
        },
    });

    // Bulk Delete mutation
    const { mutate: bulkDeleteRole } = useMutation({
        mutationFn: (ids: number[]) => roleApi.bulkDelete(ids),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["Role Table"] });
            queryClient.invalidateQueries({ queryKey: [t("trashed_roles")] });
            toast.success(`${data.deleted_count} roles deleted successfully`);

            // If any deleted role was being viewed, close the sidebar
            if (selectedRoleId) {
                closeSidebar();
            }
            setSelectedRecords([]);
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete roles");
        },
    });



    const handleDelete = async (id: number) => {
        const confirmed = await confirmDelete();
        if (confirmed) {
            deleteRole(id);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedRecords.length === 0) {
            toast.error("Please select items to delete");
            return;
        }

        const confirmed = await confirmDelete({
            title: "Delete Multiple Roles",
            text: `Are you sure you want to delete ${selectedRecords.length} selected roles?`,
        });

        if (confirmed) {
            const ids = selectedRecords.map((record) => record.id);
            bulkDeleteRole(ids);
        }
    };

    const openCreateModal = () => {
        setRoleToEdit(null);
        setIsOpen(true);
    };

    const openEditModal = (role: IRole) => {
        setRoleToEdit(role);
        setIsOpen(true);
    };

    const handleViewRole = (role: IRole) => {
        openSidebar(role.id);
    };

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
            accessor: "permissions",
            title: "Permissions",
            type: "text",
            sortable: false,
            render: ({ permissions }) => (
                <div>
                    {permissions && permissions.length > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {permissions.length} permissions
                        </span>
                    ) : (
                        <span className="text-gray-500 text-sm">No permissions</span>
                    )}
                </div>
            ),
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
                    type: "permissions",
                    onClick: (record) => {
                        setViewRolePermissions(record);
                    },
                },
                {
                    type: "view",
                    onClick: (record) => handleViewRole(record),
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
            <DataTableWithSidebar<IRole>
                title="Role Table"
                columns={columns}
                fetchData={(params) => roleApi.getAll(params)}
                searchFields={["name", "guard_name"]}
                sortCol="created_at"
                query={{}}
                rowSelectionEnabled={true}
                onSelectionChange={setSelectedRecords}
                searchable={true}
                exportable={{
                    enabled: true,
                    name: "Roles",
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
                sidebarTitle="Role Details"
                onCloseSidebar={closeSidebar}
                sidebarContent={<RoleDetail roleId={selectedRoleId} />}
            />

            <RoleModal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                roleToEdit={roleToEdit}
            />
            {viewRolePermissions && (
                <RolePermissionsSidebar
                    onClose={() => setViewRolePermissions(null)}
                    role={viewRolePermissions}
                />
            )}
        </div>
    );
};

export default RoleList;
