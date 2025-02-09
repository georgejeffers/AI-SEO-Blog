import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface WritingPreferences {
  context?: string;
  explicitness?: number;
  userPreferences?: string;
}

const explicitnessPrompts = {
  1: "Lightly consider the user's preferences but primarily use your expertise to generate titles.",
  2: "Incorporate the user's preferences while maintaining creative freedom.",
  3: "Balance user preferences with your own expertise for an optimized output.",
  4: "Prioritize the user's preferences while ensuring coherence and SEO effectiveness.",
  5: "Strictly follow the user's preferences—use them directly in the article titles."
} as const;

function validatePreferences(preferences?: WritingPreferences): preferences is Required<WritingPreferences> {
  if (!preferences) return false;
  return (
    typeof preferences.explicitness === 'number' &&
    preferences.explicitness >= 1 &&
    preferences.explicitness <= 5 &&
    typeof preferences.context === 'string' &&
    preferences.context.length > 0
  );
}

export async function generateArticleIdeas(keyword: string, preferences?: WritingPreferences): Promise<string[]> {
  try {
    console.log('Generating ideas with preferences:', preferences);

    let systemPrompt = `You are an expert content writer specializing in creating SEO-optimized promotional content.

TITLE REQUIREMENTS:
- Each title must be unique and engaging
- Titles should be SEO-friendly
- Use proper capitalization
- Include relevant keywords
- Keep titles concise but descriptive`;

    let prompt = `Generate 5 unique and engaging article titles about "${keyword}". Each title must be SEO-friendly and compelling.`;

    if (preferences?.explicitness && preferences.explicitness >= 1) {
      // Add context-based requirements based on explicitness level
      if (preferences.context) {
        const contextStr = preferences.context.trim();
        const explicitnessLevel = preferences.explicitness;
        
        console.log(`Adding promotional requirements (Level ${explicitnessLevel}) for context: ${contextStr}`);
        
        systemPrompt += `\n\nPROMOTIONAL REQUIREMENTS (Level ${explicitnessLevel}/5):`;
        
        if (explicitnessLevel >= 4) {
          systemPrompt += `\nCRITICAL: Every title MUST prominently feature "${contextStr}":
1. MUST start titles with "${contextStr}" or make it the main focus
2. MUST position "${contextStr}" as THE essential solution
3. MUST emphasize "${contextStr}" as the leading tool
4. MUST highlight specific benefits of "${contextStr}"`;
          
          prompt += `\n\nABSOLUTE REQUIREMENTS:
- Every single title MUST start with or prominently include "${contextStr}"
- Make "${contextStr}" the central focus of each title
- Show how "${contextStr}" solves problems related to ${keyword}
- Position "${contextStr}" as the industry-leading solution
- No title should be without "${contextStr}"`;
        } else if (explicitnessLevel >= 2) {
          systemPrompt += `\nNaturally incorporate "${contextStr}" into titles:
1. Include "${contextStr}" where it fits naturally
2. Present it as a solution when relevant
3. Highlight its benefits where appropriate`;
          
          prompt += `\n\nGUIDELINES:
- Include "${contextStr}" in some titles where relevant
- Present it as one of the solutions
- Highlight its benefits when appropriate`;
        }
      }

      // Add user preferences if provided
      if (preferences.userPreferences) {
        const features = preferences.userPreferences
          .split(',')
          .map(f => f.trim())
          .filter(f => f.length > 0);
        
        if (features.length > 0) {
          console.log('Adding user preferences:', features);
          prompt += `\n\nKEY FEATURES TO HIGHLIGHT:
${features.map(f => `- ${f}`).join('\n')}`;
        }
      }
    }

    prompt += `\n\nFormat Requirements:
- List each title on a new line
- Start each line with a number and period
- Example:
1. First Title Here
2. Second Title Here`;

    console.log('Sending prompt to OpenAI:', { systemPrompt, prompt });

    const response = await openai.chat.completions.create({
      model: "gpt-4",
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

    console.log('Generated titles:', titles);

    // Validate that titles include the context when required
    if (preferences?.explicitness && preferences.explicitness >= 4 && preferences.context) {
      const contextStr = preferences.context.trim().toLowerCase();
      const validTitles = titles.filter(title => {
        const titleLower = title.toLowerCase();
        // For high explicitness, require the context to be at the start or prominently featured
        if (preferences.explicitness === 5) {
          return titleLower.startsWith(contextStr) || 
                 titleLower.includes(` ${contextStr} `) ||
                 titleLower.includes(`${contextStr}:`);
        }
        return titleLower.includes(contextStr);
      });

      console.log('Valid titles after context check:', validTitles);

      if (validTitles.length < titles.length) {
        console.log('Retrying with stronger emphasis on context');
        // Retry with stronger emphasis if titles don't meet requirements
        systemPrompt += `\n\nWARNING: Previous attempt failed. EVERY title MUST start with or prominently feature "${preferences.context}". No exceptions.`;
        prompt += `\n\nCRITICAL: Each title MUST begin with or prominently feature "${preferences.context}". This is a strict requirement. Do not generate any titles without "${preferences.context}".`;
        
        const retryResponse = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
        });

        const retryTitles = retryResponse.choices[0].message.content
          ?.split('\n')
          .map(line => line.trim())
          .filter(line => line.match(/^\d+\./))
          .map(line => line.replace(/^\d+\.\s*/, ''))
          .filter(line => line.length > 0)
          .slice(0, 5) || [];

        console.log('Retry titles:', retryTitles);

        // Verify retry results
        if (!retryTitles.every(title => 
          title.toLowerCase().includes(contextStr)
        )) {
          console.error('Retry failed to meet promotional requirements');
          throw new Error('Generated titles did not meet promotional requirements');
        }
        
        return retryTitles;
      }

      return validTitles;
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
1. Title Format:
   # [Title]
   [TWO blank lines after]

2. Introduction Format:
   - Must have proper spacing after periods (". ")
   - Must have proper paragraph breaks
   - No header needed for introduction
   [TWO blank lines after]

3. Section Headers:
   ### [Section Name]
   [ONE blank line after]

4. Paragraph Rules:
   - Always add a space after periods, commas, and punctuation
   - ONE blank line between paragraphs
   - TWO blank lines between sections
   - Proper sentence spacing throughout
   - No run-on sentences or cramped text

5. Content Structure:
   - Clear section breaks
   - Consistent formatting
   - Proper list formatting with line breaks
   - Clean, readable layout`;

    let contentPrompt = `Write a comprehensive article about "${keyword}" with the title "${title}".

FORMATTING REQUIREMENTS:
1. Add a space after EVERY period, comma, and punctuation mark
2. Use proper paragraph breaks with blank lines
3. Ensure clean section breaks with two blank lines
4. Format lists with proper spacing`;

    if (preferences?.explicitness && preferences.explicitness >= 1) {
      // Add context-based requirements based on explicitness level
      if (preferences.context) {
        systemPrompt += `\n\nPROMOTIONAL REQUIREMENTS (Level ${preferences.explicitness}/5):
${preferences.explicitness >= 4 ? 'CRITICAL: ' : ''}Include "${preferences.context}" in the following ways:
1. ${preferences.explicitness >= 4 ? 'Must prominently feature' : 'Naturally mention'} in the introduction
2. ${preferences.explicitness >= 4 ? 'Dedicate entire sections to' : 'Include references to'} its benefits
3. ${preferences.explicitness >= 4 ? 'Position as the industry leader' : 'Highlight as a solution'}
4. ${preferences.explicitness >= 4 ? 'End with a strong call-to-action' : 'Suggest as an option'} to use it`;

        contentPrompt += `\n\nPROMOTIONAL FOCUS:
1. ${preferences.explicitness >= 4 ? 'Heavily emphasize' : 'Include'} "${preferences.context}" throughout the content
2. ${preferences.explicitness >= 4 ? 'Make it the central solution' : 'Present it as a solution'}
3. ${preferences.explicitness >= 4 ? 'Highlight its superiority' : 'Mention its benefits'}`;
      }

      // Add user preferences if provided
      if (preferences.userPreferences) {
        contentPrompt += `\n\nKEY POINTS TO EMPHASIZE:
${preferences.userPreferences.split(',').map(pref => `- ${pref.trim()}`).join('\n')}`;
      }
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contentPrompt }
      ],
      temperature: 0.7,
    });

    let content = response.choices[0].message.content?.trim() || '';

    // Validate promotional content when required
    if (preferences?.explicitness && preferences.explicitness >= 4 && preferences.context) {
      const contextStr = preferences.context.trim();
      const contextMentions = (content.match(new RegExp(contextStr, 'gi')) || []).length;
      const hasContextInIntro = content.split('\n\n')[1]?.toLowerCase().includes(contextStr.toLowerCase());
      
      if (contextMentions < 5 || !hasContextInIntro) {
        // Retry with stronger emphasis
        systemPrompt += `\n\nWARNING: Previous attempt failed to properly promote "${contextStr}".
CRITICAL REQUIREMENTS:
1. MUST mention "${contextStr}" at least 5 times
2. MUST introduce "${contextStr}" in the first paragraph
3. MUST have dedicated sections about "${contextStr}"
4. MUST end with a strong call-to-action for "${contextStr}"`;

        const retryResponse = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: contentPrompt }
          ],
          temperature: 0.7,
        });

        content = retryResponse.choices[0].message.content?.trim() || '';
        
        // Verify retry results
        const retryMentions = (content.match(new RegExp(contextStr, 'gi')) || []).length;
        const retryHasContextInIntro = content.split('\n\n')[1]?.toLowerCase().includes(contextStr.toLowerCase());
        
        if (retryMentions < 5 || !retryHasContextInIntro) {
          throw new Error('Generated content does not meet promotional requirements');
        }
      }
    }

    // Post-process content to ensure proper formatting
    content = content
      // Fix title formatting
      .replace(/^#\s*([^\n]+)(?:\n+)?/, '# $1\n\n')
      // Fix section headers
      .replace(/###\s*([^\n]+)(?:\n+)?/g, '### $1\n')
      // Ensure proper spacing after punctuation
      .replace(/([.!?])([A-Z])/g, '$1 $2')
      .replace(/([.!?])(\s+)([A-Z])/g, '$1 $3')
      .replace(/([,;:])([a-zA-Z])/g, '$1 $2')
      // Fix list formatting
      .replace(/^(-|\d+\.)\s*/gm, '$1 ')
      // Ensure proper paragraph spacing
      .replace(/\n{3,}/g, '\n\n')
      // Fix spacing after periods within sentences
      .replace(/(\w+\.)(\w+)/g, '$1 $2')
      // Ensure proper spacing around list items
      .replace(/(\n- .+)\n(?![\n-])/g, '$1\n\n')
      .replace(/(\n\d+\. .+)\n(?![\n\d])/g, '$1\n\n')
      // Clean up any remaining formatting issues
      .replace(/[ \t]+$/gm, '')  // Remove trailing spaces
      .replace(/^\s+$/gm, '')    // Remove empty lines with spaces
      .replace(/\n{3,}/g, '\n\n'); // Final cleanup of multiple newlines

    // Add proper spacing between sections
    content = content
      .split('\n\n')
      .map(section => {
        if (section.startsWith('### ')) {
          return `\n\n${section}`;
        }
        return section;
      })
      .join('\n\n')
      .replace(/\n{4,}/g, '\n\n\n');  // Final cleanup of section spacing

    // Validate content formatting
    if (!content.startsWith('# ') || !content.includes('\n\n')) {
      throw new Error('Generated content does not meet formatting requirements');
    }

    // Validate promotional content when required
    if (preferences?.explicitness && preferences.explicitness >= 4 && preferences.context) {
      const contextMentions = (content.match(new RegExp(preferences.context, 'gi')) || []).length;
      if (contextMentions < 5) {
        throw new Error('Generated content does not meet promotional requirements');
      }
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