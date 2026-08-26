import { useQuery } from "@tanstack/react-query";
import { IApiResponse, IQueryParams } from "../../types";

interface UseFetchTableDataProps<T> {
    title: string;
    fetchData: (param: IQueryParams) => Promise<IApiResponse<T>> | undefined;
    query?: object;
    currentPage: number;
    rowsPerPage: number;
    search: string;
    searchFields: string[];
    sortBy: Record<string, "asc" | "desc">;
    sortDirection: string;
}

function useFetchTableData<T>({
    title,
    fetchData,
    query = {},
    currentPage,
    rowsPerPage,
    search,
    searchFields,
    sortBy,
}: UseFetchTableDataProps<T>) {
    // String fingerprint so inline `query={{}}` object identity does not thrash the cache.
    const queryFingerprint = JSON.stringify(query ?? {});

    return useQuery<IApiResponse<T> | undefined>({
        queryKey: [title, queryFingerprint, currentPage, rowsPerPage, search, sortBy],
        queryFn: () => {
            const apiParams: any = {
                page: currentPage,
                per_page: rowsPerPage,
                filter: { ...(query as object) },
            };

            if (search && search.trim() !== "") {
                apiParams.search_term = search;
                apiParams.search_fields = searchFields.join(",");
            }

            if (sortBy && Object.keys(sortBy).length > 0) {
                const sortField = Object.keys(sortBy)[0];
                if (sortField) {
                    apiParams.sort_by = sortField;
                    apiParams.sort_direction = sortBy[sortField];
                }
            }

            return fetchData({
                ...apiParams,
            });
        },
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        staleTime: 2 * 60 * 1000,
        placeholderData: (previousData) => previousData,
    });
}

export default useFetchTableData;
