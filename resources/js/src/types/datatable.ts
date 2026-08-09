import { IApiResponse, IQueryParams } from "./index";
import { ColumnConfig } from "./columns";
import { BulkAction } from "../components/datatable/index";

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
