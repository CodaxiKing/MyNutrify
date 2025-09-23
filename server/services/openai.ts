import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "your-api-key-here"
});

export interface FoodAnalysisResult {
  name: string;
  confidence: number;
  calories: number;
  servingSize: string;
  macronutrients: {
    carbs: number;
    protein: number;
    fat: number;
  };
  description?: string;
}

export async function analyzeFoodImage(base64Image: string): Promise<FoodAnalysisResult> {
  // Use mock data to avoid API costs/limits during testing
  // This can be disabled by setting DISABLE_OPENAI_MOCK=true
  if (process.env.DISABLE_OPENAI_MOCK !== 'true') {
    return {
      name: "Grilled Chicken Breast",
      confidence: 0.85,
      calories: 185,
      servingSize: "1 medium breast (85g)",
      macronutrients: {
        carbs: 0,
        protein: 35,
        fat: 4,
      },
      description: "A lean grilled chicken breast, a good source of protein",
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a nutrition expert AI that analyzes food images. Analyze the image and provide detailed nutritional information in JSON format. 

Return the response in this exact JSON format:
{
  "name": "food name",
  "confidence": 0.95,
  "calories": 450,
  "servingSize": "1 serving",
  "macronutrients": {
    "carbs": 35,
    "protein": 25,
    "fat": 15
  },
  "description": "brief description of the food"
}

Guidelines:
- Be as accurate as possible with calorie and macronutrient estimates
- Consider typical serving sizes for the identified food
- Confidence should be between 0 and 1
- If you can't identify the food clearly, set confidence below 0.7
- Round calories to nearest 5, macros to nearest gram`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this food image and provide the nutritional information in the specified JSON format."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validate the response structure
    if (!result.name || !result.calories || !result.macronutrients) {
      throw new Error("Invalid response format from OpenAI");
    }

    return {
      name: result.name,
      confidence: Math.min(1, Math.max(0, result.confidence || 0.5)),
      calories: Math.max(0, result.calories),
      servingSize: result.servingSize || "1 serving",
      macronutrients: {
        carbs: Math.max(0, result.macronutrients.carbs || 0),
        protein: Math.max(0, result.macronutrients.protein || 0),
        fat: Math.max(0, result.macronutrients.fat || 0),
      },
      description: result.description,
    };
  } catch (error) {
    console.error("Error analyzing food image:", error);
    throw new Error("Failed to analyze food image: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

export async function generateFoodSuggestions(query: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a nutrition expert. Given a food query, suggest 5-8 similar or related healthy food options. Return the response as a JSON array of strings.

Format: ["food1", "food2", "food3", ...]

Focus on:
- Similar foods with better nutritional profiles
- Healthy alternatives
- Different preparation methods
- Related food categories`,
        },
        {
          role: "user",
          content: `Suggest healthy food options related to: ${query}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return Array.isArray(result.suggestions) ? result.suggestions : [];
  } catch (error) {
    console.error("Error generating food suggestions:", error);
    return [];
  }
}
