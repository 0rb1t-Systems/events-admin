import { Button, Tooltip } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { DataTable, DataTableSortStatus } from "mantine-datatable";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { setPageTitle } from "../../store/themeConfigSlice";
import { IApiResponse, IQueryParams } from "../../types";
import { ColumnConfig } from "../../types/columns";
import { createColumn } from "../../utils/columns";
import DebouncedInput from "./DebouncedInput";
import EmptyStateDisplay from "./EmptyStateDisplay";
import useFetchTableData from "./useFetchTableData";
import ColumnVisibilityToggle from "./ColumnVisibilityToggle";
import ExportMenu from "./ExportMenu";
import { IconRefresh } from "@tabler/icons-react";

// Add BulkAction type
export interface BulkAction {
    label: string;
    icon?: React.ReactNode;
    variant?:
        | "filled"
        | "outline"
        | "light"
        | "subtle"
        | "default"
        | "white"
        | "gradient";
    color?: string;
    onClick: (selectedIds: number[]) => void;
    isVisible?: (count: number) => boolean;
}

// Updated interface to include new export and column visibility options
export interface CustomDataTableProps<T> {
    title: string;
    columns: ColumnConfig<T>[];
    fetchData: (param: IQueryParams) => Promise<IApiResponse<T>> | undefined;
    searchFields?: Array<string>;
    query?: Record<string, string | number | boolean | string[]> | object;
    buttons?: React.ReactNode;
    canExpand?: boolean;
    disablePagination?: boolean;
    exportable?: {
        enabled: boolean;
        name: string;
        formats?: ("csv" | "excel" | "pdf")[];
    };
    columnToggle?: boolean;
    searchable?: boolean;
    sortCol?: string;
    rowSelectionEnabled?: boolean;
    onSelectionChange?: (records: T[]) => void;
    className?: string;
    bulkActions?: BulkAction[];
    getRecordId?: (record: T) => number;
}

function CustomDataTable<T>({
    title,
    columns: initialColumns,
    fetchData,
    query = {},
    searchFields = [],
    exportable,
    columnToggle = true,
    searchable = true,
    buttons,
    canExpand,
    sortCol = "id",
    disablePagination = false,
    rowSelectionEnabled = false,
    onSelectionChange,
    className,
    bulkActions = [],
    getRecordId = (record) => (record as any).id,
}: CustomDataTableProps<T>) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [columns, setColumns] = useState<ColumnConfig<T>[]>(initialColumns);

    // Get values from URL params or use defaults
    const initialSearch = searchParams.get(`${title}_search`) || "";
    const initialPage = parseInt(searchParams.get(`${title}_page`) || "1", 10);
    const PAGE_SIZES = [7, 10, 20, 30, 50, 100];
    const initialPageSize = parseInt(
        searchParams.get(`${title}_pageSize`) || String(PAGE_SIZES[1]),
        10
    );
    const initialSortCol = searchParams.get(`${title}_sortCol`) || sortCol;
    const initialSortDir = searchParams.get(`${title}_sortDir`) || "desc";

    const [search, setSearch] = useState(initialSearch);
    const [selectedRecords, setSelectedRecords] = useState<T[]>([]);
    const [page, setPage] = useState(initialPage);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const queryClient = useQueryClient();

    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: initialSortCol,
        direction: initialSortDir as "asc" | "desc",
    });

    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle(title));
    }, [dispatch, title]);

    // Handle column visibility changes
    const handleColumnVisibilityChange = (
        updatedColumns: ColumnConfig<T>[]
    ) => {
        setColumns(updatedColumns);
    };

    // Update URL search params when state changes
    useEffect(() => {
        const params = new URLSearchParams(searchParams);

        if (search) {
            params.set(`${title}_search`, search);
        } else {
            params.delete(`${title}_search`);
        }

        params.set(`${title}_page`, String(page));
        params.set(`${title}_pageSize`, String(pageSize));
        params.set(`${title}_sortCol`, sortStatus.columnAccessor);
        params.set(`${title}_sortDir`, sortStatus.direction);

        setSearchParams(params);
    }, [search, page, pageSize, sortStatus, title, setSearchParams]);

    // Reset to first page when page size or search changes
    useEffect(() => {
        setPage(1);
    }, [pageSize, search]);

    // Handle data fetching with all dynamic parameters
    const { data, isLoading, error } = useFetchTableData<T>({
        title,
        fetchData,
        query,
        currentPage: page,
        rowsPerPage: pageSize,
        search,
        searchFields,
        sortBy: { [sortStatus.columnAccessor]: sortStatus.direction },
        sortDirection: sortStatus.direction,
    });

    // Refresh data when needed
    const refreshData = () => {
        queryClient.invalidateQueries({ queryKey: [title] });
    };

    // Extract IDs from selected records
    const getSelectedIds = (): number[] => {
        return selectedRecords.map((record) => getRecordId(record));
    };

    // Handle action execution
    const handleActionClick = (action: BulkAction) => {
        const selectedIds = getSelectedIds();
        action.onClick(selectedIds);
        // Optionally clear selection after action
        setSelectedRecords([]);
    };

    // Handle selection of rows
    const handleSelectedRecordsChange = (records: T[]) => {
        setSelectedRecords(records);
        if (onSelectionChange) {
            onSelectionChange(records);
        }
    };

    // Custom pagination and sorting handlers
    const handlePageChange = (p: number) => {
        setPage(p);
    };

    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
    };

    const handleSortStatusChange = (status: DataTableSortStatus) => {
        setSortStatus(status);
    };

    const handleSearchChange = (value: string) => {
        setSearch(value);
    };

    // Convert column configs to Mantine columns
    const mantineColumns = columns.map((column: ColumnConfig<T>) =>
        createColumn(column)
    );

    // Filter actions based on visibility condition
    const visibleBulkActions = bulkActions.filter(
        (action) =>
            !action.isVisible || action.isVisible(selectedRecords.length)
    );

    return (
        <div
            className={clsx(
                "panel px-0 border-white-light dark:border-[#1b2e4b]",
                className
            )}
        >
            <div className="invoice-table">
                <div className="mb-4.5 px-5 flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold dark:text-white-light">
                            {title}
                        </h3>
                        <div className="flex items-center gap-2">{buttons}</div>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                            {selectedRecords.length > 0 && (
                                <span className="text-info font-medium">
                                    {selectedRecords.length} item
                                    {selectedRecords.length !== 1
                                        ? "s"
                                        : ""}{" "}
                                    selected
                                </span>
                            )}

                            {/* Table action buttons group */}
                            <div className="flex items-center gap-2">
                                {/* Column visibility toggle button - moved here */}
                                {columnToggle && (
                                    <ColumnVisibilityToggle
                                        columns={columns}
                                        onChange={handleColumnVisibilityChange}
                                    />
                                )}

                                {/* Export button - moved here */}
                                {exportable?.enabled && data?.data && (
                                    <ExportMenu
                                        data={data.data}
                                        columns={columns}
                                        title={title}
                                        filename={exportable.name}
                                    />
                                )}

                                {/* Refresh button - moved after Export */}
                                <Tooltip
                                    label="Refresh"
                                    position="top"
                                    withArrow
                                >
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        color="blue"
                                        className="px-3 py-1.5 transition-colors duration-300 hover:bg-blue-50 dark:hover:bg-blue-900"
                                        onClick={refreshData}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                        }}
                                    >
                                        <IconRefresh size={16} />
                                    </Button>
                                </Tooltip>

                                {/* Bulk action buttons */}
                                {selectedRecords.length > 0 &&
                                    visibleBulkActions.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            {visibleBulkActions.map(
                                                (action, index) => (
                                                    <Tooltip
                                                        key={index}
                                                        label={action.label}
                                                        position="top"
                                                        withArrow
                                                    >
                                                        <Button
                                                            variant={
                                                                action.variant ||
                                                                "outline"
                                                            }
                                                            color={
                                                                action.color ||
                                                                "blue"
                                                            }
                                                            onClick={() =>
                                                                handleActionClick(
                                                                    action
                                                                )
                                                            }
                                                            size="sm"
                                                            className="p-2 rounded-md"
                                                            styles={{
                                                                root: {
                                                                    display:
                                                                        "flex",
                                                                    alignItems:
                                                                        "center",
                                                                    justifyContent:
                                                                        "center",
                                                                    minWidth:
                                                                        "auto",
                                                                    border: "1px solid",
                                                                    borderColor:
                                                                        action.color ===
                                                                        "red"
                                                                            ? "var(--mantine-color-red-6)"
                                                                            : action.color ===
                                                                              "blue"
                                                                            ? "var(--mantine-color-blue-6)"
                                                                            : "var(--mantine-color-gray-6)",
                                                                },
                                                                inner: {
                                                                    display:
                                                                        "flex",
                                                                    margin: 0,
                                                                    padding: 0,
                                                                },
                                                            }}
                                                        >
                                                            {action.icon}
                                                        </Button>
                                                    </Tooltip>
                                                )
                                            )}
                                        </div>
                                    )}
                            </div>
                        </div>

                        {searchable && (
                            <div>
                                <DebouncedInput
                                    value={search}
                                    onChange={handleSearchChange}
                                    placeholder="Search..."
                                    debounceTimeout={500}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="datatables pagination-padding">
                    <DataTable
                        className={clsx(
                            "whitespace-nowrap table-hover invoice-table",
                            className
                        )}
                        records={data?.data || []}
                        columns={mantineColumns}
                        highlightOnHover
                        totalRecords={data?.total || 0}
                        recordsPerPage={pageSize}
                        page={page}
                        onPageChange={handlePageChange}
                        recordsPerPageOptions={PAGE_SIZES}
                        onRecordsPerPageChange={handlePageSizeChange}
                        sortStatus={sortStatus}
                        onSortStatusChange={handleSortStatusChange}
                        selectedRecords={
                            rowSelectionEnabled ? selectedRecords : []
                        }
                        onSelectedRecordsChange={
                            rowSelectionEnabled
                                ? handleSelectedRecordsChange
                                : undefined
                        }
                        paginationText={({ from, to, totalRecords }) =>
                            `Showing ${from} to ${to} of ${totalRecords} entries`
                        }
                        noRecordsText=""
                        minHeight={
                            data?.data?.length === 0 ||
                            data?.total === 0 ||
                            error
                                ? "calc(60vh - 100px)"
                                : undefined
                        }
                        emptyState={
                            <EmptyStateDisplay
                                message={
                                    error
                                        ? "An error occurred while retrieving data"
                                        : "No records found"
                                }
                                subMessage={
                                    error
                                        ? undefined
                                        : search
                                        ? "Try modifying your search criteria"
                                        : "No data available at the moment"
                                }
                                isError={!!error}
                                isLoading={isLoading}
                                onRetry={refreshData}
                                onClearFilters={() => handleSearchChange("")}
                                search={search}
                            />
                        }
                        fetching={isLoading}
                        idAccessor="id"
                    />
                </div>
            </div>
        </div>
    );
}

export default CustomDataTable;
