import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertArticleSchema } from "@shared/schema";
import { generateArticleIdeas, generateArticleContent } from "./services/gemini";

function cleanContent(content: string): string {
  // Remove extra ** from keywords
  if (Array.isArray(content)) {
    return content.map(item => item.replace(/\*\*/g, ''));
  }

  // Clean up markdown-style formatting
  return content
    .replace(/\*\*\s*(.*?)\s*\*\*/g, '$1') // Remove ** around text
    .replace(/^#+\s*/gm, '') // Remove markdown headers
    .trim();
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Articles API
  app.get("/api/articles", async (_req, res) => {
    const articles = await storage.getArticles();
    // Clean the content and keywords before sending
    const cleanedArticles = articles.map(article => ({
      ...article,
      content: cleanContent(article.content),
      keywords: article.keywords.map(k => cleanContent(k))
    }));
    res.json(cleanedArticles);
  });

  app.get("/api/articles/:id", async (req, res) => {
    const article = await storage.getArticle(parseInt(req.params.id));
    if (!article) return res.sendStatus(404);

    // Clean the content and keywords before sending
    const cleanedArticle = {
      ...article,
      content: cleanContent(article.content),
      keywords: article.keywords.map(k => cleanContent(k))
    };
    res.json(cleanedArticle);
  });

  app.post("/api/articles", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parseResult = insertArticleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json(parseResult.error);
    }

    const article = await storage.createArticle({
      ...parseResult.data,
      authorId: req.user.id,
    });
    res.status(201).json(article);
  });

  // New endpoints for AI article generation
  app.post("/api/articles/ideas", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { keyword } = req.body;
    if (!keyword) {
      return res.status(400).json({ message: "Keyword is required" });
    }

    try {
      const ideas = await generateArticleIdeas(keyword);
      res.json(ideas);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate article ideas" });
    }
  });

  app.post("/api/articles/generate", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { title, keyword } = req.body;
    if (!title || !keyword) {
      return res.status(400).json({ message: "Title and keyword are required" });
    }

    try {
      const generated = await generateArticleContent(title, keyword);
      const article = await storage.createArticle({
        title,
        content: generated.content,
        keywords: generated.keywords,
        seoScore: generated.seoScore,
        authorId: req.user.id,
      });
      res.json(article);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate article content" });
    }
  });

  app.put("/api/articles/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const article = await storage.getArticle(parseInt(req.params.id));
    if (!article) return res.sendStatus(404);
    if (article.authorId !== req.user.id) return res.sendStatus(403);

    const parseResult = insertArticleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json(parseResult.error);
    }

    const updated = await storage.updateArticle(article.id, parseResult.data);
    res.json(updated);
  });

  app.delete("/api/articles/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const article = await storage.getArticle(parseInt(req.params.id));
    if (!article) return res.sendStatus(404);
    if (article.authorId !== req.user.id) return res.sendStatus(403);

    await storage.deleteArticle(article.id);
    res.sendStatus(204);
  });

  const httpServer = createServer(app);
  return httpServer;
}