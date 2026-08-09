export interface BulkCreateColumn {
    key: string;
    label: string;
    type: "text" | "textarea" | "number" | "select" | "date";
    required?: boolean;
    options?: { value: string | number; label: string }[];
    placeholder?: string;
    validation?: {
        pattern?: string;
        message?: string;
    };
}
