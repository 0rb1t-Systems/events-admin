import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadMoreButtonProps {
  isLoading: boolean;
  onClick: () => void;
}

const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({ isLoading, onClick }) => {
  return (
    <div className="p-4 text-center border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={onClick}
        disabled={isLoading}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading...
          </>
        ) : (
          'Load More Results'
        )}
      </button>
    </div>
  );
};

export default LoadMoreButton;
