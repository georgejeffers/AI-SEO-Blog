import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is required");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export async function generateArticleIdeas(keyword: string): Promise<string[]> {
  try {
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
  } catch (error) {
    console.error('Error generating article ideas:', error);
    throw new Error('Failed to generate article ideas');
  }
}

export async function generateArticleContent(title: string, keyword: string): Promise<{
  content: string;
  keywords: string[];
  seoScore: { score: number; suggestions: string[] };
}> {
  try {
    const prompt = `Write a comprehensive blog article about "${keyword}" with the title "${title}".
    The article should be engaging and well-structured.
    Focus on providing valuable information.
    Return only the article content, without any special formatting or markers.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text().trim();

    // Generate keywords in a separate call
    const keywordsPrompt = `Generate 5 relevant SEO keywords for an article titled "${title}" about "${keyword}".
    Return only the keywords, one per line.`;

    const keywordsResult = await model.generateContent(keywordsPrompt);
    const keywordsResponse = await keywordsResult.response;
    const keywords = keywordsResponse.text()
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0)
      .slice(0, 5);

    if (!content || !keywords.length) {
      throw new Error('Generated content is invalid');
    }

    return {
      content,
      keywords,
      seoScore: {
        score: 85,
        suggestions: [
          "Add internal links where relevant",
          "Include more industry-specific terms",
          "Consider adding media content"
        ]
      }
    };
  } catch (error) {
    console.error('Error generating article content:', error);
    throw new Error('Failed to generate article content');
  }
}