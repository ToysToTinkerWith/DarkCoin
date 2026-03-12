import React from "react";

/** ====== Data as a named export ====== */
export const trees = [
  {
    skill1: { title: "Poison", effect: "Poison + 1", level: 0, maxLevel: 3, byte: 0 },
    skill2: { title: "Toxic Cask", effect: "Curses apply 1 poison on hit", level: 0, maxLevel: 3, byte: 1 },
    skill3: { title: "Antidote", effect: "Lose 1 poison on self when hit with a buff", level: 0, maxLevel: 3, byte: 2 },
  },
  {
    skill1: { title: "Bleed", effect: "Bleed + 1", level: 0, maxLevel: 3, byte: 100 },
    skill2: { title: "Vampire", effect: "Applying bleed restores 1 health", level: 0, maxLevel: 3, byte: 101 },
    skill3: { title: "Drown in Blood", effect: "Applying bleed applies 1 drown", level: 0, maxLevel: 3, byte: 102 },
  },
  {
    skill1: { title: "Burn", effect: "Burn + 1", level: 0, maxLevel: 3, byte: 200 },
    skill2: { title: "Fiery Hell", effect: "Applying burn applies 1 doom", level: 0, maxLevel: 3, byte: 201 },
    skill3: { title: "Gasoline", effect: "Hitting burned targets applies 1 burn", level: 0, maxLevel: 3, byte: 202 },
  },
  {
    skill1: { title: "Freeze", effect: "Freeze + 1", level: 0, maxLevel: 3, byte: 300 },
    skill2: { title: "Cold Hands", effect: "Melee hits apply 1 freeze", level: 0, maxLevel: 3, byte: 301 },
    skill3: { title: "Heart of Ice", effect: "Freeze applied on self grants 1 health, apply 1 freeze on self per turn", level: 0, maxLevel: 3, byte: 302 },
  },
  {
    skill1: { title: "Slow", effect: "Slow + 1", level: 0, maxLevel: 3, byte: 400 },
    skill2: { title: "Quicksand", effect: "Hitting slowed targets applies 1 slow", level: 0, maxLevel: 3, byte: 401 },
    skill3: { title: "Slow Motion", effect: "Slow applied on self applies 1 focus, apply 1 slow on self per turn", level: 0, maxLevel: 3, byte: 402 },
  },
  {
    skill1: { title: "Drown", effect: "Drown + 1", level: 0, maxLevel: 3, byte: 500 },
    skill2: { title: "Deep Water", effect: "Drown + 2", level: 0, maxLevel: 3, byte: 501 },
    skill3: { title: "Suffocation", effect: "Magic attacks apply 1 drown", level: 0, maxLevel: 3, byte: 502 },
  },
  {
    skill1: { title: "Paralyze", effect: "Paralyze + 1", level: 0, maxLevel: 3, byte: 600 },
    skill2: { title: "High Voltage", effect: "Paralyze + 2", level: 0, maxLevel: 3, byte: 601 },
    skill3: { title: "Conductivity", effect: "Paralyze attacks do +1 damage to targets with drown", level: 0, maxLevel: 3, byte: 602 },
  },
  {
    skill1: { title: "Doom", effect: "Doom + 1", level: 0, maxLevel: 3, byte: 700 },
    skill2: { title: "Sadistic Pleasure", effect: "Melee attacks apply 2 doom and 1 doom to self", level: 0, maxLevel: 3, byte: 701 },
    skill3: { title: "Unatural Hunger", effect: "Doom applied on self heals 1 health", level: 0, maxLevel: 3, byte: 702 },
  },
  {
    skill1: { title: "Shield", effect: "Shield + 1", level: 0, maxLevel: 3, byte: 800 },
    skill2: { title: "Knights Honor", effect: "Shield + 2", level: 0, maxLevel: 3, byte: 801 },
    skill3: { title: "Paladin", effect: "Applying shield also applies 1 bless", level: 0, maxLevel: 3, byte: 802 },
  },
  {
    skill1: { title: "Strengthen", effect: "Strengthen + 1", level: 0, maxLevel: 3, byte: 900 },
    skill2: { title: "Arm Day", effect: "Melee attacks apply 1 strengthn", level: 0, maxLevel: 3, byte: 901 },
    skill3: { title: "Cardio is King", effect: "Each strengthen on self also grants 0.2 speed", level: 0, maxLevel: 3, byte: 902 },
  },
  {
    skill1: { title: "Focus", effect: "Focus + 1", level: 0, maxLevel: 3, byte: 1000 },
    skill2: { title: "Eagle Eye", effect: "Focus + 2", level: 0, maxLevel: 3, byte: 1001 },
    skill3: { title: "Arrow of Truth", effect: "Ranged attacks apply 1 empower to self", level: 0, maxLevel: 3, byte: 1002 },
  },
  {
    skill1: { title: "Empower", effect: "Empower + 1", level: 0, maxLevel: 3, byte: 1100 },
    skill2: { title: "Confidence of Self", effect: "Empower on self also grants 0.2 dexterity", level: 0, maxLevel: 3, byte: 1101 },
    skill3: { title: "Honest Touch", effect: "Melee buffs apply 2 empower", level: 0, maxLevel: 3, byte: 1102 },
  },
  {
    skill1: { title: "Nurture", effect: "Nurture + 1", level: 0, maxLevel: 3, byte: 1200 },
    skill2: { title: "Long Summer", effect: "Nurture on self provides an additional 0.1 health regen", level: 0, maxLevel: 3, byte: 1201 },
    skill3: { title: "Green Aura", effect: "Buffs apply 1 nurture", level: 0, maxLevel: 3, byte: 1202 },
  },
  {
    skill1: { title: "Bless", effect: "Bless + 1", level: 0, maxLevel: 3, byte: 1300 },
    skill2: { title: "Unwaivering Faith", effect: "Bless applied on self also applies 1 focus", level: 0, maxLevel: 3, byte: 1301 },
    skill3: { title: "Miracles do Happen", effect: "Magic moves have a 25% chance to apply 4 bless on self", level: 0, maxLevel: 3, byte: 1302 },
  },
  {
    skill1: { title: "Hasten", effect: "Hasten + 1", level: 0, maxLevel: 3, byte: 1400 },
    skill2: { title: "Need for Speed", effect: "Hasten provides an additional 0.1 speed", level: 0, maxLevel: 3, byte: 1401 },
    skill3: { title: "Drug Lord", effect: "Hasten on self applies 1 strengthen and 1 focus, but also 1 doom", level: 0, maxLevel: 3, byte: 1402 },
  },
  {
    skill1: { title: "Cleanse", effect: "Cleanse + 1", level: 0, maxLevel: 3, byte: 1500 },
    skill2: { title: "Washed Hands", effect: "Melee buffs apply 1 cleanse", level: 0, maxLevel: 3, byte: 1501 },
    skill3: { title: "Restored Judgement", effect: "Applying cleanse applies 1 empower", level: 0, maxLevel: 3, byte: 1502 },
  },
];

/** ====== Simple presentational component (default export) ====== */
function SkillTrees({ onSelect }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {trees.map((tree, treeIndex) => {
        const trio = [tree.skill1, tree.skill2, tree.skill3];
        return (
          <div key={treeIndex} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
            <h3 style={{ margin: 0 }}>Tree {treeIndex + 1}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 12 }}>
              {trio.map((skill, tierIndex) => (
                <button
                  key={skill.title}
                  onClick={() => onSelect?.(skill, treeIndex, tierIndex)}
                  style={{
                    textAlign: "left",
                    cursor: onSelect ? "pointer" : "default",
                    borderRadius: 10,
                    padding: 12,
                    border: "1px solid #ccc",
                    background: "#fff",
                  }}
                >
                  <strong>{skill.title}</strong>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{skill.effect}</div>
                  <div style={{ fontSize: 12, marginTop: 8 }}>
                    Level: {skill.level} / {skill.maxLevel}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Byte: {skill.byte}</div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default SkillTrees;
