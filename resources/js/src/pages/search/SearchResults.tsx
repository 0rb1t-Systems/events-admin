import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { globalSearchApi, IGlobalSearchItem, IGlobalSearchResponse } from '../../services/globalSearch';
import {
  SearchResultsHeader,
  SearchResultsTabs,
  LoadingSpinner,
  ErrorMessage
} from './components';

const SearchResults = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const activeTab = searchParams.get('type') || 'all';
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [searchResults, setSearchResults] = useState<IGlobalSearchResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [paginationState, setPaginationState] = useState({
        'word-entries': { page: 1, hasMore: false, items: [] as IGlobalSearchItem[] },
        'books': { page: 1, hasMore: false, items: [] as IGlobalSearchItem[] },
        'content-items': { page: 1, hasMore: false, items: [] as IGlobalSearchItem[] },
        'categories': { page: 1, hasMore: false, items: [] as IGlobalSearchItem[] }
    });

    useEffect(() => {
        const fetchResults = async () => {
            if (!query) return;

            setIsLoading(true);
            setError(null);

            try {
                const results = await globalSearchApi.search({ q: query });
                setSearchResults(results);

                // Initialize pagination state with the initial results
                setPaginationState({
                    'word-entries': {
                        page: 1,
                        hasMore: results.total_per_category.word_entries > results.results.word_entries.length,
                        items: results.results.word_entries
                    },
                    'books': {
                        page: 1,
                        hasMore: results.total_per_category.books > results.results.books.length,
                        items: results.results.books
                    },
                    'content-items': {
                        page: 1,
                        hasMore: results.total_per_category.content_items > results.results.content_items.length,
                        items: results.results.content_items
                    },
                    'categories': {
                        page: 1,
                        hasMore: results.total_per_category.categories > results.results.categories.length,
                        items: results.results.categories
                    }
                });
            } catch (err) {
                console.error('Error fetching search results:', err);
                setError('Failed to fetch search results. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchResults();
    }, [query]);

    const handleTabChange = (tab: string) => {
        // Update the URL when tab changes while preserving the search query
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            if (tab === 'all') {
                newParams.delete('type');
            } else {
                newParams.set('type', tab);
            }
            return newParams;
        });
    };

    // Normalization functions for each entity type
    const normalizeItem = (type: string, item: any): IGlobalSearchItem => {
        switch (type) {
            case 'word-entries':
                return {
                    id: item.id,
                    type: 'word-entry',
                    title: item.word,
                    description: item.description,
                    url: `/vocabularies?view=${item.id}`,
                    match_field: '',
                    match_score: 0,
                    created_at: item.created_at,
                };
            case 'books':
                return {
                    id: item.id,
                    type: 'book',
                    title: item.title,
                    description: item.description,
                    url: `/books?view=${item.id}`,
                    match_field: '',
                    match_score: 0,
                    created_at: item.created_at,
                };
            case 'content-items':
                return {
                    id: item.id,
                    type: 'content-item',
                    title: item.title,
                    description: item.text,
                    url: `/content-items?view=${item.id}`,
                    match_field: '',
                    match_score: 0,
                    created_at: item.created_at,
                };
            case 'categories':
                return {
                    id: item.id,
                    type: 'category',
                    title: item.name,
                    description: item.description,
                    url: `/categories?view=${item.id}`,
                    match_field: '',
                    match_score: 0,
                    created_at: item.created_at,
                };
            default:
                return item;
        }
    };

    const loadMoreResults = async (type: string) => {
        if (!query || isLoadingMore) return;
        setIsLoadingMore(true);
        try {
            const nextPage = paginationState[type].page + 1;
            const response = await globalSearchApi.searchEntityType(type, {
                q: query,
                page: nextPage,
                per_page: 15
            });
            // Normalize new items
            const normalizedItems = (response.data || []).map((item: any) => normalizeItem(type, item));
            setPaginationState(prev => ({
                ...prev,
                [type]: {
                    page: nextPage,
                    hasMore: response.next_page_url !== null,
                    items: [...prev[type].items, ...normalizedItems]
                }
            }));
        } catch (err) {
            console.error(`Error loading more ${type}:`, err);
        } finally {
            setIsLoadingMore(false);
        }
    };

    return (
        <div className="p-4 md:p-6">
            <div className="max-w-5xl mx-auto">
                <SearchResultsHeader query={query} searchResults={searchResults} />

                {isLoading ? (
                    <LoadingSpinner />
                ) : error ? (
                    <ErrorMessage message={error} />
                ) : searchResults ? (
                    <SearchResultsTabs
                        activeTab={activeTab}
                        searchResults={searchResults}
                        query={query}
                        paginationState={paginationState}
                        isLoadingMore={isLoadingMore}
                        onTabChange={handleTabChange}
                        onLoadMore={loadMoreResults}
                    />
                ) : null}
            </div>
        </div>
    );
};

export default SearchResults;
