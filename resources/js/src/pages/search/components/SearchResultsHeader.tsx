import React from 'react';
import { IGlobalSearchResponse } from '../../../services/globalSearch';

interface SearchResultsHeaderProps {
  query: string;
  searchResults: IGlobalSearchResponse | null;
}

const SearchResultsHeader: React.FC<SearchResultsHeaderProps> = ({ query, searchResults }) => {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Search Results for "{query}"
      </h1>
      {searchResults && (
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Found {searchResults.total_results} results
        </p>
      )}
    </div>
  );
};

export default SearchResultsHeader;
