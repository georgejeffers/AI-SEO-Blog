import { useQuery } from "@tanstack/react-query";
import { Article } from "@shared/schema";
import ArticleCard from "@/components/article-card";
import { Loader2 } from "lucide-react";
import ArticleSearch from "@/components/article-search";
import { useParams } from "wouter";

interface BlogInfo {
  username: string;
  displayName?: string;
  blogTitle?: string;
  blogDescription?: string;
}

export default function BlogPage() {
  const params = useParams();
  const username = params.username;

  const { data: blogInfo, isLoading: isLoadingBlogInfo } = useQuery<BlogInfo>({
    queryKey: [`/api/users/${username}/blog`],
    enabled: !!username,
  });

  const { data: articles, isLoading: isLoadingArticles } = useQuery<Article[]>({
    queryKey: [username ? `/api/users/${username}/articles` : '/api/articles'],
  });

  if (isLoadingBlogInfo || isLoadingArticles) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {username && blogInfo ? (
        <>
          <h1 className="text-4xl font-bold mb-2">{blogInfo.blogTitle || `${blogInfo.username}'s Blog`}</h1>
          {blogInfo.blogDescription && (
            <p className="text-lg text-muted-foreground mb-8">{blogInfo.blogDescription}</p>
          )}
        </>
      ) : (
        <h1 className="text-4xl font-bold mb-8">All Blog Articles</h1>
      )}

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