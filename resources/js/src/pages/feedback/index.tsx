import moment from "moment";
import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Breadcrumb from "../../components/Breadcrumb";
import DataTableWithSidebar from "../../components/DataTableWithSidebar";
import { useSidebarDetail } from "../../hooks";
import { feedbackApi } from "../../services/feedback";
import { ColumnConfig } from "../../types/columns";
import { IEventFeedback } from "../../types/feedback";
import FeedbackDetail from "./components/FeedbackDetail";

const Stars = ({ rating }: { rating: number }) => {
    const n = Math.max(0, Math.min(5, Math.round(rating)));
    return (
        <span className="text-xs tracking-tight text-amber-500" title={`${n}/5`}>
            {"★".repeat(n)}
            <span className="text-gray-300 dark:text-gray-600">{"★".repeat(5 - n)}</span>
        </span>
    );
};

const FeedbackPage = () => {
    const queryClient = useQueryClient();
    const { selectedId, showSidebar, openSidebar, closeSidebar } = useSidebarDetail();
    const [visibilityFilter, setVisibilityFilter] = useState<string>("");

    const columns: ColumnConfig<IEventFeedback>[] = [
        {
            accessor: "event",
            title: "Event",
            type: "custom",
            sortable: false,
            render: (row) => (
                <span className="font-medium">
                    {row.participation?.event?.title ?? "—"}
                </span>
            ),
        },
        {
            accessor: "participant",
            title: "Participant",
            type: "custom",
            sortable: false,
            width: 140,
            render: (row) => (
                <span className="text-xs">{row.participation?.user?.name ?? "—"}</span>
            ),
        },
        {
            accessor: "rating",
            title: "Rating",
            type: "custom",
            sortable: true,
            width: 110,
            render: ({ rating }) => <Stars rating={rating} />,
        },
        {
            accessor: "comment",
            title: "Comment",
            type: "custom",
            sortable: false,
            render: ({ comment }) => (
                <span className="line-clamp-1 text-xs text-gray-600 dark:text-gray-300">
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
            width: 120,
            render: ({ submitted_at }) =>
                submitted_at ? moment(submitted_at).format("MMM DD, YYYY") : "—",
        },
        {
            accessor: "hidden",
            title: "Visibility",
            type: "custom",
            sortable: true,
            width: 90,
            render: ({ hidden }) => (
                <span
                    className={`badge ${
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
            textAlignment: "center",
            actions: [{ type: "view", onClick: (r) => openSidebar(r.id) }],
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

            <DataTableWithSidebar<IEventFeedback>
                title="Feedback"
                columns={columns}
                fetchData={(params) => feedbackApi.getAll(params)}
                searchFields={["comment"]}
                sortCol="submitted_at"
                query={tableQuery}
                rowSelectionEnabled={false}
                searchable
                className="mt-5"
                buttons={
                    <select
                        className="form-select w-auto text-xs"
                        value={visibilityFilter}
                        onChange={(e) => setVisibilityFilter(e.target.value)}
                    >
                        <option value="">All visibility</option>
                        <option value="visible">Visible</option>
                        <option value="hidden">Hidden</option>
                    </select>
                }
                showSidebar={showSidebar}
                sidebarTitle="Feedback Detail"
                onCloseSidebar={closeSidebar}
                sidebarContent={
                    <FeedbackDetail
                        feedbackId={selectedId}
                        onVisibilityChanged={() => {
                            queryClient.invalidateQueries({
                                queryKey: ["Feedback"],
                            });
                        }}
                    />
                }
            />
        </div>
    );
};

export default FeedbackPage;
