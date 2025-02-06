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

export default function ArticleForm() {
  const { toast } = useToast();
  const form = useForm<InsertArticle>({
    resolver: zodResolver(insertArticleSchema),
    defaultValues: {
      title: "",
      content: "",
      keywords: [],
      seoScore: {},
    },
  });

  const createArticle = useMutation({
    mutationFn: async (data: InsertArticle) => {
      const res = await apiRequest("POST", "/api/articles", data);
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

  return (
    <form
      onSubmit={form.handleSubmit((data) => createArticle.mutate(data))}
      className="space-y-4"
    >
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
          {...form.register("keywords")}
          onChange={(e) => {
            const keywords = e.target.value.split(",").map((k) => k.trim());
            form.setValue("keywords", keywords);
          }}
          required
        />
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
