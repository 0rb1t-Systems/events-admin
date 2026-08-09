import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormTable from "./FormTable";
import FormActions from "./FormActions";
import {
    BulkCreateFormProps,
    ComboboxOption,
    createFormSchema,
    FormData,
} from "./types";

const BulkCreateFormContent = <T extends Record<string, any>>(
    props: BulkCreateFormProps<T>
) => {
    const { columns, bulkStore, onSuccess, onClose, initialData = [] } = props;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [optionsCache, setOptionsCache] = useState<
        Record<string, ComboboxOption[]>
    >({});

    // Cache for storing options for combobox fields by row and field
    const [comboboxOptions, setComboboxOptions] = useState<
        Record<number, Record<string, ComboboxOption[]>>
    >({});

    // Create form schema from columns
    const formSchema = createFormSchema(columns);

    const form = useForm<FormData<T>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            entries:
                initialData.length > 0
                    ? initialData.map((item) => {
                          const entry: Record<string, any> = {};
                          columns.forEach((col) => {
                              entry[String(col.key)] = item[col.key] || "";
                          });
                          return entry;
                      })
                    : Array(5)
                          .fill(null)
                          .map(() => {
                              const entry: Record<string, any> = {};
                              columns.forEach((col) => {
                                  entry[String(col.key)] = "";
                              });
                              return entry;
                          }),
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "entries",
    });

    const handleAddRow = () => {
        const newEntry: Record<string, any> = {};
        columns.forEach((column) => {
            newEntry[String(column.key)] = "";
        });
        append(newEntry);
    };

    // Handle search for combobox fields
    const handleComboboxSearch = async (
        query: string,
        rowIndex: number,
        columnKey: string,
        fetchFn?: (query: string) => Promise<ComboboxOption[]>
    ) => {
        if (!fetchFn) return;

        try {
            // Check the cache first
            const cacheKey = `${columnKey}-${query}`;
            if (optionsCache[cacheKey]) {
                setComboboxOptions((prev) => ({
                    ...prev,
                    [rowIndex]: {
                        ...prev[rowIndex],
                        [columnKey]: optionsCache[cacheKey],
                    },
                }));
                return;
            }

            // Fetch new options
            const options = await fetchFn(query);

            // Update the cache
            setOptionsCache((prev) => ({
                ...prev,
                [cacheKey]: options,
            }));

            // Update the state for this specific row and column
            setComboboxOptions((prev) => ({
                ...prev,
                [rowIndex]: {
                    ...prev[rowIndex],
                    [columnKey]: options,
                },
            }));
        } catch (error) {
            console.error("Error fetching options:", error);
        }
    };

    const handleFormSubmit = async (data: FormData<T>) => {
        setIsSubmitting(true);
        try {
            // Call the bulkStore function directly with the form data
            await bulkStore(data);

            // Show success message
            toast.success("Entries created successfully");

            // Call the success callback if provided
            if (onSuccess) {
                onSuccess();
            }

            // Close the modal
            onClose();
        } catch (error: any) {
            console.error("Submission error:", error);

            // Handle various error formats
            const apiErrors =
                error.response?.data?.errors || error.errors || {};

            // Process each error and map to form fields
            let hasSetErrors = false;

            Object.entries(apiErrors).forEach(([key, messages]) => {
                // Check if the error key follows the pattern "entries.{index}.{field}" or "{index}.{field}"
                const matches =
                    key.match(/entries\.(\d+)\.(\w+)/) ||
                    key.match(/^(\d+)\.(\w+)/);
                if (matches) {
                    const [, indexStr, field] = matches;
                    const index = parseInt(indexStr, 10);
                    const message = Array.isArray(messages)
                        ? messages[0]
                        : messages;

                    // Clean up the error message for display
                    let cleanMessage = String(message);

                    // Handle specific message patterns
                    if (cleanMessage.includes("has already been taken")) {
                        cleanMessage = "This field already exists";
                    } else if (cleanMessage.includes("has a duplicate value")) {
                        cleanMessage = "This field has a duplicate value";
                    } else if (cleanMessage.includes("is required")) {
                        cleanMessage = "This field is required";
                    } else if (
                        cleanMessage.match(/The entries\.\d+\.\w+ field/)
                    ) {
                        // Replace standard Laravel pattern with simpler message
                        cleanMessage = cleanMessage.replace(
                            /The entries\.\d+\.\w+ field/,
                            "This field"
                        );
                    } else if (
                        cleanMessage.match(
                            /The selected entries\.\d+\.\w+ is invalid/
                        )
                    ) {
                        // Make parent_id error more user-friendly
                        cleanMessage = cleanMessage.replace(
                            /The selected entries\.\d+\.(\w+) is invalid/,
                            "The selected $1 is invalid"
                        );
                    }

                    // Set the error on the specific field
                    form.setError(`entries.${index}.${field}` as any, {
                        type: "server",
                        message: cleanMessage,
                    });

                    hasSetErrors = true;
                }
            });

            // If no specific field errors were set, show a generic error
            if (!hasSetErrors) {
                toast.error(error.message || "Failed to create entries");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Initialize the combobox options with any static options
    useEffect(() => {
        const initialComboboxState: Record<
            number,
            Record<string, ComboboxOption[]>
        > = {};

        fields.forEach((field, rowIndex) => {
            initialComboboxState[rowIndex] = {};

            columns.forEach((column) => {
                if (column.type === "combobox" && column.options) {
                    initialComboboxState[rowIndex][String(column.key)] =
                        column.options;
                }
            });
        });

        setComboboxOptions(initialComboboxState);
    }, [fields, columns]);

    return (
        <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="space-y-6"
        >
            <FormTable
                columns={columns}
                fields={fields}
                comboboxOptions={comboboxOptions}
                handleComboboxSearch={handleComboboxSearch}
                form={form}
                handleAddRow={handleAddRow}
                remove={remove}
            />
            <FormActions
                onClose={onClose}
                isSubmitting={isSubmitting}
                hasEntries={fields.length > 0}
            />
        </form>
    );
};

export default BulkCreateFormContent;
