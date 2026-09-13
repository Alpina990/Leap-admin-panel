/** Keep observations during a refresh, never across a different identity query. */
export function readState(previous,path,revision){
 const key=`${path}:${revision}`;
 if(!path)return {key,loading:false};
 if(previous.key===key)return {...previous,loading:false};
 return {key,path,loading:true,...(previous.path===path?{data:previous.data,syncedAt:previous.syncedAt}:{})};
}
