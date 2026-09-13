import staticCopy from './design-static-copy.json' with {type:'json'};
// Explicit, audited name + exact-text pairs. New or changed archive text is
// unavailable by default. Geometry never carries an implied data contract.
export const routes={Overview:'bi8Au',Learners:'C5tZxu',Content:'DUfwI',Commerce:'uYGzD',Learning:'KNuM1',Messages:'nqETx'};
export function adaptDesign(node){
 if(typeof node==='string')return '—';
 const approved=staticCopy[node.attrs['data-pencil-name']];
 return {...node,attrs:{...node.attrs},children:node.children.map(child=>typeof child==='string'?(approved?.includes(child)?child:'—'):adaptDesign(child))};
}
export function indexDesign(node,result={}){
 if(typeof node==='string')return result;
 result[node.attrs['data-pencil-name']]=node;
 node.children.forEach(child=>indexDesign(child,result));return result;
}
