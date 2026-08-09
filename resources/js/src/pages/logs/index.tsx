import { useQuery } from "@tanstack/react-query";
import { Calendar, Filter } from "lucide-react";
import moment from "moment";
import React, { useState } from "react";
import Breadcrumb from "../../components/Breadcrumb";
import DataTableWithSidebar from "../../components/DataTableWithSidebar";
import { useSidebarDetail } from "../../hooks";
import { ColumnConfig } from "../../types/columns";
import LogDetail from "./components/LogDetail";
import { logsApi } from "../../services/logs";

interface Log {
    id: number;
    log_name: string;
    description: string;
    subject_type: string;
    subject_id: number | null;
    causer_type: string | null;
    causer_id: number | null;
    causer: {
        id: number;
        name: string;
        email: string;
    } | null;
    properties: any;
    created_at: string;
}

const LogsList = () => {
    const [logTypeFilter, setLogTypeFilter] = useState<string | null>(null);
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");
    const [showDateFilters, setShowDateFilters] = useState(false);

    // Use shared sidebar detail hook
    const {
        selectedId: selectedLogId,
        showSidebar,
        openSidebar,
        closeSidebar,
    } = useSidebarDetail();

    // Fetch log types for the filter dropdown
    const { data: logTypesData } = useQuery({
        queryKey: ["LogTypes"],
        queryFn: () => logsApi.getLogTypes(),
    });

    const logTypes = logTypesData || [];

    const breadcrumbItems = [
        { title: "Dashboard", path: "/" },
        { title: "Logs" },
    ];

    const handleViewLog = (log: Log) => {
        openSidebar(log.id);
    };

    const applyLogTypeFilter = (logType: string | null) => {
        setLogTypeFilter(logType);
        setShowTypeDropdown(false);
        setShowFiltersDropdown(false);
    };

    const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDateFrom(e.target.value);
    };

    const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDateTo(e.target.value);
    };

    const applyDateFilter = () => {
        setShowDateFilters(false);
    };

    const clearDateFilter = () => {
        setDateFrom("");
        setDateTo("");
        setShowDateFilters(false);
    };

    // Close dropdowns when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (
                !target.closest(".filter-dropdown") &&
                !target.closest(".date-filter-dropdown")
            ) {
                setShowTypeDropdown(false);
                setShowFiltersDropdown(false);
                setShowDateFilters(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const columns: ColumnConfig<Log>[] = [
        {
            accessor: "id",
            title: "ID",
            type: "number",
            sortable: true,
            width: 80,
        },
        {
            accessor: "log_name",
            title: "Type",
            type: "text",
            sortable: true,
            render: ({ log_name }) => (
                <div className="font-medium capitalize">
                    {log_name?.replace("_", " ")}
                </div>
            ),
        },
        {
            accessor: "description",
            title: "Description",
            type: "text",
            sortable: true,
            render: ({ description }) => (
                <div className="max-w-xs truncate">{description}</div>
            ),
        },
        {
            accessor: "causer",
            title: "User",
            type: "text",
            sortable: false,
            render: ({ causer }) => <div>{causer ? causer.name : "-"}</div>,
        },
        {
            accessor: "subject_type",
            title: "Subject Type",
            type: "text",
            sortable: true,
            render: ({ subject_type }) => (
                <div>{subject_type ? subject_type.split("\\").pop() : "-"}</div>
            ),
        },
        {
            accessor: "causer_type",
            title: "Causer Type",
            type: "text",
            sortable: true,
            render: ({ causer_type }) => (
                <div>{causer_type ? causer_type.split("\\").pop() : "-"}</div>
            ),
        },
        {
            accessor: "created_at",
            title: "Created At",
            type: "date",
            sortable: true,
            render: ({ created_at }) => (
                <div>
                    {created_at
                        ? moment(created_at).format("MM/DD/YYYY HH:mm:ss")
                        : "-"}
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
                    onClick: (record) => handleViewLog(record),
                },
            ],
        },
    ];

    return (
        <div>
            <Breadcrumb items={breadcrumbItems} />

            <DataTableWithSidebar<Log>
                title="Activity Logs"
                columns={columns}
                fetchData={(params) =>
                    logsApi.getAll({
                        ...params,
                        log_name: logTypeFilter,
                        date_from: dateFrom || undefined,
                        date_to: dateTo || undefined,
                    })
                }
                searchFields={["description"]}
                sortCol="created_at"
                query={{
                    filters: {
                        log_name: logTypeFilter,
                        date_from: dateFrom,
                        date_to: dateTo,
                    },
                }}
                searchable={true}
                buttons={
                    <div className="flex gap-2 relative">
                        {/* Date Range Filter Button */}
                        <div className="date-filter-dropdown relative">
                            <button
                                type="button"
                                className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                                    dateFrom || dateTo
                                        ? "bg-primary text-white border-primary"
                                        : "border-gray-300 bg-white text-gray-700"
                                }`}
                                onClick={() => {
                                    setShowDateFilters(!showDateFilters);
                                    setShowTypeDropdown(false);
                                }}
                            >
                                <Calendar size={16} />
                                <span>
                                    {dateFrom || dateTo
                                        ? `Date: ${
                                              dateFrom
                                                  ? moment(dateFrom).format(
                                                        "MM/DD/YYYY"
                                                    )
                                                  : "Any"
                                          } - ${
                                              dateTo
                                                  ? moment(dateTo).format(
                                                        "MM/DD/YYYY"
                                                    )
                                                  : "Any"
                                          }`
                                        : "Date range"}
                                </span>
                            </button>

                            {showDateFilters && (
                                <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-10 min-w-[320px] p-4">
                                    <h3 className="font-medium mb-3">
                                        Filter by date range
                                    </h3>
                                    <div className="flex flex-col gap-3">
                                        <div>
                                            <label className="block text-sm mb-1">
                                                From date
                                            </label>
                                            <input
                                                type="date"
                                                value={dateFrom}
                                                onChange={handleDateFromChange}
                                                className="w-full px-3 py-2 border rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm mb-1">
                                                To date
                                            </label>
                                            <input
                                                type="date"
                                                value={dateTo}
                                                onChange={handleDateToChange}
                                                className="w-full px-3 py-2 border rounded-md"
                                            />
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={applyDateFilter}
                                                className="px-4 py-2 bg-primary text-white rounded-md text-sm flex-1"
                                            >
                                                Apply
                                            </button>
                                            <button
                                                onClick={clearDateFilter}
                                                className="px-4 py-2 border border-gray-300 rounded-md text-sm"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Type Filter Button */}
                        <div className="filter-dropdown relative">
                            <button
                                type="button"
                                className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                                    logTypeFilter
                                        ? "bg-primary text-white border-primary"
                                        : "border-gray-300 bg-white text-gray-700"
                                }`}
                                onClick={() => {
                                    setShowTypeDropdown(!showTypeDropdown);
                                    setShowFiltersDropdown(false);
                                }}
                            >
                                <Filter size={16} />
                                <span>
                                    {logTypeFilter
                                        ? `Type: ${logTypeFilter.replace(
                                              "_",
                                              " "
                                          )}`
                                        : "Type: all"}
                                </span>
                            </button>

                            {showTypeDropdown && (
                                <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-10 min-w-[200px]">
                                    <div className="p-2">
                                        <button
                                            className={`block w-full text-left px-4 py-2 rounded-md hover:bg-gray-100 ${
                                                !logTypeFilter
                                                    ? "bg-gray-100 font-semibold"
                                                    : ""
                                            }`}
                                            onClick={() =>
                                                applyLogTypeFilter(null)
                                            }
                                        >
                                            All Logs
                                        </button>
                                        {logTypes.map((type: string) => (
                                            <button
                                                key={type}
                                                className={`block w-full text-left px-4 py-2 rounded-md hover:bg-gray-100 capitalize ${
                                                    logTypeFilter === type
                                                        ? "bg-gray-100 font-semibold"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    applyLogTypeFilter(type)
                                                }
                                            >
                                                {type.replace("_", " ")}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                }
                exportable={{
                    enabled: true,
                    name: "ActivityLogs.csv",
                    formats: ["csv", "excel", "pdf"],
                }}
                showSidebar={showSidebar}
                sidebarTitle="Log Details"
                onCloseSidebar={closeSidebar}
                sidebarContent={
                    <LogDetail logId={selectedLogId} onClose={closeSidebar} />
                }
            />
        </div>
    );
};

export default LogsList;
