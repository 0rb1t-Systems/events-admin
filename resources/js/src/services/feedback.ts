import { BaseApi } from "./BaseApi";
import { IEventFeedback } from "../types/feedback";
import axiosInstance from "../utils/axios";

class FeedbackApi extends BaseApi<IEventFeedback> {
    constructor() {
        super("/feedback");
    }

    async updateVisibility(id: number | string, hidden: boolean): Promise<IEventFeedback> {
        const response = await axiosInstance.patch(`${this.endpoint}/${id}/visibility`, {
            hidden,
        });
        return response.data.data || response.data;
    }
}

export const feedbackApi = new FeedbackApi();
