import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is required");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

interface WritingPreferences {
  context?: string;
  explicitness?: number;
}

export async function generateArticleIdeas(keyword: string, preferences?: WritingPreferences): Promise<string[]> {
  try {
    let prompt = `Generate 5 unique and engaging article titles about "${keyword}". 
    Make each title SEO-friendly, informative, and interesting.`;

    if (preferences?.context && preferences.explicitness) {
      const contextGuidance = preferences.explicitness >= 4 
        ? `Ensure the titles prominently feature or relate to: ${preferences.context}`
        : `Consider subtly incorporating themes related to: ${preferences.context}`;
      prompt += `\n${contextGuidance}`;
    }

    prompt += `\nFormat each title on a new line, starting with a number, like this:
    1. First Title
    2. Second Title
    etc.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, ''))
      .filter(line => line.length > 0)
      .slice(0, 5);
  } catch (error) {
    console.error('Error generating article ideas:', error);
    throw new Error('Failed to generate article ideas');
  }
}

export async function generateArticleContent(
  title: string,
  keyword: string,
  preferences?: WritingPreferences
): Promise<{
  content: string;
  keywords: string[];
  seoScore: { score: number; suggestions: string[] };
}> {
  try {
    let prompt = `Write a comprehensive blog article about "${keyword}" with the title "${title}".
    The article should be engaging and well-structured.
    Focus on providing valuable information.`;

    if (preferences?.context) {
      const contextInstructions = getContextInstructions(preferences.explicitness || 1, preferences.context);
      prompt += `\n${contextInstructions}`;
    }

    prompt += "\nReturn only the article content, without any special formatting or markers.";

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text().trim();

    // Generate keywords that include the context if provided
    const keywordsPrompt = `Generate 5 relevant SEO keywords for an article titled "${title}" about "${keyword}"${
      preferences?.context ? ` that relates to ${preferences.context}` : ''
    }.
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

function getContextInstructions(explicitness: number, context: string): string {
  switch (explicitness) {
    case 1:
      return `Naturally and very subtly weave in mentions or themes related to: ${context}. These should be so seamless that they feel completely organic to the content.`;
    case 2:
      return `Include subtle references to: ${context}. Place these naturally within the content without drawing attention to them.`;
    case 3:
      return `Regularly incorporate mentions of: ${context}. Balance these mentions throughout the content while maintaining authenticity.`;
    case 4:
      return `Prominently feature: ${context}. Make it a recurring theme throughout the content while maintaining value for readers.`;
    case 5:
      return `Make: ${context} a central focus of the content. Feature it prominently in key sections and throughout the article.`;
    default:
      return `Consider incorporating relevant mentions of: ${context} where appropriate.`;
  }
}