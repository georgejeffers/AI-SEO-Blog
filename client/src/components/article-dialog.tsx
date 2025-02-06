import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Article } from "@shared/schema";
import { format } from "date-fns";

interface ArticleDialogProps {
  article: Article;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ArticleDialog({ article, open, onOpenChange }: ArticleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{article.title}</DialogTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            {article.keywords.map((keyword, i) => (
              <Badge key={i} variant="secondary">
                {keyword}
              </Badge>
            ))}
          </div>
        </DialogHeader>
        <div className="mt-4">
          <div className="prose prose-sm dark:prose-invert">
            {article.content.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Published on {format(new Date(article.createdAt), "MMMM d, yyyy")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
