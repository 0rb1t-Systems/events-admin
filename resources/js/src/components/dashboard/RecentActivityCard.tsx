import React from "react";
import { format, parseISO } from "date-fns";
import {
    BookText,
    ChevronsRight,
    Eye,
    FileTextIcon,
    Loader2,
    Tag,
    User,
} from "lucide-react";
import { Link } from "react-router-dom";

interface RecentWord {
    id: number;
    word: string;
    meaning: string;
    user_id: number;
    created_at: string;
    user?: {
        id: number;
        name: string;
    };
}

interface RecentBook {
    id: number;
    title: string;
    author: string;
    created_at: string;
    categories?: {
        id: number;
        name: string;
    }[];
}

interface RecentActivityCardProps {
    title: string;
    viewAllLink: string;
    loading: boolean;
    type: "words" | "books";
    items: RecentWord[] | RecentBook[];
}

const RecentActivityCard: React.FC<RecentActivityCardProps> = ({
    title,
    viewAllLink,
    loading,
    type,
    items,
}) => {
    return (
        <div className="panel h-full">
            <div className="flex items-center justify-between mb-5">
                <h5 className="font-semibold text-lg dark:text-white-light">
                    {title}
                </h5>
                <Link
                    to={viewAllLink}
                    className="font-semibold text-primary text-sm hover:underline flex items-center"
                >
                    <span>View All</span>
                    <ChevronsRight className="w-4 h-4 ml-1" />
                </Link>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-[350px]">
                    <Loader2 className="animate-spin h-8 w-8 text-primary" />
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 h-[350px] flex items-center justify-center">
                    <div>
                        {type === "words" ? (
                            <FileTextIcon className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
                        ) : (
                            <BookText className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
                        )}
                        No recent {type} available
                    </div>
                </div>
            ) : (
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                    {type === "words"
                        ? // Words rendering
                          (items as RecentWord[]).map((word) => (
                              <div
                                  key={word.id}
                                  className="bg-white dark:bg-black rounded-md border border-gray-100 dark:border-gray-800 p-3 shadow-sm hover:shadow-md transition-all duration-300"
                              >
                                  <div className="flex items-start">
                                      <div className="w-10 h-10 rounded-md bg-primary-light text-primary dark:bg-primary/20 grid place-content-center">
                                          <FileTextIcon size={20} />
                                      </div>
                                      <div className="ml-3 flex-1">
                                          <div className="flex items-center justify-between">
                                              <h6 className="text-base font-semibold dark:text-white-light mb-1">
                                                  {word.word}
                                              </h6>
                                              <span className="text-xs text-gray-500">
                                                  {format(
                                                      parseISO(word.created_at),
                                                      "MMM dd"
                                                  )}
                                              </span>
                                          </div>
                                          <p className="text-gray-500 text-sm mb-1">
                                              {word.meaning?.substring(0, 60)}
                                              {word.meaning?.length > 60
                                                  ? "..."
                                                  : ""}
                                          </p>
                                          <div className="flex items-center justify-between text-xs mt-2">
                                              <div className="flex items-center text-gray-400">
                                                  <User
                                                      size={14}
                                                      className="mr-1"
                                                  />
                                                  <span>
                                                      {word.user?.name ||
                                                          "System"}
                                                  </span>
                                              </div>
                                              <Link
                                                  to={`/vocabularies?view=${word.id}`}
                                                  className="text-primary hover:underline flex items-center"
                                              >
                                                  <Eye
                                                      size={14}
                                                      className="mr-1"
                                                  />
                                                  View
                                              </Link>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))
                        : // Books rendering
                          (items as RecentBook[]).map((book) => (
                              <div
                                  key={book.id}
                                  className="bg-white dark:bg-black rounded-md border border-gray-100 dark:border-gray-800 p-3 shadow-sm hover:shadow-md transition-all duration-300"
                              >
                                  <div className="flex items-start">
                                      <div className="w-10 h-10 rounded-md bg-info-light text-info dark:bg-info/20 grid place-content-center">
                                          <BookText size={20} />
                                      </div>
                                      <div className="ml-3 flex-1">
                                          <div className="flex items-center justify-between">
                                              <h6 className="text-base font-semibold dark:text-white-light mb-1">
                                                  {book.title}
                                              </h6>
                                              <span className="text-xs text-gray-500">
                                                  {format(
                                                      parseISO(book.created_at),
                                                      "MMM dd"
                                                  )}
                                              </span>
                                          </div>
                                          <p className="text-gray-500 text-sm mb-1">
                                              {book.author}
                                          </p>
                                          <div className="flex items-center justify-between text-xs mt-2">
                                              <div className="flex items-center text-gray-400">
                                                  <Tag
                                                      size={14}
                                                      className="mr-1"
                                                  />
                                                  <span>
                                                      {book.categories &&
                                                      book.categories.length > 0
                                                          ? book.categories
                                                                .map(
                                                                    (cat) =>
                                                                        cat.name
                                                                )
                                                                .join(", ")
                                                          : "Uncategorized"}
                                                  </span>
                                              </div>
                                              <Link
                                                  to={`/books?view=${book.id}`}
                                                  className="text-primary hover:underline flex items-center"
                                              >
                                                  <Eye
                                                      size={14}
                                                      className="mr-1"
                                                  />
                                                  View
                                              </Link>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))}
                </div>
            )}
        </div>
    );
};

export default RecentActivityCard;
