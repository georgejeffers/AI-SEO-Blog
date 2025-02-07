import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Settings } from "lucide-react";
import { Label } from "@/components/ui/label";

interface WritingPreferences {
  context: string;
  explicitness: number;
}

export function WritingPreferencesDialog() {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<WritingPreferences>(() => {
    const saved = localStorage.getItem("writingPreferences");
    return saved ? JSON.parse(saved) : { context: "", explicitness: 1 };
  });
  const { toast } = useToast();

  const savePreferences = () => {
    localStorage.setItem("writingPreferences", JSON.stringify(preferences));
    toast({
      title: "Preferences Saved",
      description: "Your writing preferences have been updated.",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Settings className="h-4 w-4" />
          Writing Preferences
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Writing Preferences</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>
              Content Context
              <span className="text-xs text-muted-foreground ml-2">
                (URLs, messages, or themes to naturally include)
              </span>
            </Label>
            <Textarea
              placeholder="Enter websites, messages, or themes you want to promote in your content..."
              value={preferences.context}
              onChange={(e) =>
                setPreferences({ ...preferences, context: e.target.value })
              }
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label>
              Promotion Explicitness
              <span className="text-xs text-muted-foreground ml-2">
                (1: Very Subtle - 5: Very Obvious)
              </span>
            </Label>
            <div className="flex items-center space-x-4">
              <Slider
                min={1}
                max={5}
                step={1}
                value={[preferences.explicitness]}
                onValueChange={([value]) =>
                  setPreferences({ ...preferences, explicitness: value })
                }
                className="flex-1"
              />
              <span className="w-8 text-center font-mono">
                {preferences.explicitness}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {preferences.explicitness === 1 && "Natural integration in content"}
              {preferences.explicitness === 2 && "Subtle mentions in paragraphs"}
              {preferences.explicitness === 3 && "Regular mentions throughout"}
              {preferences.explicitness === 4 && "Prominent placement & frequent mentions"}
              {preferences.explicitness === 5 && "Featured in titles & throughout content"}
            </p>
          </div>

          <Button onClick={savePreferences} className="w-full">
            Save Preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
