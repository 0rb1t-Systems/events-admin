import React, { useState, useEffect } from "react";
import FileUpload from "../form/FileUpload";
import Spinner from "../Spinner";
import {
    Download,
    Upload,
    Plus,
    Info,
    CheckCircle2,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Trash2,
    X,
} from "lucide-react";
import * as XLSX from "xlsx";

export interface DataColumn<T> {
    key: keyof T;
    displayName: string;
    required?: boolean;
    render?: (value: any, item: T, onChange: (key: keyof T, value: any) => void) => React.ReactNode;
    width?: string;
}

export interface TemplateItem {
    [key: string]: any;
}

export interface UploadOptions {
    templateName: string;
    templateData: TemplateItem[];
    fileTypes: string; // e.g. ".xlsx,.xls,.csv"
    maxEntries?: number;
}

export interface UploadFailedEntry {
    key: string;
    reason: string;
}

export interface UploadResult<T> {
    total_uploaded: number;
    successful_inserts: number;
    failed_inserts: number;
    failed_entries: UploadFailedEntry[];
}

// Add a new interface for detailed error information
export interface UploadError {
    type: 'file-read' | 'file-parse' | 'validation' | 'empty' | 'unknown';
    message: string;
    details?: string;
}

interface BulkDataUploaderProps<T> {
    columns: DataColumn<T>[];
    uploadOptions: UploadOptions;
    keyField: keyof T;
    onSubmit: (data: T[]) => Promise<UploadResult<T>>;
    onCreateEntryFromRow: (row: any, index: number) => T;
    infoText?: React.ReactNode;
    editingGuideText?: React.ReactNode;
    uniqueKeyValidator?: (item: T, items: T[]) => string | null;
    processFailedEntry?: (failedEntry: UploadFailedEntry, originalEntries: T[]) => T;
    customTitle?: string;
}

const BulkDataUploader = <T extends Record<string, any>>({
    columns,
    uploadOptions,
    keyField,
    onSubmit,
    onCreateEntryFromRow,
    infoText,
    editingGuideText,
    uniqueKeyValidator,
    processFailedEntry,
    customTitle = "Bulk Data Upload",
}: BulkDataUploaderProps<T>) => {
    const [file, setFile] = useState<File | null>(null);
    const [entries, setEntries] = useState<T[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [previewMode, setPreviewMode] = useState<boolean>(false);
    const [error, setError] = useState<UploadError | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [uploadResults, setUploadResults] = useState<UploadResult<T> | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const handleFileChange = (file: File | null) => {
        setFile(file);
        setEntries([]);
        setPreviewMode(false);
        setError(null);
        setSuccess(null);
        setUploadResults(null);
        setCurrentPage(1);
    };

    const handleFileUpload = async () => {
        if (!file) {
            setError({
                type: 'empty',
                message: "Please select a file first"
            });
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    let workbook;
                    try {
                        workbook = XLSX.read(data, { type: "array" });
                    } catch (err: any) {
                        setError({
                            type: 'file-parse',
                            message: "Failed to parse file. Please ensure it is a valid Excel or CSV file.",
                            details: err.message || "Unknown parsing error"
                        });
                        setLoading(false);
                        return;
                    }

                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                        setError({
                            type: 'file-parse',
                            message: "No sheets found in the uploaded file.",
                        });
                        setLoading(false);
                        return;
                    }

                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    if (!worksheet) {
                        setError({
                            type: 'file-parse',
                            message: "The first sheet in the file could not be read.",
                        });
                        setLoading(false);
                        return;
                    }

                    // Use defval: '' to ensure all cells are read, even if empty
                    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                    if (json.length <= 1) {
                        setError({
                            type: 'empty',
                            message: "The Excel file is empty or contains no valid data. Please check your file."
                        });
                        setLoading(false);
                        return;
                    }

                    // Normalize header row: trim, lowercase, remove invisible characters
                    const rawHeaderRow = json[0] as string[];
                    const normalize = (str: string) => str ? str.trim().replace(/[\u200B-\u200D\uFEFF]/g, '').toLowerCase() : '';
                    const headerRow = rawHeaderRow.map(normalize);

                    // Get expected required columns (normalized)
                    const requiredColumns = columns.filter(c => c.required).map(c => normalize(c.displayName));
                    const allColumns = columns.map(c => normalize(c.displayName));

                    // Check for missing required columns
                    const missingColumns = requiredColumns.filter(col => !headerRow.includes(col));
                    if (missingColumns.length > 0) {
                        setError({
                            type: 'file-parse',
                            message: `Missing required column(s): ${missingColumns.join(', ')}`,
                            details: 'Please ensure your file includes all required columns.'
                        });
                        setLoading(false);
                        return;
                    }

                    // Optionally, warn about extra columns (not required for strict upload)
                    // const extraColumns = headerRow.filter(col => !allColumns.includes(col));

                    // Map Excel rows to our data format
                    const dataRows = json.slice(1);
                    const mappedData: T[] = dataRows.map((row: any, index) => {
                        // Skip empty rows
                        if (!row || row.length === 0 || !row[0]) {
                            return null;
                        }
                        // Create object where keys are normalized excel column headers and values are cell values
                        const rowData: Record<string, any> = {};
                        headerRow.forEach((header, colIndex) => {
                            if (header) {
                                // Find the original column definition for this header
                                const colDef = columns.find(c => normalize(c.displayName) === header);
                                if (colDef) {
                                    rowData[colDef.key as string] = row[colIndex];
                                }
                            }
                        });
                        return onCreateEntryFromRow(rowData, index);
                    }).filter(Boolean) as T[];

                    if (mappedData.length === 0) {
                        setError({
                            type: 'empty',
                            message: "No valid data rows found in the file. Please check your file."
                        });
                        setLoading(false);
                        return;
                    }

                    // Apply any validation if needed
                    if (uniqueKeyValidator) {
                        const entriesWithErrors = mappedData.map(entry => {
                            const error = uniqueKeyValidator(entry, mappedData);
                            return error ? { ...entry, error } : entry;
                        });
                        const hasErrors = entriesWithErrors.some(entry => 'error' in entry);
                        if (hasErrors) {
                            setError({
                                type: 'validation',
                                message: "Validation errors found in the data. Please fix and try again."
                            });
                            setLoading(false);
                            return;
                        }
                    }

                    setEntries(mappedData);
                    setPreviewMode(true);

                    // Adjust items per page based on the number of entries
                    if (mappedData.length > 100) {
                        setItemsPerPage(20);
                    } else if (mappedData.length > 50) {
                        setItemsPerPage(15);
                    } else {
                        setItemsPerPage(10);
                    }
                } catch (err: any) {
                    console.error("Error parsing Excel:", err);
                    setError({
                        type: 'file-parse',
                        message: "Failed to parse Excel file",
                        details: err.message || "Unknown parsing error"
                    });
                }
                setLoading(false);
            };

            reader.onerror = (event) => {
                console.error("FileReader error:", event);
                setError({
                    type: 'file-read',
                    message: "Error reading file",
                    details: "The file could not be read. It may be corrupted or in an unsupported format."
                });
                setLoading(false);
            };

            reader.readAsArrayBuffer(file);
        } catch (err: any) {
            console.error("Error uploading file:", err);
            setError({
                type: 'unknown',
                message: "An error occurred during file upload",
                details: err.message || "Unknown error"
            });
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        // Validate entries before submission
        const hasErrors = entries.some(entry => {
            return columns.some(column => {
                if (column.required && !entry[column.key]) {
                    return true;
                }
                return false;
            });
        });

        if (hasErrors) {
            setError({
                type: 'validation',
                message: "Please fill in all required fields"
            });
            return;
        }

        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const result = await onSubmit(entries);
            setUploadResults(result);

            if (result.failed_inserts > 0) {
                setError({
                    type: 'unknown',
                    message: `${result.failed_inserts} entries failed to upload. See details below.`
                });
                setPreviewMode(false);
            } else {
                setSuccess(
                    `Successfully imported ${result.successful_inserts} entries`
                );
                // On success, just keep the success message visible and hide other upload components
                setPreviewMode(false);
                setEntries([]);
                setFile(null);
            }
        } catch (err: any) {
            console.error("Error submitting data batch:", err);
            setError({
                type: 'unknown',
                message: "Failed to submit data entries",
                details: err.message || "Unknown error"
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditFailedEntries = () => {
        if (!uploadResults || uploadResults.failed_entries.length === 0 || !processFailedEntry) return;

        // Process failed entries
        const failedEntriesToEdit = uploadResults.failed_entries.map((failedEntry, index) => {
            return processFailedEntry(failedEntry, entries);
        });

        // Set these as the current entries and switch to preview mode for editing
        setEntries(failedEntriesToEdit);
        setPreviewMode(true);
        setError(null);
        setUploadResults(null);
    };

    const handleAddRow = () => {
        // Create a new empty entry with default values
        const newEntry = onCreateEntryFromRow({}, entries.length);
        setEntries([...entries, newEntry]);
    };

    const handleRemoveRow = (id: string | number) => {
        setEntries(entries.filter(entry => entry[keyField] !== id));
    };

    const handleUpdateRow = (id: string | number, field: keyof T, value: any) => {
        setEntries(
            entries.map(entry => {
                if (entry[keyField] === id) {
                    return { ...entry, [field]: value };
                }
                return entry;
            })
        );
    };

    const downloadTemplate = () => {
        try {
            // Convert template data to worksheet
            const worksheet = XLSX.utils.json_to_sheet(uploadOptions.templateData);

            // Create workbook and add worksheet
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

            // Generate Excel file
            XLSX.writeFile(workbook, uploadOptions.templateName);
        } catch (err) {
            console.error("Error downloading template:", err);
            setError({
                type: 'unknown',
                message: "Failed to download template",
                details: err instanceof Error ? err.message : "Unknown error"
            });
        }
    };

    // Pagination functions
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentEntries = entries.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(entries.length / itemsPerPage);

    const paginate = (pageNumber: number) => {
        if (pageNumber < 1) pageNumber = 1;
        if (pageNumber > totalPages) pageNumber = totalPages;
        setCurrentPage(pageNumber);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold dark:text-white">
                        {customTitle}
                    </h1>
                    <button
                        type="button"
                        className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-4 py-2 rounded-md border border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                        onClick={downloadTemplate}
                    >
                        <Download className="w-4 h-4" />
                        Download Template
                    </button>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg flex items-start gap-3 relative shadow-sm">
                        <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div className="flex flex-col flex-1">
                            <div className="font-semibold text-base">{error.message}</div>
                            {error.details && (
                                <div className="text-sm mt-1 text-red-600 dark:text-red-400">
                                    {error.details}
                                </div>
                            )}
                            {error.type === 'file-read' && (
                                <div className="text-sm mt-2">
                                    <p>Please try the following:</p>
                                    <ul className="list-disc pl-4 mt-1">
                                        <li>Check if the file is not corrupted</li>
                                        <li>Ensure the file is in a supported format ({uploadOptions.fileTypes})</li>
                                        <li>Try downloading the template and filling it with your data</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full bg-transparent hover:bg-red-100 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors border-none"
                            onClick={() => setError(null)}
                            title="Close"
                        >
                            <X className="w-5 h-5 text-red-500 dark:text-red-300" />
                            <span className="sr-only">Close</span>
                        </button>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 rounded-lg">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <div>{success}</div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                                onClick={() => {
                                    setSuccess(null);
                                    setUploadResults(null);
                                }}
                            >
                                Return to Upload
                            </button>
                        </div>
                    </div>
                )}

                {uploadResults && !success && (
                    <div className="mb-6 space-y-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2">
                                Upload Summary
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                                    <div className="text-sm text-blue-600 dark:text-blue-400">
                                        Total Processed
                                    </div>
                                    <div className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                                        {uploadResults.total_uploaded}
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                                    <div className="text-sm text-green-600 dark:text-green-400">
                                        Successfully Added
                                    </div>
                                    <div className="text-2xl font-bold text-green-800 dark:text-green-300">
                                        {uploadResults.successful_inserts}
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-red-100 dark:border-red-800">
                                    <div className="text-sm text-red-600 dark:text-red-400">
                                        Failed Entries
                                    </div>
                                    <div className="text-2xl font-bold text-red-800 dark:text-red-300">
                                        {uploadResults.failed_inserts}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {uploadResults.failed_entries.length > 0 && (
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg">
                                <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-2">
                                    Failed Entries ({uploadResults.failed_inserts})
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-amber-200 dark:divide-amber-700">
                                        <thead className="bg-amber-100 dark:bg-amber-800">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                                                    Item
                                                </th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                                                    Reason
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-700 divide-y divide-amber-200 dark:divide-amber-700">
                                            {uploadResults.failed_entries.map(
                                                (entry, index) => (
                                                    <tr
                                                        key={index}
                                                        className="hover:bg-amber-50 dark:hover:bg-amber-800/50"
                                                    >
                                                        <td className="px-4 py-2 text-sm text-amber-900 dark:text-amber-200 font-medium">
                                                            {entry.key}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-amber-900 dark:text-amber-200">
                                                            {entry.reason}
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {processFailedEntry && (
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            type="button"
                                            className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                                            onClick={handleEditFailedEntries}
                                        >
                                            Edit Failed Entries
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                type="button"
                                className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                                onClick={() => {
                                    setUploadResults(null);
                                    setError(null);
                                }}
                            >
                                Return to Upload
                            </button>
                        </div>
                    </div>
                )}

                {!previewMode && !success ? (
                    <>
                        {!uploadResults && !error ? (
                            <div className="space-y-6">
                                {infoText ? (
                                    <div className="p-6 bg-blue-50 dark:bg-blue-900/30 rounded-lg mb-6">
                                        <div className="flex items-start gap-3">
                                            <Info className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                            <div className="text-sm text-blue-700 dark:text-blue-300">
                                                {infoText}
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700/50">
                                    <FileUpload
                                        id="data-excel"
                                        label="Upload File"
                                        helpText={`Upload a file with the required columns (${columns.filter(c => c.required).map(c => c.displayName).join(', ')})`}
                                        accept={uploadOptions.fileTypes}
                                        onChange={handleFileChange}
                                        value={file}
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 bg-blue-600 dark:bg-blue-700 text-white px-5 py-2.5 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 transition-colors"
                                        onClick={handleFileUpload}
                                        disabled={!file || loading}
                                    >
                                        {loading ? (
                                            <>
                                                <Spinner className="w-4 h-4" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-4 h-4" />
                                                Preview Data
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </>
                ) : (
                    <div className="space-y-6">
                        {editingGuideText && (
                            <div className="p-6 bg-amber-50 dark:bg-amber-900/30 rounded-lg mb-6">
                                <div className="flex items-start gap-3">
                                    <Info className="w-5 h-5 text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                    <div className="text-sm text-amber-700 dark:text-amber-300">
                                        {editingGuideText}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-semibold dark:text-white">
                                    Preview and Edit Data
                                </h2>
                                <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                                    {entries.length} {entries.length === 1 ? "entry" : "entries"}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                                    onClick={() => setPreviewMode(false)}
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    className="flex items-center gap-2 bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 transition-colors"
                                    onClick={handleSubmit}
                                    disabled={submitting || entries.length === 0}
                                >
                                    {submitting ? (
                                        <>
                                            <Spinner className="w-4 h-4" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            Upload Data
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Data Table */}
                        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead>
                                    <tr className="bg-gray-100 dark:bg-gray-800">
                                        <th className="w-10 px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                                            #
                                        </th>
                                        {columns.map((column, index) => (
                                            <th
                                                key={index}
                                                className={`px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 ${column.width ? column.width : ''}`}
                                            >
                                                {column.displayName}
                                                {column.required && <span className="text-red-500 ml-1">*</span>}
                                            </th>
                                        ))}
                                        <th className="w-16 px-2 py-2 text-center font-medium text-gray-600 dark:text-gray-300">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                                    {currentEntries.map((entry, index) => (
                                        <tr
                                            key={entry[keyField]?.toString() || index}
                                            className="hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                        >
                                            <td className="w-10 px-3 py-2 text-center text-gray-500 dark:text-gray-400 text-sm border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                                {indexOfFirstItem + index + 1}
                                            </td>
                                            {columns.map((column, colIndex) => (
                                                <td key={colIndex} className="p-1 border-r border-gray-200 dark:border-gray-700">
                                                    {column.render ? (
                                                        column.render(
                                                            entry[column.key],
                                                            entry,
                                                            (key, value) => handleUpdateRow(entry[keyField], key, value)
                                                        )
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            className={`w-full px-3 py-1.5 border-0 dark:bg-gray-800 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 rounded-sm ${
                                                                column.required && !entry[column.key] ? 'border-red-500 bg-red-50 dark:bg-red-900/30' : ''
                                                            }`}
                                                            value={entry[column.key] || ''}
                                                            onChange={(e) =>
                                                                handleUpdateRow(
                                                                    entry[keyField],
                                                                    column.key,
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder={`Enter ${column.displayName.toLowerCase()}`}
                                                        />
                                                    )}
                                                </td>
                                            ))}
                                            <td className="w-16 px-2 text-center">
                                                <button
                                                    type="button"
                                                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                                    onClick={() =>
                                                        handleRemoveRow(entry[keyField])
                                                    }
                                                    title="Remove row"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination and Add Row */}
                        <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-4">
                            <button
                                type="button"
                                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium px-3 py-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                onClick={handleAddRow}
                            >
                                <Plus className="w-4 h-4" />
                                Add Row
                            </button>

                            {totalPages > 1 && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => paginate(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="p-1 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                                    >
                                        <ChevronLeft className="w-5 h-5 dark:text-gray-300" />
                                    </button>

                                    <div className="flex gap-1">
                                        {Array.from(
                                            { length: Math.min(5, totalPages) },
                                            (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (currentPage <= 3) {
                                                    pageNum = i + 1;
                                                } else if (currentPage >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + i;
                                                } else {
                                                    pageNum = currentPage - 2 + i;
                                                }

                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => paginate(pageNum)}
                                                        className={`w-8 h-8 rounded-md flex items-center justify-center ${
                                                            currentPage === pageNum
                                                                ? "bg-blue-500 text-white"
                                                                : "border border-gray-300 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            }
                                        )}
                                    </div>

                                    <button
                                        onClick={() => paginate(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="p-1 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                                    >
                                        <ChevronRight className="w-5 h-5 dark:text-gray-300" />
                                    </button>

                                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                                        Page {currentPage} of {totalPages}
                                    </span>

                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => {
                                            setItemsPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="ml-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-md px-2 py-1 text-sm"
                                    >
                                        <option value={10}>10 per page</option>
                                        <option value={15}>15 per page</option>
                                        <option value={20}>20 per page</option>
                                        <option value={50}>50 per page</option>
                                        <option value={100}>100 per page</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulkDataUploader;
