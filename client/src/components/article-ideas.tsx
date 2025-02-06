import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ArticleIdeasProps {
  onSelectIdea: (title: string, keyword: string) => void;
}

export default function ArticleIdeas({ onSelectIdea }: ArticleIdeasProps) {
  const [keyword, setKeyword] = useState("");
  const [ideas, setIdeas] = useState<string[]>([]);
  const { toast } = useToast();

  const generateIdeas = useMutation({
    mutationFn: async (keyword: string) => {
      const res = await apiRequest("POST", "/api/articles/ideas", { keyword });
      return res.json();
    },
    onSuccess: (data: string[]) => {
      setIdeas(data);
      toast({
        title: "Success",
        description: "Article ideas generated successfully",
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

  const generateArticle = useMutation({
    mutationFn: async ({ title, keyword }: { title: string; keyword: string }) => {
      const res = await apiRequest("POST", "/api/articles/generate", {
        title,
        keyword,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Article generated successfully",
      });
      setIdeas([]);
      setKeyword("");
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
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Enter a keyword for article ideas..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          disabled={generateIdeas.isPending}
        />
        <Button
          onClick={() => generateIdeas.mutate(keyword)}
          disabled={!keyword || generateIdeas.isPending}
        >
          {generateIdeas.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Generate Ideas
        </Button>
      </div>

      {ideas.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">Select articles to generate:</h3>
          {ideas.map((idea, index) => (
            <Card key={index}>
              <CardContent className="flex items-center justify-between p-4">
                <p>{idea}</p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      generateArticle.mutate({ title: idea, keyword });
                      onSelectIdea(idea, keyword);
                    }}
                    disabled={generateArticle.isPending}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newIdeas = ideas.filter((_, i) => i !== index);
                      setIdeas(newIdeas);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
