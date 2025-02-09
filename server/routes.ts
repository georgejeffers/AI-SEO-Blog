import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertArticleSchema } from "@shared/schema";
import { generateArticleIdeas, generateArticleContent } from "./services/openai";
import express from "express";

function cleanContent(content: string): string | string[] {
  if (Array.isArray(content)) {
    return content.map(item => 
      item
        .replace(/^\*\*/, '')
        .replace(/\*\*$/, '')
        .replace(/\*\*/g, '')
        .trim()
    );
  }

  let cleanedContent = content
    .replace(/^\*\*/, '')
    .replace(/\*\*$/, '')
    .replace(/\*\*\s*(.*?)\s*\*\*/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/^\*\s+/gm, '• ')
    .replace(/\*\*/g, '')
    .trim();

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
  // Set up authentication first
  setupAuth(app);

  // API router setup
  const apiRouter = express.Router();

  // API middleware
  apiRouter.use(express.json({
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf.toString());
      } catch (e) {
        console.error('JSON Parse Error:', e);
        res.status(400).json({ error: 'Invalid JSON' });
        throw new Error('Invalid JSON');
      }
    }
  }));

  apiRouter.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Get articles for a specific user's blog
  apiRouter.get("/users/:username/articles", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const articles = await storage.getArticlesByAuthor(user.id);
      const cleanedArticles = articles.map(article => ({
        ...article,
        content: cleanContent(article.content),
        keywords: article.keywords.map(k => cleanContent(k))
      }));
      res.json(cleanedArticles);
    } catch (error: any) {
      console.error("Error fetching user's articles:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's blog information
  apiRouter.get("/users/:username/blog", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        username: user.username,
        displayName: user.displayName,
        blogTitle: user.blogTitle,
        blogDescription: user.blogDescription
      });
    } catch (error: any) {
      console.error("Error fetching user's blog info:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update user's blog information
  apiRouter.put("/users/blog", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { displayName, blogTitle, blogDescription } = req.body;
      const updatedUser = await storage.updateUser(req.user.id, {
        displayName,
        blogTitle,
        blogDescription
      });

      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating user's blog info:", error);
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.post("/articles/ideas", async (req, res) => {
    try {
      console.log('Generate Ideas Request Body:', req.body);

      const { keyword, preferences } = req.body;
      if (!keyword) {
        return res.status(400).json({ error: "Keyword is required" });
      }

      const ideas = await generateArticleIdeas(keyword, preferences);
      res.json(ideas);
    } catch (error: any) {
      console.error('Error generating article ideas:', error);
      res.status(500).json({ error: error.message || "Failed to generate ideas" });
    }
  });

  apiRouter.post("/articles/generate", async (req, res) => {
    try {
      console.log('Generate Article Request Body:', req.body);

      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { title, keyword, preferences } = req.body;
      if (!title || !keyword) {
        return res.status(400).json({ error: "Title and keyword are required" });
      }

      const generated = await generateArticleContent(title, keyword, preferences);
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
      console.error('Error generating article:', error);
      res.status(500).json({ error: error.message || "Failed to generate article" });
    }
  });

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
      console.error("Error fetching articles:", error);
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
      console.error("Error searching articles:", error);
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
      console.error("Error fetching article:", error);
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
      console.error("Error creating article:", error);
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
      console.error("Error updating article:", error);
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
      console.error("Error deleting article:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Mount API router at /api path
  app.use('/api', (req, res, next) => {
    console.log(`API ${req.method} ${req.path}`, {
      headers: req.headers,
      body: req.body,
      query: req.query
    });
    next();
  }, apiRouter);

  const httpServer = createServer(app);
  return httpServer;
}