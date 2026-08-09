import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Book, FileText, FolderOpen, Clock } from 'lucide-react';
import { IGlobalSearchItem } from '../../../services/globalSearch';

interface SearchItemProps {
  item: IGlobalSearchItem;
}

const getIconForType = (type: string) => {
  switch (type) {
    case 'word-entry':
      return <Search className="w-5 h-5 text-primary" />;
    case 'book':
      return <Book className="w-5 h-5 text-blue-500" />;
    case 'content-item':
      return <FileText className="w-5 h-5 text-green-500" />;
    case 'category':
      return <FolderOpen className="w-5 h-5 text-amber-500" />;
    default:
      return <Search className="w-5 h-5" />;
  }
};

const getFormattedDate = (dateString: string | null) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString();
};

const SearchItem: React.FC<SearchItemProps> = ({ item }) => {
  return (
    <Link
      to={item.url}
      className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
      key={`${item.type}-${item.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getIconForType(item.type)}</div>
        <div className="flex-1">
          <h3 className="text-base font-medium text-gray-900 dark:text-white">{item.title}</h3>
          {item.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="capitalize">{item.type ? item.type.replace('-', ' ') : ''}</span>
            {item.created_at && (
              <>
                <span className="mx-2">•</span>
                <Clock className="w-3 h-3 mr-1" />
                <span>{getFormattedDate(item.created_at)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default SearchItem;
