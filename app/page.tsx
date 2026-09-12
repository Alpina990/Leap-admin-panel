import Home from './leap';
import {requireAdminSession} from '@/lib/admin-server';
export const dynamic='force-dynamic';
export default async function Page(){const session=await requireAdminSession();return <Home session={session}/>;}
