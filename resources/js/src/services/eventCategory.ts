import { BaseApi } from "./baseApi";
import { IEventCategory } from "../types/event";

class EventCategoryApi extends BaseApi<IEventCategory> {
    constructor() {
        super("/event-categories");
    }
}

export const eventCategoryApi = new EventCategoryApi();
