import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import FormCombobox from "../components/form/FormCombobox";
import { eventApi } from "../services/event";
import { userApi } from "../services/user";
import { IEvent } from "../types/event";
import { IUser } from "../types";

/**
 * Standard searchable entity picker (Prompt 12).
 * Pattern: FormCombobox + search?q= -- payload is numeric id; UI is human-readable.
 *
 * Reference twin: UserForm role picker.
 */

type Entity = { id: number };

interface EntitySearchComboboxProps<T extends Entity> {
    id: string;
    label: string;
    value: T | null;
    onChange: (value: T | null) => void;
    onSearch: (query: string) => void;
    options: T[];
    displayValue: (item: T) => string;
    loading?: boolean;
    error?: string;
    disabled?: boolean;
    placeholder?: string;
}

export function EntitySearchCombobox<T extends Entity>(
    props: EntitySearchComboboxProps<T>
) {
    return <FormCombobox<T> {...props} />;
}

export function useEventSearch(minChars = 1) {
    const [query, setQuery] = useState("");
    const { data, isFetching } = useQuery({
        queryKey: ["event-search-picker", query],
        queryFn: () => eventApi.search({ q: query, per_page: 20 }),
        enabled: query.trim().length >= minChars,
    });
    return {
        query,
        setQuery,
        options: (data?.data || []) as IEvent[],
        loading: isFetching,
    };
}

export function useUserSearch(minChars = 1) {
    const [query, setQuery] = useState("");
    const { data, isFetching } = useQuery({
        queryKey: ["user-search-picker", query],
        queryFn: () => userApi.search({ q: query, per_page: 20 }),
        enabled: query.trim().length >= minChars,
    });
    return {
        query,
        setQuery,
        options: (data?.data || []) as IUser[],
        loading: isFetching,
    };
}

export const formatEventOption = (e: IEvent) => {
    const date = e.starts_at
        ? new Date(e.starts_at).toLocaleDateString()
        : "";
    const org = e.organizer?.business_name
        ? ` - ${e.organizer.business_name}`
        : "";
    return `${e.title}${date ? ` (${date})` : ""}${org}`;
};

export const formatUserOption = (u: IUser) => `${u.name} - ${u.email}`;
