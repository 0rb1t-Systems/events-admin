
export type ColumnType =
    | "text"
    | "number"
    | "date"
    | "boolean"
    | "custom"
    | "actions"
    | "status"
    | "toggle";

export type ActionType = "view" | "edit" | "delete" | "restore" | "permissions";

export interface ActionConfig<T = any> {
    type: ActionType;
    icon?: React.ReactNode;
    label?: string;
    onClick: (record: T) => void;
    show?: (record: T) => boolean;
    className?: string;
}

export interface StatusOption {
    value: string;
    label: string;
    color: string; // Color value like 'success', 'danger', 'warning', etc.
}

export interface BaseColumnConfig<T = any> {
    accessor: string;
    title: string;
    type?: ColumnType;
    sortable?: boolean;
    width?: number;
    textAlignment?: "left" | "center" | "right";
    hidden?: boolean;
    render?: (record: T) => React.ReactNode;
    // Export related properties
    skipExport?: boolean;
    format?: (value: any) => string;
}

export interface TextColumnConfig<T = any> extends BaseColumnConfig<T> {
    type: "text";
    truncate?: boolean;
    maxWidth?: number;
}

export interface NumberColumnConfig<T = any> extends BaseColumnConfig<T> {
    type: "number";
    format?: (value: number) => string;
}

export interface DateColumnConfig<T = any> extends BaseColumnConfig<T> {
    type: "date";
    format?: (date: Date) => string;
}

export interface BooleanColumnConfig<T = any> extends BaseColumnConfig<T> {
    type: "boolean";
    trueText?: string;
    falseText?: string;
}

export interface CustomColumnConfig<T = any> extends BaseColumnConfig<T> {
    type: "custom";
    render: (record: T) => React.ReactNode;
}

export interface StatusColumnConfig<T = any> extends BaseColumnConfig<T> {
    type: "status";
    options?: StatusOption[];
    valueAccessor?: (record: T) => {
        value: string;
        label: string;
        color: string;
    };
}

export interface ActionsColumnConfig<T = any> extends BaseColumnConfig<T> {
    type: "actions";
    actions: ActionConfig<T>[];
    defaultIcons?: boolean;
}

export interface ToggleColumnConfig<T = any> extends BaseColumnConfig<T> {
    type: "toggle";
    isLoading?: boolean;
    onChange: (record: T, newValue: boolean) => void;
}

export type ColumnConfig<T = any> =
    | TextColumnConfig<T>
    | NumberColumnConfig<T>
    | DateColumnConfig<T>
    | BooleanColumnConfig<T>
    | CustomColumnConfig<T>
    | ActionsColumnConfig<T>
    | StatusColumnConfig<T>
    | ToggleColumnConfig<T>;
