import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface WritingPreferences {
  context?: string;
  explicitness?: number;
}

function validatePreferences(preferences?: WritingPreferences): boolean {
  return !!(preferences?.context && typeof preferences.explicitness === 'number' && preferences.explicitness >= 1 && preferences.explicitness <= 5);
}

export async function generateArticleIdeas(keyword: string, preferences?: WritingPreferences): Promise<string[]> {
  try {
    let systemPrompt = `You are an expert content writer specializing in creating promotional content that drives engagement.`;

    // If max explicitness, make the product the absolute focus
    if (validatePreferences(preferences) && preferences.explicitness === 5) {
      const { context } = preferences;
      systemPrompt += `\n\nCRITICAL REQUIREMENTS:
1. Every title MUST start with "${context}" or prominently feature it
2. Make it clear that ${context} is THE solution for ${keyword}
3. Position ${context} as the industry-leading tool
4. Emphasize the unique benefits of ${context}`;
    }

    let prompt = `Generate 5 unique and engaging article titles about "${keyword}". Each title must be SEO-friendly and compelling.`;

    if (validatePreferences(preferences)) {
      const { context, explicitness } = preferences;
      if (explicitness >= 4) {
        prompt += `\n\nABSOLUTE REQUIREMENTS:
- Each title MUST prominently feature "${context}"
- Position "${context}" as the primary solution
- Include key benefits of "${context}" where possible
- Make it clear that "${context}" is essential for success`;
      } else if (explicitness >= 3) {
        prompt += `\nInclude references to ${context} in the titles where appropriate.`;
      }
    }

    prompt += `\n\nFormat each title on a new line with a number:
1. First Title
2. Second Title`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
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
    let systemPrompt = `You are an expert content writer who creates engaging, well-structured articles.

CRITICAL FORMATTING REQUIREMENTS:
1. Use proper markdown spacing:
   - Start with "# [Title]"
   - Add TWO blank lines after the title
   - Use "### [Section Name]" for sections
   - Add TWO blank lines before each section
   - Add ONE blank line after each section header
   - Add ONE blank line between paragraphs
2. Never join sentences or sections without proper spacing
3. Every section must be properly separated`;

    if (validatePreferences(preferences) && preferences.explicitness >= 4) {
      const { context } = preferences;
      systemPrompt += `\n\nCRITICAL CONTENT REQUIREMENTS:
1. The entire article MUST revolve around ${context}
2. Start by introducing ${context} as THE solution
3. Every section MUST showcase ${context}'s features and benefits
4. Use specific examples of how ${context} solves problems
5. Include testimonials or use cases that demonstrate ${context}'s effectiveness
6. End with a strong call-to-action to use ${context}
7. Position ${context} as the industry-leading solution throughout`;
    }

    let prompt = `Write a comprehensive article about "${keyword}" with the title "${title}".`;

    if (validatePreferences(preferences)) {
      const { context, explicitness } = preferences;
      if (explicitness === 5) {
        prompt += `\n\nABSOLUTE REQUIREMENTS:
1. Make ${context} the central focus of EVERY section
2. Begin by positioning ${context} as the ultimate solution
3. Describe key features: ${context}'s autobuy and inventory management
4. Explain how ${context} revolutionizes ${keyword}
5. Include specific benefits and success stories
6. End with a compelling call-to-action to try ${context}`;
      }
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content?.trim() || '';

    // Generate SEO keywords with strong product focus
    const keywordsPrompt = validatePreferences(preferences) && preferences.explicitness >= 4
      ? `Generate 5 SEO keywords for an article about "${keyword}" that prominently features ${preferences.context}. The keywords should help drive traffic specifically to content about ${preferences.context}.`
      : `Generate 5 SEO keywords for an article about "${keyword}"${preferences?.context ? ` that mentions ${preferences.context}` : ''}.`;

    const keywordsResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an SEO expert specializing in promotional content optimization."
        },
        { role: "user", content: keywordsPrompt }
      ],
      temperature: 0.7,
    });

    const keywords = keywordsResponse.choices[0].message.content
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