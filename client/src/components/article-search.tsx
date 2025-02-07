import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Article } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import ArticleCard from "./article-card";
import { Loader2 } from "lucide-react";

export default function ArticleSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: articles, isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles/search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const response = await fetch(`/api/articles/search/${encodeURIComponent(debouncedQuery)}`);
      return response.json();
    },
    enabled: debouncedQuery.length > 0,
  });

  return (
    <div className="space-y-6">
      <Input
        type="search"
        placeholder="Search articles..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      )}

      {articles && articles.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {articles && articles.length === 0 && debouncedQuery && !isLoading && (
        <p className="text-center text-muted-foreground py-8">
          No articles found matching your search.
        </p>
      )}
    </div>
  );
}
