import moment from "moment";
import DataTableWithSidebar from "../../../components/DataTableWithSidebar";
import { useSidebarDetail } from "../../../hooks";
import { apiClientApi } from "../../../services/apiClient";
import { IApiClient } from "../../../types/apiClient";
import { ColumnConfig } from "../../../types/columns";
import ApiClientDetail from "./components/ApiClientDetail";

const ApiClientList = () => {
    const {
        selectedId: selectedClientId,
        showSidebar,
        openSidebar,
        closeSidebar,
    } = useSidebarDetail();

    const handleView = (client: IApiClient) => {
        openSidebar(client.id);
    };

    const columns: ColumnConfig<IApiClient>[] = [
        {
            accessor: "name",
            title: "Client",
            type: "text",
            sortable: true,
            render: ({ name }) => (
                <span className="font-medium text-gray-900 dark:text-white">{name}</span>
            ),
        },
        {
            accessor: "public_key_masked",
            title: "Public key",
            type: "text",
            sortable: false,
            render: ({ public_key_masked, public_key }) => (
                <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
                    {public_key_masked ?? public_key}
                </span>
            ),
        },
        {
            accessor: "active",
            title: "Status",
            type: "text",
            sortable: true,
            render: ({ active }) => (
                <span
                    className={`badge ${
                        active ? "badge-outline-success" : "badge-outline-danger"
                    }`}
                >
                    {active ? "Active" : "Inactive"}
                </span>
            ),
        },
        {
            accessor: "updated_at",
            title: "Updated",
            type: "date",
            sortable: true,
            hideBelow: "lg",
            render: ({ updated_at }) => (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    {moment(updated_at).format("MMM DD, YYYY")}
                </span>
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
                    onClick: (record) => handleView(record),
                },
            ],
        },
    ];

    return (
        <div className="space-y-4 p-1">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    API clients
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Registered machine clients for signed API access. Keys are seeded and rotated via
                    environment variables — not created from this screen.
                </p>
            </div>

            <DataTableWithSidebar<IApiClient>
                title="API Clients"
                columns={columns}
                fetchData={(params) => apiClientApi.getAll(params)}
                searchFields={["name", "public_key"]}
                sortCol="name"
                rowSelectionEnabled={false}
                searchable
                columnToggle={false}
                exportable={{ enabled: false, name: "api-clients" }}
                showSidebar={showSidebar}
                sidebarTitle="API client details"
                onCloseSidebar={closeSidebar}
                sidebarContent={
                    selectedClientId ? (
                        <ApiClientDetail clientId={selectedClientId} onClose={closeSidebar} />
                    ) : null
                }
            />
        </div>
    );
};

export default ApiClientList;
