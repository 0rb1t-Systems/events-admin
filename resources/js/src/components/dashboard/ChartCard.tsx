import React from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import Dropdown from "../Dropdown";
import { MoreHorizontal, Loader2 } from "lucide-react";

interface ChartCardProps {
    title: string;
    subtitle?: string;
    series: ApexOptions["series"];
    type:
        | "line"
        | "area"
        | "bar"
        | "pie"
        | "donut"
        | "radialBar"
        | "scatter"
        | "bubble"
        | "heatmap"
        | "treemap"
        | "boxPlot"
        | "candlestick"
        | "radar"
        | "polarArea"
        | "rangeBar"
        | "rangeArea";
    height?: number;
    options?: ApexOptions;
    showDropdown?: boolean;
    loading?: boolean;
    dropdownItems?: { label: string; onClick: () => void }[];
}

const ChartCard: React.FC<ChartCardProps> = ({
    title,
    subtitle,
    series,
    type,
    height = 350,
    options = {},
    showDropdown = false,
    loading = false,
    dropdownItems = [],
}) => {
    const defaultOptions: ApexOptions = {
        chart: {
            height: height,
            type: type,
            fontFamily: "Nunito, sans-serif",
            zoom: {
                enabled: false,
            },
            toolbar: {
                show: false,
            },
        },
        dataLabels: {
            enabled: false,
        },
        stroke: {
            curve: "smooth",
            width: 2,
        },
        colors: ["#4361ee", "#805dca", "#00ab55", "#e7515a"],
        ...options,
    };

    return (
        <div className="panel h-full bg-white dark:bg-black relative z-10">
            <div className="flex items-center justify-between dark:text-white-light mb-5">
                <div>
                    <h5 className="font-semibold text-lg">{title}</h5>
                    {subtitle && (
                        <p className="text-gray-500 text-sm">{subtitle}</p>
                    )}
                </div>
                {showDropdown && (
                    <div className="dropdown">
                        <Dropdown
                            offset={[0, 5]}
                            placement="bottom-end"
                            button={
                                <MoreHorizontal className="text-black/70 dark:text-white/70 hover:!text-primary" />
                            }
                        >
                            <ul>
                                {dropdownItems.map((item, index) => (
                                    <li key={index}>
                                        <button
                                            type="button"
                                            onClick={item.onClick}
                                        >
                                            {item.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </Dropdown>
                    </div>
                )}
            </div>
            <div className="relative">
                <div className="bg-white dark:bg-black rounded-lg overflow-hidden">
                    {loading ? (
                        <div
                            className={`min-h-[${height}px] grid place-content-center bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08]`}
                        >
                            <Loader2 className="animate-spin text-black dark:text-white w-5 h-5" />
                        </div>
                    ) : (
                        <ReactApexChart
                            series={series}
                            options={defaultOptions}
                            type={type}
                            height={height}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChartCard;
