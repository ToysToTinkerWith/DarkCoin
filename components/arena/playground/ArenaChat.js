import React,{useEffect,useRef,useState} from 'react';
import {CHAT_LIMIT} from '../../../lib/arena/chat';
export default function ArenaChat({messages,open,blocked,onOpen,onClose,onSend}){
 const [draft,setDraft]=useState(''),input=useRef(null),history=useRef(null);
 useEffect(()=>{if(open)input.current?.focus();},[open]);
 useEffect(()=>{const el=history.current;if(el)el.scrollTop=el.scrollHeight;},[messages]);
 const submit=e=>{e.preventDefault();if(draft.trim()&&onSend(draft)){setDraft('');onClose();}};
 return <section className="arenaChat" aria-label="Arena chat">
  <div ref={history} className="arenaChatHistory" role="log" aria-label="Champion messages" aria-live="polite" aria-relevant="additions">{messages.map(m=><p key={m.id}><strong>{m.name}</strong><span>{m.text}</span></p>)}</div>
  {open&&!blocked?<form onSubmit={submit}><label className="arenaChatLabel" htmlFor="arena-chat-input">Message the arena</label><input ref={input} id="arena-chat-input" value={draft} maxLength={CHAT_LIMIT} autoComplete="off" placeholder="Say something…" onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{e.stopPropagation();if(e.nativeEvent.isComposing&&e.key==='Enter')e.preventDefault();if(e.key==='Escape'){e.preventDefault();onClose();}}}/><button type="submit" disabled={!draft.trim()}>Send</button><small>Enter to send · Esc to cancel</small></form>:<button className="arenaChatOpen" disabled={blocked} onClick={onOpen}><kbd>Enter</kbd> Chat with champions</button>}
 </section>;
}
