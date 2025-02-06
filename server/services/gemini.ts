import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export async function generateArticleIdeas(keyword: string): Promise<string[]> {
  const prompt = `Generate 5 unique and engaging article titles about "${keyword}". 
  Make each title SEO-friendly, informative, and interesting.
  Format each title on a new line, starting with a number, like this:
  1. First Title
  2. Second Title
  etc.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  // Parse the numbered list into clean titles
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.match(/^\d+\./)) // Only keep numbered lines
    .map(line => line.replace(/^\d+\.\s*/, '')) // Remove the numbering
    .filter(line => line.length > 0)
    .slice(0, 5); // Ensure we only get 5 titles
}

export async function generateArticleContent(title: string, keyword: string): Promise<{
  content: string;
  keywords: string[];
  seoScore: { score: number; suggestions: string[] };
}> {
  const prompt = `Write a comprehensive, SEO-optimized blog article with the title "${title}" focusing on the keyword "${keyword}". 
  The article should be engaging, informative, and well-structured.
  Also suggest 5 relevant keywords for the article.
  Finally, provide an SEO score from 0-100 and up to 3 SEO improvement suggestions.
  Format the response as follows:

  CONTENT:
  [Your article content here]

  KEYWORDS:
  - keyword1
  - keyword2
  - keyword3
  - keyword4
  - keyword5

  SEO_SCORE: [number]

  SUGGESTIONS:
  - suggestion1
  - suggestion2
  - suggestion3`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  // Parse the response
  const contentMatch = text.match(/CONTENT:\s*([\s\S]*?)(?=KEYWORDS:|$)/);
  const keywordsMatch = text.match(/KEYWORDS:\s*([\s\S]*?)(?=SEO_SCORE:|$)/);
  const scoreMatch = text.match(/SEO_SCORE:\s*(\d+)/);
  const suggestionsMatch = text.match(/SUGGESTIONS:\s*([\s\S]*?)$/);

  const keywords = keywordsMatch ? 
    keywordsMatch[1]
      .split('\n')
      .map(k => k.replace(/^-\s*/, '').trim())
      .filter(k => k.length > 0)
    : [keyword];

  const suggestions = suggestionsMatch ?
    suggestionsMatch[1]
      .split('\n')
      .map(s => s.replace(/^-\s*/, '').trim())
      .filter(s => s.length > 0)
    : ["Add more keywords", "Improve structure"];

  return {
    content: contentMatch ? contentMatch[1].trim() : text,
    keywords: keywords.slice(0, 5),
    seoScore: { 
      score: scoreMatch ? parseInt(scoreMatch[1]) : 70,
      suggestions: suggestions.slice(0, 3)
    }
  };
}