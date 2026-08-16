import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import React from "react";
import Loader from "../../../components/Loader";
import axiosInstance from "../../../utils/axios";

interface Props {
    eventId: number;
}

type Kind = "announcements" | "certificates" | "feedback" | "sponsors" | "speakers" | "sessions";

const fetchList = async (eventId: number, kind: Kind) => {
    const res = await axiosInstance.get(`/events/${eventId}/${kind}`);
    return res.data.data || res.data;
};

const EventAddOnOversight: React.FC<Props> = ({ eventId }) => {
    const announcements = useQuery({
        queryKey: ["event-announcements", eventId],
        queryFn: () => fetchList(eventId, "announcements"),
    });
    const certificates = useQuery({
        queryKey: ["event-certificates", eventId],
        queryFn: () => fetchList(eventId, "certificates"),
    });
    const feedback = useQuery({
        queryKey: ["event-feedback", eventId],
        queryFn: () => fetchList(eventId, "feedback"),
    });
    const sponsors = useQuery({
        queryKey: ["event-sponsors", eventId],
        queryFn: () => fetchList(eventId, "sponsors"),
    });
    const speakers = useQuery({
        queryKey: ["event-speakers", eventId],
        queryFn: () => fetchList(eventId, "speakers"),
    });
    const sessions = useQuery({
        queryKey: ["event-sessions", eventId],
        queryFn: () => fetchList(eventId, "sessions"),
    });

    const loading =
        announcements.isLoading ||
        certificates.isLoading ||
        feedback.isLoading ||
        sponsors.isLoading ||
        speakers.isLoading ||
        sessions.isLoading;

    if (loading) return <Loader />;

    const Section = ({
        title,
        children,
    }: {
        title: string;
        children: React.ReactNode;
    }) => (
        <div className="space-y-1.5">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {title}
            </h5>
            {children}
        </div>
    );

    const empty = (label: string) => (
        <p className="text-xs text-gray-500">No {label}</p>
    );

    return (
        <div className="space-y-4 text-xs">
            <Section title="Announcements">
                {(announcements.data?.announcements?.length ?? 0) === 0
                    ? empty("announcements")
                    : announcements.data!.announcements.map((a: any) => (
                          <div
                              key={a.id}
                              className="rounded border border-gray-100 px-2 py-1.5 dark:border-[#1b2e4b]"
                          >
                              <div className="font-medium text-gray-900 dark:text-white">
                                  {a.subject}
                              </div>
                              <div className="text-gray-500">
                                  {a.sent_at
                                      ? moment(a.sent_at).format("MMM DD, YYYY")
                                      : "not sent"}
                              </div>
                          </div>
                      ))}
            </Section>

            <Section title="Certificates">
                {(certificates.data?.certificates?.length ?? 0) === 0
                    ? empty("certificates")
                    : certificates.data!.certificates.map((c: any) => (
                          <div
                              key={c.id}
                              className="rounded border border-gray-100 px-2 py-1.5 dark:border-[#1b2e4b]"
                          >
                              <span className="font-medium">
                                  {c.participation?.user?.name ?? `P#${c.participation_id}`}
                              </span>
                              {" · "}
                              {c.issued_at
                                  ? moment(c.issued_at).format("MMM DD, YYYY")
                                  : "—"}
                              {c.verified ? " · verified" : ""}
                          </div>
                      ))}
            </Section>

            <Section title={`Feedback (avg ${feedback.data?.average_rating ?? "—"})`}>
                {(feedback.data?.feedback?.length ?? 0) === 0
                    ? empty("feedback")
                    : feedback.data!.feedback.map((f: any) => (
                          <div
                              key={f.id}
                              className="rounded border border-gray-100 px-2 py-1.5 dark:border-[#1b2e4b]"
                          >
                              <span className="font-medium">{f.rating}/5</span>
                              {f.comment ? ` — ${f.comment}` : ""}
                          </div>
                      ))}
            </Section>

            <Section title="Sponsors">
                {(sponsors.data?.sponsors?.length ?? 0) === 0
                    ? empty("sponsors")
                    : sponsors.data!.sponsors.map((s: any) => (
                          <div
                              key={s.id}
                              className="rounded border border-gray-100 px-2 py-1.5 dark:border-[#1b2e4b]"
                          >
                              <span className="font-medium">{s.name}</span>
                              {" · "}
                              <span className="capitalize">{s.tier}</span>
                          </div>
                      ))}
            </Section>

            <Section title="Speakers">
                {(speakers.data?.speakers?.length ?? 0) === 0
                    ? empty("speakers")
                    : speakers.data!.speakers.map((s: any) => (
                          <div
                              key={s.id}
                              className="rounded border border-gray-100 px-2 py-1.5 dark:border-[#1b2e4b]"
                          >
                              <span className="font-medium">{s.name}</span>
                              {s.title ? ` · ${s.title}` : ""}
                              {s.organization ? ` · ${s.organization}` : ""}
                          </div>
                      ))}
            </Section>

            <Section title="Sessions">
                {(sessions.data?.sessions?.length ?? 0) === 0
                    ? empty("sessions")
                    : sessions.data!.sessions.map((s: any) => (
                          <div
                              key={s.id}
                              className="rounded border border-gray-100 px-2 py-1.5 dark:border-[#1b2e4b]"
                          >
                              <div className="font-medium text-gray-900 dark:text-white">
                                  {s.title}
                              </div>
                              <div className="text-gray-500">
                                  {s.starts_at
                                      ? moment(s.starts_at).format("MMM DD HH:mm")
                                      : "—"}
                                  {s.room ? ` · ${s.room}` : ""}
                                  {s.speaker?.name ? ` · ${s.speaker.name}` : ""}
                              </div>
                          </div>
                      ))}
            </Section>
        </div>
    );
};

export default EventAddOnOversight;
