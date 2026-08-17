import { useQueryClient } from "@tanstack/react-query";
import React from "react";
import { useParams } from "react-router-dom";
import DetailPageHeader from "../../components/DetailPageHeader";
import FeedbackDetail from "./components/FeedbackDetail";

const FeedbackShow = () => {
    const { id } = useParams();
    const queryClient = useQueryClient();
    const feedbackId = Number(id);

    if (!Number.isFinite(feedbackId) || feedbackId <= 0) {
        return <div className="p-4 text-sm text-red-500">Invalid feedback</div>;
    }

    return (
        <div>
            <DetailPageHeader
                backTo="/feedback"
                backLabel="Back to Feedback"
                crumbs={[
                    { title: "Dashboard", path: "/" },
                    { title: "Feedback", path: "/feedback" },
                    { title: `#${feedbackId}` },
                ]}
            />
            <div className="panel">
                <FeedbackDetail
                    feedbackId={feedbackId}
                    onVisibilityChanged={() => {
                        queryClient.invalidateQueries({ queryKey: ["Feedback"] });
                        queryClient.invalidateQueries({ queryKey: ["feedback", feedbackId] });
                    }}
                />
            </div>
        </div>
    );
};

export default FeedbackShow;
