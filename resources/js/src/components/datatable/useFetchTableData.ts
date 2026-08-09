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
    return useQuery<IApiResponse<T> | undefined>({
        queryKey: [title, query, currentPage, rowsPerPage, search, sortBy],
        queryFn: () => {
            // Format parameters for API compatibility
            const apiParams: any = {
                page: currentPage,
                per_page: rowsPerPage,
                filter: { ...query },
            };

            // Handle search query
            if (search && search.trim() !== "") {
                apiParams.search_term = search;
                apiParams.search_fields = searchFields.join(",");
            }

            // Handle sorting
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
        refetchOnMount: true,
        refetchOnReconnect: false,
        staleTime: 1000 * 60,
    });
}

export default useFetchTableData;
