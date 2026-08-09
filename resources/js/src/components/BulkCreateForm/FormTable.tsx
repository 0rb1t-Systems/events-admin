import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Control, FieldArrayWithId, UseFormReturn } from "react-hook-form";
import FormField from "./FormField";
import { BulkCreateFormColumn, ComboboxOption, FormData } from "./types";

interface FormTableProps<T> {
    columns: BulkCreateFormColumn<T>[];
    fields: FieldArrayWithId<FormData<T>>[];
    comboboxOptions: Record<number, Record<string, ComboboxOption[]>>;
    handleComboboxSearch: (
        query: string,
        rowIndex: number,
        columnKey: string,
        fetchFn?: (query: string) => Promise<ComboboxOption[]>
    ) => void;
    form: UseFormReturn<FormData<T>>;
    handleAddRow: () => void;
    remove: (index: number) => void;
}

const FormTable = <T extends Record<string, any>>({
    columns,
    fields,
    comboboxOptions,
    handleComboboxSearch,
    form,
    handleAddRow,
    remove,
}: FormTableProps<T>) => {
    const {
        control,
        formState: { errors },
    } = form;

    return (
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="w-full table-auto">
                <TableHeader columns={columns} />
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {fields.map((field, index) => (
                        <TableRow
                            key={field.id}
                            field={field}
                            index={index}
                            columns={columns}
                            control={control}
                            errors={errors}
                            comboboxOptions={comboboxOptions}
                            handleComboboxSearch={handleComboboxSearch}
                            remove={remove}
                        />
                    ))}
                    <AddRowButton
                        columns={columns}
                        handleAddRow={handleAddRow}
                    />
                </tbody>
            </table>
        </div>
    );
};

interface TableHeaderProps<T> {
    columns: BulkCreateFormColumn<T>[];
}

const TableHeader = <T extends Record<string, any>>({
    columns,
}: TableHeaderProps<T>) => (
    <thead>
        <tr className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
            <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-300 text-xs uppercase tracking-wider w-14">
                #
            </th>
            {columns.map((column) => (
                <th
                    key={column.key.toString()}
                    className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-300 text-xs uppercase tracking-wider"
                >
                    {column.label}
                    {column.required && (
                        <span className="text-red-500 ml-1">*</span>
                    )}
                </th>
            ))}
            <th className="py-3 px-4 text-center font-medium text-gray-500 dark:text-gray-300 text-xs uppercase tracking-wider w-20">
                Actions
            </th>
        </tr>
    </thead>
);

interface TableRowProps<T> {
    field: FieldArrayWithId<FormData<T>>;
    index: number;
    columns: BulkCreateFormColumn<T>[];
    control: Control<FormData<T>>;
    errors: any;
    comboboxOptions: Record<number, Record<string, ComboboxOption[]>>;
    handleComboboxSearch: (
        query: string,
        rowIndex: number,
        columnKey: string,
        fetchFn?: (query: string) => Promise<ComboboxOption[]>
    ) => void;
    remove: (index: number) => void;
}

const TableRow = <T extends Record<string, any>>({
    field,
    index,
    columns,
    control,
    errors,
    comboboxOptions,
    handleComboboxSearch,
    remove,
}: TableRowProps<T>) => (
    <tr key={field.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
        <td className="p-3 text-gray-700 dark:text-gray-300 text-sm">
            {index + 1}
        </td>
        {columns.map((column) => (
            <td key={`${field.id}-${column.key.toString()}`} className="p-2">
                <FormField
                    column={column}
                    control={control}
                    index={index}
                    errors={errors}
                    comboboxOptions={
                        comboboxOptions[index]?.[String(column.key)] || []
                    }
                    onComboboxSearch={handleComboboxSearch}
                />
            </td>
        ))}
        <td className="p-2 text-center">
            <button
                type="button"
                className="inline-flex items-center justify-center w-8 h-8 text-red-500 hover:text-white bg-transparent hover:bg-red-500 rounded-md transition-colors"
                onClick={() => remove(index)}
                title="Remove row"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </td>
    </tr>
);

interface AddRowButtonProps<T> {
    columns: BulkCreateFormColumn<T>[];
    handleAddRow: () => void;
}

const AddRowButton = <T extends Record<string, any>>({
    columns,
    handleAddRow,
}: AddRowButtonProps<T>) => (
    <tr className="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700">
        <td colSpan={columns.length + 2} className="p-2">
            <button
                type="button"
                className="flex w-full items-center justify-center gap-1 px-3 py-1.5 font-medium text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white bg-transparent hover:bg-gray-100 dark:hover:bg-gray-600/50 rounded-sm transition-colors"
                onClick={handleAddRow}
            >
                <Plus className="w-4 h-4" />
                Add Row
            </button>
        </td>
    </tr>
);

export default FormTable;
