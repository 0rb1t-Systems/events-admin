import { Briefcase, CalendarDays, DollarSign, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Breadcrumb from "../../components/Breadcrumb";
import Loader from "../../components/Loader";
import { dashboardApi } from "../../services/dashboard";

const STATUS_ORDER = [
    "draft",
    "published",
    "registration_open",
    "sold_out",
    "registration_closed",
    "ongoing",
    "completed",
    "cancelled",
];

const formatStatus = (status: string) =>
    status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatMoney = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
        maximumFractionDigits: 2,
    }).format(amount);

const Dashboard = () => {
    const { t } = useTranslation();
    const { data, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: ["dashboard-stats"],
        queryFn: () => dashboardApi.getStats(),
    });

    const breadcrumbItems = [{ title: t("dashboard") }];

    if (isLoading) {
        return (
            <div>
                <Breadcrumb items={breadcrumbItems} />
                <div className="panel mt-5 flex min-h-[240px] items-center justify-center">
                    <Loader />
                </div>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div>
                <Breadcrumb items={breadcrumbItems} />
                <div className="panel mt-5 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    Failed to load dashboard stats.
                    <button
                        type="button"
                        className="btn btn-outline-primary mt-3 gap-2"
                        onClick={() => refetch()}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const cards = [
        {
            title: t("organizers"),
            value: data.total_organizers.toLocaleString(),
            icon: <Briefcase className="h-5 w-5" />,
            link: "/organizers",
            hint: "Total accounts",
        },
        {
            title: t("events"),
            value: data.total_events.toLocaleString(),
            icon: <CalendarDays className="h-5 w-5" />,
            link: "/events",
            hint: "All statuses",
        },
        {
            title: "Collected funds",
            value: formatMoney(data.total_collected_funds, data.currency),
            icon: <DollarSign className="h-5 w-5" />,
            link: "/payouts",
            hint: "Completed payments",
        },
        {
            title: "Pending payouts",
            value: data.pending_payout_requests.toLocaleString(),
            icon: <Wallet className="h-5 w-5" />,
            link: "/payouts",
            hint:
                data.approved_awaiting_payment > 0
                    ? `${data.approved_awaiting_payment} approved awaiting payment`
                    : "Requested status",
        },
    ];

    return (
        <div>
            <Breadcrumb items={breadcrumbItems} />
            <div className="mt-5 flex items-center justify-between gap-3">
                <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t("dashboard")}
                </h5>
                <button
                    type="button"
                    className="btn btn-outline-primary gap-2"
                    onClick={() => refetch()}
                    disabled={isFetching}
                >
                    Refresh
                </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <Link
                        key={card.title}
                        to={card.link}
                        className="panel block p-4 transition hover:border-primary/40"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    {card.title}
                                </p>
                                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                                    {card.value}
                                </p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {card.hint}
                                </p>
                            </div>
                            <div className="rounded-md bg-primary/10 p-2 text-primary">
                                {card.icon}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="panel mt-4 p-4">
                <h6 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Events by status
                </h6>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {STATUS_ORDER.map((status) => (
                        <div
                            key={status}
                            className="flex items-center justify-between rounded border border-gray-100 px-3 py-2 dark:border-gray-800"
                        >
                            <span className="text-sm text-gray-700 dark:text-gray-200">
                                {formatStatus(status)}
                            </span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {data.events_by_status[status] ?? 0}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
