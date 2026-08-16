import { BaseApi } from "./baseApi";
import {
    IDiscountCode,
    IEvent,
    IEventImage,
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

    async disableTicketSales(ticketTypeId: number | string): Promise<ITicketType> {
        const response = await axiosInstance.post(`/ticket-types/${ticketTypeId}/disable-sales`);
        return response.data.data || response.data;
    }

    async enableTicketSales(ticketTypeId: number | string): Promise<ITicketType> {
        const response = await axiosInstance.post(`/ticket-types/${ticketTypeId}/enable-sales`);
        return response.data.data || response.data;
    }

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
}

export const eventApi = new EventApi();
