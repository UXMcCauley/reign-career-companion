import { corsHeaders } from '../../src/server/cors';

export async function OPTIONS(req: Request) {
  // Preflight: must return the headers with an empty 204, or the real POST never fires.
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) });
}

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get('origin'));
  try {
    const payload = await req.json();
    const reply = await generateCoachReply(payload);
    return Response.json({ reply }, { headers: cors });
  } catch (err) {
    // why mirror cors here too: error responses are still cross-origin reads.
    // Without these headers the client sees a CORS failure instead of your 500 body.
    return Response.json(
      { error: err instanceof Error ? err.message : 'Coach request failed' },
      { status: 500, headers: cors }
    );
  }
}

function generateCoachReply(payload: any) {
    throw new Error('Function not implemented.');
}
