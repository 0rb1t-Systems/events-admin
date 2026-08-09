import { BaseApi } from "./baseApi";
import { IUser } from "../types";

class UserApi extends BaseApi<IUser> {
    constructor() {
        super("/users");
    }
}

export const userApi = new UserApi();
