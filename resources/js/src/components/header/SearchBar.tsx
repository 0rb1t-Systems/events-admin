import React, { useState, FormEvent, useEffect, useRef } from 'react';
import { Search, XCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const SearchBar = () => {
    const [search, setSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Update search query from URL parameters when location changes
    useEffect(() => {
        // Parse the current URL query parameters
        const queryParams = new URLSearchParams(location.search);
        const q = queryParams.get('q');

        // If there's a query parameter named 'q', update the search input
        if (q) {
            setSearchQuery(q);
        }
    }, [location]);

    // Add keyboard shortcut listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Ctrl+K or Cmd+K
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
                setSearch(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            setSearch(false);
        }
    };

    // Clear search input
    const clearSearch = () => {
        setSearchQuery('');
        if (location.pathname === '/search') {
            navigate('/search'); // Navigate to search without params
        }
    };

    return (
        <div className="sm:ltr:mr-auto sm:rtl:ml-auto">
            <form
                className={`${search && '!block'} sm:relative absolute inset-x-0 sm:top-0 top-1/2 sm:translate-y-0 -translate-y-1/2 sm:mx-0 mx-4 z-10 sm:block hidden`}
                onSubmit={handleSearch}
            >
                <div className="relative">
                    <input
                        ref={searchInputRef}
                        type="text"
                        className="form-input ltr:pl-9 rtl:pr-9 ltr:sm:pr-4 rtl:sm:pl-4 ltr:pr-9 rtl:pl-9 peer sm:bg-transparent bg-gray-100 placeholder:tracking-widest"
                        placeholder="Search... (Ctrl+K)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="absolute w-9 h-9 inset-0 ltr:right-auto rtl:left-auto appearance-none peer-focus:text-primary"
                    >
                        <Search size={20} className="mx-auto" />
                    </button>
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={clearSearch}
                            className="absolute top-1/2 -translate-y-1/2 ltr:right-2 rtl:left-2 hover:opacity-80"
                        >
                            <XCircle size={18} />
                        </button>
                    )}
                </div>
            </form>
            <button
                type="button"
                onClick={() => setSearch(!search)}
                className="search_btn sm:hidden p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:bg-white-light/90 dark:hover:bg-dark/60"
            >
                <Search size={18} className="w-4.5 h-4.5 mx-auto dark:text-[#d0d2d6]" />
            </button>
        </div>
    );
};

export default SearchBar;
