import { NextRequest, NextResponse } from 'next/server';

const AGENT_BASE_URL = process.env.AGENT_API_URL || 'https://anchor-agent-api-400512176866.us-central1.run.app';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    if (action === 'version') {
      const res = await fetch(`${AGENT_BASE_URL}/version`);
      if (!res.ok) throw new Error(`Version API returned status ${res.status}`);
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (action === 'apps') {
      const res = await fetch(`${AGENT_BASE_URL}/list-apps`);
      if (!res.ok) throw new Error(`List-apps API returned status ${res.status}`);
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId = 'default_user', appName = 'agent', sessionId, message } = body;

    if (action === 'session') {
      const targetUrl = `${AGENT_BASE_URL}/apps/${appName}/users/${encodeURIComponent(userId)}/sessions`;
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        throw new Error(`Failed to create session: ${res.statusText}`);
      }

      const sessionData = await res.json();
      return NextResponse.json(sessionData);
    }

    if (action === 'chat') {
      if (!sessionId || !message) {
        return NextResponse.json({ error: 'sessionId and message are required' }, { status: 400 });
      }

      const targetUrl = `${AGENT_BASE_URL}/run_sse`;
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ADK's RunAgentRequest takes the user's text as `new_message` (a Content object).
        // An unknown `message` field is silently dropped, so the agent never sees the question.
        body: JSON.stringify({
          app_name: appName,
          user_id: userId,
          session_id: sessionId,
          new_message: { role: 'user', parts: [{ text: message }] },
        }),
      });

      if (!res.ok) {
        throw new Error(`Agent run_sse failed: ${res.statusText}`);
      }

      const sseText = await res.text();
      return NextResponse.json({ raw: sseText });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
