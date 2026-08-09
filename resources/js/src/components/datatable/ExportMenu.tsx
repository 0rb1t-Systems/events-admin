import React from "react";
import { Menu, Button, Text, Group } from "@mantine/core";
import { Download, FileSpreadsheet, FileText, FileDown } from "lucide-react";
import { ColumnConfig } from "../../types/columns";
import { exportData } from "../../utils/export";

interface ExportMenuProps<T> {
    data: T[];
    columns: ColumnConfig<T>[];
    title: string;
    filename: string;
}

function ExportMenu<T>({ data, columns, title, filename }: ExportMenuProps<T>) {
    const handleExport = (format: "csv" | "excel" | "pdf") => {
        // Special handling for PDF
        if (format === "pdf") {
            try {
                // Call exportData with specific PDF settings
                exportData(data, columns, {
                    filename,
                    format,
                    title,
                    pdf: {
                        orientation: "landscape",
                        pageSize: "A4",
                    },
                });
            } catch (error) {
                console.error("PDF export failed:", error);
                // Fallback to CSV if PDF fails
                exportData(data, columns, {
                    filename: `${filename}-fallback`,
                    format: "csv",
                    title,
                });
            }
        } else {
            // Regular export for other formats
            exportData(data, columns, {
                filename,
                format,
                title,
            });
        }
    };

    return (
        <Menu
            shadow="md"
            width={300}
            position="bottom-end"
            radius="md"
            closeOnItemClick={true}
        >
            <Menu.Target>
                <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Download size={16} />}
                    radius="md"
                    color="green"
                    className="px-3 py-1.5 transition-colors duration-300 hover:bg-green-50"
                >
                    Export
                </Button>
            </Menu.Target>

            <Menu.Dropdown className="bg-white p-0 rounded-lg shadow-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                <div className="px-4 py-3 bg-green-50 border-b border-green-100 dark:bg-green-900/50 dark:border-green-900">
                    <Text
                        size="sm"
                        weight={600}
                        className="text-green-700 dark:text-green-200"
                    >
                        Export Options
                    </Text>
                    <Text size="xs" color="dimmed" className="mt-1">
                        Download {data.length} records
                    </Text>
                </div>

                <div>
                    <div
                        className="py-3 px-4 hover:bg-blue-50 transition-colors cursor-pointer flex items-center dark:hover:bg-blue-900/50"
                        onClick={() => handleExport("csv")}
                    >
                        <div className="bg-blue-100 p-2 rounded-md dark:bg-blue-900/50">
                            <FileText size={18} className="text-blue-600" />
                        </div>
                        <Text size="sm" weight={500} className="ml-3">
                            CSV
                        </Text>
                    </div>

                    <div
                        className="py-3 px-4 hover:bg-green-50 transition-colors cursor-pointer flex items-center dark:hover:bg-green-900/50"
                        onClick={() => handleExport("excel")}
                    >
                        <div className="bg-green-100 p-2 rounded-md dark:bg-green-900/50">
                            <FileSpreadsheet
                                size={18}
                                className="text-green-600"
                            />
                        </div>
                        <Text size="sm" weight={500} className="ml-3">
                            Excel
                        </Text>
                    </div>

                    <div
                        className="py-3 px-4 hover:bg-red-50 transition-colors cursor-pointer flex items-center dark:hover:bg-red-900/50"
                        onClick={() => handleExport("pdf")}
                    >
                        <div className="bg-red-100 p-2 rounded-md dark:bg-red-900/50">
                            <FileDown size={18} className="text-red-600" />
                        </div>
                        <Text size="sm" weight={500} className="ml-3">
                            PDF
                        </Text>
                    </div>
                </div>
            </Menu.Dropdown>
        </Menu>
    );
}

export default ExportMenu;
