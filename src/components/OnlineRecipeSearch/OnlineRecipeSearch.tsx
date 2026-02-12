'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './OnlineRecipeSearch.module.scss';

interface SearchResult {
  url: string;
  term: string;
  image?: string;
}

interface OnlineRecipeSearchProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onSelectRecipe: (result: SearchResult) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export default function OnlineRecipeSearch({
  searchTerm,
  onSearchTermChange,
  onSelectRecipe,
  placeholder = 'Cerca ricette online...',
  autoFocus = false,
  className = '',
}: OnlineRecipeSearchProps) {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSearch = async () => {
    if (searchTerm.length < 2) return;

    setIsSearching(true);
    setHasSearched(true);
    setCurrentPage(1);
    try {
      const response = await fetch(
        `/api/search-recipes?q=${encodeURIComponent(searchTerm)}&page=1&page_size=10`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
        setHasMore(data.pagination?.has_more || false);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const response = await fetch(
        `/api/search-recipes?q=${encodeURIComponent(searchTerm)}&page=${nextPage}&page_size=10`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults((prev) => [...prev, ...(data.results || [])]);
        setHasMore(data.pagination?.has_more || false);
        setCurrentPage(nextPage);
      }
    } catch (err) {
      console.error('Load more error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const bottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    if (bottom && hasMore && !isLoadingMore) {
      handleLoadMore();
    }
  };

  const handleSelectResult = async (result: SearchResult) => {
    setLoadingUrl(result.url);
    try {
      await onSelectRecipe(result);
    } finally {
      setLoadingUrl(null);
    }
  };

  // Auto-load more results if container is not scrollable (wide displays)
  // or if user is at the bottom after previous load completes
  useEffect(() => {
    const checkScrollable = async () => {
      if (!resultsRef.current || isLoadingMore || !hasMore || searchResults.length === 0) {
        return;
      }

      const element = resultsRef.current;
      const isScrollable = element.scrollHeight > element.clientHeight;
      const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
      
      if ((!isScrollable || isAtBottom) && hasMore && !isLoadingMore) {
        // Container is not scrollable OR user is at bottom, load more
        handleLoadMore();
      }
    };

    // Check after results render and after loading completes
    const timeoutId = setTimeout(checkScrollable, 100);
    return () => clearTimeout(timeoutId);
  }, [searchResults.length, hasMore, isLoadingMore]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChange = (value: string) => {
    onSearchTermChange(value);
    setHasSearched(false);
  };

  return (
    <div className={`${styles.onlineRecipeSearch} ${className}`}>
      <div className={styles.onlineSearchInputWrapper}>
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              handleSearch();
            }
          }}
          className={styles.onlineSearchInput}
          autoFocus={autoFocus}
        />
        <button
          type="button"
          className={`btn btn-primary btn-sm ${styles.searchButton}`}
          onClick={handleSearch}
          disabled={isSearching || searchTerm.length < 2}
        >
          {isSearching ? (
            <i className="bi bi-hourglass-split"></i>
          ) : (
            <i className="bi bi-search"></i>
          )}
        </button>
      </div>

      {searchResults.length > 0 ? (
        <>
          <div className={styles.onlineSearchResults} ref={resultsRef} onScroll={handleScroll}>
            {searchResults.map((result, index) => (
              <button
                key={`result-${index}`}
                className="recipe-selector-item-card"
                onClick={() => handleSelectResult(result)}
                disabled={loadingUrl === result.url}
              >
                {loadingUrl === result.url ? (
                  <div className="recipe-selector-loading">
                    <i className="bi bi-hourglass-split"></i> Caricamento...
                  </div>
                ) : (
                  <>
                    {result.image ? (
                      <>
                        <img src={result.image} alt={result.term} className="recipe-selector-card-image" />
                        <div className="recipe-selector-card-overlay"></div>
                        <span className="recipe-selector-card-title">{result.term}</span>
                      </>
                    ) : (
                      <>
                        <div className="recipe-selector-card-placeholder"></div>
                        <span className="recipe-selector-card-title">{result.term}</span>
                      </>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
          <div className={styles.onlineSearchLoadingMore}>
            {isLoadingMore && <i className="bi bi-arrow-repeat spinning"></i>}
          </div>
        </>
      ) : hasSearched && searchResults.length === 0 ? (
        <div className={styles.onlineSearchEmpty}>
          <p style={{ color: 'var(--text-secondary)' }}>
            {isSearching ? 'Ricerca in corso...' : 'Nessun risultato. Prova con altri termini.'}
          </p>
        </div>
      ) : null}
    </div>
  );
}
