import { useQuery } from "@tanstack/react-query";
import { Article } from "@shared/schema";
import ArticleCard from "@/components/article-card";
import { Loader2 } from "lucide-react";
import ArticleSearch from "@/components/article-search";

export default function BlogPage() {
  const { data: articles, isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-8">Blog Articles</h1>
      <div className="mb-8">
        <ArticleSearch />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {articles?.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}