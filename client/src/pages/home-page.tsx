import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Article } from "@shared/schema";
import ArticleForm from "@/components/article-form";
import ArticleIdeas from "@/components/article-ideas";
import DashboardStats from "@/components/dashboard-stats";
import { Link } from "wouter";
import {
  LayoutDashboard,
  LogOut,
  PenSquare,
  BookOpen,
  Sparkles,
  Settings,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { data: articles } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
  });
  const [showManualForm, setShowManualForm] = useState(false);

  const userArticles = articles?.filter(
    (article) => article.authorId === user?.id
  );

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <LayoutDashboard className="h-6 w-6" />
            <h1 className="text-xl font-bold">Content Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/blog">
              <Button variant="ghost">
                <BookOpen className="h-4 w-4 mr-2" />
                View All Blogs
              </Button>
            </Link>
            {user && (
              <Link href={`/blog/${user.username}`}>
                <Button variant="ghost">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Your Blog
                </Button>
              </Link>
            )}
            <Link href="/blog/manage">
              <Button variant="ghost">
                <Settings className="h-4 w-4 mr-2" />
                Manage Blog
              </Button>
            </Link>
            <Button
              variant="destructive"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center">
                <Sparkles className="h-6 w-6 mr-2" />
                Generate Articles
              </h2>
              <Button
                variant="outline"
                onClick={() => setShowManualForm(!showManualForm)}
              >
                {showManualForm ? "Use AI Generator" : "Write Manually"}
              </Button>
            </div>
            {showManualForm ? (
              <ArticleForm />
            ) : (
              <ArticleIdeas
                onSelectIdea={(title, keyword) => {
                  // Handle when an idea is selected
                  console.log("Selected:", title, keyword);
                }}
              />
            )}
          </div>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Dashboard Overview</h2>
            <DashboardStats articles={userArticles || []} />
          </div>
        </div>
      </main>
    </div>
  );
}