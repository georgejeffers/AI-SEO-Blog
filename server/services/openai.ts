import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface WritingPreferences {
  context?: string;
  explicitness?: number;
}

export async function generateArticleIdeas(keyword: string, preferences?: WritingPreferences): Promise<string[]> {
  try {
    let systemPrompt = "You are an expert content writer who creates SEO-optimized article titles.";

    if (preferences?.context) {
      systemPrompt += ` You should incorporate themes related to: ${preferences.context} with an explicitness level of ${preferences.explicitness} (1 being very subtle, 5 being very obvious).`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Generate 5 unique and engaging article titles about "${keyword}". Make them SEO-friendly and interesting.`
        }
      ],
      temperature: 0.7,
    });

    const titles = response.choices[0].message.content
      ?.split('\n')
      .filter(line => line.trim())
      .slice(0, 5) || [];

    return titles;
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
    let systemPrompt = "You are an expert content writer who creates engaging, well-structured articles.";

    if (preferences?.context) {
      systemPrompt += ` You should incorporate mentions of: ${preferences.context} with an explicitness level of ${preferences.explicitness} (1 being very subtle, 5 being very obvious).`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Write a comprehensive blog article about "${keyword}" with the title "${title}".

          Requirements:
          1. Use clear section headings
          2. Include proper paragraph breaks
          3. Use only English characters
          4. Write in a professional tone
          5. Format with proper spacing between sections

          The article should be informative and engaging.`
        }
      ],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content?.trim() || '';

    // Generate keywords
    const keywordResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an SEO expert. Generate keywords that would help this article rank well."
        },
        {
          role: "user",
          content: `Generate 5 relevant SEO keywords for an article titled "${title}" about "${keyword}". 
          ${preferences?.context ? `Consider including keywords related to: ${preferences.context}` : ''}`
        }
      ],
      temperature: 0.7,
    });

    const keywords = keywordResponse.choices[0].message.content
      ?.split('\n')
      .map(k => k.replace(/^\d+\.\s*/, '').trim())
      .filter(k => k.length > 0)
      .slice(0, 5) || [];

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