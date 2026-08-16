import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Filter, Plus } from "lucide-react";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
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

type UserTypeFilter = "" | "admin" | "user";

const UserList = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [selectedRecords, setSelectedRecords] = useState<IUser[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<IUser | null>(null);
    const [userTypeFilter, setUserTypeFilter] = useState<UserTypeFilter>("");
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    const {
        selectedId: selectedUserId,
        showSidebar,
        openSidebar,
        closeSidebar,
    } = useSidebarDetail();

    const { confirmDelete } = useConfirmDialog();

    useEffect(() => {
        const onClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (
                showTypeDropdown &&
                filterRef.current &&
                !filterRef.current.contains(target)
            ) {
                setShowTypeDropdown(false);
            }
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, [showTypeDropdown]);

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
            render: ({ name }) => <div className="font-medium">{name}</div>,
        },
        {
            accessor: "email",
            title: "Email",
            type: "text",
            sortable: true,
        },
        {
            accessor: "user_type",
            title: "Type",
            type: "status",
            sortable: true,
            width: 110,
            options: [
                { value: "admin", label: "Admin", color: "primary" },
                { value: "user", label: "Participant", color: "secondary" },
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

    const tableQuery = userTypeFilter
        ? { user_type: userTypeFilter }
        : {};

    return (
        <div>
            <Breadcrumb items={breadcrumbItems} />

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
                    <div className="flex gap-2 items-center">
                        <div className="filter-dropdown relative" ref={filterRef}>
                            <button
                                type="button"
                                className={`px-3 py-2 rounded-lg border flex items-center gap-2 text-sm ${
                                    userTypeFilter
                                        ? "bg-primary text-white border-primary"
                                        : "border-gray-300 bg-white text-gray-700 dark:bg-[#1b2e4b] dark:border-[#1b2e4b] dark:text-white-light"
                                }`}
                                onClick={() => setShowTypeDropdown((v) => !v)}
                            >
                                <Filter size={16} />
                                <span>
                                    {userTypeFilter === "admin"
                                        ? "Admin"
                                        : userTypeFilter === "user"
                                          ? "Participant"
                                          : "All types"}
                                </span>
                            </button>
                            {showTypeDropdown && (
                                <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-[#1b2e4b] dark:bg-[#0e1726]">
                                    {[
                                        { value: "" as UserTypeFilter, label: "All types" },
                                        { value: "admin" as UserTypeFilter, label: "Admin" },
                                        { value: "user" as UserTypeFilter, label: "Participant" },
                                    ].map((option) => (
                                        <button
                                            key={option.label}
                                            type="button"
                                            className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[#1b2e4b] ${
                                                userTypeFilter === option.value
                                                    ? "text-primary font-medium"
                                                    : "text-gray-700 dark:text-white-light"
                                            }`}
                                            onClick={() => {
                                                setUserTypeFilter(option.value);
                                                setShowTypeDropdown(false);
                                            }}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="btn btn-primary gap-2"
                            onClick={openCreateModal}
                        >
                            <Plus size={16} />
                            Add New
                        </button>
                    </div>
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
