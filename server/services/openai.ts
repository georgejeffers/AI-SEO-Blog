import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface WritingPreferences {
  context?: string;
  explicitness?: number;
}

function getExplicitnessInstructions(explicitness: number, context: string): string {
  switch (explicitness) {
    case 1:
      return `Very subtly weave in references to ${context}. These mentions should be so natural and seamless that they feel completely organic to the content. Avoid any direct promotion.`;
    case 2:
      return `Include subtle references to ${context} within the content. Place these mentions naturally within paragraphs without drawing attention to them.`;
    case 3:
      return `Regularly mention ${context} throughout the content. Balance these references while maintaining authenticity. Include in body paragraphs but not headers.`;
    case 4:
      return `Make ${context} a prominent theme. Feature it in some section headers and regularly throughout paragraphs, discussing its benefits and features. Make it a clear focus while maintaining value.`;
    case 5:
      return `Make ${context} the absolute central focus. The entire article should revolve around it, featuring it prominently in the title, all section headers, and extensively throughout the content. Every section should connect back to how ${context} provides value and solutions. Build the entire narrative around it while providing valuable insights.`;
    default:
      return `Include relevant mentions of ${context} where appropriate.`;
  }
}

export async function generateArticleIdeas(keyword: string, preferences?: WritingPreferences): Promise<string[]> {
  try {
    let systemPrompt = "You are an expert content writer who creates SEO-optimized article titles.";

    if (preferences?.context) {
      const explicitnessGuide = getExplicitnessInstructions(preferences.explicitness || 3, preferences.context);
      systemPrompt += `\n${explicitnessGuide}\nGenerate titles that align with this guidance. For maximum explicitness, ensure the titles directly showcase the promoted solution.`;
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
          content: `Generate 5 unique and engaging article titles about "${keyword}". Each title should be SEO-friendly and interesting.${
            preferences?.explicitness === 5 
              ? `\nThe titles MUST prominently feature ${preferences.context}. Make it clear that this solution is central to the topic.` 
              : ''
          }`
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
    let systemPrompt = `You are an expert content writer who creates engaging, well-structured articles.`;

    if (preferences?.context) {
      const explicitnessGuide = getExplicitnessInstructions(preferences.explicitness || 3, preferences.context);
      systemPrompt += `\n${explicitnessGuide}`;

      // Additional context-specific instructions for maximum explicitness
      if (preferences.explicitness === 5) {
        systemPrompt += `\n\nCRITICAL INSTRUCTIONS:
        1. This article MUST be entirely focused on ${preferences.context}
        2. Every section should demonstrate how ${preferences.context} solves problems or provides value
        3. Use specific features and benefits from ${preferences.context} throughout the content
        4. The introduction should immediately establish ${preferences.context} as the primary solution
        5. Conclude with a strong call-to-action about using ${preferences.context}`;
      }
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
          1. Use clear section headings (use markdown style: ### for headers)
          2. Include proper paragraph breaks (use double newlines)
          3. Use only English characters
          4. Write in a professional tone
          5. Format with proper spacing between sections
          ${preferences?.explicitness === 5 
            ? '6. Every section MUST discuss and promote the main solution extensively\n7. Include specific features and benefits in detail\n8. End with a compelling call-to-action' 
            : preferences?.explicitness >= 4 
              ? '6. Ensure the promotional content is prominent and clearly visible' 
              : preferences?.explicitness <= 2 
                ? '6. Keep promotional mentions subtle and naturally integrated' 
                : ''}

          The article should be informative and engaging while following the writing style guidance provided.`
        }
      ],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content?.trim() || '';

    // Generate keywords that incorporate the promotional context
    const keywordResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an SEO expert. Generate keywords that would help this article rank well${
            preferences?.context 
              ? ` and drive traffic specifically for ${preferences.context}` 
              : ''
          }.`
        },
        {
          role: "user",
          content: `Generate 5 relevant SEO keywords for an article titled "${title}" about "${keyword}".
          ${preferences?.context && preferences?.explicitness === 5 
            ? `Make sure the keywords strongly feature ${preferences.context} and its key benefits.` 
            : preferences?.context 
              ? `Consider including keywords related to: ${preferences.context}` 
              : ''}`
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