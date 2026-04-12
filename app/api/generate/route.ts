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
    tavilyClient.search(`${opponent} tactical analysis 2026`, {
      maxResults: 5,
      searchDepth: "advanced",
    }),
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

### ${opponent} – Tactical Analysis
${formatResults(tacticalSearch.results)}

### ${opponent} – Injuries & Lineup News
${formatResults(injurySearch.results)}
`.trim();

  const systemInstruction = `You are a world-class football analyst with decades of experience at the highest levels of the game. Your job is to produce highly specific, actionable tactical blueprints for coaches preparing to face a given opponent.

You will be given:
1. The user's intended formation, offensive style, and defensive style.
2. Real-time data retrieved from the web about the opponent's tactics, current form, injuries, and lineup.

Your task is to analyse the gap between the user's tactical setup and the opponent's current real-world state. Do not produce generic advice — every instruction must be directly informed by the live data provided. Structure your report with clear markdown headings, bullet points, and concise analysis sections.`;

  const userPrompt = `
## Our Tactical Setup
- **Formation:** ${formation}
- **Offensive Style:** ${offensiveStyle}
- **Defensive Style:** ${defensiveStyle}

## Opponent
**${opponent}**

${searchContext}

---

Based on the real-world data above, generate a complete **Tactical Blueprint** for our match against **${opponent}**. The report must include:

1. **Opponent Overview** – A brief summary of ${opponent}'s current form, system, and key threats based on the search data.
2. **Key Vulnerabilities to Exploit** – Specific weaknesses (tactical, personnel, or shape-related) our ${offensiveStyle} attack in a ${formation} can target.
3. **Threats to Neutralise** – How our ${defensiveStyle} defensive scheme must adapt to counter ${opponent}'s specific strengths and danger players.
4. **Injury & Lineup Impact** – How their current absentees or rotation changes affect our approach.
5. **Phase-by-Phase Instructions** – Tactical instructions for in-possession, out-of-possession, and transitions.
6. **Set-Piece Recommendations** – One attacking and one defensive set-piece focus based on the opponent's data.
7. **Manager's Pre-Match Message** – A short, punchy motivational summary for the squad (3-4 sentences).
`.trim();

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    systemInstruction,
  });

  const result = await model.generateContentStream(userPrompt);

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
