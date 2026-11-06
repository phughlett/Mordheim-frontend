import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getMaximumExperience, getRosterExperienceTotal } from "../experience-rules";
import { fieldingSummary } from "../fielding-summary";
import { statLabels, type Member } from "../types";
import { PrintExperienceTrack } from "./experience/print-experience-track";

type ExampleWarrior = Pick<Member, "id" | "name" | "type" | "role" | "groupSize" | "experience" | "stats" | "equipment" | "notes"> & {
  skills: string[];
  advances: string;
  injuries: { name: string; effect: string; battle: number }[];
};

export const exampleWarband = {
  name: "The Lantern Guard",
  warband: "Reikland Mercenaries",
  battles: 14,
  treasury: 146,
  wyrdstone: 4,
  stash: ["Healing herbs × 2", "Lucky charm", "Sword"],
  members: [
    {
      id: "lantern-captain", name: "Captain Otto Brandt", type: "Mercenary Captain", role: "Hero",
      groupSize: 1, experience: "60",
      stats: { M: "4", WS: "5", BS: "5", S: "3", T: "3", W: "2", I: "5", A: "2", Ld: "8" },
      equipment: "Sword, duelling pistol, dagger, light armour, helmet, lucky charm",
      skills: ["Step Aside", "Haggle", "Wyrdstone Hunter"],
      advances: "+1 WS, +1 BS, +1 W, +1 I, +1 A",
      injuries: [],
      notes: "Leader. Once a caravan officer; now he keeps a lantern burning for every warrior who makes it home.",
    },
    {
      id: "lantern-marta", name: "Marta Ironhand", type: "Champion", role: "Hero",
      groupSize: 1, experience: "38",
      stats: { M: "3", WS: "5", BS: "3", S: "4", T: "4", W: "2", I: "3", A: "2", Ld: "7" },
      equipment: "Sword, hammer, dagger, light armour, helmet, lucky charm",
      skills: ["Mighty Blow", "Resilient", "Step Aside"],
      advances: "+1 WS, +1 S, +1 T, +1 W, +1 A",
      injuries: [{ name: "Leg Wound", effect: "Movement reduced by 1. Her profile already includes the penalty.", battle: 9 }],
      notes: "Held the bridge while the marksmen escaped. A damaged leg has not softened her resolve.",
    },
    {
      id: "lantern-falk", name: "Falk Longwatch", type: "Champion", role: "Hero",
      groupSize: 1, experience: "32",
      stats: { M: "4", WS: "4", BS: "5", S: "3", T: "3", W: "2", I: "3", A: "2", Ld: "7" },
      equipment: "Crossbow, sword, dagger, light armour, helmet, rope & hook",
      skills: ["Quick Shot", "Eagle Eyes", "Nimble"],
      advances: "+2 BS, +1 W, +1 A",
      injuries: [{ name: "Hardened", effect: "Immune to fear after surviving a terrifying encounter.", battle: 11 }],
      notes: "The company's rooftop lookout. Carries a spare lantern to signal safe routes through the ruins.",
    },
    {
      id: "lantern-elsa", name: "Elsa Voss", type: "Youngblood", role: "Hero",
      groupSize: 1, experience: "22",
      stats: { M: "4", WS: "4", BS: "2", S: "4", T: "3", W: "2", I: "3", A: "2", Ld: "6" },
      equipment: "Sword, buckler, dagger, light armour, helmet",
      skills: ["Sprint", "Dodge", "Strike to Injure"],
      advances: "+2 WS, +1 S, +1 W, +1 A",
      injuries: [],
      notes: "Joined as the company runner. Now trusted to lead the rush for unattended wyrdstone.",
    },
    {
      id: "lantern-jakob", name: "Jakob Ash", type: "Youngblood", role: "Hero",
      groupSize: 1, experience: "18",
      stats: { M: "4", WS: "2", BS: "3", S: "3", T: "3", W: "1", I: "4", A: "2", Ld: "6" },
      equipment: "Bow, sword, dagger, light armour, helmet, lucky charm",
      skills: ["Eagle Eyes", "Dodge", "Sprint"],
      advances: "+1 WS, +1 BS, +1 I, +1 A",
      injuries: [{ name: "Hand Injury", effect: "Weapon Skill reduced by 1. His profile already includes the penalty.", battle: 6 }],
      notes: "Still wears the scorched coat from his first expedition. Learning to fight around an old hand injury.",
    },
    {
      id: "lantern-swords", name: "The Lamplighters", type: "Swordsmen", role: "Henchman",
      groupSize: 3, experience: "9",
      stats: { M: "4", WS: "5", BS: "3", S: "4", T: "3", W: "1", I: "3", A: "2", Ld: "7" },
      equipment: "Each model: sword, buckler, dagger, light armour, helmet",
      skills: [], advances: "+1 WS, +1 S, +1 A", injuries: [],
      notes: "Three veterans who guard the Heroes' flanks. Equipment and experience are tracked per model.",
    },
    {
      id: "lantern-marksmen", name: "The High Windows", type: "Marksmen", role: "Henchman",
      groupSize: 3, experience: "8",
      stats: { M: "4", WS: "3", BS: "5", S: "3", T: "3", W: "1", I: "4", A: "1", Ld: "7" },
      equipment: "Each model: crossbow, dagger, helmet",
      skills: [], advances: "+1 BS, +1 I", injuries: [],
      notes: "Reikland's marksmen begin with BS 4; this experienced group has improved to BS 5.",
    },
    {
      id: "lantern-warrior", name: "Old Rudi", type: "Warrior", role: "Henchman",
      groupSize: 1, experience: "6",
      stats: { M: "4", WS: "4", BS: "3", S: "3", T: "3", W: "1", I: "3", A: "2", Ld: "7" },
      equipment: "Spear, shield, dagger, light armour, helmet",
      skills: [], advances: "+1 WS, +1 A", injuries: [],
      notes: "Mind the supply cart. Rudi has survived long enough to make that an order rather than a suggestion.",
    },
  ] satisfies ExampleWarrior[],
};

export function ExampleWarband() {
  const [printing, setPrinting] = useState(false);
  const { members } = exampleWarband;
  const { totalFielded, routThreshold } = fieldingSummary(members);
  const rating = totalFielded * 5 + getRosterExperienceTotal(members);

  useEffect(() => {
    if (!printing) return;
    const previousTitle = document.title;
    document.title = `${exampleWarband.name} - Mordheim roster`;
    const finish = () => setPrinting(false);
    window.addEventListener("afterprint", finish, { once: true });
    const timer = window.setTimeout(() => window.print(), 50);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", finish);
      document.title = previousTitle;
    };
  }, [printing]);

  return (
    <section className="landing-example" id="example-warband" aria-labelledby="example-title">
      <div className="landing-section-heading">
        <p className="landing-eyebrow">See a seasoned warband</p>
        <h2 id="example-title">{exampleWarband.name}</h2>
        <p>
          {exampleWarband.warband} after {exampleWarband.battles} battles.
          Five Heroes, hard-earned skills, lasting scars, and a well-stocked armoury.
          This fictional, read-only example shows what your campaign ledger can hold.
        </p>
      </div>
      <div className="landing-actions">
        <button className="landing-button landing-button-primary" type="button" disabled={printing} onClick={() => setPrinting(true)} aria-describedby="example-print-help">
          {printing ? "Preparing PDF..." : "Export PDF / Print"}
        </button>
        <p className="landing-note" id="example-print-help">Print the full example or choose “Save as PDF” in your browser’s print dialog.</p>
      </div>
      {printing && createPortal(<ExampleWarbandPrintSheet />, document.body)}
      <dl className="example-totals" aria-label="Example warband summary">
        <div><dt>Warriors</dt><dd>{totalFielded} <small>/ 15</small></dd></div>
        <div><dt>Rating</dt><dd>{rating}</dd></div>
        <div><dt>Battles fought</dt><dd>{exampleWarband.battles}</dd></div>
        <div><dt>Treasury</dt><dd>{exampleWarband.treasury} <small>GC</small></dd></div>
        <div><dt>Wyrdstone</dt><dd>{exampleWarband.wyrdstone} <small>shards</small></dd></div>
        <div><dt>Rout test at</dt><dd>{routThreshold} <small>out of action</small></dd></div>
      </dl>
      <p className="example-hint">Open any warrior or group to inspect their record. No account needed.</p>
      {(["Hero", "Henchman"] as const).map((role) => (
        <div className="example-group" key={role}>
          <h3>{role === "Hero" ? "Heroes" : "Henchmen"}</h3>
          {members.filter((member) => member.role === role).map((member, index) => (
            <details className="example-warrior" key={member.id} open={role === "Hero" && index === 0}>
              <summary>
                <span className="example-identity">
                  <strong>{member.name}</strong>
                  <span>{member.type}{member.id === "lantern-captain" ? " · Leader" : ""}{role === "Henchman" ? ` · ${member.groupSize} ${member.groupSize === 1 ? "model" : "models"}` : ""}</span>
                </span>
                <span className="example-warrior-meta">
                  <span>{member.experience} XP{role === "Henchman" ? " / model" : ""}</span>
                  {member.skills.length > 0 && <span>{member.skills.length} skills</span>}
                  {member.injuries.length > 0 && <span className="example-scar">{member.injuries[0].name}</span>}
                </span>
              </summary>
              <div className="example-record">
                <table className="example-stats">
                  <caption>{member.name} — current characteristics</caption>
                  <thead><tr>{statLabels.map((stat) => <th scope="col" key={stat}>{stat}</th>)}</tr></thead>
                  <tbody><tr>{statLabels.map((stat) => <td key={stat}>{member.stats[stat]}</td>)}</tr></tbody>
                </table>
                <div className="example-record-grid">
                  <div>
                    <h4>Equipment</h4>
                    <p>{member.equipment}</p>
                    {member.skills.length > 0 && <>
                      <h4>Learned skills</h4>
                      <ul className="example-skills">{member.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul>
                    </>}
                  </div>
                  <div>
                    <h4>Experience & advances</h4>
                    <label className="example-xp">
                      {member.experience} / {getMaximumExperience(role)} XP{role === "Henchman" ? " per model" : ""}
                      <progress value={member.experience} max={getMaximumExperience(role)} />
                    </label>
                    <p>Characteristic advances: {member.advances}.</p>
                    <h4>Injury record</h4>
                    {member.injuries.length ? member.injuries.map((injury) => (
                      <p className="example-injury" key={injury.name}>
                        <strong>{injury.name} · Battle {injury.battle}</strong>
                        <span>{injury.effect}</span>
                      </p>
                    )) : <p>No lasting injuries recorded.</p>}
                  </div>
                </div>
                <p className="example-warrior-note">{member.notes}</p>
              </div>
            </details>
          ))}
        </div>
      ))}
      <div className="example-stash">
        <h3>Warband stash</h3>
        <p>Unassigned supplies, separate from the equipment carried by warriors.</p>
        <ul className="example-skills">{exampleWarband.stash.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
      <div className="landing-actions">
        <a className="landing-button landing-button-primary" href="/app">Build your own warband <span aria-hidden="true">→</span></a>
        <p className="landing-note">An illustrative roster, not a live campaign or an editable template.</p>
      </div>
    </section>
  );
}

export function ExampleWarbandPrintSheet() {
  const { members } = exampleWarband;
  const { totalFielded, routThreshold } = fieldingSummary(members);
  return (
    <div className="print-sheet">
      <header className="print-header">
        <div>
          <div className="print-eyebrow">Mordheim warband roster · Fictional example</div>
          <h1>{exampleWarband.name}</h1>
          <p className="print-subtitle">{exampleWarband.warband}</p>
        </div>
        <dl className="print-totals">
          <div><dt>Gold Crowns</dt><dd>{exampleWarband.treasury} GC</dd></div>
          <div><dt>Wyrdstone</dt><dd>{exampleWarband.wyrdstone}</dd></div>
          <div><dt>Rating</dt><dd>{totalFielded * 5 + getRosterExperienceTotal(members)}</dd></div>
          <div><dt>Total Fielded</dt><dd>{totalFielded} warriors</dd></div>
          <div><dt>Rout Test At</dt><dd>{routThreshold} out of action</dd></div>
          <div><dt>Battles</dt><dd>{exampleWarband.battles}</dd></div>
        </dl>
      </header>
      <section className="print-stash">
        <h2>Warband stash</h2>
        <ul>{exampleWarband.stash.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      {members.map((member) => (
        <article className="print-member" key={member.id}>
          <div className="print-member-heading">
            <h2>{member.name}{member.groupSize > 1 ? ` (×${member.groupSize})` : ""}</h2>
            <span>{member.type} · {member.role} · {member.experience} XP{member.role === "Henchman" ? " / model" : ""}</span>
          </div>
          <table className="print-stats">
            <thead><tr>{statLabels.map((stat) => <th scope="col" key={stat}>{stat}</th>)}</tr></thead>
            <tbody><tr>{statLabels.map((stat) => <td key={stat}>{member.stats[stat]}</td>)}</tr></tbody>
          </table>
          <PrintExperienceTrack role={member.role} experience={member.experience} canGainExperience />
          <div className="print-member-body">
            <div><h3>Equipment</h3><p>{member.equipment}</p></div>
            <div><h3>Learned skills</h3><p>{member.skills.join(", ") || "None"}</p></div>
          </div>
          <p><strong>Characteristic advances:</strong> {member.advances}</p>
          <h3>Injury record</h3>
          {member.injuries.length ? member.injuries.map((injury) => (
            <p key={injury.name}><strong>{injury.name} · Battle {injury.battle}:</strong> {injury.effect}</p>
          )) : <p>No lasting injuries recorded.</p>}
          <p className="print-notes"><strong>Notes:</strong> {member.notes}</p>
        </article>
      ))}
    </div>
  );
}
