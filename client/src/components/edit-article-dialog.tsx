import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Article, insertArticleSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface EditArticleDialogProps {
  article: Article;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditArticleDialog({
  article,
  open,
  onOpenChange,
}: EditArticleDialogProps) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(insertArticleSchema),
    defaultValues: {
      title: article.title,
      content: article.content,
      keywords: article.keywords,
      seoScore: article.seoScore,
      authorId: article.authorId,
    },
  });

  const updateArticle = useMutation({
    mutationFn: async (data: Partial<Article>) => {
      const res = await apiRequest("PUT", `/api/articles/${article.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Article updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    updateArticle.mutate(data);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Article</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Article Title"
              {...form.register("title")}
              required
            />
          </div>

          <div className="space-y-2">
            <Input
              placeholder="Keywords (comma separated)"
              defaultValue={article.keywords.join(", ")}
              onChange={(e) => {
                const keywords = e.target.value
                  .split(",")
                  .map((k) => k.trim())
                  .filter((k) => k.length > 0);
                form.setValue("keywords", keywords);
              }}
              required
            />
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="Article Content"
              className="min-h-[400px]"
              {...form.register("content")}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={updateArticle.isPending}
          >
            {updateArticle.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Update Article
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
