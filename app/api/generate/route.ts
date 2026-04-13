import { tavily } from "@tavily/core";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  const { opponent, formation, offensiveStyle, defensiveStyle } =
    await request.json();

  if (!opponent || !formation || !offensiveStyle || !defensiveStyle) {
    return new Response("Missing required fields", { status: 400 });
  }

  const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY! });

  const [tacticalSearch, injurySearch] = await Promise.all([
    tavilyClient.search(
      `How to beat a ${formation} with ${offensiveStyle} and ${defensiveStyle} football tactics`,
      { maxResults: 5, searchDepth: "advanced" }
    ),
    tavilyClient.search(`${opponent} recent injuries and lineup 2026`, {
      maxResults: 5,
    }),
  ]);

  const formatResults = (
    results: Array<{ title: string; url: string; content: string }>
  ) =>
    results
      .map((r) => `**${r.title}**\n${r.content}\nSource: ${r.url}`)
      .join("\n\n");

  const searchContext = `
## Real-World Tactical Intelligence (from live web search)

### Counter-Tactical Research – vs ${formation} (${offensiveStyle} / ${defensiveStyle})
${formatResults(tacticalSearch.results)}

### ${opponent} – Injuries & Lineup News
${formatResults(injurySearch.results)}
`.trim();

  const systemInstruction = `You are a Tactical Counter-Specialist — an elite football analyst whose sole mission is to break down an opponent's system and expose its weaknesses. You dissect formations, styles, and tendencies with surgical precision to help coaches devise the optimal plan to dismantle a specific opponent configuration.

You will be given:
1. The opponent's formation, offensive style, and defensive style.
2. Real-time data retrieved from the web about the opponent's tactics, current form, injuries, and lineup.

Your task is to recommend the best formation and tactical instructions to exploit the opponent's specific setup. Every recommendation must be grounded in the opponent's known configuration and the live data provided. Do not produce generic advice — your counter-plan must directly address the weaknesses of their exact shape and style. Structure your report with clear markdown headings, bullet points, and concise analysis sections.`;

  const userPrompt = `
## Opponent Configuration
- **Opponent:** ${opponent}
- **Formation:** ${formation}
- **Offensive Style:** ${offensiveStyle}
- **Defensive Style:** ${defensiveStyle}

${searchContext}

---

Based on the opponent configuration and real-world data above, generate a complete **Counter-Tactics for ${opponent}** report. The report must include:

1. **Opponent System Breakdown** – Analyse ${opponent}'s ${formation} shape, their ${offensiveStyle} attack, and ${defensiveStyle} defensive approach. Identify the structural and stylistic weaknesses in this exact configuration.
2. **Recommended Counter-Formation** – Suggest the optimal formation to use against this setup and explain why it specifically exploits their shape.
3. **Attacking Plan – How to Break Them Down** – Specific methods to exploit the gaps created by their ${formation} and ${defensiveStyle} block. Reference their known weak areas and how to overload or stretch them.
4. **Defensive Plan – How to Nullify Their Threat** – How to shut down their ${offensiveStyle} attack and exploit the spaces they leave when pressing or building up.
5. **Injury & Lineup Impact** – How their current absentees or rotation changes weaken their setup further and what that means for our approach.
6. **Key Matchup Battles** – Two or three individual battles on the pitch that are critical to winning this tactical duel.
7. **Set-Piece Angles** – One attacking and one defensive set-piece focus based on vulnerabilities in their shape.
8. **Manager's Pre-Match Message** – A short, punchy rallying call for the squad (3-4 sentences).
`.trim();

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

  // Try models in order; gemini-2.0-flash-lite has the most generous free tier
  const MODEL_PRIORITY = [
    "gemini-2.5-flash-lite", // fastest & most generous free tier
    "gemini-2.5-flash",      // best price-performance
    "gemini-2.5-pro",        // most capable, as last resort
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
      // Only fall through to next model on quota/not-found errors
      if (
        msg.includes("429") ||
        msg.includes("404") ||
        msg.toLowerCase().includes("quota") ||
        msg.toLowerCase().includes("not found")
      ) {
        continue;
      }
      // Any other error (auth, bad request, etc.) — fail immediately
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
        "Google AI quota exceeded for all available models. Enable billing at aistudio.google.com or wait for your daily quota to reset.",
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
