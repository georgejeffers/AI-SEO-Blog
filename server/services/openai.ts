import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required");
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface WritingPreferences {
  context?: string;
  explicitness?: number;
}

function validatePreferences(preferences?: WritingPreferences): boolean {
  return !!(preferences?.context && typeof preferences.explicitness === 'number' && preferences.explicitness >= 1 && preferences.explicitness <= 5);
}

function constructPrompt(basePrompt: string, preferences?: WritingPreferences): string {
  if (!validatePreferences(preferences)) return basePrompt;

  const { context, explicitness } = preferences;

  if (explicitness >= 4) {
    return `${basePrompt}\n\nCRITICAL REQUIREMENTS:
1. Make ${context} the absolute central focus of the content
2. Start by introducing ${context} as the primary solution
3. Every section must showcase ${context}'s features and benefits
4. Use specific examples of how ${context} solves problems
5. Include a strong call-to-action about using ${context}
6. The content should position ${context} as the industry-leading solution`;
  }

  if (explicitness === 3) {
    return `${basePrompt}\n\nInclude regular mentions of ${context} throughout the content, balancing promotion with value.`;
  }

  if (explicitness === 2) {
    return `${basePrompt}\n\nSubtly incorporate mentions of ${context} where natural.`;
  }

  return `${basePrompt}\n\nVery subtly reference ${context} if appropriate.`;
}

export async function generateArticleIdeas(keyword: string, preferences?: WritingPreferences): Promise<string[]> {
  try {
    const basePrompt = `Generate 5 unique and engaging article titles about "${keyword}". The titles should be SEO-friendly and compelling.`;

    let systemPrompt = "You are an expert content writer specializing in creating promotional content that drives engagement.";

    if (validatePreferences(preferences)) {
      const { context, explicitness } = preferences;
      if (explicitness >= 4) {
        systemPrompt += `\n\nCRITICAL: Each title MUST prominently feature ${context}. Make it clear that ${context} is the primary solution being discussed.`;
      }
    }

    const prompt = constructPrompt(basePrompt, preferences);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content
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
    const basePrompt = `Write a comprehensive article about "${keyword}" with the title "${title}".`;

    let systemPrompt = `You are an expert content writer who creates engaging, well-structured articles.

Format your response carefully:
1. Start with "# [Title]"
2. Add TWO blank lines after the title
3. Write an introduction (no header needed)
4. For each section:
   - Add TWO blank lines before each "### [Section Name]"
   - Add ONE blank line after each header
   - Add ONE blank line between paragraphs`;

    if (validatePreferences(preferences)) {
      const { context, explicitness } = preferences;
      if (explicitness >= 4) {
        systemPrompt += `\n\nCRITICAL CONTENT REQUIREMENTS:
1. The entire article must focus on ${context} as the primary solution
2. Begin by introducing ${context} and its unique value proposition
3. Each section must highlight specific features and benefits of ${context}
4. Use concrete examples of how ${context} solves problems
5. Include testimonials or use cases that showcase ${context}'s effectiveness
6. End with a strong call-to-action to try ${context}`;
      }
    }

    const contentPrompt = constructPrompt(basePrompt, preferences);

    const result = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: contentPrompt
        }
      ],
      temperature: 0.7,
    });

    const content = result.choices[0].message.content?.trim() || '';

    // Generate keywords with focus on the promotional context
    const keywordsPrompt = validatePreferences(preferences) && preferences.explicitness >= 4
      ? `Generate 5 SEO keywords for an article about "${keyword}" that prominently features ${preferences.context}. The keywords should help drive traffic specifically to content about ${preferences.context}.`
      : `Generate 5 SEO keywords for an article about "${keyword}"${preferences?.context ? ` that mentions ${preferences.context}` : ''}.`;

    const keywordsResult = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an SEO expert specializing in promotional content optimization."
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