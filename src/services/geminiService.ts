import { GoogleGenerativeAI } from "@google/generative-ai";

// We use the environment variable provided by the platform
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error?.message?.includes('429') || error?.status === 429)) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function generateEmojiEnigma(phrase: string, category: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    Como experto en juegos de adivinanzas con emojis, crea un enigma visual para la frase: "${phrase}" (Categoría: ${category}).
    
    Reglas de ORO:
    - Usa entre 2 y 5 emojis (evita usar siempre 3).
    - Usa "fonética creativa" si es posible (ej: ✏️🎀🔵 para LAPIS + LAZO + AZUL = LAPISLÁZULI).
    - Los emojis deben ser variados pero con una lógica que el jugador pueda seguir.
    - Devuelve ÚNICAMENTE la secuencia de emojis, sin texto adicional.
  `;

  try {
    return await retryWithBackoff(async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    });
  } catch (error) {
    console.error("Gemini generation failed after retries", error);
    return null;
  }
}

export async function generateTrainingTask() {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    Genera un nuevo reto de entrenamiento para un juego de adivinanzas con emojis.
    Elige una frase de una de estas categorías: Arte, Geografía, Historia, Deporte o Gastronomía.
    
    Devuelve un objeto JSON con este formato exacto:
    {
      "phrase": "Nombre de la frase",
      "category": "Categoría (ej: Arte, Geografía)",
      "subcategory": "Subcategoría específica (ej: Pintura, Cine, Monumento, Ciudad, Batalla)",
      "optionA": "Secuencia de emojis A (buena)",
      "optionB": "Secuencia de emojis B (alternativa o regular)"
    }
  `;

  try {
    return await retryWithBackoff(async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json|```/g, "").trim();
      return JSON.parse(text);
    });
  } catch (error) {
    console.error("Gemini training task failed after retries", error);
    return null;
  }
}
