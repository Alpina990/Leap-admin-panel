import {handleAdmin} from '@/lib/admin-server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
async function handle(request:Request, context:{params:Promise<{path:string[]}>}) {
  const {path} = await context.params;
  return handleAdmin(request, path.length === 1 ? path[0] : '');
}
export {handle as GET,handle as POST,handle as PUT,handle as PATCH,handle as DELETE,handle as HEAD,handle as OPTIONS};
