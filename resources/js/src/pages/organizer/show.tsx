import React from "react";
import { useParams } from "react-router-dom";
import DetailPageHeader from "../../components/DetailPageHeader";
import OrganizerDetail from "./components/OrganizerDetail";

const OrganizerShow = () => {
    const { id } = useParams();
    const organizerId = Number(id);

    if (!Number.isFinite(organizerId) || organizerId <= 0) {
        return <div className="p-4 text-sm text-red-500">Invalid organizer</div>;
    }

    return (
        <div>
            <DetailPageHeader
                backTo="/organizers"
                backLabel="Back to Organizers"
                crumbs={[
                    { title: "Dashboard", path: "/" },
                    { title: "Organizers", path: "/organizers" },
                    { title: `#${organizerId}` },
                ]}
            />
            <div className="panel">
                <OrganizerDetail organizerId={organizerId} />
            </div>
        </div>
    );
};

export default OrganizerShow;
