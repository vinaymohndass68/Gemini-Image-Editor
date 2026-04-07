
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

export async function editImageWithGemini(
  base64ImageData: string,
  mimeType: string,
  prompt: string
): Promise<{ base64Data: string; mimeType: string; } | null> {
  // Do not instantiate this in the global scope.
  // To make sure it uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
          responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return {
            base64Data: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
        };
      }
    }
    
    return null;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API.");
  }
}
