import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/Tabs';
import { IGlobalSearchResponse, IGlobalSearchItem } from '../../../services/globalSearch';
import SearchItem from './SearchItem';
import NoResults from './NoResults';
import LoadMoreButton from './LoadMoreButton';

interface SearchResultsTabsProps {
  activeTab: string;
  searchResults: IGlobalSearchResponse;
  query: string;
  paginationState: {
    [key: string]: {
      page: number;
      hasMore: boolean;
      items: IGlobalSearchItem[];
    };
  };
  isLoadingMore: boolean;
  onTabChange: (tab: string) => void;
  onLoadMore: (type: string) => void;
}

const SearchResultsTabs: React.FC<SearchResultsTabsProps> = ({
  activeTab,
  searchResults,
  query,
  paginationState,
  isLoadingMore,
  onTabChange,
  onLoadMore,
}) => {
  // Create "View All" links with the current query
  const createViewAllLink = (type: string) => `/search?q=${encodeURIComponent(query)}&type=${type}`;

  return (
    <Tabs defaultValue={activeTab} className="w-full">
      <TabsList className="w-full mb-4 border-b border-gray-200 dark:border-gray-700">
        <TabsTrigger
          value="all"
          onClick={() => onTabChange('all')}
        >
          All ({searchResults?.total_results})
        </TabsTrigger>
        <TabsTrigger
          value="word-entries"
          onClick={() => onTabChange('word-entries')}
        >
          Words ({searchResults?.total_per_category.word_entries})
        </TabsTrigger>
        <TabsTrigger
          value="books"
          onClick={() => onTabChange('books')}
        >
          Books ({searchResults?.total_per_category.books})
        </TabsTrigger>
        <TabsTrigger
          value="content-items"
          onClick={() => onTabChange('content-items')}
        >
          Content ({searchResults?.total_per_category.content_items})
        </TabsTrigger>
        <TabsTrigger
          value="categories"
          onClick={() => onTabChange('categories')}
        >
          Categories ({searchResults?.total_per_category.categories})
        </TabsTrigger>
      </TabsList>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <TabsContent value="all">
          {searchResults.total_results === 0 ? (
            <NoResults query={query} />
          ) : (
            <>
              {searchResults.results.word_entries.length > 0 && (
                <div className="mb-4">
                  <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 flex justify-between items-center">
                    <h2 className="font-medium">Words</h2>
                    <Link to={createViewAllLink('word-entries')} className="text-primary text-sm flex items-center">
                      View all <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                  {searchResults.results.word_entries.map((item) => (
                    <SearchItem key={`${item.type}-${item.id}`} item={item} />
                  ))}
                </div>
              )}

              {searchResults.results.books.length > 0 && (
                <div className="mb-4">
                  <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 flex justify-between items-center">
                    <h2 className="font-medium">Books</h2>
                    <Link to={createViewAllLink('books')} className="text-primary text-sm flex items-center">
                      View all <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                  {searchResults.results.books.map((item) => (
                    <SearchItem key={`${item.type}-${item.id}`} item={item} />
                  ))}
                </div>
              )}

              {searchResults.results.content_items.length > 0 && (
                <div className="mb-4">
                  <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 flex justify-between items-center">
                    <h2 className="font-medium">Content</h2>
                    <Link to={createViewAllLink('content-items')} className="text-primary text-sm flex items-center">
                      View all <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                  {searchResults.results.content_items.map((item) => (
                    <SearchItem key={`${item.type}-${item.id}`} item={item} />
                  ))}
                </div>
              )}

              {searchResults.results.categories.length > 0 && (
                <div>
                  <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 flex justify-between items-center">
                    <h2 className="font-medium">Categories</h2>
                    <Link to={createViewAllLink('categories')} className="text-primary text-sm flex items-center">
                      View all <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                  {searchResults.results.categories.map((item) => (
                    <SearchItem key={`${item.type}-${item.id}`} item={item} />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="word-entries">
          {paginationState['word-entries'].items.length === 0 ? (
            <NoResults query={query} />
          ) : (
            <>
              {paginationState['word-entries'].items.map((item) => (
                <SearchItem key={`${item.type}-${item.id}`} item={item} />
              ))}
              {paginationState['word-entries'].hasMore && (
                <LoadMoreButton
                  isLoading={isLoadingMore}
                  onClick={() => onLoadMore('word-entries')}
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="books">
          {paginationState['books'].items.length === 0 ? (
            <NoResults query={query} />
          ) : (
            <>
              {paginationState['books'].items.map((item) => (
                <SearchItem key={`${item.type}-${item.id}`} item={item} />
              ))}
              {paginationState['books'].hasMore && (
                <LoadMoreButton
                  isLoading={isLoadingMore}
                  onClick={() => onLoadMore('books')}
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="content-items">
          {paginationState['content-items'].items.length === 0 ? (
            <NoResults query={query} />
          ) : (
            <>
              {paginationState['content-items'].items.map((item) => (
                <SearchItem key={`${item.type}-${item.id}`} item={item} />
              ))}
              {paginationState['content-items'].hasMore && (
                <LoadMoreButton
                  isLoading={isLoadingMore}
                  onClick={() => onLoadMore('content-items')}
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="categories">
          {paginationState['categories'].items.length === 0 ? (
            <NoResults query={query} />
          ) : (
            <>
              {paginationState['categories'].items.map((item) => (
                <SearchItem key={`${item.type}-${item.id}`} item={item} />
              ))}
              {paginationState['categories'].hasMore && (
                <LoadMoreButton
                  isLoading={isLoadingMore}
                  onClick={() => onLoadMore('categories')}
                />
              )}
            </>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
};

export default SearchResultsTabs;
