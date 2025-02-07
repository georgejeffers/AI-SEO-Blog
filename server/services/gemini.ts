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
  const prompt = `Write a comprehensive, SEO-optimized blog article about ${keyword} with the title "${title}".
  Focus on providing valuable, actionable information.
  The article should be engaging and well-structured.
  Include 5 relevant SEO keywords.
  Keep the content natural and avoid any special formatting or section markers.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  // Extract main content (everything before any special sections)
  const content = text.split(/KEYWORDS:|SEO_SCORE:|SUGGESTIONS:/)[0].trim();

  // Generate relevant keywords based on the content
  const keywordsPrompt = `Based on this article, what are the 5 most relevant SEO keywords? 
  Return only the keywords, one per line, without bullets or numbers.`;
  const keywordsResult = await model.generateContent(keywordsPrompt + "\n\nArticle:\n" + content);
  const keywordsText = await keywordsResult.response.text();
  const keywords = keywordsText
    .split('\n')
    .map(k => k.trim())
    .filter(k => k.length > 0)
    .slice(0, 5);

  return {
    content,
    keywords,
    seoScore: {
      score: 85,
      suggestions: [
        "Review content for keyword density",
        "Add internal links if possible",
        "Consider adding relevant media"
      ]
    }
  };
}