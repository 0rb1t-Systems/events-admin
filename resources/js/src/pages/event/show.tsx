import { useQuery } from "@tanstack/react-query";
import React from "react";
import { useParams, useSearchParams } from "react-router-dom";
import DetailPageHeader from "../../components/DetailPageHeader";
import DetailTabs from "../../components/DetailTabs";
import Loader from "../../components/Loader";
import { eventApi } from "../../services/event";
import EventAddOnOversight from "./components/EventAddOnOversight";
import EventAnalyticsPanel from "./components/EventAnalyticsPanel";
import EventGalleryTab from "./components/EventGalleryTab";
import EventOverviewTab from "./components/EventOverviewTab";
import EventPaymentsPanel from "./components/EventPaymentsPanel";
import EventTicketTypesTab from "./components/EventTicketTypesTab";
import InvitationTemplatePreview from "./components/InvitationTemplatePreview";
import ParticipationOversight from "./components/ParticipationOversight";

const EVENT_TABS = [
    { id: "overview", label: "Overview" },
    { id: "ticket-types", label: "Ticket Types" },
    { id: "registrations", label: "Registrations" },
    { id: "payments", label: "Payments" },
    { id: "speakers", label: "Speakers" },
    { id: "sessions", label: "Sessions" },
    { id: "sponsors", label: "Sponsors" },
    { id: "announcements", label: "Announcements" },
    { id: "gallery", label: "Gallery" },
    { id: "invitation", label: "Invitation" },
    { id: "analytics", label: "Analytics" },
] as const;

type EventTabId = (typeof EVENT_TABS)[number]["id"];

const isEventTab = (value: string | null): value is EventTabId =>
    EVENT_TABS.some((tab) => tab.id === value);

const EventShow = () => {
    const { id } = useParams();
    const eventId = Number(id);
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get("tab");
    const active: EventTabId = isEventTab(tabParam) ? tabParam : "overview";

    const { data: event, isLoading } = useQuery({
        queryKey: ["event", eventId],
        queryFn: () => eventApi.getById(eventId),
        enabled: Number.isFinite(eventId) && eventId > 0,
    });

    const setTab = (next: string) => {
        const nextParams = new URLSearchParams(searchParams);
        if (next === "overview") {
            nextParams.delete("tab");
        } else {
            nextParams.set("tab", next);
        }
        setSearchParams(nextParams, { replace: true });
    };

    if (!Number.isFinite(eventId) || eventId <= 0) {
        return <div className="p-4 text-sm text-red-500">Invalid event</div>;
    }

    return (
        <div>
            <DetailPageHeader
                backTo="/events"
                backLabel="Back to Events"
                crumbs={[
                    { title: "Dashboard", path: "/" },
                    { title: "Events", path: "/events" },
                    { title: event?.title ?? (isLoading ? "…" : `#${eventId}`) },
                ]}
            />

            <div className="panel">
                <DetailTabs tabs={[...EVENT_TABS]} active={active} onChange={setTab} />

                {isLoading && active === "overview" ? (
                    <Loader />
                ) : (
                    <>
                        {active === "overview" && <EventOverviewTab eventId={eventId} />}
                        {active === "ticket-types" && <EventTicketTypesTab eventId={eventId} />}
                        {active === "registrations" && <ParticipationOversight eventId={eventId} />}
                        {active === "payments" && <EventPaymentsPanel eventId={eventId} />}
                        {active === "speakers" && (
                            <EventAddOnOversight eventId={eventId} only={["speakers"]} />
                        )}
                        {active === "sessions" && (
                            <EventAddOnOversight eventId={eventId} only={["sessions"]} />
                        )}
                        {active === "sponsors" && (
                            <EventAddOnOversight eventId={eventId} only={["sponsors"]} />
                        )}
                        {active === "announcements" && (
                            <EventAddOnOversight eventId={eventId} only={["announcements"]} />
                        )}
                        {active === "gallery" && <EventGalleryTab eventId={eventId} />}
                        {active === "invitation" && (
                            <InvitationTemplatePreview eventId={eventId} />
                        )}
                        {active === "analytics" && <EventAnalyticsPanel eventId={eventId} />}
                    </>
                )}
            </div>
        </div>
    );
};

export default EventShow;
