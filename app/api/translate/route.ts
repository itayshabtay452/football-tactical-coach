import { GoogleGenerativeAI } from "@google/generative-ai";

type SupportedLanguage = "en" | "fr";

const LANGUAGE_CONFIG: Record<
  SupportedLanguage,
  { systemInstruction: string; userPrompt: (report: string) => string }
> = {
  en: {
    systemInstruction: `You are a professional football analyst and English language expert. Your task is to translate tactical football reports from Hebrew into fluent, professional English. Use authentic football terminology as used by coaches and analysts in England and Europe. Preserve all markdown formatting (headings, bullet points, bold text) exactly as in the source. Translate all section headings and content — do not leave any Hebrew text untranslated. The result should read as if it was originally written in English by a professional football analyst.`,
    userPrompt: (report) =>
      `Translate the following tactical football report from Hebrew into professional English. Maintain the exact same markdown structure (##, ###, **, -, etc.). Use authentic football terminology throughout.\n\n${report}`,
  },
  fr: {
    systemInstruction: `You are a professional football analyst and French language expert specialising in French football (football association) terminology. Your task is to translate tactical football reports from Hebrew into fluent, professional French. Use authentic French football terminology as used by coaches, analysts, and commentators in France. Apply the following precise term mappings: "Counter-attack" → "Contre-attaque", "High Line" → "Bloc haut", "Low Block" → "Bloc bas", "Wing-backs" → "Pistons", "High Press" → "Pressing haut", "Possession" → "Jeu de possession", "Long ball" → "Jeu long", "Man-marking" → "Marquage individuel", "Zonal" → "Marquage de zone", "Formation" → "Dispositif tactique", "Pressing" → "Pressing", "Offside trap" → "Piège du hors-jeu", "Striker" → "Avant-centre", "Winger" → "Ailier", "Midfielder" → "Milieu de terrain", "Sweeper" → "Libéro", "Playmaker" → "Meneur de jeu", "False nine" → "Faux numéro 9". Preserve all markdown formatting (headings, bullet points, bold text) exactly as in the source. Translate all section headings and content — do not leave any Hebrew text untranslated. The result should read as if it was originally written in French by a professional football analyst.`,
    userPrompt: (report) =>
      `Translate the following tactical football report from Hebrew into professional French. Maintain the exact same markdown structure (##, ###, **, -, etc.). Use authentic French football terminology throughout. Key term mappings to apply: Counter-attack → Contre-attaque, High Line → Bloc haut, Wing-backs → Pistons, High Press → Pressing haut, Low Block → Bloc bas.\n\n${report}`,
  },
};

export async function POST(request: Request) {
  const body = await request.json();
  const { report, language = "en" } = body as {
    report: string;
    language?: SupportedLanguage;
  };

  if (!report || typeof report !== "string") {
    return new Response("Missing report content", { status: 400 });
  }

  const config = LANGUAGE_CONFIG[language as SupportedLanguage];
  if (!config) {
    return new Response(`Unsupported language: ${language}`, { status: 400 });
  }

  const { systemInstruction, userPrompt } = config;

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

  const MODEL_PRIORITY = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
  ];

  type StreamResult = Awaited<
    ReturnType<ReturnType<typeof genAI.getGenerativeModel>["generateContentStream"]>
  >;
  let result: StreamResult | null = null;
  let lastErr: unknown;

  for (const modelName of MODEL_PRIORITY) {
    const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
    try {
      result = await model.generateContentStream(userPrompt(report));
      break;
    } catch (err: unknown) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("429") ||
        msg.includes("404") ||
        msg.toLowerCase().includes("quota") ||
        msg.toLowerCase().includes("not found")
      ) {
        continue;
      }
      if (msg.includes("403") || msg.toLowerCase().includes("api key")) {
        return new Response(
          "Invalid Google AI API key. Check GOOGLE_AI_API_KEY in .env.local.",
          { status: 403 }
        );
      }
      return new Response(`Gemini error: ${msg}`, { status: 500 });
    }
  }

  if (!result) {
    const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
    if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
      return new Response(
        "Google AI quota exceeded for all available models. Try again later.",
        { status: 429 }
      );
    }
    return new Response(`Gemini error: ${msg}`, { status: 500 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(encoder.encode(text));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
