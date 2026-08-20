import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import moment from "moment";
import { useState } from "react";
import { toast } from "sonner";
import DataTableWithSidebar from "../../../components/DataTableWithSidebar";
import { useConfirmDialog, useSidebarDetail } from "../../../hooks";
import { packageApi } from "../../../services/package";
import { IPackage } from "../../../types";
import { ColumnConfig } from "../../../types/columns";
import { formatMoney } from "../../../utils/money";
import PackageDetail from "./components/PackageDetail";
import PackageModal from "./components/PackageModal";

const PackageList = () => {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [packageToEdit, setPackageToEdit] = useState<IPackage | null>(null);

    const {
        selectedId: selectedPackageId,
        showSidebar,
        openSidebar,
        closeSidebar,
    } = useSidebarDetail();

    const { confirmDelete, confirmAction } = useConfirmDialog();

    const { mutate: deletePackage } = useMutation({
        mutationFn: (id: number) => packageApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["Package Table"] });
            toast.success("Package deleted successfully");
            if (selectedPackageId) closeSidebar();
        },
        onError: (error: Error) => {
            toast.error(
                error.message ||
                    "Cannot delete this package (it may have subscription history). Archive instead after cancelling active subscribers."
            );
        },
    });

    const { mutate: archivePackage } = useMutation({
        mutationFn: (id: number) => packageApi.archive(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["Package Table"] });
            toast.success("Package archived");
        },
        onError: (error: Error) => {
            toast.error(
                error.message ||
                    "Cannot archive while active subscribers exist. Cancel those subscriptions first."
            );
        },
    });

    const handleDelete = async (pkg: IPackage) => {
        const ok = await confirmDelete({
            title: "Delete package?",
            text: `Delete "${pkg.name}"? This is blocked if any subscription history references it (no silent orphaning). Prefer Archive after cancelling active subscribers.`,
        });
        if (ok) deletePackage(pkg.id);
    };

    const handleArchive = async (pkg: IPackage) => {
        const ok = await confirmAction({
            title: "Archive package?",
            text: `Archive "${pkg.name}"? Blocked if organizers still have an active subscription on this package.`,
            confirmButtonText: "Archive",
        });
        if (ok) archivePackage(pkg.id);
    };

    const columns: ColumnConfig<IPackage>[] = [
        {
            accessor: "name",
            title: "Name",
            type: "text",
            sortable: true,
            render: ({ name }) => <div className="font-medium">{name}</div>,
        },
        {
            accessor: "price",
            title: "Price",
            type: "text",
            sortable: true,
            width: 130,
            minWidth: 120,
            textAlignment: "right",
            render: ({ price }) => (
                <span className="whitespace-nowrap">{formatMoney(price)}</span>
            ),
        },
        {
            accessor: "event_quota",
            title: "Quota",
            type: "custom",
            sortable: true,
            width: 110,
            render: ({ event_quota }) => {
                if (event_quota === null) {
                    return <span className="text-xs">Unlimited</span>;
                }
                if (event_quota === 0) {
                    return <span className="text-xs">0 (none)</span>;
                }
                return <span>{event_quota}</span>;
            },
        },
        {
            accessor: "status",
            title: "Status",
            type: "status",
            sortable: true,
            width: 110,
            options: [
                { value: "active", label: "Active", color: "success" },
                { value: "archived", label: "Archived", color: "warning" },
            ],
        },
        {
            accessor: "created_at",
            title: "Created",
            type: "date",
            sortable: true,
            width: 110,
            hideBelow: "lg",
            render: ({ created_at }) => (
                <div>{created_at ? moment(created_at).format("MM/DD/YYYY") : "-"}</div>
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
                    onClick: (record) => openSidebar(record.id),
                },
                {
                    type: "edit",
                    onClick: (record) => {
                        setPackageToEdit(record);
                        setIsOpen(true);
                    },
                },
                {
                    type: "archive",
                    label: "Archive",
                    onClick: (record) => {
                        if (record.status !== "archived") {
                            void handleArchive(record);
                        }
                    },
                    show: (record) => record.status !== "archived",
                },
                {
                    type: "delete",
                    onClick: (record) => void handleDelete(record),
                },
            ],
        },
    ];

    return (
        <div>
            <DataTableWithSidebar<IPackage>
                title="Package Table"
                columns={columns}
                fetchData={(params) => packageApi.getAll(params)}
                searchFields={["name", "description"]}
                sortCol="created_at"
                query={{}}
                rowSelectionEnabled={false}
                searchable={true}
                className="mt-0"
                buttons={
                    <button
                        type="button"
                        className="btn btn-primary gap-2"
                        onClick={() => {
                            setPackageToEdit(null);
                            setIsOpen(true);
                        }}
                    >
                        <Plus size={16} />
                        Add Package
                    </button>
                }
                showSidebar={showSidebar}
                sidebarTitle="Package Details"
                onCloseSidebar={closeSidebar}
                sidebarContent={<PackageDetail packageId={selectedPackageId} />}
            />

            <PackageModal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                packageToEdit={packageToEdit}
            />
        </div>
    );
};

export default PackageList;
