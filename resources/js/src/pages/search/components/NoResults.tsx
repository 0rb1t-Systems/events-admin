import React from 'react';
import { Search } from 'lucide-react';

interface NoResultsProps {
  query: string;
}

const NoResults: React.FC<NoResultsProps> = ({ query }) => {
  return (
    <div className="text-center py-12">
      <Search className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No results found</h3>
      <p className="text-gray-600 dark:text-gray-400">
        We couldn't find any results for "{query}". Please try another search term.
      </p>
    </div>
  );
};

export default NoResults;
