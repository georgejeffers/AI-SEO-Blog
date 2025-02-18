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
      const response = await fetch(`/api/articles/${encodeURIComponent(slug)}`);
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

  // Split content into sections based on headings
  const sections = article.content
    .split(/(?=^#{1,3}\s)/m)
    .map(section => section.trim())
    .filter(Boolean);

  return (
    <div className="container mx-auto py-8 px-4">
      <article className="prose prose-lg dark:prose-invert mx-auto">
        <h1 className="mb-4">{article.title}</h1>
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
        <div className="space-y-6">
          {sections.map((section, index) => {
            // Convert markdown-style headers to HTML
            const processedSection = section
              .replace(/^(#{1,3})\s(.*)$/m, (_, level, text) => {
                const headingLevel = level.length + 1; // h2-h4
                return `<h${headingLevel}>${text}</h${headingLevel}>\n\n`;
              });

            return (
              <div 
                key={index} 
                className="whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: processedSection }}
              />
            );
          })}
        </div>
      </article>
    </div>
  );
}