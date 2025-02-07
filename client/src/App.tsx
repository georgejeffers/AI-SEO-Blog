import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/use-auth";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ProtectedRoute } from "./lib/protected-route";

import HomePage from "@/pages/home-page";
import BlogPage from "@/pages/blog-page";
import BlogManagementPage from "@/pages/blog-management";
import ArticlePage from "@/pages/article-page";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <Route path="/blog" component={BlogPage} />
      <ProtectedRoute path="/blog/manage" component={BlogManagementPage} />
      <Route path="/blog/:username">
        {(params) => <BlogPage username={params.username} />}
      </Route>
      <Route path="/blog/:slug">
        {(params) => <ArticlePage slug={params.slug} />}
      </Route>
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;