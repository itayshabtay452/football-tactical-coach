import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  const { report } = await request.json();

  if (!report || typeof report !== "string") {
    return new Response("Missing report content", { status: 400 });
  }

  const systemInstruction = `You are a professional football analyst and Hebrew language expert specialising in Israeli football terminology. Your task is to translate tactical football reports from English into fluent, professional Hebrew. Use authentic Israeli football (כדורגל) terminology as used by coaches, analysts, and commentators in Israel. Preserve all markdown formatting (headings, bullet points, bold text) exactly as in the source. Translate all section headings and content — do not leave any English text untranslated. The result should read as if it was originally written in Hebrew by a professional football analyst.`;

  const userPrompt = `Translate the following tactical football report into professional Hebrew. Maintain the exact same markdown structure (##, ###, **, -, etc.). Use authentic Israeli football terminology throughout.\n\n${report}`;

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
      result = await model.generateContentStream(userPrompt);
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
