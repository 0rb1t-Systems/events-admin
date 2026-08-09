import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import moment from "moment";
import { ColumnConfig } from "../types/columns";

/**
 * Formats a date value using Moment.js
 * @param value The date value to format
 * @returns Formatted date string in localized format (L)
 */
const formatDate = (value: any): string => {
    // Check if the value is already a Date object
    if (value instanceof Date) {
        return moment(value).format("L");
    }

    // If it's a string or timestamp that looks like a date, try to convert it
    if (value) {
        // Try to parse the date with moment
        const date = moment(value);
        // Check if date is valid
        if (date.isValid()) {
            return date.format("L");
        }
    }

    // If all else fails, return the original value as a string
    return String(value || "");
};

/**
 * Gets a displayable string value from a record based on column configuration
 * @param record The data record
 * @param column The column configuration
 * @param dateFormat Optional custom date format for date type columns
 * @returns Formatted string value
 */
const getDisplayValue = <T>(
    record: T,
    column: ColumnConfig<T>,
    dateFormat?: string
): string => {
    const value = record[column.accessor as keyof T];

    // Handle different types of values
    if (value === null || value === undefined) return "";

    if (column.type === "date" && value) {
        return formatDateWithFormat(value, dateFormat);
    }

    return String(value);
};

/**
 * Exports data to a CSV file
 * @param data Array of data records
 * @param columns Column configurations
 * @param filename Filename for the exported file
 * @param dateFormat Optional custom format for date values
 */
export const exportToCSV = <T>(
    data: T[],
    columns: ColumnConfig<T>[],
    filename: string,
    dateFormat?: string
): void => {
    try {
        // Filter visible columns
        const visibleColumns = columns.filter((col) => !col.hidden);

        // Create CSV header
        const header = visibleColumns.map((col) => col.title);

        // Create CSV rows
        const rows = data.map((record) =>
            visibleColumns.map((column) =>
                getDisplayValue(record, column, dateFormat)
            )
        );

        // Combine header and rows
        const csvContent = [
            header.join(","),
            ...rows.map((row) => row.join(",")),
        ].join("\n");

        // Create Blob and download file
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
        saveAs(blob, filename);
    } catch (error) {
        console.error("Error exporting CSV:", error);
    }
};

/**
 * Exports data to an Excel file
 * @param data Array of data records
 * @param columns Column configurations
 * @param filename Filename for the exported file
 * @param dateFormat Optional custom format for date values
 */
export const exportToExcel = <T>(
    data: T[],
    columns: ColumnConfig<T>[],
    filename: string,
    dateFormat?: string
): void => {
    try {
        // Filter visible columns
        const visibleColumns = columns.filter((col) => !col.hidden);

        // Create workbook data with headers as first row
        const wsData = [
            visibleColumns.map((col) => col.title),
            ...data.map((record) =>
                visibleColumns.map((column) =>
                    getDisplayValue(record, column, dateFormat)
                )
            ),
        ];

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Create workbook and append worksheet
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");

        // Generate and save Excel file
        XLSX.writeFile(wb, filename);
    } catch (error) {
        console.error("Error exporting Excel:", error);
    }
};

/**
 * Exports data to a PDF file
 * @param data Array of data records
 * @param columns Column configurations
 * @param filename Filename for the exported file
 * @param title Optional title for the PDF document
 * @param dateFormat Optional custom format for date values
 */
export const exportToPDF = <T>(
    data: T[],
    columns: ColumnConfig<T>[],
    filename: string,
    title?: string,
    dateFormat?: string
): void => {
    try {
        // Filter visible columns
        const visibleColumns = columns.filter((col) => !col.hidden);

        // Create PDF document
        const doc = new jsPDF();

        // Add title if provided
        if (title) {
            doc.text(title, 14, 10);
        }

        // Prepare data for autotable
        const tableColumn = visibleColumns.map((col) => col.title);
        const tableRows = data.map((record) =>
            visibleColumns.map((column) =>
                getDisplayValue(record, column, dateFormat)
            )
        );

        // Create table
        (doc as any).autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: title ? 20 : 10,
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [66, 139, 202] },
        });

        // Save the PDF
        doc.save(filename);
    } catch (error) {
        console.error("Error exporting PDF:", error);
    }
};

/**
 * Interface for export options
 */
interface ExportOptions {
    filename: string;
    format: "csv" | "excel" | "pdf";
    title?: string;
    dateFormat?: string; // Custom date format for Moment.js
    pdf?: {
        orientation?: "portrait" | "landscape";
        pageSize?: string;
    };
}

/**
 * Formats a date value using Moment.js with a custom format
 * @param value The date value to format
 * @param format Optional custom format string for Moment.js (defaults to 'L')
 * @returns Formatted date string
 */
const formatDateWithFormat = (value: any, format?: string): string => {
    if (value) {
        const date = moment(value);
        if (date.isValid()) {
            return date.format(format || "L");
        }
    }
    return String(value || "");
};

/**
 * Unified export function that handles multiple export formats
 * @param data Array of data records
 * @param columns Column configurations
 * @param options Export options including format, filename, and date formatting
 */
export function exportData<T>(
    data: T[],
    columns: ColumnConfig<T>[],
    options: ExportOptions
): void {
    // Use custom date format if provided
    const dateFormat = options.dateFormat;

    // Use legacy functions for basic formats
    if (options.format === "csv") {
        return exportToCSV(
            data,
            columns,
            `${options.filename}.csv`,
            dateFormat
        );
    } else if (options.format === "excel") {
        return exportToExcel(
            data,
            columns,
            `${options.filename}.xlsx`,
            dateFormat
        );
    } else if (options.format === "pdf" && !options.pdf) {
        // Use simple PDF export if no PDF options are specified
        return exportToPDF(
            data,
            columns,
            `${options.filename}.pdf`,
            options.title,
            dateFormat
        );
    }

    // Get visible columns
    const visibleColumns = columns.filter((col) => !col.hidden);

    // Prepare data for export
    const exportData = data.map((item) => {
        const row: Record<string, any> = {};
        visibleColumns.forEach((col) => {
            if (!col.skipExport) {
                // Handle getting value from the item
                let value;

                // For our data model, accessor is always a string
                if (typeof item === "object" && item !== null) {
                    const accessor = col.accessor as string;
                    value = (item as any)[accessor];

                    // Handle date values specifically
                    if (col.type === "date" && value) {
                        value = formatDateWithFormat(value, dateFormat);
                    }

                    // Use render function if available for custom columns
                    if (
                        value === undefined &&
                        col.render &&
                        typeof col.render === "function"
                    ) {
                        try {
                            const rendered = col.render(item as any);
                            // If render returns a string or number, use that
                            if (
                                typeof rendered === "string" ||
                                typeof rendered === "number"
                            ) {
                                value = rendered;
                            }
                        } catch (e) {
                            // Ignore render errors during export
                        }
                    }

                    // Format the value if a formatter is provided
                    if (
                        value !== undefined &&
                        col.format &&
                        typeof col.format === "function"
                    ) {
                        value = col.format(value);
                    }

                    row[col.title || accessor] = value;
                }
            }
        });
        return row;
    });

    // Advanced PDF export with custom options
    if (options.format === "pdf" && options.pdf) {
        try {
            // Use PDF export if jsPDF is available
            if (typeof jsPDF === "function") {
                // Initialize PDF
                const pdfOptions = options.pdf;
                const orientation = pdfOptions.orientation || "portrait";
                const pageSize = pdfOptions.pageSize || "a4";

                const doc = new jsPDF({
                    orientation: orientation as any,
                    unit: "mm",
                    format: pageSize,
                });

                // Add title if provided
                if (options.title) {
                    doc.setFontSize(14);
                    doc.text(options.title, 14, 15);
                    doc.setFontSize(10);
                }

                // Prepare table data - ensure all values are safe strings
                const headers = visibleColumns
                    .filter((col) => !col.skipExport)
                    .map((col) => col.title || String(col.accessor));

                const rows = exportData.map((item) =>
                    Object.values(item).map((value) =>
                        value === null || value === undefined
                            ? ""
                            : String(value)
                    )
                );

                // Add table to document
                (doc as any).autoTable({
                    head: [headers],
                    body: rows,
                    startY: options.title ? 20 : 10,
                    theme: "grid",
                    styles: { fontSize: 8, cellPadding: 2 },
                    headStyles: {
                        fillColor: [66, 135, 245],
                        textColor: [255, 255, 255],
                        fontStyle: "bold",
                    },
                });

                // Save PDF
                doc.save(`${options.filename}.pdf`);
            } else {
                // Fallback to CSV if jsPDF is not available
                console.warn("jsPDF not available, falling back to CSV export");
                const worksheet = XLSX.utils.json_to_sheet(exportData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(
                    workbook,
                    worksheet,
                    options.title || "Sheet1"
                );

                // Save as CSV with a note that it's a PDF fallback
                const filename = `${options.filename}-pdf-fallback.csv`;
                XLSX.writeFile(workbook, filename);

                // Show a browser alert about the fallback
                if (typeof window !== "undefined") {
                    window.alert(
                        "PDF export is not available. Data has been exported as CSV instead."
                    );
                }
            }
        } catch (error) {
            console.error("PDF export failed:", error);
            // Fall back to CSV if there's an error
            try {
                const worksheet = XLSX.utils.json_to_sheet(exportData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(
                    workbook,
                    worksheet,
                    options.title || "Sheet1"
                );
                XLSX.writeFile(
                    workbook,
                    `${options.filename}-error-fallback.csv`
                );

                if (typeof window !== "undefined") {
                    window.alert(
                        "PDF export failed. Data has been exported as CSV instead."
                    );
                }
            } catch (csvError) {
                console.error("CSV fallback also failed:", csvError);
            }
        }
    } else if (options.format !== "pdf") {
        throw new Error(`Unsupported export format: ${options.format}`);
    }
}
