import { z } from "zod";

export interface ComboboxOption {
    value: string;
    label: string;
    data?: any;
}

export interface BulkCreateFormColumn<T> {
    key: keyof T;
    label: string;
    required?: boolean;
    type?: "text" | "textarea" | "number" | "select" | "date" | "combobox";
    options?: ComboboxOption[];
    fetchOptions?: (query: string) => Promise<ComboboxOption[]>;
    displayValue?: (value: string, options: ComboboxOption[]) => string;
}

export interface BulkCreateFormProps<T> {
    columns: BulkCreateFormColumn<T>[];
    bulkStore: (data: { entries: any[] }) => Promise<any>;
    onSuccess?: () => void;
    onClose: () => void;
    isOpen: boolean;
    title: string;
    initialData?: T[];
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
}

// Helper function to create schema from columns
export const createEntrySchema = <T>(columns: BulkCreateFormColumn<T>[]) => {
    const shape: Record<string, any> = {};

    columns.forEach((column) => {
        const key = String(column.key);
        if (column.required) {
            shape[key] = z.string().min(1, "This field is required");
        } else {
            shape[key] = z.string().optional();
        }
    });

    return z.object(shape);
};

export const createFormSchema = <T>(columns: BulkCreateFormColumn<T>[]) => {
    const entrySchema = createEntrySchema(columns);
    return z.object({
        entries: z.array(entrySchema).min(1),
    });
};

export type FormData<T> = z.infer<ReturnType<typeof createFormSchema<T>>>;
