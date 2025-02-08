import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface WritingPreferences {
  context?: string;
  explicitness?: number;
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

    const result = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert content writer specializing in creating SEO-optimized article titles that drive engagement."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    return result.choices[0].message.content
      ?.split('\n')
      .map(line => line.trim())
      .filter(line => line.match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, ''))
      .filter(line => line.length > 0)
      .slice(0, 5) || [];
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

    const result = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert content writer who creates engaging, well-structured articles.

Format your response carefully:
1. Start with "# [Title]"
2. Add TWO blank lines after the title
3. Write the introduction (no header needed)
4. For each section:
   - Add TWO blank lines before the section header
   - Use "### [Section Name]" format
   - Add ONE blank line after the header
   - Add ONE blank line between paragraphs`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    const content = result.choices[0].message.content?.trim() || '';

    // Generate keywords that include the context if provided
    const keywordsPrompt = `Generate 5 relevant SEO keywords for an article titled "${title}" about "${keyword}"${
      preferences?.context ? ` that relates to ${preferences.context}` : ''
    }.
    Return only the keywords, one per line.`;

    const keywordsResult = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an SEO expert. Generate keywords that will help this content rank well."
        },
        {
          role: "user",
          content: keywordsPrompt
        }
      ],
      temperature: 0.7,
    });

    const keywords = keywordsResult.choices[0].message.content
      ?.split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0)
      .slice(0, 5) || [];

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