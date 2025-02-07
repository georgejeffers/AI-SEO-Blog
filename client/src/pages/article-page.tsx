import { useQuery } from "@tanstack/react-query";
import { Article } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface ArticlePageProps {
  slug: string;
}

export default function ArticlePage({ slug }: ArticlePageProps) {
  const { data: article, isLoading } = useQuery<Article>({
    queryKey: ["/api/articles", slug],
    queryFn: async () => {
      const response = await fetch(`/api/articles/${slug}`);
      if (!response.ok) throw new Error("Article not found");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-4xl font-bold">Article not found</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <article className="prose prose-lg dark:prose-invert mx-auto">
        <h1>{article.title}</h1>
        <div className="flex flex-wrap gap-2 my-4">
          {article.keywords.map((keyword, i) => (
            <Badge key={i} variant="secondary">
              {keyword}
            </Badge>
          ))}
        </div>
        <div className="text-sm text-muted-foreground mb-8">
          Published on {format(new Date(article.createdAt), "MMMM d, yyyy")}
        </div>
        {article.content.split('\n').map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </article>
    </div>
  );
}
