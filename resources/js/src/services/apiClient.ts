import { BaseApi } from "./baseApi";
import { IApiClient } from "../types/apiClient";

class ApiClientApi extends BaseApi<IApiClient> {
    constructor() {
        super("/api-clients");
    }
}

export const apiClientApi = new ApiClientApi();
