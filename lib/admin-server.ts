import 'server-only';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {proxyAdmin} from './admin-bff.mjs';
import type {AdminSession} from './admin-types';

export async function handleAdmin(request: Request, action: string): Promise<Response> {
  try {
    return await proxyAdmin(request, action, {
      api: process.env.LEAP_ADMIN_API_URL,
      origin: process.env.LEAP_ADMIN_ORIGIN,
    });
  } catch {
    return Response.json({error:{code:'admin_unavailable',message:'Administrator service unavailable.'}},
      {status:503,headers:{'Cache-Control':'no-store'}});
  }
}

export async function requireAdminSession(): Promise<AdminSession> {
  const incoming = await headers();
  // Internal GET: no Origin is needed or manufactured. Never use incoming Host
  // or proxy identity headers to choose an upstream or establish authorization.
  const response = await handleAdmin(new Request('https://admin.invalid/api/admin/session', {
    headers: {cookie: incoming.get('cookie') ?? ''},
  }), 'session');
  if (response.status === 401) redirect('/login');
  if (!response.ok) throw new Error('Administrator service unavailable. Please retry.');
  return await response.json() as AdminSession;
}
