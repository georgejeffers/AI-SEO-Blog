import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertArticleSchema } from "@shared/schema";
import { generateArticleIdeas, generateArticleContent } from "./services/gemini";

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
  setupAuth(app);

  // Articles API
  app.get("/api/articles", async (_req, res) => {
    const articles = await storage.getArticles();
    const cleanedArticles = articles.map(article => ({
      ...article,
      content: cleanContent(article.content),
      keywords: article.keywords.map(k => cleanContent(k))
    }));
    res.json(cleanedArticles);
  });

  app.get("/api/articles/:slug", async (req, res) => {
    const article = await storage.getArticleBySlug(req.params.slug);
    if (!article) return res.sendStatus(404);

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

    const slug = await generateUniqueSlug(parseResult.data.title);
    const article = await storage.createArticle({
      ...parseResult.data,
      slug,
      authorId: req.user.id,
    });
    res.status(201).json(article);
  });

  // Search endpoint
  app.get("/api/articles/search/:query", async (req, res) => {
    const articles = await storage.searchArticles(req.params.query);
    const cleanedArticles = articles.map(article => ({
      ...article,
      content: cleanContent(article.content),
      keywords: article.keywords.map(k => cleanContent(k))
    }));
    res.json(cleanedArticles);
  });

  app.post("/api/articles/generate", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { title, keyword } = req.body;
    if (!title || !keyword) {
      return res.status(400).json({ message: "Title and keyword are required" });
    }

    try {
      const generated = await generateArticleContent(title, keyword);
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

    const slug = await generateUniqueSlug(parseResult.data.title);
    const updated = await storage.updateArticle(article.id, {
      ...parseResult.data,
      slug,
    });
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