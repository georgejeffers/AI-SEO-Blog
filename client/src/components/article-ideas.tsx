import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ArticleIdeasProps {
  onSelectIdea: (title: string, keyword: string) => void;
}

interface IdeaItem {
  title: string;
  selected: boolean;
}

interface WritingPreferences {
  context?: string;
  explicitness?: number;
  userPreferences?: string;
}

export default function ArticleIdeas({ onSelectIdea }: ArticleIdeasProps) {
  const [keyword, setKeyword] = useState("");
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const { toast } = useToast();

  const getWritingPreferences = (): WritingPreferences | undefined => {
    const saved = localStorage.getItem("writingPreferences");
    if (!saved) return undefined;
    
    const prefs = JSON.parse(saved);
    console.log("Retrieved writing preferences:", prefs);
    
    // Validate preferences
    if (!prefs.context?.trim() || !prefs.explicitness) {
      console.log("Invalid preferences found:", prefs);
      return undefined;
    }
    
    return prefs;
  };

  const generateIdeas = useMutation({
    mutationFn: async (keyword: string) => {
      const preferences = getWritingPreferences();
      console.log("Sending preferences to API:", preferences);
      const res = await apiRequest("POST", "/api/articles/ideas", { 
        keyword,
        preferences 
      });
      return res.json();
    },
    onSuccess: (data: string[]) => {
      setIdeas(data.map(title => ({ title, selected: false })));
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
      const preferences = getWritingPreferences();
      console.log("Using preferences for article generation:", preferences);
      const res = await apiRequest("POST", "/api/articles/generate", {
        title,
        keyword,
        preferences
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({
        title: "Success",
        description: "Article generated successfully",
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

  const generateSelected = async () => {
    const selectedIdeas = ideas.filter(idea => idea.selected);
    for (const idea of selectedIdeas) {
      await generateArticle.mutateAsync({ title: idea.title, keyword });
    }
    setIdeas([]);
    setKeyword("");
  };

  const toggleIdeaSelection = (index: number) => {
    setIdeas(ideas.map((idea, i) => 
      i === index ? { ...idea, selected: !idea.selected } : idea
    ));
  };

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
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Select articles to generate:</h3>
            <Button
              onClick={generateSelected}
              disabled={!ideas.some(idea => idea.selected) || generateArticle.isPending}
            >
              {generateArticle.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Generate Selected
            </Button>
          </div>
          {ideas.map((idea, index) => (
            <Card key={index} className={idea.selected ? "border-primary" : ""}>
              <CardContent className="flex items-center justify-between p-4">
                <p>{idea.title}</p>
                <div className="flex gap-2">
                  <Button
                    variant={idea.selected ? "default" : "ghost"}
                    size="icon"
                    onClick={() => toggleIdeaSelection(index)}
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