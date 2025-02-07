import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Article } from "@shared/schema";
import { format } from "date-fns";
import { Link } from "wouter";

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  return (
    <Link href={`/blog/${article.slug}`}>
      <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
        <CardHeader>
          <CardTitle>{article.title}</CardTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            {article.keywords.map((keyword, i) => (
              <Badge key={i} variant="secondary">
                {keyword}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground line-clamp-3">
            {article.content.split('\n')[0]}
          </p>
          <div className="mt-4 text-sm text-muted-foreground">
            {format(new Date(article.createdAt), "MMM d, yyyy")}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}