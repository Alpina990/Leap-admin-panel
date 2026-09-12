import {handleAdmin} from '@/lib/admin-server';
export const dynamic='force-dynamic';
const handle=(request:Request)=>handleAdmin(request,'');
export {handle as GET,handle as POST,handle as PUT,handle as PATCH,handle as DELETE,handle as OPTIONS,handle as HEAD};
