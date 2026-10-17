const firstSentence = (s) => s.split(/(?<=\.)\s/)[0]

function shuffle(a, rng) {
  const out = [...a]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** 4 shuffled options: the answer plus 3 distractors drawn from `pool` (names the answer must not match). */
function options(answer, pool, rng) {
  const wrong = shuffle([...new Set(pool)].filter((n) => n !== answer), rng).slice(0, 3)
  return wrong.length === 3 ? shuffle([answer, ...wrong], rng) : null
}

const pick = (a, rng) => a[Math.floor(rng() * a.length)]

/** Each maker returns a question or null when the dataset can't support one. */
const MAKERS = [
  // which tactic has this goal
  (d, _idx, goals, rng) => {
    const t = pick(d.tactics, rng)
    const opts = options(t.name, d.tactics.map((x) => x.name), rng)
    const goal = goals[t.shortname] ?? firstSentence(t.description)
    return opts && { prompt: `Which tactic is this? "${goal}"`, options: opts, answer: t.name }
  },
  // which tactic a technique belongs to
  (d, idx, _goals, rng) => {
    const t = pick(d.techniques.filter((x) => !x.isSub), rng)
    if (!t) return null
    const own = d.tactics.filter((x) => t.tactics.includes(x.shortname))
    if (!own.length) return null
    const answer = pick(own, rng).name
    const others = d.tactics.filter((x) => !t.tactics.includes(x.shortname)).map((x) => x.name)
    const opts = options(answer, others.concat(answer), rng)
    return opts && { prompt: `${t.id} ${t.name} belongs to which tactic?`, options: opts, answer, techId: t.id }
  },
  // which group uses a technique
  (d, idx, _goals, rng) => {
    const t = pick(d.techniques.filter((x) => idx.usedBy.get(x.id)?.groups.length), rng)
    if (!t) return null
    const users = idx.usedBy.get(t.id).groups
    const answer = pick(users, rng).name
    const nonUsers = d.groups.filter((g) => !users.includes(g)).map((g) => g.name)
    const opts = options(answer, nonUsers.concat(answer), rng)
    return opts && { prompt: `Which group uses ${t.id} ${t.name}?`, options: opts, answer, techId: t.id }
  },
]

/** Up to `count` questions mixing all types. `goals` maps tactic shortname to a plain-language goal. */
export function makeQuiz(dataset, idx, goals = {}, count = 10, rng = Math.random) {
  const out = []
  for (let tries = 0; out.length < count && tries < count * 20; tries++) {
    const q = pick(MAKERS, rng)(dataset, idx, goals, rng)
    if (q && !out.some((o) => o.prompt === q.prompt)) out.push(q)
  }
  return out
}
