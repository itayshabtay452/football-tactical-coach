import { tavily } from "@tavily/core";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  const {
    opponentDefensiveFormation,
    opponentOffensiveFormation,
    defensiveApproach,
    offensiveApproach,
  } = await request.json() as {
    opponentDefensiveFormation: string;
    opponentOffensiveFormation: string;
    defensiveApproach: string;
    offensiveApproach: string;
  };

  if (
    !opponentDefensiveFormation ||
    !opponentOffensiveFormation ||
    !defensiveApproach ||
    !offensiveApproach
  ) {
    return new Response("Missing required fields", { status: 400 });
  }

  const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY! });

  const tacticalQuery = [
    `football tactical analysis`,
    `defensive formation ${opponentDefensiveFormation}`,
    `offensive formation ${opponentOffensiveFormation}`,
    `${defensiveApproach} defensive approach`,
    `${offensiveApproach} offensive style`,
    `strengths weaknesses how to beat counter tactics`,
  ].join(" ");

  const historicalQuery = [
    `football teams historical examples`,
    `${offensiveApproach} attack ${defensiveApproach} defense`,
    `${opponentOffensiveFormation} formation past games analysis real teams`,
  ].join(" ");

  const [tacticalSearch, historicalSearch] = await Promise.all([
    tavilyClient.search(tacticalQuery, {
      maxResults: 5,
      searchDepth: "advanced",
    }),
    tavilyClient.search(historicalQuery, {
      maxResults: 5,
      searchDepth: "advanced",
    }),
  ]);

  const formatResults = (
    results: Array<{ title: string; url: string; content: string }>
  ) =>
    results
      .map((r) => `**${r.title}**\n${r.content}\nSource: ${r.url}`)
      .join("\n\n");

  const searchContext = `
## מודיעין טקטי בזמן אמת (מחיפוש רשת חי)

### ניתוח טקטי – ${opponentDefensiveFormation} הגנה / ${opponentOffensiveFormation} התקפה · ${defensiveApproach} / ${offensiveApproach}
${formatResults(tacticalSearch.results)}

### דוגמאות היסטוריות – קבוצות ומשחקים דומים
${formatResults(historicalSearch.results)}
`.trim();

  const systemInstruction = `אתה מנתח טקטי עילית בכדורגל — מומחה לפיצוח מערכות יריב וחשיפת נקודות תורפה. תפקידך לנתח את ההגדרה הטקטית של היריב ולהציג תכנית נגד מפורטת לאנשי המקצוע.

תקבל:
1. ניסוח ההגנה וההתקפה של היריב, גישת ההגנה וסגנון ההתקפה שלו.
2. נתונים בזמן אמת מהרשת על הטקטיקה, היסטוריה, חוזקות וחולשות של מערכת זו.

כללים מחייבים:
- השתמש אך ורק בהקשר שסופק מחיפוש הרשת כבסיס לניתוח. אסור לייצר ניתוח גנרי.
- כתוב את כל התשובה בעברית בלבד.
- השתמש בטרמינולוגיה מקצועית של כדורגל.
- בנה את הדוח בדיוק ב-3 חלקים עם כותרות בעברית כפי שמפורט בהנחיות המשתמש.`;

  const userPrompt = `
## הגדרה טקטית של היריב
- **ניסוח הגנתי:** ${opponentDefensiveFormation}
- **ניסוח התקפי:** ${opponentOffensiveFormation}
- **גישה הגנתית:** ${defensiveApproach}
- **גישה התקפית:** ${offensiveApproach}

${searchContext}

---

על בסיס ההגדרה הטקטית והנתונים מחיפוש הרשת לעיל, כתוב דוח טקטי מקצועי מלא בעברית.
הדוח חייב להיות מחולק בדיוק ל-3 חלקים בלבד עם הכותרות הבאות:

## סקירה טקטית
(נתח את שילוב הניסוחים ${opponentDefensiveFormation} הגנה ו-${opponentOffensiveFormation} התקפה יחד עם גישת ${defensiveApproach} ו-${offensiveApproach}. זהה את החוזקות, החולשות, ונקודות התורפה המבניות של מערכת זו בדיוק. השתמש בנתונים מהחיפוש כבסיס לניתוך.)

## איך מנצחים את זה
(המלצות מעשיות וספציפיות כיצד לנגד ולנצח את ההגדרה הזו: ניסוח נגד מומלץ, תכנית התקפית לפיצוח ה-${defensiveApproach}, תכנית הגנתית לבלימת ה-${offensiveApproach}, ומפתחות קרב קריטיים במגרש.)

## דוגמאות מהעבר
(דוגמאות היסטוריות אמיתיות של קבוצות ומשחקים שהשתמשו בהגדרה דומה — מה עבד, מה לא עבד, ולקחים מעשיים. השתמש בנתונים מחיפוש הרשת.)
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
