import { createSlice, PayloadAction, createAction } from "@reduxjs/toolkit";

export interface Organization {
    id?: number;
    name: string;
    founded_date?: string;
    logo_url?: string;
    website_url?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    created_at?: string;
    updated_at?: string;
}

interface OrganizationState {
    data: Organization | null;
    loading: boolean;
    error: string | null;
}

const initialState: OrganizationState = {
    data: null,
    loading: false,
    error: null,
};

// Create action manually to test
export const setOrganization = createAction<Organization>('organization/setOrganization');

const organizationSlice = createSlice({
    name: "organization",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(setOrganization, (state, action) => {
            state.data = action.payload;
            state.error = null;
        });
    },
});

export default organizationSlice.reducer;
