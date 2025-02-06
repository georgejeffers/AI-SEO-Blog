import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { insertArticleSchema, InsertArticle } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function ArticleForm() {
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<InsertArticle>({
    resolver: zodResolver(insertArticleSchema),
    defaultValues: {
      title: "",
      content: "",
      keywords: [],
      seoScore: { score: 0, suggestions: [] },
      authorId: user?.id,
    },
  });

  const createArticle = useMutation({
    mutationFn: async (data: InsertArticle) => {
      const articleData = {
        ...data,
        authorId: user?.id,
      };
      const res = await apiRequest("POST", "/api/articles", articleData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      form.reset();
      toast({
        title: "Success",
        description: "Article created successfully",
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
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create articles",
        variant: "destructive",
      });
      return;
    }
    createArticle.mutate(data);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Input
          placeholder="Article Title"
          {...form.register("title")}
          required
        />
        {form.formState.errors.title && (
          <p className="text-sm text-destructive">
            {form.formState.errors.title.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Input
          placeholder="Keywords (comma separated)"
          onChange={(e) => {
            const keywords = e.target.value
              .split(",")
              .map((k) => k.trim())
              .filter((k) => k.length > 0);
            form.setValue("keywords", keywords);
          }}
          required
        />
        {form.formState.errors.keywords && (
          <p className="text-sm text-destructive">
            {form.formState.errors.keywords.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="Article Content"
          className="min-h-[200px]"
          {...form.register("content")}
          required
        />
        {form.formState.errors.content && (
          <p className="text-sm text-destructive">
            {form.formState.errors.content.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={createArticle.isPending}
      >
        {createArticle.isPending && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        Generate Article
      </Button>
    </form>
  );
}