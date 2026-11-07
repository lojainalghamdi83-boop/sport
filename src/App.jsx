import { useEffect, useMemo, useState } from 'react'
import { questions } from './questions.js'

// Track slots: 0 = Player 1 start, 1–5 = the five squares, 6 = Player 2 start.
// The page is RTL, so slot 0 sits on the right and Player 1 runs leftwards.
const P1_START = 0
const P2_START = 6
const CENTER = 3
const SLOTS = 7
const SQUARES = [1, 2, 3, 4, 5]
const STEPS_TO_WIN = CENTER - P1_START
const SQUARE_ICONS = { 1: '⚽', 2: '🏀', 4: '🏐', 5: '🏸' }

// Windows draws the runner emoji facing right; Apple and Android draw it facing left.
const RUNNER_FACES_RIGHT = typeof navigator !== 'undefined' && /Windows/.test(navigator.userAgent)

const QUESTION_TIME = 20 // seconds per question
const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و']

const DEFAULT_NAMES = { p1: 'اللاعبة الأولى', p2: 'اللاعبة الثانية' }
const NAMES_KEY = 'champions-race-names'

// Skip malformed entries so a typo in questions.js never breaks a game.
const BANK = questions.filter(
  (item) =>
    item &&
    typeof item.q === 'string' &&
    Array.isArray(item.options) &&
    item.options.length >= 2 &&
    Number.isInteger(item.answer) &&
    item.answer >= 0 &&
    item.answer < item.options.length
)

const PLAYER_STYLE = {
  p1: {
    text: 'text-sky-ink',
    token: 'from-[#9be1fc] via-sky to-sky-deep',
    glow: 'shadow-[0_6px_18px_rgb(30_159_216/0.45)]',
    dot: 'bg-sky',
    soft: 'bg-sky-soft',
    border: 'border-sky',
    focusBorder: 'focus:border-sky',
    badge: 'bg-sky text-ink',
  },
  p2: {
    text: 'text-coral-ink',
    token: 'from-[#ffc2bc] via-coral to-coral-deep',
    glow: 'shadow-[0_6px_18px_rgb(242_100_90/0.45)]',
    dot: 'bg-coral',
    soft: 'bg-coral-soft',
    border: 'border-coral',
    focusBorder: 'focus:border-coral',
    badge: 'bg-coral text-ink',
  },
}

const SPORT_BG = [
  ['⚽', '6%', '10%', '3.4rem', '0s'],
  ['🏀', '82%', '14%', '3rem', '-2s'],
  ['🥇', '45%', '6%', '2.4rem', '-4s'],
  ['🏐', '12%', '58%', '2.8rem', '-1s'],
  ['⭐', '88%', '52%', '2.2rem', '-3s'],
  ['🏅', '72%', '84%', '3.2rem', '-5s'],
  ['🏃‍♀️', '24%', '88%', '3rem', '-6s'],
  ['🎾', '52%', '72%', '2rem', '-2.5s'],
]

function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Shuffles the options and tracks where the correct one landed.
function prepareQuestion(item) {
  const order = shuffle(item.options.map((_, i) => i))
  return { text: item.q, options: order.map((i) => item.options[i]), answer: order.indexOf(item.answer) }
}

function newGame(starter) {
  const deck = shuffle(BANK)
  return {
    p1: P1_START,
    p2: P2_START,
    score: { p1: 0, p2: 0 },
    winner: null, // 'p1' | 'p2' | 'draw'
    turn: starter,
    deck,
    index: 0,
    question: prepareQuestion(deck[0]),
    picked: null, // option index, or -1 when time ran out
  }
}

function loadNames() {
  try {
    const saved = JSON.parse(localStorage.getItem(NAMES_KEY))
    if (saved && typeof saved.p1 === 'string' && typeof saved.p2 === 'string') return saved
  } catch {}
  return DEFAULT_NAMES
}

function displayName(names, id) {
  return names[id].trim() || DEFAULT_NAMES[id]
}

const other = (id) => (id === 'p1' ? 'p2' : 'p1')

export default function App() {
  const [screen, setScreen] = useState('start')
  const [names, setNames] = useState(loadNames)
  const [round, setRound] = useState(0)
  const [game, setGame] = useState(() => newGame('p1'))

  useEffect(() => {
    try {
      localStorage.setItem(NAMES_KEY, JSON.stringify(names))
    } catch {}
  }, [names])

  function answer(choice) {
    setGame((g) => {
      if (g.winner || g.picked !== null) return g
      if (choice !== g.question.answer) return { ...g, picked: choice }
      // Correct: advance one square towards the center.
      const id = g.turn
      const pos = id === 'p1' ? g[id] + 1 : g[id] - 1
      return {
        ...g,
        picked: choice,
        [id]: pos,
        score: { ...g.score, [id]: g.score[id] + 1 },
        winner: pos === CENTER ? id : null,
      }
    })
  }

  function nextQuestion() {
    setGame((g) => {
      if (g.winner || g.picked === null) return g
      const index = g.index + 1
      if (index >= g.deck.length) {
        // Question bank used up: whoever got closer wins.
        const d1 = g.score.p1
        const d2 = g.score.p2
        return { ...g, winner: d1 > d2 ? 'p1' : d2 > d1 ? 'p2' : 'draw' }
      }
      return { ...g, index, turn: other(g.turn), question: prepareQuestion(g.deck[index]), picked: null }
    })
  }

  // Alternate who answers first each round so neither player always starts.
  function startRound() {
    const next = round + 1
    setRound(next)
    setGame(newGame(next % 2 === 1 ? 'p1' : 'p2'))
  }

  function startFromHome() {
    startRound()
    setScreen('game')
  }

  return (
    <div className="ambient flex min-h-full flex-col items-center px-4 py-[clamp(12px,3vh,32px)] sm:px-8">
      <SportBackground />

      {screen === 'start' ? (
        <StartScreen names={names} setNames={setNames} onStart={startFromHome} />
      ) : (
        <>
          <GameHeader onHome={() => setScreen('start')} onRestart={startRound} />

          <main className="flex w-full max-w-[1100px] flex-1 flex-col gap-[clamp(14px,3vh,32px)] py-[clamp(10px,2.5vh,28px)]">
            <Scoreboard game={game} names={names} />
            <Board game={game} names={names} />

            {game.winner ? (
              <WinBanner key={round} winner={game.winner} names={names} onRestart={startRound} onHome={() => setScreen('start')} />
            ) : (
              <QuestionCard
                key={`${round}-${game.index}`}
                game={game}
                names={names}
                onAnswer={answer}
                onNext={nextQuestion}
              />
            )}
          </main>

          {game.winner && game.winner !== 'draw' && <Confetti key={round} />}
        </>
      )}
    </div>
  )
}

function SportBackground() {
  return (
    <div className="sport-bg" aria-hidden="true">
      {SPORT_BG.map(([icon, x, y, size, delay], i) => (
        <span key={i} style={{ insetInlineStart: x, top: y, fontSize: size, animationDelay: delay }}>
          {icon}
        </span>
      ))}
    </div>
  )
}

function Logo({ className }) {
  return <img src="/moe-logo.png" alt="شعار وزارة التعليم" className={`w-auto object-contain ${className}`} />
}

function StartScreen({ names, setNames, onStart }) {
  return (
    <main className="fade-in flex w-full max-w-[760px] flex-1 flex-col items-center justify-center gap-[clamp(16px,3vh,32px)] py-4 text-center">
      <Logo className="h-[clamp(64px,14vw,90px)]" />

      <div>
        <h1 className="text-[clamp(2.4rem,9vw,4.5rem)] leading-tight font-extrabold">
          <span className="title-gradient">سباق الأبطال</span> 🏅
        </h1>
        <p className="mt-1 text-[clamp(1rem,2.6vw,1.35rem)] font-semibold text-ink-soft">
          مسابقة التربية البدنية ⚽🏀🏐 أجيبي، تقدّمي، وكوني البطلة!
        </p>
      </div>

      <section className="card w-full rounded-3xl p-[clamp(16px,3vw,28px)] text-start">
        <h2 className="mb-3 text-lg font-bold">📋 طريقة اللعب</h2>
        <ul className="space-y-2 text-[clamp(0.95rem,2.3vw,1.1rem)] leading-relaxed">
          <li>🏃‍♀️ تتناوب اللاعبتان على الإجابة، سؤالًا لكل واحدة.</li>
          <li>✅ كل إجابة صحيحة تُقدّمكِ خطوة نحو الكأس في المنتصف.</li>
          <li>⏱️ لديكِ {QUESTION_TIME} ثانية للإجابة عن كل سؤال.</li>
          <li>🥇 أول لاعبة تصل إلى الكأس هي البطلة!</li>
        </ul>
      </section>

      <section className="grid w-full gap-4 sm:grid-cols-2">
        <NameInput id="p1" names={names} setNames={setNames} />
        <NameInput id="p2" names={names} setNames={setNames} />
      </section>

      <button
        type="button"
        onClick={onStart}
        className="cursor-pointer rounded-full bg-gradient-to-b from-mint to-mint-deep px-10 py-4 text-[clamp(1.2rem,3vw,1.5rem)] font-extrabold text-ink shadow-[0_10px_28px_rgb(35_164_108/0.35)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgb(35_164_108/0.45)] active:translate-y-0 active:scale-[0.97] focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none"
      >
        ابدئي السباق 🏁
      </button>
    </main>
  )
}

function NameInput({ id, names, setNames }) {
  const s = PLAYER_STYLE[id]
  return (
    <label className={`card flex flex-col gap-1 rounded-2xl border-s-[6px] p-4 text-start ${s.border}`}>
      <span className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
        <span className={`h-3 w-3 rounded-full ${s.dot}`} />
        {id === 'p1' ? 'اسم اللاعبة الأولى' : 'اسم اللاعبة الثانية'} ✏️
      </span>
      <input
        value={names[id]}
        maxLength={20}
        spellCheck={false}
        placeholder={DEFAULT_NAMES[id]}
        onChange={(e) => setNames((n) => ({ ...n, [id]: e.target.value }))}
        onBlur={() => setNames((n) => (n[id].trim() ? n : { ...n, [id]: DEFAULT_NAMES[id] }))}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className={`w-full rounded-xl border-2 border-transparent bg-page px-3 py-2 text-xl font-bold outline-none transition-colors placeholder:text-ink/30 ${s.focusBorder} ${s.text}`}
      />
    </label>
  )
}

function GameHeader({ onHome, onRestart }) {
  return (
    <header className="flex w-full max-w-[1100px] items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Logo className="h-[64px] shrink-0" />
        <h1 className="truncate text-[clamp(1.1rem,4.5vw,2.2rem)] font-extrabold">
          <span className="title-gradient">سباق الأبطال</span> 🏅
        </h1>
      </div>
      <div className="flex shrink-0 gap-2">
        <SmallButton onClick={onRestart} label="إعادة السباق">🔄</SmallButton>
        <SmallButton onClick={onHome} label="الصفحة الرئيسية">🏠</SmallButton>
      </div>
    </header>
  )
}

function SmallButton({ onClick, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="card inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95 focus-visible:ring-2 focus-visible:ring-sky focus-visible:outline-none"
    >
      <span aria-hidden="true">{children}</span>
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </button>
  )
}

function Scoreboard({ game, names }) {
  return (
    <section className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
      <PlayerChip id="p1" game={game} names={names} />
      <div className="card rounded-2xl px-3 py-2 text-center">
        <div className="text-xs font-semibold text-ink-soft">السؤال</div>
        <div className="text-xl leading-tight font-extrabold">{game.index + 1}</div>
      </div>
      <PlayerChip id="p2" game={game} names={names} />
    </section>
  )
}

function PlayerChip({ id, game, names }) {
  const s = PLAYER_STYLE[id]
  const active = !game.winner && game.turn === id
  return (
    <div
      className={`flex min-w-0 flex-col rounded-2xl border-2 px-3 py-2 transition-all duration-300 ${
        id === 'p2' ? 'items-end text-end' : 'items-start text-start'
      } ${active ? `${s.soft} ${s.border} scale-[1.03] shadow-md` : 'card border-transparent'}`}
    >
      <span className={`flex max-w-full items-center gap-1.5 truncate text-[clamp(0.9rem,2.4vw,1.2rem)] font-bold ${s.text}`}>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />
        <span className="truncate">{displayName(names, id)}</span>
      </span>
      <span className="text-xs font-semibold text-ink-soft sm:text-sm">
        ✅ {game.score[id]} من {STEPS_TO_WIN}
        {active && <span className="ms-1">· دوركِ 🎯</span>}
      </span>
    </div>
  )
}

function Board({ game, names }) {
  const { winner } = game
  const slotPct = 100 / SLOTS

  return (
    <section aria-label="مضمار السباق" className="card relative w-full rounded-3xl px-[2%] py-[clamp(8px,1.5vw,18px)]">
      <div className="relative">
        {/* Rail linking the two starts through the squares (Player 1's side is on the right) */}
        <div className="pointer-events-none absolute top-1/2 right-[7%] left-[7%] h-1 -translate-y-1/2 rounded-full bg-gradient-to-l from-sky via-sun to-coral opacity-60" />

        <div className="relative grid grid-cols-7">
          <StartPad id="p1" />
          {SQUARES.map((n) => (
            <Square key={n} n={n} isCenter={n === CENTER} won={!!winner && winner !== 'draw'} />
          ))}
          <StartPad id="p2" />

          {['p1', 'p2'].map((id) => {
            const pos = game[id]
            const isWinner = winner === id
            const isLoser = winner && winner !== 'draw' && !isWinner
            const s = PLAYER_STYLE[id]
            return (
              <div
                key={id}
                className="pointer-events-none absolute top-0 flex aspect-square items-center justify-center transition-[inset-inline-start] duration-700 ease-[cubic-bezier(.65,0,.35,1)]"
                style={{ width: `${slotPct}%`, insetInlineStart: `${pos * slotPct}%`, zIndex: isWinner ? 20 : 10 }}
              >
                {/* key={pos} replays the landing pop on every move */}
                <div key={pos} className={pos === P1_START || pos === P2_START ? '' : 'token-land'}>
                  <div
                    className={[
                      'flex aspect-square w-[clamp(32px,6.5vw,96px)] items-center justify-center rounded-full bg-gradient-to-br ring-[3px] ring-white transition-all duration-500',
                      s.token,
                      s.glow,
                      isWinner ? 'token-winner' : '',
                      isLoser ? 'opacity-50 saturate-50' : '',
                    ].join(' ')}
                    role="img"
                    aria-label={displayName(names, id)}
                  >
                    {/* Flip whichever runner would face away from the center (P1 runs left, P2 runs right) */}
                    <span
                      className={`text-[clamp(1rem,3.2vw,3rem)] leading-none ${
                        (id === 'p1') === RUNNER_FACES_RIGHT ? '-scale-x-100' : ''
                      }`}
                    >
                      🏃‍♀️
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function StartPad({ id }) {
  const s = PLAYER_STYLE[id]
  return (
    <div className="relative flex aspect-square items-center justify-center p-[6%]">
      <div className={`h-[78%] w-[78%] rounded-full border-2 border-dashed ${s.border} ${s.soft} opacity-70`} />
      <span
        className={`absolute -bottom-[0.6em] left-1/2 -translate-x-1/2 text-center text-[clamp(0.6rem,1.2vw,0.95rem)] font-bold whitespace-nowrap ${s.text}`}
      >
        البداية
      </span>
    </div>
  )
}

function Square({ n, isCenter, won }) {
  return (
    <div className="flex aspect-square items-center justify-center p-[6%]">
      <div
        className={[
          'relative flex h-full w-full items-center justify-center rounded-[clamp(10px,1.6vw,24px)] border-2 transition-all duration-700',
          isCenter
            ? `border-sun-deep bg-gradient-to-b from-sun-soft to-sun ${won ? 'center-won' : 'center-glow'}`
            : 'border-ink/5 bg-gradient-to-b from-white to-sky-soft/60',
        ].join(' ')}
      >
        {isCenter ? (
          <Trophy className="h-[48%] w-[48%] text-[#b07d00]" />
        ) : (
          <span className="text-[clamp(0.9rem,2.6vw,2.4rem)] opacity-30" aria-hidden="true">
            {SQUARE_ICONS[n]}
          </span>
        )}
      </div>
    </div>
  )
}

function QuestionCard({ game, names, onAnswer, onNext }) {
  const { question, picked, turn } = game
  const s = PLAYER_STYLE[turn]
  const answered = picked !== null
  const isCorrect = answered && picked === question.answer
  const [left, setLeft] = useState(QUESTION_TIME)

  useEffect(() => {
    if (answered) return
    if (left <= 0) {
      onAnswer(-1)
      return
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => clearTimeout(t)
  }, [left, answered, onAnswer])

  const name = displayName(names, turn)
  const urgent = left <= 5

  return (
    <section className={`card rise-in w-full rounded-3xl border-t-[6px] p-[clamp(14px,3vw,28px)] ${s.border}`} aria-live="polite">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className={`rounded-full px-4 py-1 text-[clamp(0.95rem,2.4vw,1.15rem)] font-bold ${s.badge}`}>
          🎯 دور {name}
        </span>
        <span
          className={`flex items-center gap-1 text-[clamp(0.95rem,2.4vw,1.15rem)] font-bold tabular-nums ${
            urgent && !answered ? 'text-coral-ink' : 'text-ink-soft'
          }`}
        >
          ⏱️ {answered ? 'توقّف الوقت' : `${left} ثانية`}
        </span>
      </div>

      {/* Time bar shrinks towards the start (right) edge */}
      <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-ink/5">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
            urgent ? 'bg-coral' : 'bg-gradient-to-l from-mint to-sky'
          }`}
          style={{ width: `${(left / QUESTION_TIME) * 100}%` }}
        />
      </div>

      <h2 className="mb-4 text-[clamp(1.2rem,3.4vw,1.9rem)] leading-snug font-extrabold">{question.text}</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {question.options.map((opt, i) => {
          const correct = i === question.answer
          const wrongPick = answered && i === picked && !correct
          let state = 'border-ink/10 bg-white hover:-translate-y-0.5 hover:border-sky hover:shadow-md cursor-pointer'
          if (answered && correct) state = 'border-mint-deep bg-mint-soft answer-pop'
          else if (wrongPick) state = 'border-coral bg-coral-soft answer-shake'
          else if (answered) state = 'border-ink/5 bg-white opacity-55'
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => onAnswer(i)}
              className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-start text-[clamp(1rem,2.6vw,1.25rem)] font-semibold shadow-sm transition-all duration-200 active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none disabled:cursor-default ${state}`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-extrabold ${
                  answered && correct ? 'bg-mint-deep text-white' : wrongPick ? 'bg-coral-deep text-white' : 'bg-lavender-soft text-ink'
                }`}
              >
                {answered && correct ? '✓' : wrongPick ? '✗' : OPTION_LETTERS[i]}
              </span>
              <span className="flex-1">{opt}</span>
            </button>
          )
        })}
      </div>

      {answered && (
        <div className="fade-in mt-5 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-start">
          <p
            className={`text-[clamp(1.05rem,2.8vw,1.35rem)] font-bold ${isCorrect ? 'text-mint-deep' : 'text-coral-ink'}`}
          >
            {isCorrect
              ? `أحسنتِ! 🎉 تقدّمت ${name} خطوة إلى الأمام`
              : picked === -1
                ? 'انتهى الوقت ⏰ الإجابة الصحيحة باللون الأخضر'
                : 'حاولي مرة أخرى 💪 الإجابة الصحيحة باللون الأخضر'}
          </p>
          <button
            type="button"
            onClick={onNext}
            autoFocus
            className="cursor-pointer rounded-full bg-gradient-to-b from-sun to-sun-deep px-7 py-3 text-lg font-extrabold text-ink shadow-[0_8px_22px_rgb(245_184_0/0.35)] transition-all hover:-translate-y-0.5 active:scale-95 focus-visible:ring-4 focus-visible:ring-sky focus-visible:outline-none"
          >
            السؤال التالي ⬅️
          </button>
        </div>
      )}
    </section>
  )
}

function WinBanner({ winner, names, onRestart, onHome }) {
  const draw = winner === 'draw'
  const s = draw ? null : PLAYER_STYLE[winner]
  return (
    <section
      className="card rise-in flex flex-col items-center gap-[clamp(12px,2vh,22px)] rounded-3xl p-[clamp(18px,4vw,36px)] text-center"
      style={{ animationDelay: '0.55s' }}
      aria-live="polite"
    >
      <div className="text-[clamp(3rem,10vw,5rem)] leading-none">{draw ? '🤝' : '🥇'}</div>
      <h2 className="text-[clamp(1.7rem,5.5vw,3.2rem)] leading-tight font-extrabold">
        {draw ? (
          'تعادل!'
        ) : (
          <>
            فازت <span className={s.text}>{displayName(names, winner)}</span>! 🎉
          </>
        )}
      </h2>
      <p className="text-[clamp(1rem,2.6vw,1.3rem)] font-semibold text-ink-soft">
        {draw ? 'كلتاكما بطلة 🌟 النتيجة متساوية' : 'أحسنتِ يا بطلة! وشكرًا للاعبتين على الروح الرياضية 👏'}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="cursor-pointer rounded-full bg-gradient-to-b from-mint to-mint-deep px-8 py-3 text-lg font-extrabold text-ink shadow-[0_8px_24px_rgb(35_164_108/0.35)] transition-all hover:-translate-y-0.5 active:scale-95 focus-visible:ring-4 focus-visible:ring-sun focus-visible:outline-none"
        >
          العبي مرة أخرى 🔄
        </button>
        <button
          type="button"
          onClick={onHome}
          className="card cursor-pointer rounded-full px-8 py-3 text-lg font-bold transition-all hover:-translate-y-0.5 active:scale-95 focus-visible:ring-4 focus-visible:ring-sky focus-visible:outline-none"
        >
          الصفحة الرئيسية 🏠
        </button>
      </div>
    </section>
  )
}

function Confetti() {
  const pieces = useMemo(() => {
    const colors = ['#4FC3F7', '#5BD6A0', '#FFD54F', '#FF8A80', '#B39DDB']
    return Array.from({ length: 70 }, (_, i) => ({
      left: Math.random() * 100,
      w: 6 + Math.random() * 7,
      h: 10 + Math.random() * 10,
      color: colors[i % colors.length],
      drift: `${(Math.random() - 0.5) * 30}vw`,
      spin: `${(Math.random() - 0.5) * 1080}deg`,
      dur: `${2.6 + Math.random() * 2}s`,
      delay: `${0.45 + Math.random() * 0.9}s`,
    }))
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.h,
            background: p.color,
            '--drift': p.drift,
            '--spin': p.spin,
            '--dur': p.dur,
            '--delay': p.delay,
          }}
        />
      ))}
    </div>
  )
}

function Trophy({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </svg>
  )
}
