// Serves /ads.txt to authorize the AdSense seller, derived from the publisher
// id (which has a default in src/lib/ads.ts, so this always serves a line).
import { ADSENSE_CLIENT } from '@/lib/ads';

export const dynamic = 'force-static';

export function GET() {
  // "ca-pub-1234..." -> "pub-1234..."; f08c47fec0942fa0 is Google's fixed cert id.
  const publisherId = ADSENSE_CLIENT.replace(/^ca-/, '');
  const body = `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`;
  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
