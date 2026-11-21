import React,{useEffect,useId,useState,useRef,createContext,useContext} from 'react';
import {createPortal} from 'react-dom';
import {effectGlossary,effectMatches} from '../lib/effect-glossary';

export const EffectRulesContext=createContext('playtest');
export function EffectRulesScope({ruleset='classic',children}){return <EffectRulesContext.Provider value={ruleset}><div data-effect-ruleset={ruleset}>{children}</div></EffectRulesContext.Provider>;}

function Tooltip({tip,id}){if(!tip||typeof document==='undefined')return null;const width=Math.min(320,window.innerWidth-24),left=Math.max(12,Math.min(tip.x,window.innerWidth-width-12)),below=tip.y<150;return createPortal(<aside id={id} role="tooltip" data-effect-tooltip className="effectTooltip" style={{left,width,top:below?tip.y+20:tip.y-12,transform:below?'none':'translateY(-100%)'}}><strong>{tip.word}</strong><p>{effectGlossary(tip.ruleset)[tip.key]}</p></aside>,document.body);}
function Term({word,term,ruleset}){
 const [tip,setTip]=useState(null),id=useId(),element=useRef(null),show=e=>{const r=e.currentTarget.getBoundingClientRect();setTip({word,key:term,ruleset,x:r.left,y:r.top});};
 useEffect(()=>setTip(null),[ruleset]);
 useEffect(()=>{if(!tip)return;const dismiss=()=>setTip(null),outside=e=>{if(!element.current?.contains(e.target))dismiss();};window.addEventListener('scroll',dismiss,true);window.addEventListener('resize',dismiss);document.addEventListener('pointerdown',outside);return()=>{window.removeEventListener('scroll',dismiss,true);window.removeEventListener('resize',dismiss);document.removeEventListener('pointerdown',outside);};},[!!tip]);
 return <><span ref={element} role="button" tabIndex={0} data-effect-keyword data-effect-ruleset={ruleset} className="effectKeyword" aria-label={word+': '+effectGlossary(ruleset)[term]} aria-describedby={tip?id:undefined} onPointerEnter={e=>{if(e.pointerType!=='touch')show(e);}} onPointerLeave={e=>{if(e.pointerType!=='touch')setTip(null);}} onFocus={show} onBlur={()=>setTip(null)} onClick={e=>{e.stopPropagation();show(e);}} onKeyDown={e=>{if(e.key==='Escape')setTip(null);if(e.key==='Enter'||e.key===' '){e.preventDefault();show(e);}}}>{word}</span><Tooltip id={id} tip={tip}/></>;
}
export function EffectText({children}){const ruleset=useContext(EffectRulesContext);if(typeof children!=='string')return children;const matches=effectMatches(children,ruleset),parts=[];let last=0;for(const m of matches){parts.push(children.slice(last,m.start),<Term key={m.start} word={m.word} term={m.key} ruleset={ruleset}/>);last=m.end;}parts.push(children.slice(last));return <>{parts}</>;}

// Cover dynamically rendered text throughout the site without rewriting React's
// text nodes. Custom Highlight ranges are paint-only; forms and canvas stay intact.
export default function EffectKeywords(){
 const ruleset=useContext(EffectRulesContext);
 const [tip,setTip]=useState(null);const id=useId();
 useEffect(()=>{
  setTip(null);
  if(!globalThis.CSS?.highlights||!globalThis.Highlight)return;
  let ranges=new Map(),timer,disposed=false,hoverKey='';
  const ignored='script,style,textarea,input,select,option,code,pre,[contenteditable], [data-effect-keyword],[data-effect-tooltip],[data-no-keywords],[data-champion-name]';
  const scan=()=>{if(disposed)return;const next=new Map(),paint=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>!n.parentElement||n.parentElement.closest(ignored)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});let node;while((node=walker.nextNode())){const nodeRuleset=node.parentElement.closest('[data-effect-ruleset]')?.getAttribute('data-effect-ruleset')||ruleset;const entries=effectMatches(node.textContent,nodeRuleset).map(m=>{const range=document.createRange();range.setStart(node,m.start);range.setEnd(node,m.end);paint.push(range);return {...m,range,ruleset:nodeRuleset};});if(entries.length)next.set(node,entries);}ranges=next;CSS.highlights.set('darkcoin-effects',new Highlight(...paint));};
  const observer=new MutationObserver(records=>{if(records.every(r=>r.target.parentElement?.closest('[data-effect-tooltip]')||[...r.addedNodes,...r.removedNodes].every(n=>n.nodeType===1&&n.hasAttribute('data-effect-tooltip'))&&r.type==='childList'))return;if(!timer)timer=setTimeout(()=>{timer=null;scan();},120);});observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-effect-ruleset']});scan();
  const point=e=>{const caret=document.caretPositionFromPoint?.(e.clientX,e.clientY),range=!caret&&document.caretRangeFromPoint?.(e.clientX,e.clientY),node=caret?.offsetNode||range?.startContainer,offset=caret?.offset??range?.startOffset;const hit=ranges.get(node)?.find(m=>offset>=m.start&&offset<=m.end&&[...m.range.getClientRects()].some(r=>e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom));return hit;};
  const move=e=>{if(e.pointerType==='touch')return;const hit=point(e),key=hit?hit.ruleset+hit.key+hit.range.startOffset+hit.range.startContainer.textContent:'';if(key===hoverKey)return;hoverKey=key;if(hit){const r=hit.range.getBoundingClientRect();setTip({...hit,x:r.left,y:r.top});}else setTip(null);};
  const tap=e=>{if(e.target.closest?.('[data-effect-keyword]'))return;const hit=point(e);if(hit){const r=hit.range.getBoundingClientRect();setTip({...hit,x:r.left,y:r.top});}else setTip(null);};
  const dismiss=()=>{hoverKey='';setTip(null);};const key=e=>{if(e.key==='Escape')dismiss();};
  document.addEventListener('pointermove',move,{passive:true});document.addEventListener('click',tap);document.addEventListener('keydown',key);document.addEventListener('focusin',dismiss);window.addEventListener('scroll',dismiss,true);window.addEventListener('resize',dismiss);
  return()=>{disposed=true;clearTimeout(timer);observer.disconnect();CSS.highlights.delete('darkcoin-effects');document.removeEventListener('pointermove',move);document.removeEventListener('click',tap);document.removeEventListener('keydown',key);document.removeEventListener('focusin',dismiss);window.removeEventListener('scroll',dismiss,true);window.removeEventListener('resize',dismiss);};
 },[ruleset]);
 return <Tooltip tip={tip} id={id}/>;
}
