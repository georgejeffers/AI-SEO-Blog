import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export async function generateArticleIdeas(keyword: string): Promise<string[]> {
  const prompt = `Generate 5 engaging and SEO-friendly article titles about "${keyword}". Each title should be informative and clickable. Format the response as a JSON array of strings.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  try {
    return JSON.parse(text);
  } catch (error) {
    // If JSON parsing fails, try to extract titles from the text
    return text
      .split('\n')
      .filter(line => line.trim())
      .slice(0, 5);
  }
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
  Format the response as JSON with three fields:
  - content: the article text
  - keywords: array of 5 related keywords
  - seoScore: object with 'score' (number) and 'suggestions' (array of strings)`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  try {
    return JSON.parse(text);
  } catch (error) {
    // Fallback if JSON parsing fails
    return {
      content: text,
      keywords: [keyword],
      seoScore: { score: 70, suggestions: ["Add more keywords", "Improve structure"] }
    };
  }
}
