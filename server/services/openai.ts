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
    let systemPrompt = `You are an expert content writer specializing in creating SEO-optimized promotional content.`;

    let prompt = `Generate 5 unique and engaging article titles about "${keyword}". Each title must be SEO-friendly and compelling.`;

    if (validatePreferences(preferences)) {
      const { context, explicitness } = preferences;

      // At maximum explicitness, force the product name into every title
      if (explicitness >= 4) {
        systemPrompt += `\n\nABSOLUTE REQUIREMENTS:
1. Every single title MUST start with "${context}" or prominently include it
2. Position "${context}" as THE essential solution for ${keyword}
3. Emphasize that "${context}" is the leading tool in this space
4. Include specific benefits of "${context}" in titles where possible`;

        prompt += `\n\nCRITICAL TITLE REQUIREMENTS:
- Every title MUST prominently mention "${context}"
- Make "${context}" the central focus
- Show how "${context}" solves problems related to ${keyword}
- Emphasize "${context}" as the industry-leading solution`;
      }
    }

    prompt += `\n\nFormat Requirements:
- List each title on a new line
- Start each line with a number and period
- Example:
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

    const titles = response.choices[0].message.content
      ?.split('\n')
      .map(line => line.trim())
      .filter(line => line.match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, ''))
      .filter(line => line.length > 0)
      .slice(0, 5) || [];

    // Validate that titles include the context when required
    if (validatePreferences(preferences) && preferences.explicitness >= 4) {
      const { context } = preferences;
      if (!titles.every(title => title.toLowerCase().includes(context.toLowerCase()))) {
        throw new Error('Generated titles did not meet promotional requirements');
      }
    }

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
    let systemPrompt = `You are an expert content writer who creates engaging, well-structured articles.

CRITICAL FORMATTING REQUIREMENTS:
1. Proper Title Format:
   # [Your Title Here]
   [TWO blank lines after title]

2. Introduction Format:
   [Introduction text without header]
   [TWO blank lines after introduction]

3. Section Headers Format:
   ### [Section Name]
   [ONE blank line]
   [Section content]
   [TWO blank lines before next section]

4. Paragraph Spacing:
   - ONE blank line between paragraphs
   - TWO blank lines between major sections
   - NO running text together

EXAMPLE FORMAT:
# Title

[TWO BLANK LINES HERE]
Introduction paragraph one.

Introduction paragraph two.


### First Section

First section paragraph one.

First section paragraph two.


### Second Section

Second section content.`;

    let contentPrompt = `Write a comprehensive article about "${keyword}" with the title "${title}".`;

    if (validatePreferences(preferences)) {
      const { context, explicitness } = preferences;

      if (explicitness >= 4) {
        systemPrompt += `\n\nCRITICAL CONTENT REQUIREMENTS:
1. EVERY major section must prominently feature ${context}
2. Introduction MUST establish ${context} as THE solution
3. Each section MUST showcase specific ${context} features:
   - Autobuy capabilities
   - Inventory management
   - Competitive advantages
4. Use real examples of ${context}'s effectiveness
5. End with a strong call-to-action to use ${context}
6. Position ${context} as the industry leader throughout`;

        contentPrompt += `\n\nABSOLUTE REQUIREMENTS:
1. Start by introducing ${context} as the ultimate solution for ${keyword}
2. Every section must demonstrate how ${context} solves specific problems
3. Include actual features and benefits of ${context}
4. Compare ${context}'s capabilities to manual methods
5. End with a clear call-to-action to try ${context}
6. Make ${context} the central focus of the entire article`;
      }
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contentPrompt }
      ],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content?.trim() || '';

    // Validate content formatting
    if (!content.startsWith('# ') || !content.includes('\n\n')) {
      throw new Error('Generated content does not meet formatting requirements');
    }

    // Generate SEO keywords with product focus
    const keywordsPrompt = validatePreferences(preferences) && preferences.explicitness >= 4
      ? `Generate 5 SEO keywords for an article about "${keyword}" that prominently features ${preferences.context}. Focus on driving traffic specifically to content about ${preferences.context}.`
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

    // Validate promotional content when required
    if (validatePreferences(preferences) && preferences.explicitness >= 4) {
      const { context } = preferences;
      const contextMentions = (content.match(new RegExp(context, 'gi')) || []).length;
      if (contextMentions < 5) {
        throw new Error('Generated content does not meet promotional requirements');
      }
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