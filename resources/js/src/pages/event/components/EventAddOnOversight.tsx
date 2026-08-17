import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import GenericModal from "../../../components/GenericModal";
import Loader from "../../../components/Loader";
import SimpleAdminTable, { SimpleAdminTd } from "../../../components/SimpleAdminTable";
import FormInput from "../../../components/form/FormInput";
import FormSelect from "../../../components/form/FormSelect";
import { useConfirmDialog } from "../../../hooks";
import { eventApi } from "../../../services/event";
import { certificateApi } from "../../../services/certificate";
import { IEventSpeaker, IEventSponsor, IEventSession } from "../../../types/event";
import { statusBadgeClass } from "../../../utils/statusBadge";
import axiosInstance from "../../../utils/axios";

interface Props {
    eventId: number;
    /** When set, only those sections fetch and render (lazy event hub tabs). */
    only?: Kind[];
}

export type Kind = "announcements" | "certificates" | "feedback" | "sponsors" | "speakers" | "sessions";

const fetchList = async (eventId: number, kind: Kind) => {
    const res = await axiosInstance.get(`/events/${eventId}/${kind}`);
    return res.data.data || res.data;
};

// ── Section wrapper ──────────────────────────────────────────────────────────

const Section = ({
    title,
    action,
    children,
}: {
    title: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) => (
    <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
            <h5 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h5>
            {action}
        </div>
        {children}
    </div>
);

// ── Announcement form schema ─────────────────────────────────────────────────

const announcementSchema = z.object({
    subject: z.string().min(1, "Required"),
    body: z.string().min(1, "Required"),
});
type AnnouncementForm = z.infer<typeof announcementSchema>;

// ── Sponsor form schema ──────────────────────────────────────────────────────

const SPONSOR_TIERS = [
    { value: "platinum", label: "Platinum" },
    { value: "gold", label: "Gold" },
    { value: "silver", label: "Silver" },
    { value: "partner", label: "Partner" },
];

const sponsorSchema = z.object({
    name: z.string().min(1, "Required"),
    tier: z.enum(["platinum", "gold", "silver", "partner"]),
    sort_order: z.coerce.number().int().min(0).optional(),
});
type SponsorForm = z.infer<typeof sponsorSchema>;

// ── Speaker form schema ───────────────────────────────────────────────────────

const speakerSchema = z.object({
    name: z.string().min(1, "Required"),
    title: z.string().optional(),
    organization: z.string().optional(),
    bio: z.string().optional(),
});
type SpeakerForm = z.infer<typeof speakerSchema>;

// ── Session form schema ───────────────────────────────────────────────────────

const sessionSchema = z.object({
    title: z.string().min(1, "Required"),
    starts_at: z.string().optional().nullable(),
    ends_at: z.string().optional().nullable(),
    room: z.string().optional().nullable(),
    speaker_id: z.string().optional().nullable(),
});
type SessionForm = z.infer<typeof sessionSchema>;

// ── Main component ────────────────────────────────────────────────────────────

const EventAddOnOversight: React.FC<Props> = ({ eventId, only }) => {
    const queryClient = useQueryClient();
    const { confirmAction } = useConfirmDialog();
    const show = (kind: Kind) => !only || only.includes(kind);

    const invalidateKind = (kind: Kind) =>
        queryClient.invalidateQueries({ queryKey: [`event-${kind}`, eventId] });

    // ── Queries ──────────────────────────────────────────────────────────────

    const announcements = useQuery({
        queryKey: ["event-announcements", eventId],
        queryFn: () => fetchList(eventId, "announcements"),
        enabled: show("announcements"),
    });
    const certificates = useQuery({
        queryKey: ["event-certificates", eventId],
        queryFn: () => fetchList(eventId, "certificates"),
        enabled: show("certificates"),
    });
    const feedback = useQuery({
        queryKey: ["event-feedback", eventId],
        queryFn: () => fetchList(eventId, "feedback"),
        enabled: show("feedback"),
    });
    const sponsors = useQuery({
        queryKey: ["event-sponsors", eventId],
        queryFn: () => fetchList(eventId, "sponsors"),
        enabled: show("sponsors"),
    });
    const speakers = useQuery({
        queryKey: ["event-speakers", eventId],
        queryFn: () => fetchList(eventId, "speakers"),
        enabled: show("speakers"),
    });
    const sessions = useQuery({
        queryKey: ["event-sessions", eventId],
        queryFn: () => fetchList(eventId, "sessions"),
        enabled: show("sessions"),
    });

    // ── Modal state ───────────────────────────────────────────────────────────

    const [annModal, setAnnModal] = useState(false);
    const [sponsorModal, setSponsorModal] = useState<{ open: boolean; item: IEventSponsor | null }>({ open: false, item: null });
    const [speakerModal, setSpeakerModal] = useState<{ open: boolean; item: IEventSpeaker | null }>({ open: false, item: null });
    const [sessionModal, setSessionModal] = useState<{ open: boolean; item: IEventSession | null }>({ open: false, item: null });

    // ── Announcement ──────────────────────────────────────────────────────────

    const annForm = useForm<AnnouncementForm>({
        resolver: zodResolver(announcementSchema),
        defaultValues: { subject: "", body: "" },
    });
    const annMut = useMutation({
        mutationFn: (d: AnnouncementForm) => eventApi.sendAnnouncement(eventId, d),
        onSuccess: () => {
            toast.success("Announcement sent");
            invalidateKind("announcements");
            setAnnModal(false);
            annForm.reset();
        },
        onError: (e: any) => toast.error(e?.message || "Failed"),
    });

    // ── Sponsor ───────────────────────────────────────────────────────────────

    const sponsorForm = useForm<SponsorForm>({
        resolver: zodResolver(sponsorSchema),
        defaultValues: { name: "", tier: "gold", sort_order: 0 },
    });
    useEffect(() => {
        if (sponsorModal.open) {
            sponsorForm.reset(
                sponsorModal.item
                    ? {
                          name: sponsorModal.item.name,
                          tier: sponsorModal.item.tier as SponsorForm["tier"],
                          sort_order: sponsorModal.item.sort_order,
                      }
                    : { name: "", tier: "gold", sort_order: 0 }
            );
        }
    }, [sponsorModal, sponsorForm]);

    const sponsorMut = useMutation({
        mutationFn: (d: SponsorForm) =>
            sponsorModal.item
                ? eventApi.updateSponsor(eventId, sponsorModal.item.id, d)
                : eventApi.createSponsor(eventId, d),
        onSuccess: () => {
            toast.success(sponsorModal.item ? "Sponsor updated" : "Sponsor added");
            invalidateKind("sponsors");
            setSponsorModal({ open: false, item: null });
        },
        onError: (e: any) => toast.error(e?.message || "Failed"),
    });

    const deleteSponsor = useMutation({
        mutationFn: (id: number) => eventApi.deleteSponsor(eventId, id),
        onSuccess: () => {
            toast.success("Sponsor removed");
            invalidateKind("sponsors");
        },
        onError: (e: any) => toast.error(e?.message || "Failed"),
    });

    // ── Speaker ───────────────────────────────────────────────────────────────

    const speakerForm = useForm<SpeakerForm>({
        resolver: zodResolver(speakerSchema),
        defaultValues: { name: "", title: "", organization: "", bio: "" },
    });
    useEffect(() => {
        if (speakerModal.open) {
            speakerForm.reset(
                speakerModal.item
                    ? {
                          name: speakerModal.item.name,
                          title: speakerModal.item.title ?? "",
                          organization: speakerModal.item.organization ?? "",
                          bio: speakerModal.item.bio ?? "",
                      }
                    : { name: "", title: "", organization: "", bio: "" }
            );
        }
    }, [speakerModal, speakerForm]);

    const speakerMut = useMutation({
        mutationFn: (d: SpeakerForm) =>
            speakerModal.item
                ? eventApi.updateSpeaker(eventId, speakerModal.item.id, {
                      name: d.name,
                      title: d.title || undefined,
                      organization: d.organization || undefined,
                      bio: d.bio || undefined,
                  })
                : eventApi.createSpeaker(eventId, {
                      name: d.name,
                      title: d.title || undefined,
                      organization: d.organization || undefined,
                      bio: d.bio || undefined,
                  }),
        onSuccess: () => {
            toast.success(speakerModal.item ? "Speaker updated" : "Speaker added");
            invalidateKind("speakers");
            setSpeakerModal({ open: false, item: null });
        },
        onError: (e: any) => toast.error(e?.message || "Failed"),
    });

    const deleteSpeaker = useMutation({
        mutationFn: (id: number) => eventApi.deleteSpeaker(eventId, id),
        onSuccess: () => {
            toast.success("Speaker removed");
            invalidateKind("speakers");
        },
        onError: (e: any) => toast.error(e?.message || "Failed"),
    });

    // ── Session ───────────────────────────────────────────────────────────────

    const sessionForm = useForm<SessionForm>({
        resolver: zodResolver(sessionSchema),
        defaultValues: { title: "", starts_at: null, ends_at: null, room: null, speaker_id: null },
    });
    useEffect(() => {
        if (sessionModal.open) {
            sessionForm.reset(
                sessionModal.item
                    ? {
                          title: sessionModal.item.title,
                          starts_at: sessionModal.item.starts_at?.slice(0, 16) ?? null,
                          ends_at: sessionModal.item.ends_at?.slice(0, 16) ?? null,
                          room: sessionModal.item.room ?? null,
                          speaker_id: sessionModal.item.speaker_id != null ? String(sessionModal.item.speaker_id) : null,
                      }
                    : { title: "", starts_at: null, ends_at: null, room: null, speaker_id: null }
            );
        }
    }, [sessionModal, sessionForm]);

    const sessionMut = useMutation({
        mutationFn: (d: SessionForm) => {
            const payload = {
                title: d.title,
                starts_at: d.starts_at || null,
                ends_at: d.ends_at || null,
                room: d.room || null,
                speaker_id: d.speaker_id ? Number(d.speaker_id) : null,
            };
            return sessionModal.item
                ? eventApi.updateSession(eventId, sessionModal.item.id, payload)
                : eventApi.createSession(eventId, payload);
        },
        onSuccess: () => {
            toast.success(sessionModal.item ? "Session updated" : "Session added");
            invalidateKind("sessions");
            setSessionModal({ open: false, item: null });
        },
        onError: (e: any) => toast.error(e?.message || "Failed"),
    });

    const deleteSession = useMutation({
        mutationFn: (id: number) => eventApi.deleteSession(eventId, id),
        onSuccess: () => {
            toast.success("Session removed");
            invalidateKind("sessions");
        },
        onError: (e: any) => toast.error(e?.message || "Failed"),
    });

    const reissueCertificate = useMutation({
        mutationFn: (participationId: number) => certificateApi.reissue(participationId),
        onSuccess: () => {
            toast.success("Certificate re-issued");
            invalidateKind("certificates");
        },
        onError: (e: any) => toast.error(e?.message || "Re-issue failed"),
    });

    const loading =
        (show("announcements") && announcements.isLoading) ||
        (show("certificates") && certificates.isLoading) ||
        (show("feedback") && feedback.isLoading) ||
        (show("sponsors") && sponsors.isLoading) ||
        (show("speakers") && speakers.isLoading) ||
        (show("sessions") && sessions.isLoading);

    if (loading) return <Loader />;

    const speakerOptions = (speakers.data?.speakers ?? []) as IEventSpeaker[];

    return (
        <>
            <div className="space-y-8 text-sm">

                {show("announcements") && (
                <Section
                    title="Announcements"
                    action={
                        <button
                            type="button"
                            className="btn btn-primary btn-sm gap-1"
                            onClick={() => setAnnModal(true)}
                        >
                            + Compose
                        </button>
                    }
                >
                    <SimpleAdminTable
                        columns={[
                            { key: "subject", label: "Subject" },
                            { key: "sent", label: "Sent" },
                        ]}
                        empty={(announcements.data?.announcements?.length ?? 0) === 0}
                        emptyText="No announcements"
                    >
                        {(announcements.data?.announcements ?? []).map((a: any) => (
                            <tr
                                key={a.id}
                                className="hover:bg-white-light/20 dark:hover:bg-[#1a2941]/40"
                            >
                                <SimpleAdminTd>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {a.subject}
                                    </span>
                                </SimpleAdminTd>
                                <SimpleAdminTd>
                                    {a.sent_at
                                        ? moment(a.sent_at).format("MMM DD, YYYY")
                                        : "Not sent"}
                                </SimpleAdminTd>
                            </tr>
                        ))}
                    </SimpleAdminTable>
                </Section>
                )}

                {show("certificates") && (
                <Section title="Certificates">
                    <SimpleAdminTable
                        columns={[
                            { key: "participant", label: "Participant" },
                            { key: "issued", label: "Issued" },
                            { key: "status", label: "Status" },
                            { key: "actions", label: "Actions", align: "center" },
                        ]}
                        empty={(certificates.data?.certificates?.length ?? 0) === 0}
                        emptyText="No certificates"
                    >
                        {(certificates.data?.certificates ?? []).map((c: any) => (
                            <tr
                                key={c.id}
                                className="hover:bg-white-light/20 dark:hover:bg-[#1a2941]/40"
                            >
                                <SimpleAdminTd>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {c.participation?.user?.name ?? `P#${c.participation_id}`}
                                    </span>
                                </SimpleAdminTd>
                                <SimpleAdminTd>
                                    {c.issued_at
                                        ? moment(c.issued_at).format("MMM DD, YYYY")
                                        : "—"}
                                </SimpleAdminTd>
                                <SimpleAdminTd>
                                    <span className={statusBadgeClass(c.verified ? "success" : "info")}>
                                        {c.verified ? "Verified" : "Issued"}
                                    </span>
                                </SimpleAdminTd>
                                <SimpleAdminTd align="center">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm"
                                        disabled={reissueCertificate.isPending}
                                        onClick={async () => {
                                            const name =
                                                c.participation?.user?.name ??
                                                `participation #${c.participation_id}`;
                                            const ok = await confirmAction({
                                                title: "Re-issue certificate?",
                                                text: `Re-issue certificate for ${name}? This will replace their existing certificate.`,
                                                confirmButtonText: "Re-issue",
                                            });
                                            if (ok) reissueCertificate.mutate(c.participation_id);
                                        }}
                                    >
                                        Re-issue
                                    </button>
                                </SimpleAdminTd>
                            </tr>
                        ))}
                    </SimpleAdminTable>
                </Section>
                )}

                {show("feedback") && (
                <Section
                    title={`Feedback (avg ${feedback.data?.average_rating ?? "—"} · ${feedback.data?.feedback_count ?? 0} total · ${feedback.data?.hidden_count ?? 0} hidden)`}
                >
                    <SimpleAdminTable
                        columns={[
                            { key: "rating", label: "Rating" },
                            { key: "comment", label: "Comment" },
                            { key: "status", label: "Status" },
                        ]}
                        empty={(feedback.data?.feedback?.length ?? 0) === 0}
                        emptyText="No feedback"
                    >
                        {(feedback.data?.feedback ?? []).map((f: any) => (
                            <tr
                                key={f.id}
                                className="hover:bg-white-light/20 dark:hover:bg-[#1a2941]/40"
                            >
                                <SimpleAdminTd>
                                    <span className="font-medium">{f.rating}/5</span>
                                </SimpleAdminTd>
                                <SimpleAdminTd className="max-w-md whitespace-normal">
                                    {f.comment || "—"}
                                </SimpleAdminTd>
                                <SimpleAdminTd>
                                    <span className={statusBadgeClass(f.hidden ? "warning" : "success")}>
                                        {f.hidden ? "Hidden" : "Visible"}
                                    </span>
                                </SimpleAdminTd>
                            </tr>
                        ))}
                    </SimpleAdminTable>
                </Section>
                )}

                {show("sponsors") && (
                <Section
                    title="Sponsors"
                    action={
                        <button
                            type="button"
                            className="btn btn-primary btn-sm gap-1"
                            onClick={() => setSponsorModal({ open: true, item: null })}
                        >
                            + Add
                        </button>
                    }
                >
                    <SimpleAdminTable
                        columns={[
                            { key: "name", label: "Name" },
                            { key: "tier", label: "Tier" },
                            { key: "actions", label: "Actions", align: "center" },
                        ]}
                        empty={(sponsors.data?.sponsors?.length ?? 0) === 0}
                        emptyText="No sponsors"
                    >
                        {(sponsors.data?.sponsors ?? []).map((s: any) => (
                            <tr
                                key={s.id}
                                className="hover:bg-white-light/20 dark:hover:bg-[#1a2941]/40"
                            >
                                <SimpleAdminTd>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {s.name}
                                    </span>
                                </SimpleAdminTd>
                                <SimpleAdminTd className="capitalize">{s.tier}</SimpleAdminTd>
                                <SimpleAdminTd align="center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => setSponsorModal({ open: true, item: s })}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-danger btn-sm"
                                            onClick={async () => {
                                                const ok = await confirmAction({
                                                    title: "Remove sponsor?",
                                                    confirmButtonText: "Remove",
                                                });
                                                if (ok) deleteSponsor.mutate(s.id);
                                            }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </SimpleAdminTd>
                            </tr>
                        ))}
                    </SimpleAdminTable>
                </Section>
                )}

                {show("speakers") && (
                <Section
                    title="Speakers"
                    action={
                        <button
                            type="button"
                            className="btn btn-primary btn-sm gap-1"
                            onClick={() => setSpeakerModal({ open: true, item: null })}
                        >
                            + Add
                        </button>
                    }
                >
                    <SimpleAdminTable
                        columns={[
                            { key: "name", label: "Name" },
                            { key: "title", label: "Title" },
                            { key: "org", label: "Organization", hideBelow: "lg" },
                            { key: "actions", label: "Actions", align: "center" },
                        ]}
                        empty={(speakers.data?.speakers?.length ?? 0) === 0}
                        emptyText="No speakers"
                    >
                        {(speakers.data?.speakers ?? []).map((s: any) => (
                            <tr
                                key={s.id}
                                className="hover:bg-white-light/20 dark:hover:bg-[#1a2941]/40"
                            >
                                <SimpleAdminTd>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {s.name}
                                    </span>
                                </SimpleAdminTd>
                                <SimpleAdminTd>{s.title || "—"}</SimpleAdminTd>
                                <SimpleAdminTd hideBelow="lg">{s.organization || "—"}</SimpleAdminTd>
                                <SimpleAdminTd align="center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => setSpeakerModal({ open: true, item: s })}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-danger btn-sm"
                                            onClick={async () => {
                                                const ok = await confirmAction({
                                                    title: "Remove speaker?",
                                                    confirmButtonText: "Remove",
                                                });
                                                if (ok) deleteSpeaker.mutate(s.id);
                                            }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </SimpleAdminTd>
                            </tr>
                        ))}
                    </SimpleAdminTable>
                </Section>
                )}

                {show("sessions") && (
                <Section
                    title="Sessions"
                    action={
                        <button
                            type="button"
                            className="btn btn-primary btn-sm gap-1"
                            onClick={() => setSessionModal({ open: true, item: null })}
                        >
                            + Add
                        </button>
                    }
                >
                    <SimpleAdminTable
                        columns={[
                            { key: "title", label: "Title" },
                            { key: "starts", label: "Starts" },
                            { key: "room", label: "Room", hideBelow: "lg" },
                            { key: "speaker", label: "Speaker", hideBelow: "lg" },
                            { key: "actions", label: "Actions", align: "center" },
                        ]}
                        empty={(sessions.data?.sessions?.length ?? 0) === 0}
                        emptyText="No sessions"
                    >
                        {(sessions.data?.sessions ?? []).map((s: any) => (
                            <tr
                                key={s.id}
                                className="hover:bg-white-light/20 dark:hover:bg-[#1a2941]/40"
                            >
                                <SimpleAdminTd>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {s.title}
                                    </span>
                                </SimpleAdminTd>
                                <SimpleAdminTd>
                                    {s.starts_at
                                        ? moment(s.starts_at).format("MMM DD, YYYY HH:mm")
                                        : "—"}
                                </SimpleAdminTd>
                                <SimpleAdminTd hideBelow="lg">{s.room || "—"}</SimpleAdminTd>
                                <SimpleAdminTd hideBelow="lg">{s.speaker?.name || "—"}</SimpleAdminTd>
                                <SimpleAdminTd align="center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => setSessionModal({ open: true, item: s })}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-danger btn-sm"
                                            onClick={async () => {
                                                const ok = await confirmAction({
                                                    title: "Remove session?",
                                                    confirmButtonText: "Remove",
                                                });
                                                if (ok) deleteSession.mutate(s.id);
                                            }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </SimpleAdminTd>
                            </tr>
                        ))}
                    </SimpleAdminTable>
                </Section>
                )}
            </div>

            {/* Announcement compose modal */}
            <GenericModal isOpen={annModal} setIsOpen={setAnnModal} title="Send Announcement" maxWidth="md">
                <form
                    className="space-y-4"
                    onSubmit={annForm.handleSubmit((d) => annMut.mutate(d))}
                >
                    <Controller
                        name="subject"
                        control={annForm.control}
                        render={({ field }) => (
                            <FormInput
                                id="ann_subject"
                                label="Subject"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                error={annForm.formState.errors.subject?.message}
                            />
                        )}
                    />
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Body
                        </label>
                        <Controller
                            name="body"
                            control={annForm.control}
                            render={({ field }) => (
                                <textarea
                                    className="block w-full rounded-lg border-2 border-gray-300 px-4 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-black/30 dark:text-white focus:border-primary focus:outline-none"
                                    rows={5}
                                    value={field.value}
                                    onChange={(e) => field.onChange(e.target.value)}
                                    onBlur={field.onBlur}
                                    placeholder="Message to participants..."
                                />
                            )}
                        />
                        {annForm.formState.errors.body && (
                            <p className="text-sm text-red-500">
                                {annForm.formState.errors.body.message}
                            </p>
                        )}
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => { setAnnModal(false); annForm.reset(); }}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={annMut.isPending}>
                            {annMut.isPending ? "Sending…" : "Send Announcement"}
                        </button>
                    </div>
                </form>
            </GenericModal>

            {/* Sponsor modal */}
            <GenericModal
                isOpen={sponsorModal.open}
                setIsOpen={() => setSponsorModal({ open: false, item: null })}
                title={sponsorModal.item ? "Edit Sponsor" : "Add Sponsor"}
                maxWidth="sm"
            >
                <form
                    className="space-y-4"
                    onSubmit={sponsorForm.handleSubmit((d) => sponsorMut.mutate(d))}
                >
                    <Controller
                        name="name"
                        control={sponsorForm.control}
                        render={({ field }) => (
                            <FormInput
                                id="sp_name"
                                label="Name"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                error={sponsorForm.formState.errors.name?.message}
                            />
                        )}
                    />
                    <Controller
                        name="tier"
                        control={sponsorForm.control}
                        render={({ field }) => (
                            <FormSelect
                                id="sp_tier"
                                label="Tier"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                options={SPONSOR_TIERS}
                            />
                        )}
                    />
                    <Controller
                        name="sort_order"
                        control={sponsorForm.control}
                        render={({ field }) => (
                            <FormInput
                                id="sp_sort"
                                label="Sort order"
                                type="number"
                                min={0}
                                value={String(field.value ?? 0)}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                            />
                        )}
                    />
                    <div className="flex justify-end gap-2">
                        <button type="button" className="btn btn-outline-danger" onClick={() => setSponsorModal({ open: false, item: null })}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={sponsorMut.isPending}>
                            {sponsorMut.isPending ? "Saving…" : "Save"}
                        </button>
                    </div>
                </form>
            </GenericModal>

            {/* Speaker modal */}
            <GenericModal
                isOpen={speakerModal.open}
                setIsOpen={() => setSpeakerModal({ open: false, item: null })}
                title={speakerModal.item ? "Edit Speaker" : "Add Speaker"}
                maxWidth="sm"
            >
                <form
                    className="space-y-4"
                    onSubmit={speakerForm.handleSubmit((d) => speakerMut.mutate(d))}
                >
                    <Controller
                        name="name"
                        control={speakerForm.control}
                        render={({ field }) => (
                            <FormInput
                                id="spkr_name"
                                label="Name"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                error={speakerForm.formState.errors.name?.message}
                            />
                        )}
                    />
                    <Controller
                        name="title"
                        control={speakerForm.control}
                        render={({ field }) => (
                            <FormInput
                                id="spkr_title"
                                label="Title (optional)"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                            />
                        )}
                    />
                    <Controller
                        name="organization"
                        control={speakerForm.control}
                        render={({ field }) => (
                            <FormInput
                                id="spkr_org"
                                label="Organization (optional)"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                            />
                        )}
                    />
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Bio (optional)
                        </label>
                        <Controller
                            name="bio"
                            control={speakerForm.control}
                            render={({ field }) => (
                                <textarea
                                    className="block w-full rounded-lg border-2 border-gray-300 px-4 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-black/30 dark:text-white focus:border-primary focus:outline-none"
                                    rows={3}
                                    value={field.value ?? ""}
                                    onChange={(e) => field.onChange(e.target.value)}
                                    onBlur={field.onBlur}
                                />
                            )}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" className="btn btn-outline-danger" onClick={() => setSpeakerModal({ open: false, item: null })}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={speakerMut.isPending}>
                            {speakerMut.isPending ? "Saving…" : "Save"}
                        </button>
                    </div>
                </form>
            </GenericModal>

            {/* Session modal */}
            <GenericModal
                isOpen={sessionModal.open}
                setIsOpen={() => setSessionModal({ open: false, item: null })}
                title={sessionModal.item ? "Edit Session" : "Add Session"}
                maxWidth="sm"
            >
                <form
                    className="space-y-4"
                    onSubmit={sessionForm.handleSubmit((d) => sessionMut.mutate(d))}
                >
                    <Controller
                        name="title"
                        control={sessionForm.control}
                        render={({ field }) => (
                            <FormInput
                                id="sess_title"
                                label="Title"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                error={sessionForm.formState.errors.title?.message}
                            />
                        )}
                    />
                    <Controller
                        name="starts_at"
                        control={sessionForm.control}
                        render={({ field }) => (
                            <FormInput
                                id="sess_start"
                                label="Starts at (optional)"
                                type="datetime-local"
                                value={field.value ?? ""}
                                onChange={(v) => field.onChange(v || null)}
                                onBlur={field.onBlur}
                            />
                        )}
                    />
                    <Controller
                        name="ends_at"
                        control={sessionForm.control}
                        render={({ field }) => (
                            <FormInput
                                id="sess_end"
                                label="Ends at (optional)"
                                type="datetime-local"
                                value={field.value ?? ""}
                                onChange={(v) => field.onChange(v || null)}
                                onBlur={field.onBlur}
                            />
                        )}
                    />
                    <Controller
                        name="room"
                        control={sessionForm.control}
                        render={({ field }) => (
                            <FormInput
                                id="sess_room"
                                label="Room (optional)"
                                value={field.value ?? ""}
                                onChange={(v) => field.onChange(v || null)}
                                onBlur={field.onBlur}
                            />
                        )}
                    />
                    {speakerOptions.length > 0 && (
                        <Controller
                            name="speaker_id"
                            control={sessionForm.control}
                            render={({ field }) => (
                                <FormSelect
                                    id="sess_speaker"
                                    label="Speaker (optional)"
                                    value={field.value ?? ""}
                                    onChange={(v) => field.onChange(v || null)}
                                    onBlur={field.onBlur}
                                    options={[
                                        { value: "", label: "— None —" },
                                        ...speakerOptions.map((sp) => ({
                                            value: String(sp.id),
                                            label: sp.name,
                                        })),
                                    ]}
                                />
                            )}
                        />
                    )}
                    <div className="flex justify-end gap-2">
                        <button type="button" className="btn btn-outline-danger" onClick={() => setSessionModal({ open: false, item: null })}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={sessionMut.isPending}>
                            {sessionMut.isPending ? "Saving…" : "Save"}
                        </button>
                    </div>
                </form>
            </GenericModal>
        </>
    );
};

export default EventAddOnOversight;
