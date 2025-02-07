import { useQuery } from "@tanstack/react-query";
import { Article } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Edit2, Trash2 } from "lucide-react";
import EditArticleDialog from "@/components/edit-article-dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

export default function BlogManagementPage() {
  const { user } = useAuth();
  const { data: articles, isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
  });
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const { toast } = useToast();

  const userArticles = articles?.filter(
    (article) => article.authorId === user?.id
  );

  const deleteArticle = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/articles/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({
        title: "Success",
        description: "Article deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Blog Management</h1>
      </div>

      <div className="grid gap-6">
        {userArticles?.map((article) => (
          <Card key={article.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{article.title}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingArticle(article)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteArticle(article.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {article.keywords.map((keyword, i) => (
                  <Badge key={i} variant="secondary">
                    {keyword.replace(/\*\*/g, '')}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground line-clamp-3">
                {article.content}
              </p>
              <div className="mt-4 text-sm text-muted-foreground">
                {format(new Date(article.createdAt), "MMMM d, yyyy")}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editingArticle && (
        <EditArticleDialog
          article={editingArticle}
          open={!!editingArticle}
          onOpenChange={(open) => !open && setEditingArticle(null)}
        />
      )}
    </div>
  );
}
