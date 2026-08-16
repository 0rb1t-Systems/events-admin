import { BaseApi } from "./baseApi";
import {
    IDiscountCode,
    IEvent,
    IEventAnnouncement,
    IEventFormField,
    IEventImage,
    IEventSession,
    IEventSpeaker,
    IEventSponsor,
    IParticipation,
    IRegistrationGates,
    ITicketType,
} from "../types/event";
import axiosInstance from "../utils/axios";

class EventApi extends BaseApi<IEvent> {
    constructor() {
        super("/events");
    }

    async transition(id: number | string, status: string): Promise<IEvent> {
        const response = await axiosInstance.post(`${this.endpoint}/${id}/transition`, {
            status,
        });
        return response.data.data || response.data;
    }

    async syncCapacity(id: number | string): Promise<any> {
        const response = await axiosInstance.post(`${this.endpoint}/${id}/sync-capacity`);
        return response.data.data || response.data;
    }

    async registrationGates(id: number | string): Promise<IRegistrationGates> {
        const response = await axiosInstance.get(`${this.endpoint}/${id}/registration-gates`);
        return response.data.data || response.data;
    }

    async ticketTypes(eventId: number | string): Promise<{
        event_id: number;
        monetized: boolean;
        derived_monetized: boolean;
        ticket_types: ITicketType[];
    }> {
        const response = await axiosInstance.get(`${this.endpoint}/${eventId}/ticket-types`);
        return response.data.data || response.data;
    }

    async discountCodes(eventId: number | string): Promise<{
        event_id: number;
        discount_codes: IDiscountCode[];
    }> {
        const response = await axiosInstance.get(`${this.endpoint}/${eventId}/discount-codes`);
        return response.data.data || response.data;
    }

    async participations(eventId: number | string): Promise<{
        event_id: number;
        capacity: {
            registered_count: number;
            waitlisted_count: number;
            seats_remaining: number | null;
            capacity: number | null;
        };
        participations: IParticipation[];
    }> {
        const response = await axiosInstance.get(`${this.endpoint}/${eventId}/participations`);
        return response.data.data || response.data;
    }

    async formFields(eventId: number | string): Promise<{
        event_id: number;
        form_fields: IEventFormField[];
    }> {
        const response = await axiosInstance.get(`${this.endpoint}/${eventId}/form-fields`);
        return response.data.data || response.data;
    }

    // ── Participations ────────────────────────────────────────────────────────

    async createParticipation(payload: {
        event_id: number;
        user_id: number;
        ticket_type_id?: number | null;
    }): Promise<IParticipation> {
        const response = await axiosInstance.post("/participations", payload);
        return response.data.data || response.data;
    }

    async promoteParticipation(id: number | string) {
        const response = await axiosInstance.post(`/participations/${id}/promote`);
        return response.data.data || response.data;
    }

    async cancelParticipation(id: number | string, reason?: string) {
        const response = await axiosInstance.post(`/participations/${id}/cancel`, reason ? { reason } : {});
        return response.data.data || response.data;
    }

    // ── Ticket types ──────────────────────────────────────────────────────────

    async createTicketType(payload: {
        event_id: number;
        name: string;
        price: number;
        quantity_limit?: number | null;
        sales_enabled?: boolean;
        sort_order?: number;
    }): Promise<ITicketType> {
        const response = await axiosInstance.post("/ticket-types", payload);
        return response.data.data || response.data;
    }

    async updateTicketType(
        id: number | string,
        payload: Partial<{
            name: string;
            price: number;
            quantity_limit: number | null;
            sales_enabled: boolean;
            sort_order: number;
        }>
    ): Promise<ITicketType> {
        const response = await axiosInstance.patch(`/ticket-types/${id}`, payload);
        return response.data.data || response.data;
    }

    async deleteTicketType(id: number | string): Promise<void> {
        await axiosInstance.delete(`/ticket-types/${id}`);
    }

    async disableTicketSales(ticketTypeId: number | string): Promise<ITicketType> {
        const response = await axiosInstance.post(`/ticket-types/${ticketTypeId}/disable-sales`);
        return response.data.data || response.data;
    }

    async enableTicketSales(ticketTypeId: number | string): Promise<ITicketType> {
        const response = await axiosInstance.post(`/ticket-types/${ticketTypeId}/enable-sales`);
        return response.data.data || response.data;
    }

    // ── Discount codes ────────────────────────────────────────────────────────

    async createDiscountCode(payload: {
        event_id: number;
        code: string;
        type: "percent" | "fixed";
        value: number;
        usage_limit?: number | null;
        expires_at?: string | null;
        active?: boolean;
    }): Promise<IDiscountCode> {
        const response = await axiosInstance.post("/discount-codes", payload);
        return response.data.data || response.data;
    }

    async updateDiscountCode(
        id: number | string,
        payload: Partial<{
            code: string;
            type: "percent" | "fixed";
            value: number;
            usage_limit: number | null;
            expires_at: string | null;
            active: boolean;
        }>
    ): Promise<IDiscountCode> {
        const response = await axiosInstance.patch(`/discount-codes/${id}`, payload);
        return response.data.data || response.data;
    }

    async deleteDiscountCode(id: number | string): Promise<void> {
        await axiosInstance.delete(`/discount-codes/${id}`);
    }

    // ── Event form fields ─────────────────────────────────────────────────────

    async createFormField(payload: {
        event_id: number;
        key: string;
        label: string;
        type: string;
        options?: string[] | null;
        required?: boolean;
        sort_order?: number;
        active?: boolean;
    }): Promise<IEventFormField> {
        const response = await axiosInstance.post("/event-form-fields", payload);
        return response.data.data || response.data;
    }

    async updateFormField(
        id: number | string,
        payload: Partial<{
            label: string;
            type: string;
            options: string[] | null;
            required: boolean;
            sort_order: number;
            active: boolean;
        }>
    ): Promise<IEventFormField> {
        const response = await axiosInstance.patch(`/event-form-fields/${id}`, payload);
        return response.data.data || response.data;
    }

    async deleteFormField(id: number | string): Promise<void> {
        await axiosInstance.delete(`/event-form-fields/${id}`);
    }

    async reorderFormFields(eventId: number, orderedIds: number[]): Promise<void> {
        await axiosInstance.post("/event-form-fields/reorder", {
            event_id: eventId,
            ordered_ids: orderedIds,
        });
    }

    // ── Announcements ─────────────────────────────────────────────────────────

    async sendAnnouncement(
        eventId: number | string,
        payload: { subject: string; body: string }
    ): Promise<IEventAnnouncement> {
        const response = await axiosInstance.post(
            `${this.endpoint}/${eventId}/announcements`,
            payload
        );
        return response.data.data || response.data;
    }

    // ── Sponsors ──────────────────────────────────────────────────────────────

    async createSponsor(
        eventId: number | string,
        payload: { name: string; tier: string; sort_order?: number }
    ): Promise<IEventSponsor> {
        const response = await axiosInstance.post(
            `${this.endpoint}/${eventId}/sponsors`,
            payload
        );
        return response.data.data || response.data;
    }

    async updateSponsor(
        eventId: number | string,
        sponsorId: number | string,
        payload: Partial<{ name: string; tier: string; sort_order: number }>
    ): Promise<IEventSponsor> {
        const response = await axiosInstance.patch(
            `${this.endpoint}/${eventId}/sponsors/${sponsorId}`,
            payload
        );
        return response.data.data || response.data;
    }

    async deleteSponsor(eventId: number | string, sponsorId: number | string): Promise<void> {
        await axiosInstance.delete(`${this.endpoint}/${eventId}/sponsors/${sponsorId}`);
    }

    // ── Speakers ──────────────────────────────────────────────────────────────

    async createSpeaker(
        eventId: number | string,
        payload: { name: string; title?: string; organization?: string; bio?: string }
    ): Promise<IEventSpeaker> {
        const response = await axiosInstance.post(
            `${this.endpoint}/${eventId}/speakers`,
            payload
        );
        return response.data.data || response.data;
    }

    async updateSpeaker(
        eventId: number | string,
        speakerId: number | string,
        payload: Partial<{ name: string; title: string; organization: string; bio: string }>
    ): Promise<IEventSpeaker> {
        const response = await axiosInstance.patch(
            `${this.endpoint}/${eventId}/speakers/${speakerId}`,
            payload
        );
        return response.data.data || response.data;
    }

    async deleteSpeaker(eventId: number | string, speakerId: number | string): Promise<void> {
        await axiosInstance.delete(`${this.endpoint}/${eventId}/speakers/${speakerId}`);
    }

    // ── Sessions ──────────────────────────────────────────────────────────────

    async createSession(
        eventId: number | string,
        payload: {
            title: string;
            starts_at?: string | null;
            ends_at?: string | null;
            room?: string | null;
            speaker_id?: number | null;
        }
    ): Promise<IEventSession> {
        const response = await axiosInstance.post(
            `${this.endpoint}/${eventId}/sessions`,
            payload
        );
        return response.data.data || response.data;
    }

    async updateSession(
        eventId: number | string,
        sessionId: number | string,
        payload: Partial<{
            title: string;
            starts_at: string | null;
            ends_at: string | null;
            room: string | null;
            speaker_id: number | null;
        }>
    ): Promise<IEventSession> {
        const response = await axiosInstance.patch(
            `${this.endpoint}/${eventId}/sessions/${sessionId}`,
            payload
        );
        return response.data.data || response.data;
    }

    async deleteSession(eventId: number | string, sessionId: number | string): Promise<void> {
        await axiosInstance.delete(`${this.endpoint}/${eventId}/sessions/${sessionId}`);
    }

    // ── Gallery ───────────────────────────────────────────────────────────────

    async deleteGalleryImage(eventId: number | string, imageId: number | string): Promise<void> {
        await axiosInstance.delete(`${this.endpoint}/${eventId}/gallery/${imageId}`);
    }

    async uploadGalleryImage(
        eventId: number | string,
        file: File,
        sortOrder?: number
    ): Promise<IEventImage> {
        const form = new FormData();
        form.append("image", file);
        if (sortOrder !== undefined) form.append("sort_order", String(sortOrder));
        const response = await axiosInstance.post(`${this.endpoint}/${eventId}/gallery`, form, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data.data || response.data;
    }

    async getInvitationTemplate(eventId: number | string): Promise<{
        event_id: number;
        template: {
            id: number;
            event_id: number;
            config?: Record<string, unknown> | null;
        } | null;
    }> {
        const response = await axiosInstance.get(
            `${this.endpoint}/${eventId}/invitation-template`
        );
        return response.data.data || response.data;
    }
}

export const eventApi = new EventApi();
