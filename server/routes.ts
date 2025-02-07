import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertArticleSchema } from "@shared/schema";
import { generateArticleIdeas, generateArticleContent } from "./services/gemini";
import express from "express";

function cleanContent(content: string): string | string[] {
  // Handle array of strings (like keywords)
  if (Array.isArray(content)) {
    return content.map(item => 
      item
        .replace(/^\*\*/, '') // Remove starting **
        .replace(/\*\*$/, '') // Remove ending **
        .replace(/\*\*/g, '') // Remove any remaining **
        .trim()
    );
  }

  // Clean up markdown-style formatting in content
  let cleanedContent = content
    .replace(/^\*\*/, '') // Remove starting **
    .replace(/\*\*$/, '') // Remove ending **
    .replace(/\*\*\s*(.*?)\s*\*\*/g, '$1') // Remove ** around text
    .replace(/^#+\s*/gm, '') // Remove markdown headers
    .replace(/^\*\s+/gm, '• ') // Replace markdown bullets with bullet points
    .replace(/\*\*/g, '') // Remove any remaining **
    .trim();

  // Remove KEYWORDS section and everything after it
  const keywordsIndex = cleanedContent.indexOf('KEYWORDS:');
  if (keywordsIndex !== -1) {
    cleanedContent = cleanedContent.substring(0, keywordsIndex).trim();
  }

  return cleanedContent;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function generateUniqueSlug(title: string): Promise<string> {
  let slug = generateSlug(title);
  const articles = await storage.getArticles();
  let counter = 1;
  let uniqueSlug = slug;

  while (articles.some(article => article.slug === uniqueSlug)) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
}

export function registerRoutes(app: Express): Server {
  // Parse JSON bodies
  app.use(express.json());

  // Basic CORS setup
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  // Set up authentication
  setupAuth(app);

  // API Routes
  const apiRouter = express.Router();

  // Set JSON content type for all API routes
  apiRouter.use((req, res, next) => {
    res.type('application/json');
    next();
  });

  // Error handling middleware for API routes
  apiRouter.use((err: any, _req: any, res: any, next: any) => {
    if (res.headersSent) {
      return next(err);
    }
    console.error('API Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  // Article generation endpoint
  apiRouter.post("/articles/generate", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { title, keyword } = req.body;
      if (!title || !keyword) {
        return res.status(400).json({ error: "Title and keyword are required" });
      }

      const generated = await generateArticleContent(title, keyword);
      if (!generated) {
        throw new Error("Failed to generate article content");
      }

      const slug = await generateUniqueSlug(title);
      const article = await storage.createArticle({
        title,
        slug,
        content: generated.content,
        keywords: generated.keywords,
        seoScore: generated.seoScore,
        authorId: req.user.id,
      });

      res.json(article);
    } catch (error: any) {
      console.error('Article generation error:', error);
      res.status(500).json({ error: error.message || "Failed to generate article" });
    }
  });

  // Other article routes
  apiRouter.get("/articles", async (_req, res) => {
    try {
      const articles = await storage.getArticles();
      const cleanedArticles = articles.map(article => ({
        ...article,
        content: cleanContent(article.content),
        keywords: article.keywords.map(k => cleanContent(k))
      }));
      res.json(cleanedArticles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

    apiRouter.get("/articles/search/:query", async (req, res) => {
    try {
      const articles = await storage.searchArticles(req.params.query);
      const cleanedArticles = articles.map(article => ({
        ...article,
        content: cleanContent(article.content),
        keywords: article.keywords.map(k => cleanContent(k))
      }));
      res.json(cleanedArticles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.get("/articles/:slug", async (req, res) => {
    try {
      const article = await storage.getArticleBySlug(req.params.slug);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      const cleanedArticle = {
        ...article,
        content: cleanContent(article.content),
        keywords: article.keywords.map(k => cleanContent(k))
      };
      res.json(cleanedArticle);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.post("/articles", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const parseResult = insertArticleSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error });
      }

      const slug = await generateUniqueSlug(parseResult.data.title);
      const article = await storage.createArticle({
        ...parseResult.data,
        slug,
        authorId: req.user.id,
      });
      res.status(201).json(article);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.put("/articles/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const article = await storage.getArticle(parseInt(req.params.id));
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      if (article.authorId !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const parseResult = insertArticleSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error });
      }

      const slug = await generateUniqueSlug(parseResult.data.title);
      const updated = await storage.updateArticle(article.id, {
        ...parseResult.data,
        slug,
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.delete("/articles/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const article = await storage.getArticle(parseInt(req.params.id));
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      if (article.authorId !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await storage.deleteArticle(article.id);
      res.status(204).json({});
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Mount the API router
  app.use('/api', apiRouter);

  const httpServer = createServer(app);
  return httpServer;
}