import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Article } from "@shared/schema";
import { FileText, BarChart } from "lucide-react";

interface DashboardStatsProps {
  articles: Article[];
}

export default function DashboardStats({ articles }: DashboardStatsProps) {
  const totalArticles = articles.length;
  const totalKeywords = articles.reduce(
    (acc, article) => acc + article.keywords.length,
    0
  );

  return (
    <div className="grid gap-4 grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalArticles}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Keywords</CardTitle>
          <BarChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalKeywords}</div>
        </CardContent>
      </Card>
    </div>
  );
}