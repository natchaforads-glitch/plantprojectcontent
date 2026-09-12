export type Role='editor'|'viewer'|null
const VP=process.env.NEXT_PUBLIC_VIEWER_PW??'PlantView2026!'
const EP=process.env.NEXT_PUBLIC_EDITOR_PW??'PlantTeam2026!'
export function checkPW(pw:string):Role{if(pw===EP)return 'editor';if(pw===VP)return 'viewer';return null}
export function getRole():Role{if(typeof window==='undefined')return null;return(sessionStorage.getItem('pc_role')as Role)??null}
export function saveRole(r:Role){if(r)sessionStorage.setItem('pc_role',r);else sessionStorage.removeItem('pc_role')}
export function clearRole(){sessionStorage.removeItem('pc_role')}
