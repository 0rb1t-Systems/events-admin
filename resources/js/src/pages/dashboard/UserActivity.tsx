import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { IRootState } from "../../store";
import { setPageTitle } from "../../store/themeConfigSlice";
import ChartCard from "../../components/dashboard/ChartCard";
import { User, BookText } from "lucide-react";
import dashboardService from "../../services/dashboard";
import { UserActivity as IUserActivity } from "../../services/dashboard";
import { ApexOptions } from "apexcharts";

const UserActivity = () => {
    const dispatch = useDispatch();
    const isRtl =
        useSelector((state: IRootState) => state.themeConfig.rtlClass) === "rtl"
            ? true
            : false;
    const isDark = useSelector(
        (state: IRootState) =>
            state.themeConfig.theme === "dark" || state.themeConfig.isDarkMode
    );

    // Initialize state
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<IUserActivity>({
        top_contributors: [],
        user_registrations: {
            labels: [],
            data: [],
        },
    });

    useEffect(() => {
        dispatch(setPageTitle("User Activity"));
        fetchUserActivityData();
    }, []);

    const fetchUserActivityData = async () => {
        try {
            setLoading(true);
            const data = await dashboardService.getUserActivity();
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch user activity data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Prepare chart data for user registrations
    const userRegistrationsOptions: ApexOptions = {
        chart: {
            height: 350,
            type: "line" as const,
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
            show: true,
            curve: "smooth" as const,
            width: 2,
            lineCap: "square" as const,
        },
        colors: isDark ? ["#2196F3"] : ["#1B55E2"],
        labels: stats.user_registrations.labels,
        xaxis: {
            axisBorder: {
                show: false,
            },
            axisTicks: {
                show: false,
            },
            crosshairs: {
                show: true,
            },
            labels: {
                offsetX: isRtl ? 2 : 0,
                offsetY: 5,
                style: {
                    fontSize: "12px",
                    cssClass: "apexcharts-xaxis-title",
                },
            },
        },
        yaxis: {
            tickAmount: 5,
            labels: {
                formatter: (value: number) => {
                    return Math.round(value).toString();
                },
                offsetX: isRtl ? -30 : -10,
                offsetY: 0,
                style: {
                    fontSize: "12px",
                    cssClass: "apexcharts-yaxis-title",
                },
            },
            opposite: isRtl ? true : false,
        },
        grid: {
            borderColor: isDark ? "#191E3A" : "#E0E6ED",
            strokeDashArray: 5,
            xaxis: {
                lines: {
                    show: true,
                },
            },
            yaxis: {
                lines: {
                    show: false,
                },
            },
            padding: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
            },
        },
        tooltip: {
            marker: {
                show: true,
            },
            x: {
                show: false,
            },
        },
    };

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link to="/" className="text-primary hover:underline">
                        Dashboard
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>User Activity</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="grid xl:grid-cols-1 gap-6 mb-6">
                    <div className="panel h-full">
                        <ChartCard
                            title="User Registrations"
                            subtitle="Monthly user registrations over the last year"
                            series={[
                                {
                                    name: "Users",
                                    data: stats.user_registrations.data,
                                },
                            ]}
                            type="line"
                            height={350}
                            options={userRegistrationsOptions}
                            loading={loading}
                        />
                    </div>
                </div>

                <div className="panel h-full w-full">
                    <div className="flex items-center justify-between mb-5">
                        <h5 className="font-semibold text-lg dark:text-white-light">
                            Top Contributors
                        </h5>
                    </div>
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th className="ltr:rounded-l-md rtl:rounded-r-md">
                                        User
                                    </th>
                                    <th>Email</th>
                                    <th>Words Contributed</th>
                                    <th className="ltr:rounded-r-md rtl:rounded-l-md">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.top_contributors.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="text-white-dark hover:text-black dark:hover:text-white-light/90 group"
                                    >
                                        <td className="min-w-[150px] text-black dark:text-white">
                                            <div className="flex items-center">
                                                <span className="w-8 h-8 rounded-md bg-primary-light dark:bg-primary text-primary dark:text-primary-light ltr:mr-3 rtl:ml-3 flex items-center justify-center">
                                                    <User className="w-5 h-5" />
                                                </span>
                                                <span className="whitespace-nowrap">
                                                    {user.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td>{user.email}</td>
                                        <td>
                                            <div className="flex items-center">
                                                <span className="w-4 h-4 rounded-full bg-success-light dark:bg-success text-success dark:text-success-light ltr:mr-2 rtl:ml-2 flex items-center justify-center">
                                                    <BookText className="w-3 h-3" />
                                                </span>
                                                <span>
                                                    {user.word_entries_count}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <Link
                                                to={`/users/${user.id}`}
                                                className="btn btn-sm btn-outline-primary"
                                            >
                                                View Profile
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserActivity;
