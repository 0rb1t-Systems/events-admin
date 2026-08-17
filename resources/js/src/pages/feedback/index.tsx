import moment from "moment";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "../../components/Breadcrumb";
import DataTableWithSidebar from "../../components/DataTableWithSidebar";
import StatusFilterBar from "../../components/StatusFilterBar";
import { feedbackApi } from "../../services/feedback";
import { ColumnConfig } from "../../types/columns";
import { IEventFeedback } from "../../types/feedback";

const Stars = ({ rating }: { rating: number }) => {
    const n = Math.max(0, Math.min(5, Math.round(rating)));
    return (
        <span className="tracking-tight text-amber-500" title={`${n}/5`}>
            {"★".repeat(n)}
            <span className="text-gray-300 dark:text-gray-600">{"★".repeat(5 - n)}</span>
        </span>
    );
};

const FeedbackPage = () => {
    const navigate = useNavigate();
    const [visibilityFilter, setVisibilityFilter] = useState<string>("");

    const openDetail = (id: number) => navigate(`/feedback/${id}`);

    const columns: ColumnConfig<IEventFeedback>[] = [
        {
            accessor: "event",
            title: "Event",
            type: "custom",
            sortable: false,
            width: 200,
            render: (row) => (
                <span className="font-medium text-gray-900 dark:text-white">
                    {row.participation?.event?.title ?? "—"}
                </span>
            ),
        },
        {
            accessor: "participant",
            title: "Participant",
            type: "custom",
            sortable: false,
            width: 160,
            hideBelow: "lg",
            render: (row) => (
                <span className="text-gray-800 dark:text-white-light">
                    {row.participation?.user?.name ?? "—"}
                </span>
            ),
        },
        {
            accessor: "rating",
            title: "Rating",
            type: "custom",
            sortable: true,
            width: 120,
            render: ({ rating }) => <Stars rating={rating} />,
        },
        {
            accessor: "comment",
            title: "Comment",
            type: "custom",
            sortable: false,
            width: 240,
            hideBelow: "lg",
            render: ({ comment }) => (
                <span className="line-clamp-1 text-gray-700 dark:text-gray-200">
                    {comment
                        ? comment.length > 60
                            ? `${comment.slice(0, 60)}…`
                            : comment
                        : "—"}
                </span>
            ),
        },
        {
            accessor: "submitted_at",
            title: "Submitted",
            type: "date",
            sortable: true,
            width: 130,
            hideBelow: "lg",
            render: ({ submitted_at }) =>
                submitted_at ? moment(submitted_at).format("MMM DD, YYYY") : "—",
        },
        {
            accessor: "hidden",
            title: "Visibility",
            type: "custom",
            sortable: true,
            width: 110,
            render: ({ hidden }) => (
                <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                        hidden
                            ? "bg-warning/10 text-warning"
                            : "bg-success/10 text-success"
                    }`}
                >
                    {hidden ? "Hidden" : "Visible"}
                </span>
            ),
        },
        {
            accessor: "actions",
            title: "Actions",
            type: "actions",
            sortable: false,
            width: 96,
            textAlignment: "center",
            actions: [{ type: "view", onClick: (r) => openDetail(r.id) }],
        },
    ];

    const tableQuery: Record<string, string> = {};
    if (visibilityFilter === "hidden") tableQuery.hidden = "true";
    if (visibilityFilter === "visible") tableQuery.hidden = "false";

    return (
        <div>
            <Breadcrumb
                items={[
                    { title: "Dashboard", path: "/" },
                    { title: "Feedback" },
                ]}
            />

            <StatusFilterBar
                value={visibilityFilter}
                onChange={setVisibilityFilter}
                options={[
                    { value: "", label: "All" },
                    { value: "visible", label: "Visible" },
                    { value: "hidden", label: "Hidden" },
                ]}
            />

            <DataTableWithSidebar<IEventFeedback>
                title="Feedback"
                columns={columns}
                fetchData={(params) => feedbackApi.getAll(params)}
                searchFields={["comment"]}
                sortCol="submitted_at"
                query={tableQuery}
                rowSelectionEnabled={false}
                searchable
                className="mt-0"
                onRowClick={(r) => openDetail(r.id)}
            />
        </div>
    );
};

export default FeedbackPage;
