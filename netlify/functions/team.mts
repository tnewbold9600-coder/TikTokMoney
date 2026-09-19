import type { Context, Config } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = Netlify.env.get("OPENAI_API_KEY");

  if (!apiKey) {
    return Response.json(
      { error: "AI Team needs OPENAI_API_KEY in Netlify." },
      { status: 503 }
    );
  }

  const body = await req.json();

  const system = `You are the Orchestrator for TikTok Money.

Coordinate these AI roles:
- Scout: research and opportunity discovery
- Analyst: economics and evidence
- Strategist: testing and positioning
- Creative: hooks and scripts
- Critic: challenge assumptions

The user is the boss.

Be concise and action-oriented.
Never pretend research or web searching occurred unless it actually occurred.

Use the supplied TikTok Money state as shared working memory.

Return JSON only in this format:
{"reply":"direct answer to boss","events":[{"agent":"AGENT","message":"meaningful update"}]}`;

  const payload = {
    model: Netlify.env.get("OPENAI_MODEL") || "gpt-5-mini",
    input: [
      { role: "system", content: system },
      {
        role: "user",
        content:
          `Boss command: ${body.command}\nShared state: ` +
          JSON.stringify(body.state).slice(0, 24000)
      }
    ],
    text: {
      format: {
        type: "json_object"
      }
    }
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    return Response.json(
      { error: `AI provider error ${response.status}` },
      { status: 502 }
    );
  }

  const data = await response.json();

  const text =
    data.output_text ||
    data.output
      ?.flatMap((item: any) => item.content || [])
      .find((item: any) => item.type === "output_text")?.text;

  try {
    return Response.json(JSON.parse(text));
  } catch {
    return Response.json({
      reply: text || "No response returned.",
      events: []
    });
  }
};

export const config: Config = {
  path: "/api/team"
};
