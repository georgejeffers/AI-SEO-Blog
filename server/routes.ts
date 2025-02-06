import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertArticleSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Articles API
  app.get("/api/articles", async (_req, res) => {
    const articles = await storage.getArticles();
    res.json(articles);
  });

  app.get("/api/articles/:id", async (req, res) => {
    const article = await storage.getArticle(parseInt(req.params.id));
    if (!article) return res.sendStatus(404);
    res.json(article);
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

  app.put("/api/articles/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const article = await storage.getArticle(parseInt(req.params.id));
    if (!article) return res.sendStatus(404);
    if (article.authorId !== req.user.id) return res.sendStatus(403);

    const updated = await storage.updateArticle(article.id, req.body);
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
