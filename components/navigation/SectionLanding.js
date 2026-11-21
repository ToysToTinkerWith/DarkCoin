import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from './SectionLanding.module.css';

// All section entry pages share one layout. Content and artwork belong to each
// section, while spacing, typography, cards and interactions stay consistent.
export default function SectionLanding({section, title, subtitle, description, background, backgroundPosition='center 46%', logo, cards}) {
  return <>
    <Head><title>Dark Coin {title}</title><meta name="description" content={description}/></Head>
    <main className={styles.page} data-section-navigation={section}>
      <section className={styles.hero} data-section-hero style={{backgroundImage:`url("${background}")`,backgroundPosition}} aria-labelledby={`${section}-title`}>
        <div className={styles.heroOverlay} aria-hidden="true"/>
        <div className={styles.heroContent}>
          <div className={styles.seal} aria-hidden="true"><img src={logo} alt=""/></div>
          <div className={styles.heroText}>
            <p className={styles.welcome}>Enter the</p>
            <h1 id={`${section}-title`} data-section-heading>{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
        </div>
      </section>
      <nav className={styles.cardsSection} aria-label={`${title} destinations`}>
        <div className={styles.cardsGrid} style={{'--navigation-columns':Math.min(cards.length,3),'--navigation-extra-space':cards.some(card=>card.extra)?'64px':'0px'}}>
          {cards.map(card=><article className={styles.card} data-section-card key={card.key}>
            <div className={styles.floatingIcon} aria-hidden="true"><img src={card.icon||logo} alt=""/></div>
            <div className={styles.cardShell} data-section-card-shell>
              <div className={styles.cardImage} aria-hidden="true" style={{backgroundImage:`url("${card.image}")`,backgroundPosition:card.imagePosition||'center',backgroundSize:card.fit||'cover'}}/>
              <div className={styles.cardFade} aria-hidden="true"/>
              <div className={styles.cardContent}>
                <p className={styles.cardKicker}>{card.kicker}</p>
                <h2><small>Dark Coin</small>{card.title}</h2>
                <div className={styles.divider} aria-hidden="true"><span/><b>◇</b><span/></div>
                <p className={styles.cardDescription}>{card.description}</p>
                <div className={styles.cardActions}>
                  {card.href?<Link href={card.href} legacyBehavior><a className={styles.cardButton} data-section-card-action><span>{card.action}</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></a></Link>:<p className={styles.unavailable}>{card.unavailable||'Temporarily unavailable.'}</p>}
                </div>
                <div className={styles.cardExtra}>{card.extra||null}</div>
              </div>
            </div>
          </article>)}
        </div>
      </nav>
    </main>
  </>;
}
