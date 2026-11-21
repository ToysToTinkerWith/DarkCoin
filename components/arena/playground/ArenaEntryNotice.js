import React from 'react';
import styles from './ArenaEntryNotice.module.css';

export const encounterEntryLocked=status=>status==='active'||status==='returning';

export default function ArenaEntryNotice({status,compact=false}){
 if(!encounterEntryLocked(status))return null;
 const returning=status==='returning';
 return <section className={`${styles.notice} ${compact?styles.compact:''}`} role="status" aria-live="polite" aria-atomic="true" aria-label="Arena entry status">
  <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>
  <div><div className={styles.label}>ARENA ENTRY TEMPORARILY CLOSED</div>
   <h3 className={styles.title}>{returning?'Graveclaw is returning to his grave':'Graveclaw is active and fighting champions'}</h3>
   <p className={styles.description}>{returning?'You can join again once he has returned to his grave.':'You cannot join this fight. Entry reopens when Graveclaw is defeated or defeats all champions and returns to his grave.'}{!compact&&' You can still inspect and prepare your champion below.'}</p>
  </div>
 </section>;
}
