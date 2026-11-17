import './App.css';
import './App.v3.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, configured } from './supabase';
import { Cat, Avatar, CATS, LABELS, AVATAR_COLORS, AVATAR_COLOR_NAMES } from './Cat';
import Entrance from './Entrance';
import QuizPanel from './QuizPanel';
import QuestionEditor from './QuestionEditor';
import { FriendsScreen, InvitePanel, InviteDock, MAX_FRIENDS } from './Friends';
import {
  QTYPE_BY_ID,
  SAMPLE_QUESTIONS,
  SAMPLE_QUIZ_TITLE,
  answerText,
  blankQuestion,
  fromRow,
  toRow,
  validateQuestion,
} from './questions';

// Jeda (ms) saat soal muncul: tombol jawaban terkunci supaya ketukan beruntun dari
// tombol LARI tidak ikut menjawab soal.
const QUIZ_LOCK_MS = 1300;
const TRACKS = [
  { m: 300, label: 'Pendek' },
  { m: 600, label: 'Sedang' },
  { m: 1000, label: 'Panjang' },
  { m: 1500, label: 'Maraton' },
];

// ALUR TUTORIAL: Home -> Buat Kuis -> Main Bersama -> Gabung -> Profil -> Teman
// member: true = hanya tampil untuk pemain yang punya akun (tamu tidak melihat langkah ini)
const TOUR_FLOWS = {
  home: [
    {
      id: 'tour-btn-suara',
      title: 'Atur Suara',
      desc: 'Klik di sini untuk menyalakan/mematikan suara. Jika tidak ada suara, klik 2x.',
    },
    {
      id: 'tour-btn-kuis',
      title: 'Buat Kuis',
      desc: 'Klik di sini untuk membuat kuis sendiri. Satu kuis bisa berisi 5 tipe soal sekaligus.',
      member: true,
    },
    {
      id: 'tour-btn-bersama',
      title: 'Main Bersama',
      desc: 'Klik ini untuk bikin room, pilih kucing, atur panjang lintasan, lalu main dengan teman.',
      member: true,
    },
    {
      id: 'tour-btn-gabung',
      title: 'Gabung Room',
      desc: 'Punya kode 6 digit dari teman? Klik di sini buat masuk. Tamu juga bisa memakai tombol ini.',
    },
    {
      id: 'tour-btn-teman',
      title: 'Teman',
      desc: 'Tambah teman lewat kode, lihat siapa yang online, dan undang mereka ke room-mu. Maksimal 20 teman.',
      member: true,
    },
    {
      id: 'tour-btn-profil',
      title: 'Profil',
      desc: 'Klik ikon ini untuk mengganti avatar kucing, nama, melihat Riwayat Bermain 7 hari terakhir, atau keluar.',
      member: true,
    },
  ],
  create: [
    {
      id: 'tour-input-judul',
      title: 'Judul Kuis',
      desc: 'Mulai dengan memberi judul pada kuis buatanmu.',
    },
    {
      id: 'tour-tipe-soal',
      title: 'Pilih Tipe Soal',
      desc: 'Ada 5 tipe. Pilihan Ganda: 4 opsi. Benar/Salah: nilai sebuah pernyataan. Isian Singkat: pemain mengetik jawaban. Acak Kata: pemain menyusun huruf yang diacak. Sambung Kata: pemain mengetik kata yang diawali huruf terakhir kata awal. Setiap soal boleh beda tipe, jadi satu permainan bisa berisi semuanya.',
    },
    {
      id: 'tour-input-soal',
      title: 'Tulis Soalnya',
      desc: 'Isi pertanyaan, lalu lengkapi jawabannya. Isiannya menyesuaikan tipe soal yang kamu pilih. Untuk Sambung Kata, tulis kata awalnya (misal MEJA) dan daftar kata yang benar (diawali huruf A).',
    },
    {
      id: 'tour-btn-hapus-soal',
      title: 'Hapus Soal',
      desc: 'Salah buat soal? Klik tombol ini untuk menghapusnya.',
    },
    {
      id: 'tour-btn-tambah-soal',
      title: 'Tambah Soal',
      desc: 'Klik untuk menambah soal baru (maksimal 50 soal).',
    },
    {
      id: 'tour-btn-simpan',
      title: 'Simpan Kuis',
      desc: 'Jika sudah selesai, klik simpan untuk menyimpan kuis ke database.',
    },
  ],
  host: [
    {
      id: 'tour-pilih-kucing',
      title: 'Pilih Kucing',
      desc: 'Pilih karakter kucing yang mau kamu pakai di balapan ini.',
    },
    {
      id: 'tour-pilih-kuis',
      title: 'Pilih Kuis',
      desc: 'Pilih kuis yang mau dimainkan. Sudah ada "Simulasi Kuis" berisi semua tipe soal untuk mencoba.',
    },
    {
      id: 'tour-btn-edit-kuis',
      title: 'Edit Kuis',
      desc: 'Mau ubah soal atau jawaban? Pilih kuisnya, klik tombol ini, ubah isinya, lalu tekan "Simpan Perubahan".',
    },
    {
      id: 'tour-input-bot',
      title: 'Lawan Bot',
      desc: 'Isi angka 0-5. Bot akan otomatis hilang jika ada pemain asli yang bergabung ke room.',
    },
    {
      id: 'tour-input-timer',
      title: 'Waktu Kuis',
      desc: 'Atur berapa detik waktu untuk menjawab setiap soal (5-60 detik). Waktu mulai berjalan setelah jeda singkat "Bersiap".',
    },
    {
      id: 'tour-input-jarak',
      title: 'Panjang Lintasan',
      desc: 'Pilih Pendek (300 m) sampai Maraton (1500 m). Makin panjang, makin sering pemain harus menjawab soal.',
    },
    {
      id: 'tour-input-wajib',
      title: 'Wajib Jawab Benar',
      desc: 'Atur berapa soal yang harus dijawab benar sebelum boleh finish. Dengan ini, kuis 50 soal tidak bisa dimenangkan hanya dengan 5 jawaban. Isi 0 kalau tidak mau ada syarat.',
    },
    {
      id: 'tour-btn-buat-room',
      title: 'Buat Room',
      desc: 'Klik di sini untuk membuat kode room. Di lobby kamu bisa mengundang teman langsung dari daftar temanmu.',
    },
  ],
  join: [
    {
      id: 'tour-input-kode',
      title: 'Kode Room',
      desc: 'Masukkan 6 digit kode room dari temanmu.',
    },
    {
      id: 'tour-btn-gabung-sekarang',
      title: 'Gabung',
      desc: 'Klik di sini untuk masuk ke lobby balapan.',
    },
  ],
  profile: [
    {
      id: 'tour-avatar',
      title: 'Avatar',
      desc: 'Pilih kucing dan warna bingkai untuk foto profilmu. Teman-temanmu akan melihatnya, dan kucing ini jadi pilihan awalmu saat bermain.',
      member: true,
    },
    {
      id: 'tour-input-nama',
      title: 'Ubah Nickname',
      desc: 'Ketik nama barumu di sini.',
      member: true,
    },
    {
      id: 'tour-btn-simpan-profil',
      title: 'Simpan Nama',
      desc: 'Klik untuk menyimpan perubahan nama.',
      member: true,
    },
    {
      id: 'tour-riwayat',
      title: 'Riwayat Bermain',
      desc: 'Setiap selesai main, hasilnya tersimpan otomatis: judul kuis, posisi akhir, waktu tempuh, dan jumlah jawaban benar. Riwayat lebih dari 1 minggu terhapus sendiri.',
      member: true,
    },
    {
      id: 'tour-btn-logout',
      title: 'Keluar',
      desc: 'Klik di sini jika ingin keluar atau ganti akun.',
      member: true,
    },
  ],
  friends: [
    {
      id: 'tour-kode-saya',
      title: 'Kode Temanmu',
      desc: 'Ini kode unikmu. Kirim ke temanmu supaya mereka bisa menambahkanmu. Klik untuk menyalin.',
      member: true,
    },
    {
      id: 'tour-tambah-teman',
      title: 'Tambah Teman',
      desc: 'Masukkan kode teman (6 huruf) lalu kirim. Kalau dia juga sudah mengirim permintaan, kalian langsung berteman. Maksimal 20 teman.',
      member: true,
    },
    {
      id: 'tour-daftar-teman',
      title: 'Daftar Teman',
      desc: 'Titik hijau di foto berarti temanmu sedang online. Saat kamu berada di lobby room, tombol UNDANG akan muncul di sini untuk mengajak mereka bermain.',
      member: true,
    },
  ],
};

const tourSteps = (flow, guest) =>
  (TOUR_FLOWS[flow] || []).filter((st) => !(guest && st.member));

// URUTAN PINDAH HALAMAN TUTORIAL
const NEXT_TOUR_MEMBER = {
  home: { screen: 'create', label: 'Buat Kuis' },
  create: { screen: 'host', label: 'Main Bersama' },
  host: { screen: 'join', label: 'Gabung Room' },
  join: { screen: 'profile', label: 'Profil' },
  profile: { screen: 'friends', label: 'Teman' },
};
const NEXT_TOUR_GUEST = { home: { screen: 'join', label: 'Gabung Room' } };
const nextTour = (flow, guest) =>
  (guest ? NEXT_TOUR_GUEST : NEXT_TOUR_MEMBER)[flow] || null;

// Ukuran lintasan (harus sama dengan CSS patch)
const LANE_HEIGHT = 64;
const LANE_GAP = 6;
const LANES_TOP = 200;
const MOBILE_LANE_HEIGHT = 50;
const MOBILE_LANE_GAP = 5;
const MOBILE_LANES_TOP = 92;
const MOBILE_QUERY = '(max-width: 650px)';

const blank = blankQuestion;
const msg = (e) => e?.message || String(e);

// ===== VALIDASI EMAIL: hanya email penyedia resmi / sekolah yang boleh masuk =====
const ALLOW_GUEST = true; // tamu: hanya boleh ikut bermain (butuh "Allow anonymous sign-ins" di Supabase)
const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.id',
  'ymail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'proton.me',
  'protonmail.com',
];
const ALLOWED_EMAIL_SUFFIXES = ['.sch.id', '.ac.id', '.edu'];
const EMAIL_REGEX =
  /^[a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?@([a-z0-9-]+(?:\.[a-z0-9-]+)+)$/;

function validateEmail(email) {
  const m = EMAIL_REGEX.exec(email);
  if (!m || email.includes('..'))
    return 'Format email tidak valid. Contoh: namamu@gmail.com';
  const domain = m[1];
  const ok =
    ALLOWED_EMAIL_DOMAINS.includes(domain) ||
    ALLOWED_EMAIL_SUFFIXES.some((suffix) => domain.endsWith(suffix));
  if (!ok)
    return 'Gunakan email dari Gmail, Yahoo, Outlook, iCloud, atau email sekolah/kampus (contoh: namamu@gmail.com).';
  return '';
}

const PASSWORD_RULES = [
  { label: 'Minimal 8 karakter', test: (p) => p.length >= 8 },
  { label: 'Ada huruf BESAR (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { label: 'Ada huruf kecil (a-z)', test: (p) => /[a-z]/.test(p) },
  { label: 'Ada angka (0-9)', test: (p) => /[0-9]/.test(p) },
];

function validatePassword(pwd) {
  const missing = PASSWORD_RULES.filter((r) => !r.test(pwd)).map((r) => r.label.toLowerCase());
  return missing.length ? `Password belum memenuhi syarat: ${missing.join(', ')}.` : '';
}

// ===== KUIS SIMULASI BAWAAN (otomatis dibuat untuk user yang belum punya kuis) =====
// 15 soal mudah yang memakai kelima tipe soal. Datanya ada di questions.js
async function seedSampleQuiz(ownerId) {
  const { data, error } = await supabase
    .from('quizzes')
    .insert({ owner_id: ownerId, title: SAMPLE_QUIZ_TITLE })
    .select('id')
    .single();
  if (error) throw error;
  const { error: qe } = await supabase
    .from('quiz_questions')
    .insert(SAMPLE_QUESTIONS.map((q, i) => ({ ...q, quiz_id: data.id, position: i })));
  if (qe) {
    await supabase.from('quizzes').delete().eq('id', data.id);
    throw qe;
  }
  return data.id;
}

const makeBots = (n) =>
  Array.from({ length: n }).map((_, i) => ({
    id: `bot-${i}`,
    user_id: `bot-${i}`,
    nickname: `Bot ${LABELS[CATS[i % 4]]}`,
    cat: CATS[i % 4],
    distance: 0,
    energy: 100,
    needs_quiz: false,
    correct_count: 0,
    wrong_count: 0,
    finished_at: null,
  }));

const formatTime = (ms) => {
  const total = Math.max(0, Math.floor(Number(ms) || 0));
  const minutes = String(Math.floor(total / 60000)).padStart(2, '0');
  const seconds = String(Math.floor((total % 60000) / 1000)).padStart(2, '0');
  const centis = String(Math.floor((total % 1000) / 10)).padStart(2, '0');
  return `${minutes}:${seconds}.${centis}`;
};

let audioCtx = null;
function getAudioCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

function sound(type, enabled) {
  if (!enabled) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const notes = {
      click: [520, 680],
      correct: [523, 659, 784],
      wrong: [240, 190],
      finish: [523, 659, 784, 1046],
      start: [392, 587],
      tick: [440],
      go: [523, 784, 1046],
    }[type] || [500];
    notes.forEach((hz, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.09;
      osc.type = type === 'click' || type === 'start' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(hz, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.035, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(gain);
      ctx.destination && gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  } catch {}
}

// Stopwatch dipisah jadi komponen sendiri supaya hanya angka ini yang di-render ulang
// (dulu seluruh aplikasi di-render ulang ~27x per detik, itu penyebab utama lag)
function RaceTimer({ startTime, running }) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!startTime) {
      setMs(0);
      return;
    }
    const tick = () => setMs(Date.now() - startTime);
    tick();
    if (!running) return;
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, [startTime, running]);
  return <b>{formatTime(ms)}</b>;
}

export default function App() {
  const [uid, setUid] = useState(null);
  const [screen, setScreen] = useState('entrance');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Deteksi layar HP (breakpoint sama dengan CSS) supaya tinggi arena balapan pas
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  // TUTORIAL STATE
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialFlow, setTutorialFlow] = useState('home');
  const [tutorialStep, setTutorialStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  const [isGuest, setIsGuest] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const [soundOn, setSoundOn] = useState(
    () => localStorage.getItem('catdash_sound') !== 'off'
  );
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  const menuBgmRef = useRef(null);
  const raceBgmRef = useRef(null);

  const [name, setName] = useState(
    () => localStorage.getItem('catdash_name') || ''
  );
  const [cat, setCat] = useState('orange');

  const [quizzes, setQuizzes] = useState([]);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([blank()]);
  const [editingQuizId, setEditingQuizId] = useState(null); // null = mode buat kuis baru
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const [botCount, setBotCount] = useState(3);
  const [timeLimit, setTimeLimit] = useState(15);
  const [localBots, setLocalBots] = useState([]);
  const botsWantedRef = useRef(0);
  const [trackSetting, setTrackSetting] = useState(300); // panjang lintasan yang dipilih host
  const [reqSetting, setReqSetting] = useState(0); // wajib jawab benar sebelum finish (0 = tanpa syarat)

  // ===== PROFIL, TEMAN, UNDANGAN =====
  const [profile, setProfile] = useState(null); // {display_name, avatar, avatar_color, friend_code}
  const [dbReady, setDbReady] = useState(true); // false = SQL v3 belum dijalankan
  const [friends, setFriends] = useState([]);
  const [invites, setInvites] = useState([]);
  const [invitedIds, setInvitedIds] = useState(() => new Set());
  const [introPlayed, setIntroPlayed] = useState(false);
  const [quizReady, setQuizReady] = useState(true); // false selama jeda "Bersiap"
  const [quizRetry, setQuizRetry] = useState(0);
  const uidRef = useRef(null);
  const screenRef = useRef('entrance');
  const racingRef = useRef(false);
  const wantAuthRef = useRef(false);
  const activeRoomRef = useRef(null);
  const prevStatusRef = useRef(null);
  const seenInvitesRef = useRef(new Set());
  const seenRequestsRef = useRef(null);

  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);

  const [sprinting, setSprinting] = useState(false);
  const [stepHint, setStepHint] = useState(
    'Tekan D atau klik LARI untuk berlari!'
  );

  const [raceStartTime, setRaceStartTime] = useState(null);
  const [question, setQuestion] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [quizSeconds, setQuizSeconds] = useState(15);
  const [showResults, setShowResults] = useState(false);

  const [isShaking, setIsShaking] = useState(false);
  const [reviewData, setReviewData] = useState(null);

  // ===== COUNTDOWN & PANDUAN CARA MAIN =====
  const [showHowTo, setShowHowTo] = useState(false);
  const [countdown, setCountdown] = useState(null); // 3,2,1,0(GO) atau null
  const [raceReady, setRaceReady] = useState(false);
  const countdownStartedRef = useRef(false);
  const seedingRef = useRef(false);

  // ===== LAYAR SELAMAT SEBELUM PODIUM =====
  const [showCongrats, setShowCongrats] = useState(false);
  const [finalMs, setFinalMs] = useState(0);

  // ===== PESAN SELAMAT DATANG =====
  const [showWelcome, setShowWelcome] = useState(false);
  const [hideWelcome, setHideWelcome] = useState(false); // "jangan tampilkan lagi"
  const welcomeShownRef = useRef(false);
  
    // ===== TOAST / POP-UP NOTIFIKASI =====
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);
  const notify = useCallback((message, type = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  // ===== PASSWORD TOGGLE =====
  const [showPassword, setShowPassword] = useState(false);

  // ===== RIWAYAT MAIN =====
  const [history, setHistory] = useState([]);

  // ===== DETEKSI PEMAIN ASLI BERGABUNG (untuk hapus bot) =====
  const prevRealPlayersRef = useRef(null);
  const localBotsRef = useRef([]);
  useEffect(() => { localBotsRef.current = localBots; }, [localBots]);

  const lastMoveRef = useRef(0); // waktu langkah terakhir (meniru perhitungan server)
  const moveRef = useRef({
    sprinting: false,
    sendingStep: false,
    pendingStep: false,
  });
  const quizKey = useRef('');
  const finishedRef = useRef(false);
  const busyRef = useRef(false);
  const answerRef = useRef(null);
  const quizTimeoutRef = useRef(false);
  const prefetchRef = useRef({ key: '', q: null });

  // Antrean langkah ke server: SEMUA ketukan dikirim berurutan, tidak ada yang hilang.
  const moveChainRef = useRef(Promise.resolve());
  // Naik setiap kali kondisi pemain berubah di layar; dipakai membuang data server yang sudah basi.
  const localVerRef = useRef(0);
  // Cegah refresh room menumpuk (realtime + polling + jawaban sekaligus)
  const refreshStateRef = useRef({ running: false, again: false, force: false, promise: null, id: null });
  const refreshRoomRef = useRef(null);

  screenRef.current = screen;
  racingRef.current = screen === 'room' && room?.status === 'racing';

  const allPlayersRaw = [...players, ...localBots];
  const rankedPlayers = [...allPlayersRaw].sort((a, b) => {
    const af = a.finished_at ? new Date(a.finished_at).getTime() : Infinity;
    const bf = b.finished_at ? new Date(b.finished_at).getTime() : Infinity;
    if (af !== bf) return af - bf;
    return Number(b.distance) - Number(a.distance);
  });

  // Kucing kita selalu di lintasan paling bawah (paling depan)
  const lanePlayers = [...allPlayersRaw].sort((a, b) => {
    if (a.user_id === uid) return 1;
    if (b.user_id === uid) return -1;
    return a.id.localeCompare(b.id);
  });

  const me = rankedPlayers.find((p) => p.user_id === uid);
  const isHost = room?.host_id === uid;
  const myEnergy = Math.max(0, Math.min(100, Number(me?.energy || 0)));
  const energyClass =
    myEnergy <= 0
      ? 'empty'
      : myEnergy < 25
      ? 'low'
      : myEnergy < 50
      ? 'mid'
      : '';
  const myPosition = Math.max(
    1,
    rankedPlayers.findIndex((p) => p.user_id === uid) + 1
  );

  const trackLen = Number(room?.track_length) || 300;
  const needCorrect = Number(room?.required_correct) || 0;
  const myCorrect = Number(me?.correct_count) || 0;
  const atGate = !!me?.needs_quiz && Number(me?.distance) >= trackLen;
  const incomingCount = friends.filter((f) => f.state === 'incoming').length;
  const inRoomIds = new Set(players.map((p) => p.user_id));
  const selectedCount = quizzes.find((q) => q.id === selectedQuiz)?.qcount || 0;

  const congratsText =
    myPosition === 1
      ? 'Juara 1! Kucingmu paling cepat dan paling pintar!'
      : myPosition === 2
      ? 'Juara 2! Sedikit lagi jadi yang pertama!'
      : myPosition === 3
      ? 'Juara 3! Kamu masuk podium!'
      : 'Kamu berhasil sampai garis finish! Terus berlatih ya!';

  // Tinggi area balapan menyesuaikan jumlah lintasan supaya tidak ada kucing yang terpotong
  // Geometri lintasan dihitung di sini dan dipasang INLINE, jadi tidak bergantung pada urutan
  // tempelan CSS. Makin banyak pemain, lintasan makin ramping supaya semuanya tetap muat di HP.
  const laneCount = lanePlayers.length;
  const geo = isMobile
    ? laneCount <= 5
      ? { top: 92, h: 50, gap: 5, cat: 42, me: 48 }
      : laneCount <= 8
      ? { top: 84, h: 40, gap: 4, cat: 34, me: 40 }
      : { top: 76, h: 32, gap: 3, cat: 28, me: 34 }
    : { top: LANES_TOP, h: LANE_HEIGHT, gap: LANE_GAP, cat: 46, me: 56 };
  const sceneryMinHeight = geo.top + laneCount * (geo.h + geo.gap) + 12;

  const fx = (type) => sound(type, soundOn);
  const rpc = async (fn, args) => {
    const { data, error: e } = await supabase.rpc(fn, args);
    if (e) throw e;
    return data;
  };

  const run = async (fn) => {
    setError('');
    busyRef.current = true;
    setBusy(true);
    try {
      return await fn();
    } catch (e) {
      const m = msg(e);
      if (m.includes('duplicate key'))
        setError('Data sudah ada, silakan gunakan nama lain.');
      else setError(m);
      return undefined;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  // ===== LOGIKA TUTORIAL SPOTLIGHT INTERAKTIF =====
  useEffect(() => {
    if (!showTutorial) return;

    if (TOUR_FLOWS[screen] && tutorialFlow !== screen) {
      setTutorialFlow(screen);
      setTutorialStep(0);
    }

    const updateTargetRect = () => {
      const currentFlow = tourSteps(tutorialFlow, isGuest);
      if (!currentFlow || !currentFlow[tutorialStep]) return;

      const el = document.getElementById(currentFlow[tutorialStep].id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          const rect = el.getBoundingClientRect();
          setTargetRect({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
          });
        }, 300);
      }
    };

    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    return () => window.removeEventListener('resize', updateTargetRect);
  }, [showTutorial, tutorialStep, screen, tutorialFlow]);

  // Hanya elemen yang sedang disorot tutorial yang diangkat di atas layar gelap
  useEffect(() => {
    document
      .querySelectorAll('.tour-target')
      .forEach((n) => n.classList.remove('tour-target'));
    if (!showTutorial) return;
    const id = tourSteps(tutorialFlow, isGuest)?.[tutorialStep]?.id;
    const el = id ? document.getElementById(id) : null;
    if (el) el.classList.add('tour-target');
    return () => el?.classList.remove('tour-target');
  }, [showTutorial, tutorialFlow, tutorialStep, screen, targetRect]);

  const startTutorial = () => {
    setScreen('home');
    setTutorialFlow('home');
    setTutorialStep(0);
    setShowTutorial(true);
    fx('click');
  };

  const closeTutorial = () => {
    setShowTutorial(false);
    setTargetRect(null);
    if (uid) localStorage.setItem(`catdash_tutorial_seen_${uid}`, 'true');
    fx('click');
  };

  const nextTutorialStep = () => {
    const currentFlow = tourSteps(tutorialFlow, isGuest);
    if (tutorialStep < currentFlow.length - 1) {
      setTutorialStep((prev) => prev + 1);
      fx('click');
    } else {
      closeTutorial();
    }
  };

  const prevTutorialStep = () => {
    if (tutorialStep > 0) {
      setTutorialStep((prev) => prev - 1);
      fx('click');
    }
  };

  const goToNextTutorialPage = () => {
    const next = nextTour(tutorialFlow, isGuest);
    if (next) {
      setScreen(next.screen);
      setTutorialFlow(next.screen);
      setTutorialStep(0);
      fx('click');
    }
  };

  // Muat preferensi "jangan tampilkan lagi" milik user yang sedang login
  useEffect(() => {
    if (!uid) {
      setHideWelcome(false);
      return;
    }
    setHideWelcome(localStorage.getItem(`catdash_hide_welcome_${uid}`) === 'true');
  }, [uid]);

  

  // Tampilkan pesan selamat datang SEKALI setiap aplikasi dibuka / user login
  useEffect(() => {
    if (!uid) {
      welcomeShownRef.current = false;
      setShowWelcome(false);
      return;
    }
    if (screen !== 'home' || welcomeShownRef.current) return;
    welcomeShownRef.current = true;
    if (localStorage.getItem(`catdash_hide_welcome_${uid}`) === 'true') return;
    setShowWelcome(true);
  }, [screen, uid]);

  const toggleHideWelcome = (hide) => {
    setHideWelcome(hide);
    if (!uid) return;
    if (hide) localStorage.setItem(`catdash_hide_welcome_${uid}`, 'true');
    else localStorage.removeItem(`catdash_hide_welcome_${uid}`);
  };

    // Muat riwayat dari Supabase, sekaligus hapus otomatis yang > 7 hari
  const refreshHistory = useCallback(async () => {
    if (!uid || !supabase || isGuest) { setHistory([]); return; }
    try {
      const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      await supabase
        .from('match_history')
        .delete()
        .eq('user_id', uid)
        .lt('played_at', sevenDaysAgo);

      const { data, error: e } = await supabase
        .from('match_history')
        .select('*')
        .eq('user_id', uid)
        .order('played_at', { ascending: false })
        .limit(50);

      if (e) throw e;
      setHistory(data || []);
    } catch {
      setHistory([]);
    }
  }, [uid, isGuest]);
  useEffect(() => { refreshHistory(); }, [refreshHistory, screen]);

  const closeWelcome = (withTutorial) => {
    setShowWelcome(false);
    fx('click');
    if (withTutorial) startTutorial();
  };

  // Tutup modal panduan cara main (dipakai di lobby)
  const closeHowTo = () => {
    setShowHowTo(false);
    localStorage.setItem('catdash_howto_seen', 'true');
    fx('click');
  };

  // ===== BGM & GAMEPLAY =====
  useEffect(() => {
    const isRacing = screen === 'room' && room?.status === 'racing';
    if (menuBgmRef.current) menuBgmRef.current.pause();
    if (raceBgmRef.current) raceBgmRef.current.pause();
    if (soundOn) {
      if (isRacing) {
        if (raceBgmRef.current) {
          raceBgmRef.current.volume = 0.2;
          raceBgmRef.current.play().catch(() => {});
        }
      } else {
        if (menuBgmRef.current) {
          menuBgmRef.current.volume = 0.15;
          menuBgmRef.current.play().catch(() => {});
        }
      }
    }
  }, [screen, room?.status, soundOn]);

  useEffect(() => {
    const handleFirstClick = () => {
      if (soundOn) {
        if (screen === 'room' && room?.status === 'racing')
          raceBgmRef.current?.play().catch(() => {});
        else menuBgmRef.current?.play().catch(() => {});
      }
      document.removeEventListener('click', handleFirstClick);
    };
    document.addEventListener('click', handleFirstClick);
    return () => document.removeEventListener('click', handleFirstClick);
  }, [soundOn, screen, room?.status]);

    // Musik berhenti saat tab tidak aktif / keluar dari web
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        menuBgmRef.current?.pause();
        raceBgmRef.current?.pause();
      } else if (soundOn) {
        const isRacing = screen === 'room' && room?.status === 'racing';
        if (isRacing) {
          if (raceBgmRef.current) {
            raceBgmRef.current.volume = 0.2;
            raceBgmRef.current.play().catch(() => {});
          }
        } else {
          if (menuBgmRef.current) {
            menuBgmRef.current.volume = 0.15;
            menuBgmRef.current.play().catch(() => {});
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [soundOn, screen, room?.status]);

    useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(''), 6000);
    return () => clearTimeout(id);
  }, [error]);
  useEffect(() => {
    if (!feedback) return;
    const id = setTimeout(() => setFeedback(''), 5000);
    return () => clearTimeout(id);
  }, [feedback]);

  // ===== COUNTDOWN 3-2-1-GO SEBELUM BALAPAN =====
  useEffect(() => {
    if (room?.status !== 'racing') {
      countdownStartedRef.current = false;
      setRaceReady(false);
      setCountdown(null);
      return;
    }
    countdownStartedRef.current = true;
    setRaceReady(false);
    setShowHowTo(false);

    let n = 3;
    setCountdown(3);
    sound('tick', soundRef.current);
    const id = setInterval(() => {
      n -= 1;
      if (n > 0) {
        setCountdown(n);
        sound('tick', soundRef.current);
      } else if (n === 0) {
        setCountdown(0); // tampil "GO!"
        sound('go', soundRef.current);
      } else {
        clearInterval(id);
        setCountdown(null);
        setRaceReady(true);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [room?.status]);

    // Bot otomatis hilang di semua device yang memilikinya ketika pemain asli bergabung
  useEffect(() => {
    if (screen !== 'room' || !room) {
      prevRealPlayersRef.current = null;
      return;
    }
    const realCount = players.length;
    if (prevRealPlayersRef.current === null) {
      prevRealPlayersRef.current = realCount;
      return;
    }
    if (realCount > prevRealPlayersRef.current && localBotsRef.current.length > 0) {
      setLocalBots([]);
      notify('Bot dihapus otomatis karena ada pemain asli yang bergabung!', 'info');
      fx('click');
    }
    prevRealPlayersRef.current = realCount;
  }, [players.length, screen, room, notify]);

  const refreshQuizzes = useCallback(async () => {
    if (!supabase || !uid || isGuest) return;
    const fetchList = async () => {
      const { data, error: e } = await supabase
        .from('quizzes')
        .select('id,title,quiz_questions(count)')
        .eq('owner_id', uid)
        .order('created_at', { ascending: false });
      if (e) throw e;
      return (data || []).map((q) => ({
        id: q.id,
        title: q.title,
        qcount: q.quiz_questions?.[0]?.count ?? 0,
      }));
    };
    let list = await fetchList();

    // User yang belum punya kuis otomatis dibuatkan 1 kuis simulasi (15 soal mudah)
    if (list.length === 0 && !seedingRef.current) {
      seedingRef.current = true;
      try {
        await seedSampleQuiz(uid);
        list = await fetchList();
      } catch (err) {
        setError(
          'Gagal membuat kuis simulasi otomatis: ' +
            msg(err) +
            ' (kemungkinan izin tabel di Supabase belum mengizinkan)'
        );
      } finally {
        seedingRef.current = false;
      }
    }

    setQuizzes(list);
    setSelectedQuiz((prev) => prev || list[0]?.id || '');
  }, [uid, isGuest]);

  const createSampleQuiz = () =>
    run(async () => {
      const id = await seedSampleQuiz(uid);
      await refreshQuizzes();
      setSelectedQuiz(id);
      setFeedback('Kuis simulasi berhasil dibuat!');
      fx('correct');
    });

  const doRefreshRoom = useCallback(async (id, force) => {
    if (!supabase || !id) return;
    const ver = localVerRef.current;
    const [r, p] = await Promise.all([
      supabase
        .from('rooms')
        .select('id,code,host_id,status,quiz_id,quiz_time_limit,track_length,required_correct')
        .eq('id', id)
        .single(),
      supabase
        .from('room_players')
        .select('*')
        .eq('room_id', id)
        .order('distance', { ascending: false }),
    ]);
    if (r.error) throw r.error;
    if (p.error) throw p.error;
    // balasan untuk room yang sudah ditinggalkan / diganti: buang
    if (activeRoomRef.current !== id) return;
    setRoom((prev) =>
      prev && JSON.stringify(prev) === JSON.stringify(r.data) ? prev : r.data
    );
    // Kalau layar berubah saat permintaan ini berjalan, datanya sudah basi: buang.
    if (!force && ver !== localVerRef.current) return;
    setPlayers((prevPlayers) => {
      const serverPlayers = p.data || [];
      if (force) return serverPlayers;
      return serverPlayers.map((sp) => {
        const lp = prevPlayers.find((x) => x.id === sp.id);
        if (lp && lp.distance > sp.distance && !sp.finished_at) {
          return {
            ...sp,
            distance: lp.distance,
            energy: lp.energy,
            needs_quiz: lp.needs_quiz,
          };
        }
        return sp;
      });
    });
  }, []);

  // Hanya satu refresh berjalan sekaligus; permintaan yang menumpuk digabung jadi satu susulan.
  const refreshRoom = useCallback(
    (id, force = false) => {
      if (!supabase || !id) return Promise.resolve();
      const st = refreshStateRef.current;
      if (st.running && st.id === id) {
        st.again = true;
        st.force = st.force || force;
        return st.promise;
      }
      if (st.running) {
        // room lain masih diproses: tunggu selesai lalu ambil data room yang baru
        return st.promise
          .catch(() => {})
          .then(() => refreshRoomRef.current(id, force));
      }
      st.running = true;
      st.id = id;
      st.promise = (async () => {
        try {
          let f = force;
          do {
            st.again = false;
            await doRefreshRoom(id, f);
            f = st.force;
            st.force = false;
          } while (st.again);
        } finally {
          st.running = false;
        }
      })();
      return st.promise;
    },
    [doRefreshRoom]
  );
  refreshRoomRef.current = refreshRoom;

  const advancePlayer = async () => {
    if (
      !room?.id ||
      room.status !== 'racing' ||
      !raceReady ||
      !me ||
      Number(me.energy) <= 0 ||
      me.needs_quiz ||
      me.finished_at ||
      showResults
    )
      return;
    const sprint = moveRef.current.sprinting;
    // Server menghitung gerak dari SELANG WAKTU antar langkah (bukan jumlah tekanan).
    // Layar meniru rumus yang sama supaya energi di layar dan di server tidak berselisih.
    const nowMs = Date.now();
    let dt = lastMoveRef.current ? (nowMs - lastMoveRef.current) / 1000 : 0.3;
    if (dt < 0.08) return; // terlalu cepat: server juga mengabaikannya
    dt = Math.min(0.6, dt);
    lastMoveRef.current = nowMs;
    const rate = sprint ? 35 : 20;
    const speed = sprint ? 24 : 15;
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.user_id === uid) {
          const used = Math.min(dt, Number(p.energy) / rate);
          const nextDist = Math.min(trackLen, Number(p.distance) + speed * used);
          const nextEnergy = Math.max(0, Number(p.energy) - rate * used);
          // sampai garis finish tapi belum cukup jawaban benar: tertahan, harus menjawab dulu
          const gate = nextDist >= trackLen && Number(p.correct_count) < needCorrect;
          return {
            ...p,
            distance: nextDist,
            energy: nextEnergy,
            needs_quiz: (nextEnergy <= 0 && nextDist < trackLen) || gate,
            finished_at:
              nextDist >= trackLen && !gate
                ? p.finished_at || new Date().toISOString()
                : p.finished_at,
          };
        }
        return p;
      })
    );
    localVerRef.current += 1;
    const roomId = room.id;
    // masuk antrean: dikirim berurutan, tidak ada langkah yang dibuang
    moveChainRef.current = moveChainRef.current
      .then(() => rpc('move_cat', { p_room: roomId, p_sprint: sprint }))
      .catch(() => {});
  };

  const pressRunKey = () => {
    if (
      screen !== 'room' ||
      room?.status !== 'racing' ||
      !raceReady ||
      me?.needs_quiz ||
      me?.finished_at ||
      showResults ||
      Number(me?.energy) <= 0
    )
      return;
    advancePlayer();
  };

    useEffect(() => {
    if ((room?.status === 'racing' || room?.status === 'finished') && me?.finished_at) {
      setShowResults(true);
      if (!finishedRef.current) {
        finishedRef.current = true;
        const elapsed = raceStartTime ? Date.now() - raceStartTime : 0;
        setFinalMs(elapsed);
        setShowCongrats(true);
        fx('finish');

        // Simpan riwayat ke Supabase
        (async () => {
          if (!uid || !room || !supabase || isGuest) return;
          try {
            let quizTitle = quizzes.find((q) => q.id === room.quiz_id)?.title;
            if (!quizTitle) {
              const { data } = await supabase
                .from('quizzes')
                .select('title')
                .eq('id', room.quiz_id)
                .single();
              quizTitle = data?.title || 'Kuis';
            }
            const position = rankedPlayers.findIndex((p) => p.user_id === uid) + 1;
            const { error: ie } = await supabase.from('match_history').insert({
              user_id: uid,
              quiz_id: room.quiz_id,
              quiz_title: quizTitle,
              position: position || 1,
              total_players: rankedPlayers.length,
              time_ms: elapsed,
              correct_count: me?.correct_count || 0,
            });
            if (!ie) refreshHistory();
          } catch {}
        })();
      }
    }
  }, [me?.finished_at, room?.status]);

  // Bot baru mulai berlari setelah hitung mundur selesai
  useEffect(() => {
    if (
      room?.status !== 'racing' ||
      !raceReady ||
      localBots.length === 0 ||
      showResults
    )
      return;
    const interval = setInterval(() => {
      setLocalBots((prev) =>
        prev.map((b) => {
          if (b.finished_at) return b;
          if (b.needs_quiz) {
            if (Math.random() > 0.4) {
              const correct = b.correct_count + 1;
              const botAtGate = Number(b.distance) >= trackLen;
              if (botAtGate && correct >= needCorrect)
                return {
                  ...b,
                  needs_quiz: false,
                  energy: 100,
                  correct_count: correct,
                  finished_at: new Date().toISOString(),
                };
              return {
                ...b,
                needs_quiz: botAtGate,
                energy: botAtGate ? b.energy : 100,
                correct_count: correct,
              };
            }
            return b;
          }
          const step = Math.random() * 10 + 4;
          const nextDist = Math.min(trackLen, Number(b.distance) + step);
          const nextEnergy = Math.max(
            0,
            Number(b.energy) - (Math.random() * 20 + 15)
          );
          const botGate = nextDist >= trackLen && b.correct_count < needCorrect;
          return {
            ...b,
            distance: nextDist,
            energy: nextEnergy,
            needs_quiz:
              botGate ||
              (nextEnergy <= 0 && nextDist < trackLen && Math.random() > 0.5),
            finished_at:
              nextDist >= trackLen && !botGate
                ? b.finished_at || new Date().toISOString()
                : b.finished_at,
          };
        })
      );
    }, 1200);
    return () => clearInterval(interval);
  }, [room?.status, localBots.length, showResults, raceReady, trackLen, needCorrect]);

  // Sesi login. Layar HANYA berubah kalau penggunanya berganti: Supabase mengirim ulang
  // SIGNED_IN setiap tab dibuka kembali, dan itu tidak boleh melempar pemain ke menu.
  useEffect(() => {
    if (!configured) return;
    const apply = (session) => {
      if (!session) {
        uidRef.current = null;
        setUid(null);
        setUserEmail('');
        setIsGuest(false);
        setProfile(null);
        setFriends([]);
        setInvites([]);
        setScreen(wantAuthRef.current ? 'auth' : 'entrance');
        wantAuthRef.current = false;
        return;
      }
      const u = session.user;
      const changed = uidRef.current !== u.id;
      uidRef.current = u.id;
      setUid(u.id);
      setUserEmail(u.email || '');
      setIsGuest(!!u.is_anonymous);
      if (!changed) return;
      if (u.is_anonymous) {
        let g = localStorage.getItem('catdash_guest_name');
        if (!g) {
          g = `Tamu ${Math.floor(100 + Math.random() * 900)}`;
          localStorage.setItem('catdash_guest_name', g);
        }
        setName(g);
      } else if (u.user_metadata?.name) {
        setName(String(u.user_metadata.name).slice(0, 20));
      }
      if (screenRef.current === 'auth') setScreen('home');
    };
    supabase.auth.getSession().then(({ data: { session } }) => apply(session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
    return () => subscription.unsubscribe();
  }, []);

    const handleAuth = async (e) => {
    e.preventDefault();
    if (!emailInput || !passwordInput)
      return setError('Email dan Password wajib diisi.');
    const email = emailInput.trim().toLowerCase();
    const emailErr = validateEmail(email);
    if (emailErr) return setError(emailErr);
    if (authMode === 'register') {
      const pwdErr = validatePassword(passwordInput);
      if (pwdErr) return setError(pwdErr);
    }
    return run(async () => {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email, password: passwordInput,
        });
        if (error) {
          if (error.message.includes('Invalid login credentials'))
            throw Error('Email atau Password salah.');
          throw error;
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password: passwordInput,
          options: { data: { name: email.split('@')[0] } },
        });
        if (error) throw error;
        if (data.session === null) {
          setFeedback('Pendaftaran berhasil! Silakan cek email verifikasi.');
          setAuthMode('login');
          setEmailInput('');
          setPasswordInput('');
        } else {
          setFeedback('Pendaftaran berhasil!');
        }
      }
      fx('correct');
    });
  };

  const handleGuest = () =>
    run(async () => {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) {
        if (/anonymous/i.test(error.message))
          throw Error(
            'Login tamu belum diaktifkan. Di Supabase: Authentication > Sign In / Providers > nyalakan "Allow anonymous sign-ins".'
          );
        throw error;
      }
      setIntroPlayed(true);
      setScreen('home');
      fx('click');
    });

  // dari layar pembuka / profil tamu: keluar lalu tampilkan form login
  const goLogin = async () => {
    setIntroPlayed(true);
    if (uidRef.current) {
      wantAuthRef.current = true;
      await supabase.auth.signOut();
    } else {
      setScreen('auth');
    }
    fx('click');
  };

  const handleLogout = () =>
    run(async () => {
      await supabase.auth.signOut();
      home();
      setScreen('entrance');
      fx('click');
    });

  useEffect(() => {
    if (!room?.id || !supabase) return;
    const id = room.id;
    let active = true;
    let last = 0;
    let pending = null;
    // gabungkan banyak event realtime jadi 1 refresh (maksimal sekali per 700 ms)
    const kick = () => {
      if (!active || pending) return;
      const wait = Math.max(0, 700 - (Date.now() - last));
      pending = setTimeout(() => {
        pending = null;
        last = Date.now();
        if (active) refreshRoom(id).catch(() => {});
      }, wait);
    };
    const channel = supabase
      .channel(`catdash-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${id}` },
        kick
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${id}`,
        },
        kick
      )
      .subscribe();
    const timer = setInterval(
      kick,
      1800
    );
    return () => {
      active = false;
      clearTimeout(pending);
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [room?.id, refreshRoom]);

  useEffect(() => {
    if (!room || !me?.needs_quiz || room.status !== 'racing' || showResults) {
      setQuestion(null);
      quizKey.current = '';
      return;
    }
    const key = `${room.id}-${me.correct_count}-${me.wrong_count}`;
    if (quizKey.current === key) return;
    quizKey.current = key;
    // pakai soal yang sudah diambil lebih awal kalau ada
    if (prefetchRef.current.key === key && prefetchRef.current.q) {
      setQuestion(prefetchRef.current.q);
      return;
    }
    const roomId = room.id;
    rpc('current_game_question', { p_room: roomId })
      .then((q) => {
        if (activeRoomRef.current !== roomId) return;
        if (q && q.prompt && Array.isArray(q.options)) setQuestion(q);
        else throw Error('soal belum tersedia');
      })
      .catch((e) => {
        // jangan pernah menampilkan soal palsu: coba lagi sebentar lagi
        quizKey.current = '';
        if (/belum tersedia/.test(msg(e))) {
          // server bilang belum waktunya kuis: samakan layar dengan server
          refreshRoom(roomId, true).catch(() => {});
        } else setError(msg(e));
        setTimeout(() => setQuizRetry((n) => n + 1), 1200);
      });
  }, [
    room?.id,
    room?.status,
    me?.needs_quiz,
    me?.correct_count,
    me?.wrong_count,
    showResults,
    quizRetry,
  ]);

  // Stopwatch baru jalan setelah hitung mundur selesai
  useEffect(() => {
    if (room?.status !== 'racing' || !raceReady) {
      setRaceStartTime(null);
      return;
    }
    setRaceStartTime((old) => old ?? Date.now());
  }, [room?.status, raceReady]);

  // Ambil soal berikutnya lebih awal saat energi mulai menipis,
  // jadi saat energi habis soal langsung muncul tanpa menunggu
  useEffect(() => {
    if (
      !room?.id ||
      room.status !== 'racing' ||
      !me ||
      me.needs_quiz ||
      me.finished_at ||
      showResults ||
      Number(me.energy) > 60
    )
      return;
    const key = `${room.id}-${me.correct_count}-${me.wrong_count}`;
    if (prefetchRef.current.key === key) return;
    prefetchRef.current = { key, q: null };
    rpc('current_game_question', { p_room: room.id })
      .then((q) => {
        if (
          prefetchRef.current.key === key &&
          q &&
          q.prompt &&
          Array.isArray(q.options)
        )
          prefetchRef.current.q = q;
      })
      .catch(() => {
        if (prefetchRef.current.key === key) prefetchRef.current.key = '';
      });
  }, [
    room?.id,
    room?.status,
    me?.energy,
    me?.needs_quiz,
    me?.correct_count,
    me?.wrong_count,
    me?.finished_at,
    showResults,
  ]);

  // Setiap soal baru muncul, tombol jawaban terkunci sebentar (QUIZ_LOCK_MS) supaya
  // pemain yang masih menekan-nekan tombol LARI tidak langsung menjawab asal-asalan.
  useEffect(() => {
    if (!(room?.status === 'racing' && me?.needs_quiz && question && !showResults)) {
      setQuizReady(true);
      return;
    }
    setQuizReady(false);
    const id = setTimeout(() => setQuizReady(true), QUIZ_LOCK_MS);
    return () => clearTimeout(id);
  }, [room?.status, me?.needs_quiz, question?.number, showResults]);

  // Waktu menjawab baru berjalan setelah jeda selesai
  useEffect(() => {
    if (
      !(room?.status === 'racing' && me?.needs_quiz && question && !showResults && quizReady)
    ) {
      setQuizSeconds(room?.quiz_time_limit || 15);
      quizTimeoutRef.current = false;
      return;
    }
    setQuizSeconds(room?.quiz_time_limit || 15);
    quizTimeoutRef.current = false;
    const id = setInterval(
      () => setQuizSeconds((s) => Math.max(0, s - 1)),
      1000
    );
    return () => clearInterval(id);
  }, [
    room?.status,
    me?.needs_quiz,
    question?.number,
    showResults,
    room?.quiz_time_limit,
    quizReady,
  ]);

  useEffect(() => {
    if (
      quizSeconds === 0 &&
      question &&
      !quizTimeoutRef.current &&
      !busyRef.current &&
      !showResults
    ) {
      // hanya ditandai terkirim kalau jawaban benar-benar dimulai; kalau tidak, coba lagi
      if (answerRef.current?.('WAKTU_HABIS')) quizTimeoutRef.current = true;
    }
  }, [quizSeconds, question, showResults, busy]);

  useEffect(() => {
    const down = (e) => {
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          document.activeElement?.tagName
        )
      )
        return;
      const k = e.key.toLowerCase();
      if (['d', 'arrowright', 'shift'].includes(k)) e.preventDefault();
      if (screen !== 'room' || room?.status !== 'racing' || showResults) return;
      if ((k === 'd' || k === 'arrowright') && !e.repeat) pressRunKey();
      if (k === 'shift' && !moveRef.current.sprinting) {
        moveRef.current.sprinting = true;
        setSprinting(true);
      }
    };
    const up = (e) => {
      if (e.key.toLowerCase() === 'shift') {
        moveRef.current.sprinting = false;
        setSprinting(false);
      }
    };
    const stop = () => {
      moveRef.current.sprinting = false;
      setSprinting(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', stop);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', stop);
    };
  }, [
    screen,
    room?.status,
    room?.id,
    me?.needs_quiz,
    me?.finished_at,
    showResults,
    me?.energy,
    raceReady,
  ]);

  const enterRoom = async (id) => {
    // reset state balapan agar quiz yang sama bisa dimainkan ulang
    activeRoomRef.current = id;
    prevStatusRef.current = null;
    prefetchRef.current = { key: '', q: null };
    quizKey.current = '';
    localVerRef.current += 1;
    lastMoveRef.current = 0;
    moveChainRef.current = Promise.resolve();
    setInvitedIds(new Set());
    setQuestion(null);
    finishedRef.current = false;
    countdownStartedRef.current = false;
    setShowResults(false);
    setShowCongrats(false);
    setFinalMs(0);
    setCountdown(null);
    setRaceReady(false);
    setRaceStartTime(null);

    await refreshRoom(id);
    setStepHint('Tekan D atau klik LARI untuk berlari!');
    setScreen('room');
    setFeedback('');
    if (!localStorage.getItem('catdash_howto_seen')) setShowHowTo(true);
  };

  const saveQuiz = () =>
    run(async () => {
      if (!title.trim()) throw Error('Isi judul kuis.');
      if (!questions.length || questions.length > 50)
        throw Error('Jumlah soal 1-50.');
      questions.forEach((q, i) => {
        const problem = validateQuestion(q, i);
        if (problem) throw Error(problem);
      });

      // ===== MODE EDIT: perbarui kuis yang sudah ada =====
      if (editingQuizId) {
        const { data: oldRows, error: oe } = await supabase
          .from('quiz_questions')
          .select('id')
          .eq('quiz_id', editingQuizId);
        if (oe) throw oe;
        const { error: ue } = await supabase
          .from('quizzes')
          .update({ title: title.trim() })
          .eq('id', editingQuizId);
        if (ue) throw ue;
        // soal baru dimasukkan dulu, baru soal lama dihapus (aman kalau gagal di tengah jalan)
        const { error: ie } = await supabase
          .from('quiz_questions')
          .insert(questions.map((q, i) => toRow(q, editingQuizId, i + 100)));
        if (ie) throw ie;
        if (oldRows && oldRows.length) {
          const { error: de } = await supabase
            .from('quiz_questions')
            .delete()
            .in(
              'id',
              oldRows.map((r) => r.id)
            );
          if (de) throw de;
        }
        // rapikan nomor urut (soal baru tadi memakai posisi sementara 100+)
        for (let i = 0; i < questions.length; i += 1) {
          const { error: pe } = await supabase
            .from('quiz_questions')
            .update({ position: i })
            .eq('quiz_id', editingQuizId)
            .eq('position', i + 100);
          if (pe) throw pe;
        }
        await refreshQuizzes();
        setSelectedQuiz(editingQuizId);
        setEditingQuizId(null);
        setTitle('');
        setQuestions([blank()]);
        setScreen('host');
        setFeedback('Perubahan kuis tersimpan!');
        fx('correct');
        return;
      }
      const { data, error: e } = await supabase
        .from('quizzes')
        .insert({ owner_id: uid, title: title.trim() })
        .select('id')
        .single();
      if (e) throw e;
      const { error: qe } = await supabase
        .from('quiz_questions')
        .insert(questions.map((q, i) => toRow(q, data.id, i)));
      if (qe) {
        await supabase.from('quizzes').delete().eq('id', data.id);
        throw qe;
      }
      await refreshQuizzes();
      setSelectedQuiz(data.id);
      setTitle('');
      setQuestions([blank()]);
      setScreen('host');
      setFeedback('Kuis tersimpan!');
      fx('correct');
    });

  // Keluar dari mode edit dan kosongkan form
  const leaveEditor = () => {
    if (!editingQuizId) return;
    setEditingQuizId(null);
    setTitle('');
    setQuestions([blank()]);
  };

  // Buka halaman buat kuis baru (draft kuis baru tetap dipertahankan, kecuali sebelumnya mode edit)
  const openCreate = () => {
    leaveEditor();
    setScreen('create');
  };

  // Muat kuis yang sudah ada ke form lalu buka mode edit
  const startEditQuiz = (id) =>
    run(async () => {
      if (!id) throw Error('Pilih kuis yang mau diedit dulu.');
      const { data: qz, error: e1 } = await supabase
        .from('quizzes')
        .select('id,title')
        .eq('id', id)
        .single();
      if (e1) throw e1;
      const { data: qs, error: e2 } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', id)
        .order('position');
      if (e2) throw e2;
      const loaded = (qs || []).map(fromRow);
      setEditingQuizId(id);
      setTitle(qz.title || '');
      setQuestions(loaded.length ? loaded : [blank()]);
      setScreen('create');
      setFeedback('');
      fx('click');
    });

  const makeRoom = () =>
    run(async () => {
      if (!uid || !name.trim() || !selectedQuiz)
        throw Error('Lengkapi nama dan pilih kuis.');
      localStorage.setItem('catdash_name', name.trim());
      const code = await rpc('create_game_room', {
        p_quiz: selectedQuiz,
        p_name: name.trim(),
        p_cat: cat,
        p_time_limit: Math.max(5, Math.min(60, Number(timeLimit) || 15)),
        p_track: trackSetting,
        p_required: Math.max(0, Math.min(selectedCount || 0, Number(reqSetting) || 0)),
      });
      const { data, error: e } = await supabase
        .from('rooms').select('id').eq('code', code).single();
      if (e) throw e;

      // Bot ditambahkan sekarang (di lobby) agar terlihat & otomatis hilang saat pemain asli masuk
      botsWantedRef.current = botCount;
      setLocalBots(botCount > 0 ? makeBots(botCount) : []);

      await enterRoom(data.id);
      fx('start');
    });

  const joinRoom = () =>
    run(async () => {
      if (!uid || !name.trim()) throw Error('Isi nama pemain.');
      if (!/^\d{6}$/.test(joinCode.trim())) throw Error('Kode room 6 digit.');
      localStorage.setItem('catdash_name', name.trim());
      botsWantedRef.current = 0;
      setLocalBots([]);
      const id = await rpc('join_game_room', {
        p_code: joinCode.trim(),
        p_name: name.trim(),
        p_cat: cat,
      });
      await enterRoom(id);
      fx('click');
    });

  const startGame = () =>
    run(async () => {
      await rpc('start_game_room', { p_room: room.id });
      await refreshRoom(room.id);
      fx('start');
    });

  // ===== BAGIAN INI YANG DIPERBAIKI =====
  const answer = (val) => {
    if (busyRef.current) return;
    
    // Waktu habis dikirim sebagai teks 'WAKTU_HABIS' (angka -1 bisa bentrok dengan jawaban isian yang sah)
    const isTimeout = val === 'WAKTU_HABIS';
    const p_answer = isTimeout ? 'WAKTU_HABIS' : String(val);

    return run(async () => {
      try {
        // pastikan semua langkah sudah diterima server sebelum menjawab
        await moveChainRef.current;
        const res = await rpc('answer_game_question', {
          p_room: room.id,
          p_answer: p_answer,
        });
        const ok = !!res?.ok;
        lastMoveRef.current = Date.now();
        const finishedNow = !!res?.finished;
        const shown = res?.correct ? ` Jawaban: ${res.correct}` : '';
        localVerRef.current += 1;

        if (ok) {
          setFeedback(
            finishedNow
              ? 'BENAR! Kamu sampai garis finish!'
              : atGate
              ? `BENAR! Tinggal ${Math.max(0, needCorrect - myCorrect - 1)} soal lagi untuk finish.`
              : 'BENAR! Energi Penuh!'
          );
          fx('correct');
        } else {
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 500);
          setFeedback(`${isTimeout ? 'WAKTU HABIS!' : 'SALAH!'}${shown} Dapat soal baru.`);
          fx('wrong');
        }
        setQuestion(null);
        quizKey.current = '';
        setPlayers((prev) =>
          prev.map((p) => {
            if (p.user_id !== uid) return p;
            const gate = Number(p.distance) >= trackLen;
            return {
              ...p,
              correct_count: p.correct_count + (ok ? 1 : 0),
              wrong_count: p.wrong_count + (ok ? 0 : 1),
              energy: gate ? p.energy : ok ? 100 : 0,
              needs_quiz: finishedNow ? false : gate ? true : !ok,
              finished_at: finishedNow
                ? p.finished_at || new Date().toISOString()
                : p.finished_at,
            };
          })
        );
        // tidak ditunggu: jawaban langsung terasa selesai, data room menyusul di latar belakang
        refreshRoom(room.id).catch(() => {});
      } catch (e) {
        // Layar & server tidak sinkron (soal sudah tidak aktif di server): ambil ulang data
        // dari server supaya pemain tidak macet.
        localVerRef.current += 1;
        setQuestion(null);
        quizKey.current = '';
        prefetchRef.current = { key: '', q: null };
        refreshRoom(room.id, true).catch(() => {});
        if (!/Tidak ada soal|Belum waktunya|tidak aktif/.test(String(msg(e)))) {
          setFeedback('Terjadi kesalahan sistem.');
          setError(msg(e));
        } else {
          setFeedback('Data disinkronkan ulang, lanjutkan bermain!');
        }
      }
    });
  };
  answerRef.current = answer;

  const deleteQuestion = (i) => {
    const q = questions[i];
    if (!q) return;
    const hasContent = q.prompt.trim() || q.options.some((o) => o.trim());
    if (hasContent && !window.confirm(`Hapus soal nomor ${i + 1}?`)) return;
    if (questions.length === 1) {
      setQuestions([blank()]); // soal terakhir dikosongkan, bukan dihapus
      setFeedback('Soal dikosongkan.');
    } else {
      setQuestions((v) => v.filter((_, j) => j !== i));
      setFeedback(`Soal nomor ${i + 1} dihapus.`);
    }
    fx('click');
  };

  const setQ = (i, field, value, option) =>
    setQuestions((old) =>
      old.map((q, j) => {
        if (i !== j) return q;
        return option === undefined
          ? { ...q, [field]: value }
          : {
              ...q,
              options: q.options.map((v, k) => (k === option ? value : v)),
            };
      })
    );

  const openReview = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', room.quiz_id)
        .order('position');
      if (error) throw error;
      setReviewData(data);
      setScreen('review');
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleSound = () => {
    setSoundOn((old) => {
      localStorage.setItem('catdash_sound', old ? 'off' : 'on');
      return !old;
    });
  };

  const handleUpdateProfile = () =>
    run(async () => {
      if (!name.trim()) throw Error('Nama tidak boleh kosong.');
      const { error: e } = await supabase.auth.updateUser({
        data: { name: name.trim() },
      });
      if (e) throw e;
      if (!isGuest && dbReady) {
        const p = await rpc('sync_profile', { p_name: name.trim(), p_avatar: null, p_color: null });
        if (p) setProfile(p);
      }
      localStorage.setItem('catdash_name', name.trim());
      setFeedback('Profil berhasil diupdate!');
      fx('correct');
    });

  const home = () => {
    moveRef.current = {
      sprinting: false,
      sendingStep: false,
      pendingStep: false,
    };
    activeRoomRef.current = null;
    prevStatusRef.current = null;
    prefetchRef.current = { key: '', q: null };
    quizKey.current = '';
    botsWantedRef.current = 0;
    setInvitedIds(new Set());
    setRoom(null);
    setPlayers([]);
    setLocalBots([]);
    setQuestion(null);
    setScreen('home');
    setFeedback('');
    setShowResults(false);
    finishedRef.current = false;
    setReviewData(null);
    moveChainRef.current = Promise.resolve();
    setShowHowTo(false);
    setCountdown(null);
    setRaceReady(false);
    countdownStartedRef.current = false;
    setShowCongrats(false);
    setFinalMs(0);
    leaveEditor();
  };

  // ===== PROFIL, TEMAN, UNDANGAN, REMATCH =====
  const loadProfile = useCallback(async () => {
    try {
      let p = await rpc('sync_profile', { p_name: null, p_avatar: null, p_color: null });
      if (p && p.display_name === 'Pemain') {
        // profil baru: pakai nama dari pendaftaran
        const { data } = await supabase.auth.getUser();
        const meta = String(data?.user?.user_metadata?.name || '').trim().slice(0, 20);
        if (meta) p = await rpc('sync_profile', { p_name: meta, p_avatar: null, p_color: null });
      }
      if (p) {
        setProfile(p);
        setName(p.display_name);
        setCat(p.avatar);
        localStorage.setItem('catdash_name', p.display_name);
      }
      setDbReady(true);
    } catch {
      setDbReady(false);
    }
  }, []);

  const refreshFriends = useCallback(async () => {
    try {
      const f = await rpc('list_friends');
      const list = Array.isArray(f) ? f : [];
      setFriends(list);
      const incoming = list.filter((x) => x.state === 'incoming').map((x) => x.id);
      if (seenRequestsRef.current) {
        const fresh = incoming.filter((id) => !seenRequestsRef.current.has(id));
        if (fresh.length) {
          const who = list.find((x) => x.id === fresh[0])?.display_name || 'Seseorang';
          notify(`${who} ingin berteman denganmu. Cek menu Teman.`, 'info');
          sound('click', soundRef.current);
        }
      }
      seenRequestsRef.current = new Set(incoming);
    } catch {}
  }, [notify]);

  const refreshInvites = useCallback(async () => {
    try {
      const inv = await rpc('my_invites');
      const list = Array.isArray(inv) ? inv : [];
      list.forEach((i) => {
        if (!seenInvitesRef.current.has(i.id)) {
          seenInvitesRef.current.add(i.id);
          notify(`${i.from_name} mengajakmu main!`, 'success');
          sound('start', soundRef.current);
        }
      });
      setInvites(list);
    } catch {}
  }, [notify]);

  // setelah login: muat profil (akun biasa) dan daftar kuis
  useEffect(() => {
    if (!uid) return;
    if (isGuest) {
      setProfile(null);
      return;
    }
    loadProfile();
    refreshQuizzes().catch(() => {});
  }, [uid, isGuest, loadProfile, refreshQuizzes]);

  // denyut: tanda "online", daftar teman, dan undangan (berhenti selama balapan)
  useEffect(() => {
    if (!uid || isGuest || !dbReady) return;
    let alive = true;
    seenRequestsRef.current = null;
    const tick = async () => {
      if (!alive || document.hidden) return;
      try {
        await rpc('touch_presence');
      } catch {}
      if (racingRef.current) return;
      await Promise.all([refreshFriends(), refreshInvites()]);
    };
    tick();
    const id = setInterval(tick, 8000);
    const ch = supabase
      .channel(`invites-${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_invites', filter: `to_user=eq.${uid}` },
        () => {
          if (!racingRef.current) refreshInvites();
        }
      )
      .subscribe();
    const onVis = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      clearInterval(id);
      supabase.removeChannel(ch);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [uid, isGuest, dbReady, refreshFriends, refreshInvites]);

  // buka layar Teman / lobby: segarkan daftar teman saat itu juga
  useEffect(() => {
    if (!uid || isGuest || !dbReady) return;
    if (screen === 'friends' || (screen === 'room' && room?.status === 'lobby')) refreshFriends();
  }, [screen, room?.status, uid, isGuest, dbReady, refreshFriends]);

  // tamu tidak boleh masuk layar khusus akun
  useEffect(() => {
    if (isGuest && ['create', 'host', 'friends', 'profile'].includes(screen)) setScreen('home');
  }, [isGuest, screen]);

  // host menekan "Main Lagi": semua pemain kembali ke lobby dengan nilai nol
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = room?.status ?? null;
    if (room?.status === 'lobby' && (prev === 'racing' || prev === 'finished')) {
      finishedRef.current = false;
      setShowResults(false);
      setShowCongrats(false);
      setFinalMs(0);
      setRaceStartTime(null);
      setQuestion(null);
      quizKey.current = '';
      prefetchRef.current = { key: '', q: null };
      moveChainRef.current = Promise.resolve();
      localVerRef.current += 1;
      setInvitedIds(new Set());
      if (room?.id) refreshRoom(room.id, true).catch(() => {});
      if (room?.host_id === uid && botsWantedRef.current > 0 && players.length <= 1)
        setLocalBots(makeBots(botsWantedRef.current));
    }
  }, [room?.status]);

  const addFriend = (code) =>
    run(async () => {
      const r = await rpc('send_friend_request', { p_code: code });
      notify(
        r?.state === 'accepted'
          ? `Kamu dan ${r.name} sekarang berteman!`
          : `Permintaan pertemanan dikirim ke ${r?.name || 'temanmu'}.`,
        'success'
      );
      fx('correct');
      await refreshFriends();
      return true;
    });
  const respondFriend = (id, accept) =>
    run(async () => {
      await rpc('respond_friend_request', { p_id: id, p_accept: accept });
      notify(accept ? 'Kalian sekarang berteman!' : 'Permintaan ditolak.', 'info');
      await refreshFriends();
    });
  const removeFriend = (id) =>
    run(async () => {
      await rpc('remove_friendship', { p_id: id });
      notify('Dihapus dari daftar teman.', 'info');
      await refreshFriends();
    });
  const inviteFriend = (f) =>
    run(async () => {
      await rpc('invite_friend', { p_room: room.id, p_friend: f.user_id });
      setInvitedIds((prev) => new Set(prev).add(f.user_id));
      notify(`Undangan dikirim ke ${f.display_name}.`, 'success');
      fx('click');
    });
  const joinInvite = (inv) =>
    run(async () => {
      const nm = (name || profile?.display_name || 'Pemain').trim().slice(0, 20);
      botsWantedRef.current = 0;
      setLocalBots([]);
      const id = await rpc('join_game_room', { p_code: inv.code, p_name: nm, p_cat: cat });
      setInvites((v) => v.filter((i) => i.id !== inv.id));
      await enterRoom(id);
      fx('click');
    });
  const dismissInvite = async (inv) => {
    setInvites((v) => v.filter((i) => i.id !== inv.id));
    try {
      await rpc('dismiss_invite', { p_id: inv.id });
    } catch {}
  };
  const copyFriendCode = () => {
    navigator.clipboard?.writeText(profile?.friend_code || '');
    notify('Kode teman disalin.', 'success');
  };
  const chooseAvatar = (patch) =>
    run(async () => {
      const p = await rpc('sync_profile', {
        p_name: null,
        p_avatar: patch.avatar ?? null,
        p_color: patch.color ?? null,
      });
      if (p) {
        setProfile(p);
        setCat(p.avatar);
      }
      fx('click');
    });
  const rematch = () =>
    run(async () => {
      await rpc('rematch_room', { p_room: room.id });
      await refreshRoom(room.id, true);
      fx('start');
    });

  if (!configured)
    return (
      <main className="wrap">
        <section className="panel">
          <h1>CAT DASH</h1>
          <h2>Hubungkan Supabase dulu</h2>
        </section>
      </main>
    );

  const toastLayer = (
    <div className="toast-container">
      {error && (
        <div className="toast toast-error">
          <span>{error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
      {feedback && (
        <div className="toast toast-info" onClick={() => setFeedback('')}>
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')}>×</button>
        </div>
      )}
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );

  if (screen === 'entrance')
    return (
      <>
        <Entrance
          skipIntro={introPlayed}
          busy={busy}
          user={uid ? { name: isGuest ? name : profile?.display_name || name, isGuest } : null}
          onLogin={goLogin}
          onGuest={handleGuest}
          onContinue={() => {
            setIntroPlayed(true);
            setScreen('home');
            fx('click');
          }}
          onSwitchAccount={goLogin}
        />
        {toastLayer}
      </>
    );

  // Isi panduan cara main (dipakai di modal & kartu lobby)
  const howToItems = (
    <ol className="instruction-list">
      <li>
        Tekan <span className="kbd">D</span> (atau <span className="kbd">→</span>
        , atau tombol <b>LARI</b>) berulang-ulang untuk menggerakkan kucingmu.
      </li>
      <li>
        Tahan <span className="kbd">SHIFT</span> (atau tombol <b>SPRINT</b>)
        sambil menekan D untuk melangkah lebih jauh, tapi energi lebih boros.
      </li>
      <li>
        Saat energi habis, kamu harus menjawab soal. Soal bisa berupa{' '}
        <b>pilihan ganda</b>, <b>benar/salah</b>, <b>isian singkat</b>,{' '}
        <b>acak kata</b> (susun huruf), atau <b>sambung kata</b>. Semua tipe bisa muncul
        dalam satu permainan.
      </li>
      <li>
        Soal punya <b>jeda “Bersiap” sekitar 1 detik</b> supaya jari yang masih
        menekan LARI tidak ikut menjawab. Waktu menjawab baru berjalan setelah jeda.
      </li>
      <li>
        Jawaban <b>benar</b> = energi penuh lagi. Jawaban <b>salah</b> atau
        waktu habis = dapat soal baru (kunci jawabannya ditampilkan).
      </li>
      <li>
        Panjang lintasan diatur host. Kadang ada syarat <b>wajib jawab benar</b>:
        kalau kamu sampai garis finish tapi belum cukup jawaban benar, kamu
        tertahan sampai syaratnya terpenuhi.
      </li>
      <li>
        <b>Bot</b> adalah lawan latihan. Kalau ada <b>pemain asli</b> yang masuk
        room, bot akan otomatis <b>dihapus di semua device</b>.
      </li>
      <li>
        Kucingmu ditandai <b>panah ▼ KAMU</b> di atas kepalanya. Siapa yang
        pertama sampai garis finish menang!
      </li>
    </ol>
  );

  // Saat soal kuis tampil, animasi latar dijeda supaya tidak berat
  const quizOpen =
    screen === 'room' &&
    room?.status === 'racing' &&
    !!me?.needs_quiz &&
    !showResults;

  // Kalau target tutorial ada di dasar layar, tooltip dipindah ke atas target supaya tidak terpotong
  const tipAbove =
    showTutorial &&
    targetRect &&
    targetRect.top - window.scrollY + targetRect.height + 250 >
      window.innerHeight;

  return (
    <main
      className={`wrap ${isShaking ? 'shake' : ''} ${
        quizOpen ? 'quizOpen' : ''
      }`}
    >
      <audio
        ref={menuBgmRef}
        src="/audio/bgm_menu.mp3"
        loop
        onError={(e) => {
          if (e.target.src.indexOf('pixabay') === -1) {
            e.target.src =
              'https://cdn.pixabay.com/audio/2022/03/15/audio_27dbd9d363.mp3';
            if (soundOn) e.target.play().catch(() => {});
          }
        }}
      />
      <audio
        ref={raceBgmRef}
        src="/audio/bgm_race.mp3"
        loop
        onError={(e) => {
          if (e.target.src.indexOf('pixabay') === -1) {
            e.target.src =
              'https://cdn.pixabay.com/audio/2021/09/30/audio_3b01e7a2b6.mp3';
            if (soundOn) e.target.play().catch(() => {});
          }
        }}
      />

      {/* ===== TUTORIAL SPOTLIGHT INTERAKTIF ===== */}
      {showTutorial && targetRect && (
        <>
          <div
            className="tutorial-highlight"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          />
          <div
            className={`tutorial-tooltip ${tipAbove ? 'above' : ''}`}
            style={{
              top: tipAbove
                ? targetRect.top - 20
                : targetRect.top + targetRect.height + 20,
              left: Math.max(
                20,
                Math.min(
                  window.innerWidth - 360,
                  targetRect.left + targetRect.width / 2 - 170
                )
              ),
            }}
          >
            <div className="tutorial-tooltip-arrow" />
            <h3>{tourSteps(tutorialFlow, isGuest)[tutorialStep].title}</h3>
            <p>{tourSteps(tutorialFlow, isGuest)[tutorialStep].desc}</p>
            <div className="tutorial-footer">
              <div className="tutorial-dots">
                {tourSteps(tutorialFlow, isGuest).map((_, i) => (
                  <span
                    key={i}
                    className={`dot ${i === tutorialStep ? 'active' : ''}`}
                  />
                ))}
              </div>
              <div className="tutorial-buttons">
                <button className="ghost" onClick={closeTutorial}>
                  Tutup
                </button>
                {tutorialStep > 0 && (
                  <button className="ghost" onClick={prevTutorialStep}>
                    ← Sebelumnya
                  </button>
                )}
                {tutorialStep === tourSteps(tutorialFlow, isGuest).length - 1 &&
                nextTour(tutorialFlow, isGuest) ? (
                  <button className="secondary" onClick={goToNextTutorialPage}>
                    Lanjut ke {nextTour(tutorialFlow, isGuest).label} →
                  </button>
                ) : (
                  <button className="secondary" onClick={nextTutorialStep}>
                    {tutorialStep === tourSteps(tutorialFlow, isGuest).length - 1
                      ? 'Selesai'
                      : 'Lanjut →'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <header>
        <div className="brandBlock">
          <span className="brand">CAT DASH</span>
          <small>MULTIPLAYER QUIZ RACE</small>
        </div>
        <div className="headerRight">
          {uid ? (
            <>
              <button
                id="tour-btn-suara"
                className="ghost soundButton"
                onClick={toggleSound}
              >
                {soundOn ? 'SUARA: ON' : 'SUARA: OFF'}
              </button>
              <button className="ghost" onClick={startTutorial}>
                PANDUAN
              </button>
              {screen !== 'home' && screen !== 'review' && screen !== 'profile' && (
                <button className="ghost" onClick={home}>
                  MENU
                </button>
              )}
              {isGuest ? (
                <button className="secondary" onClick={goLogin}>
                  MASUK AKUN
                </button>
              ) : (
                <>
                  <button
                    className="ghost badgeBtn"
                    onClick={() => {
                      setScreen('friends');
                      fx('click');
                    }}
                  >
                    TEMAN
                    {incomingCount > 0 && <i className="badge">{incomingCount}</i>}
                  </button>
                  <button
                    className="ghost profileBtn"
                    id="tour-btn-profil"
                    onClick={() => {
                      setScreen('profile');
                      fx('click');
                    }}
                  >
                    {profile && (
                      <Avatar cat={profile.avatar} color={profile.avatar_color} size={26} />
                    )}
                    PROFIL
                  </button>
                </>
              )}
            </>
          ) : (
            <span className="status">BELUM LOGIN</span>
          )}
        </div>
      </header>

      {toastLayer}

      {uid && !isGuest && !racingRef.current && !showTutorial && (
        <InviteDock invites={invites} busy={busy} onJoin={joinInvite} onDismiss={dismissInvite} />
      )}

      {/* AUTH */}
      {screen === 'auth' && (
        <section
          className="panel center hero authPanel"
          style={{ maxWidth: '500px', margin: '0 auto' }}
        >
          <h1 className="logoCut small" aria-label="Cat Dash">
            {'CAT DASH'.split('').map((c, i) => (
              <span key={i} className={c === ' ' ? 'sp' : ''} style={{ '--i': i }}>
                {c}
              </span>
            ))}
          </h1>
          <p className="authLead">
            Masuk untuk menyimpan progres, berteman, dan bertanding dengan teman-temanmu.
          </p>
          <div className="questionEditor" style={{ marginTop: '20px', textAlign: 'left' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
              {authMode === 'login' ? 'Masuk Akun' : 'Daftar Akun Baru'}
            </h2>
            <form onSubmit={handleAuth}>
              <label>
                Email
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="namamu@gmail.com"
                  autoComplete="email"
                  required
                />
                <small className="fieldHint">
                  Gunakan email aktif (Gmail, Yahoo, Outlook, iCloud, atau email
                  sekolah/kampus).
                </small>
              </label>
              <label>
                Password
                <div className="pwdRow">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    required
                  />
                  <button
                    type="button"
                    className="ghost mini"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? 'SEMBUNYIKAN' : 'LIHAT'}
                  </button>
                </div>
                {authMode === 'register' && (
                  <ul className="pwdRules">
                    {PASSWORD_RULES.map((r) => (
                      <li key={r.label} className={r.test(passwordInput) ? 'ok' : ''}>
                        {r.label}
                      </li>
                    ))}
                  </ul>
                )}
              </label>
              <button
                type="submit"
                disabled={busy}
                style={{ width: '100%', marginTop: '15px' }}
              >
                {busy
                  ? 'MEMPROSES...'
                  : authMode === 'login'
                  ? 'MASUK'
                  : 'DAFTAR SEKARANG'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                className="linkBtn"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              >
                {authMode === 'login'
                  ? 'Belum punya akun? Daftar di sini'
                  : 'Sudah punya akun? Masuk di sini'}
              </button>
            </div>
          </div>
          <div className="actions" style={{ justifyContent: 'center', marginTop: '20px' }}>
            {ALLOW_GUEST && (
              <button className="secondary" onClick={handleGuest} disabled={busy}>
                MAIN SEBAGAI TAMU
              </button>
            )}
            <button className="ghost" onClick={() => setScreen('entrance')} disabled={busy}>
              KEMBALI
            </button>
          </div>
        </section>
      )}

      {/* PROFILE */}
      {screen === 'profile' && !isGuest && (
        <section className="panel" style={{ maxWidth: '560px', margin: '0 auto' }}>
          <h2>Profil Pengguna</h2>
          <p className="muted">Kelola identitasmu di game.</p>

          <div className="questionEditor" style={{ marginTop: '20px' }}>
            <div className="between" style={{ marginBottom: '15px' }}>
              <b>Email:</b>
              <span>{userEmail}</span>
            </div>

            <div className="avatarPicker" id="tour-avatar">
              <Avatar
                cat={profile?.avatar || cat}
                color={profile?.avatar_color || 'sun'}
                size={92}
              />
              <div className="avatarControls">
                <label style={{ marginTop: 0 }}>Kucing avatar</label>
                <div className="avatarCats">
                  {CATS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`avaOpt ${(profile?.avatar || cat) === c ? 'on' : ''}`}
                      disabled={busy || !dbReady}
                      onClick={() => chooseAvatar({ avatar: c })}
                    >
                      <Cat cat={c} size={54} />
                      <small>{LABELS[c]}</small>
                    </button>
                  ))}
                </div>
                <label>Warna bingkai</label>
                <div className="avatarColors">
                  {AVATAR_COLOR_NAMES.map((k) => (
                    <button
                      key={k}
                      type="button"
                      aria-label={`Warna ${k}`}
                      className={`swatch ${(profile?.avatar_color || 'sun') === k ? 'on' : ''}`}
                      style={{ background: AVATAR_COLORS[k] }}
                      disabled={busy || !dbReady}
                      onClick={() => chooseAvatar({ color: k })}
                    />
                  ))}
                </div>
              </div>
            </div>
            {!dbReady && (
              <small className="fieldHint">
                Avatar belum bisa disimpan: jalankan catdash_v3.sql di Supabase dulu.
              </small>
            )}

            <label>Nama Pemain</label>
            <input
              id="tour-input-nama"
              value={name}
              maxLength={20}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama kamu"
            />

            <button
              id="tour-btn-simpan-profil"
              className="secondary"
              onClick={handleUpdateProfile}
              disabled={busy}
              style={{ width: '100%', marginTop: '15px' }}
            >
              {busy ? 'MENYIMPAN...' : 'SIMPAN NAMA'}
            </button>

            <label className="checkRow">
              <input
                type="checkbox"
                checked={!hideWelcome}
                onChange={(e) => toggleHideWelcome(!e.target.checked)}
              />
              <span>Tampilkan pesan selamat datang saat membuka aplikasi</span>
            </label>
          </div>

          <div className="history-card-wrap" id="tour-riwayat">
            <h3 style={{ marginTop: '25px' }}>Riwayat Bermain</h3>
            <p className="muted" style={{ marginTop: '-6px', fontSize: '14px' }}>
              Otomatis dihapus jika sudah lebih dari 1 minggu.
            </p>
            {history.length === 0 ? (
              <p className="muted">Belum ada riwayat. Mainkan game untuk melihatnya di sini.</p>
            ) : (
              <div className="history-list">
                {history.map((h) => (
                  <div key={h.id} className="history-item">
                    <div className="between">
                      <b>{h.quiz_title}</b>
                      <small>{new Date(h.played_at).toLocaleDateString('id-ID')}</small>
                    </div>
                    <div className="history-meta">
                      <span>Posisi {h.position}/{h.total_players}</span>
                      <span>Waktu {formatTime(h.time_ms)}</span>
                      <span>{h.correct_count} benar</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="actions" style={{ marginTop: '30px' }}>
            <button
              id="tour-btn-logout"
              className="ghost danger"
              onClick={handleLogout}
              style={{ width: '100%' }}
            >
              KELUAR / LOG OUT
            </button>
            <button className="ghost" onClick={() => setScreen('home')} style={{ width: '100%' }}>
              KEMBALI KE MENU
            </button>
          </div>
        </section>
      )}

      {/* TEMAN */}
      {screen === 'friends' && !isGuest && (
        <FriendsScreen
          profile={profile}
          friends={friends}
          busy={busy}
          dbReady={dbReady}
          onAdd={addFriend}
          onRespond={respondFriend}
          onRemove={removeFriend}
          onRefresh={refreshFriends}
          onCopyCode={copyFriendCode}
        />
      )}

      {/* HOME */}
      {screen === 'home' && (
        <section className="panel center hero">
          <h1 className="logoCut" aria-label="Cat Dash">
            {'CAT DASH'.split('').map((c, i) => (
              <span key={i} className={c === ' ' ? 'sp' : ''} style={{ '--i': i }}>
                {c}
              </span>
            ))}
          </h1>
          <span className="heroStamp">Multiplayer Quiz Race</span>
          <p className="hero-desc">
            Sebuah pengalaman seru di mana <b>kecepatan tangan</b> bertemu
            dengan <b>ketajaman otak</b>. Buktikan seberapa gesit kamu di
            lintasan balap penuh tantangan ini!
          </p>
          <div className="heroChips">
            <span>Adu Cepat</span>
            <span>Adu Pintar</span>
            <span>5 Tipe Soal</span>
            <span>Hingga 10 Pemain</span>
          </div>
          {isGuest && (
            <div className="guestBanner">
              <b>Kamu masuk sebagai tamu.</b> Tamu hanya bisa ikut bermain di room
              temanmu.{' '}
              <button className="linkBtn" onClick={goLogin}>
                Masuk atau daftar
              </button>{' '}
              untuk membuat kuis, berteman, dan menyimpan riwayat.
            </div>
          )}
          <div className="heroCats">
            {CATS.map((c) => (
              <Cat key={c} cat={c} size={90} />
            ))}
          </div>
          <div className="actions">
            {isGuest ? (
              <>
                <button
                  className="locked"
                  aria-disabled="true"
                  onClick={() => notify('Daftar akun dulu untuk membuat kuis.', 'info')}
                >
                  BUAT KUIS <small>terkunci</small>
                </button>
                <button
                  className="locked"
                  aria-disabled="true"
                  onClick={() => notify('Daftar akun dulu untuk membuat room.', 'info')}
                >
                  MAIN BERSAMA <small>terkunci</small>
                </button>
              </>
            ) : (
              <>
                <button
                  id="tour-btn-kuis"
                  onClick={() => {
                    openCreate();
                    fx('click');
                  }}
                >
                  BUAT KUIS
                </button>
                <button
                  id="tour-btn-bersama"
                  onClick={() => {
                    refreshQuizzes().catch((e) => setError(msg(e)));
                    setScreen('host');
                    fx('click');
                  }}
                >
                  MAIN BERSAMA
                </button>
              </>
            )}
            <button
              id="tour-btn-gabung"
              onClick={() => {
                setScreen('join');
                fx('click');
              }}
            >
              GABUNG ROOM
            </button>
            {!isGuest && (
              <button
                id="tour-btn-teman"
                className="secondary badgeBtn"
                onClick={() => {
                  setScreen('friends');
                  fx('click');
                }}
              >
                TEMAN
                {incomingCount > 0 && <i className="badge">{incomingCount}</i>}
              </button>
            )}
          </div>
        </section>
      )}

      {/* CREATE */}
      {screen === 'create' && (
        <section className="panel">
          <h2>{editingQuizId ? 'Edit Kuis' : 'Buat Kuis Sendiri'}</h2>
          {editingQuizId && (
            <p className="muted" style={{ marginTop: '-6px' }}>
              Kamu sedang mengedit kuis. Perubahan baru tersimpan setelah klik
              “Simpan Perubahan”.
            </p>
          )}
          <label>Judul kuis</label>
          <input
            id="tour-input-judul"
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Misalnya: IPA Kelas 7"
          />

          {questions.map((q, i) => (
            <QuestionEditor
              key={q._key}
              q={q}
              index={i}
              first={i === 0}
              onPatch={(patch) =>
                setQuestions((old) => old.map((x, j) => (j === i ? { ...x, ...patch } : x)))
              }
              onDelete={() => deleteQuestion(i)}
            />
          ))}

          <div className="actions">
            <button
              id="tour-btn-tambah-soal"
              className="secondary"
              disabled={questions.length >= 50}
              onClick={() => setQuestions((v) => [...v, blank(v[v.length - 1]?.type)])}
            >
              + TAMBAH SOAL
            </button>
            <button
              id="tour-btn-simpan"
              disabled={busy || !uid}
              onClick={saveQuiz}
            >
              {busy
                ? 'MENYIMPAN...'
                : editingQuizId
                ? 'SIMPAN PERUBAHAN'
                : 'SIMPAN KUIS'}
            </button>
            {editingQuizId && (
              <button
                className="ghost"
                disabled={busy}
                onClick={() => {
                  leaveEditor();
                  setScreen('host');
                  fx('click');
                }}
              >
                BATAL
              </button>
            )}
          </div>
        </section>
      )}

      {/* HOST / JOIN */}
      {(screen === 'host' || screen === 'join') && (
        <section className="panel">
          <h2>{screen === 'host' ? 'Kuis Saya' : 'Gabung Room'}</h2>

          <div
            className="questionEditor"
            style={{
              background: 'var(--bg-almond)',
              borderColor: 'var(--pink-soft)',
              marginBottom: '20px',
            }}
          >
            <label>
              Nama pemain
              <input
                maxLength={20}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama kamu"
              />
            </label>
            <h3 style={{ marginTop: '15px' }}>Pilih kucing</h3>
            <div className="catPicker" id="tour-pilih-kucing">
              {CATS.map((c) => (
                <button
                  key={c}
                  className={`catOption ${cat === c ? 'chosen' : ''}`}
                  onClick={() => setCat(c)}
                >
                  <Cat cat={c} size={76} />
                  <small>{LABELS[c]}</small>
                </button>
              ))}
            </div>
          </div>

          {screen === 'host' ? (
            <>
              <label>Pilih kuis</label>
              <div className="quizPickRow">
                <select
                  id="tour-pilih-kuis"
                  value={selectedQuiz}
                  onChange={(e) => setSelectedQuiz(e.target.value)}
                >
                  <option value="">-- Pilih kuis --</option>
                  {quizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title} ({q.qcount} soal)
                    </option>
                  ))}
                </select>
                <button
                  id="tour-btn-edit-kuis"
                  className="secondary"
                  disabled={busy || !selectedQuiz}
                  onClick={() => startEditQuiz(selectedQuiz)}
                >
                  EDIT KUIS
                </button>
              </div>
              {quizzes.length === 0 && (
                <div>
                  <p>
                    Belum punya kuis.{' '}
                    <button
                      className="linkBtn"
                      onClick={openCreate}
                    >
                      Buat kuis dulu
                    </button>
                    .
                  </p>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={createSampleQuiz}
                  >
                    BUAT KUIS SIMULASI (15 SOAL, SEMUA TIPE)
                  </button>
                </div>
              )}
              {quizzes.length > 0 && !quizzes.some((q) => q.title === SAMPLE_QUIZ_TITLE) && (
                <button className="linkBtn" disabled={busy} onClick={createSampleQuiz}>
                  + Tambah kuis simulasi yang memuat kelima tipe soal
                </button>
              )}

              <label>Jumlah Bot (Lawan Sendiri)</label>
              <input
                id="tour-input-bot"
                type="number"
                min="0"
                max="5"
                value={botCount}
                onChange={(e) =>
                  setBotCount(
                    Math.max(0, Math.min(5, Math.floor(Number(e.target.value) || 0)))
                  )
                }
              />
              <small className="fieldHint">
                Maksimal 5 bot. Bot hanya lawan latihan dan tidak dihitung
                dalam batas pemain.
              </small>

              <label>Waktu per Soal (detik)</label>
              <input
                id="tour-input-timer"
                type="number"
                min="5"
                max="60"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
              />
              <small className="fieldHint">
                Isi antara 5 sampai 60 detik. Satu room maksimal 10 pemain
                (termasuk kamu).
              </small>

              <label>Panjang lintasan</label>
              <div className="chipRow" id="tour-input-jarak">
                {TRACKS.map((t) => (
                  <button
                    key={t.m}
                    type="button"
                    className={`chip ${trackSetting === t.m ? 'on' : ''}`}
                    onClick={() => setTrackSetting(t.m)}
                  >
                    {t.label}
                    <small>{t.m} m</small>
                  </button>
                ))}
              </div>
              <small className="fieldHint">
                Perkiraan: pemain menjawab sekitar {Math.ceil(trackSetting / 75)} soal untuk
                sampai garis finish.
              </small>

              <label>Wajib jawab benar sebelum finish</label>
              <div className="reqRow" id="tour-input-wajib">
                <input
                  type="number"
                  min="0"
                  max={selectedCount || 50}
                  value={reqSetting}
                  onChange={(e) =>
                    setReqSetting(
                      Math.max(0, Math.min(selectedCount || 50, Math.floor(Number(e.target.value) || 0)))
                    )
                  }
                />
                <button type="button" className="ghost mini" onClick={() => setReqSetting(0)}>
                  TANPA SYARAT
                </button>
                <button
                  type="button"
                  className="ghost mini"
                  disabled={!selectedCount}
                  onClick={() => setReqSetting(selectedCount)}
                >
                  SEMUA SOAL ({selectedCount})
                </button>
              </div>
              <small className="fieldHint">
                {reqSetting > 0
                  ? `Pemain yang sampai garis finish tapi baru menjawab benar kurang dari ${reqSetting} soal akan tertahan dan harus menjawab dulu. Kuis ini punya ${selectedCount} soal.`
                  : 'Tanpa syarat, pemenang ditentukan hanya dari siapa yang pertama sampai garis finish.'}
              </small>

              <button
                id="tour-btn-buat-room"
                disabled={busy || !uid}
                onClick={makeRoom}
              >
                {busy ? 'MEMBUAT...' : 'BUAT KODE ROOM'}
              </button>
            </>
          ) : (
            <>
              <label>Kode room 6 digit</label>
              <input
                id="tour-input-kode"
                inputMode="numeric"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
              />
              <small className="fieldHint">
                Satu room maksimal 10 pemain. Kalau penuh, kamu belum bisa
                masuk.
              </small>
              <button
                id="tour-btn-gabung-sekarang"
                disabled={busy || !uid}
                onClick={joinRoom}
              >
                GABUNG SEKARANG
              </button>
            </>
          )}
        </section>
      )}

      {/* ROOM */}
      {screen === 'room' && room && (
        <section className="panel">
          <div className="between roomHeading">
            <div>
              <h2>
                {room.status === 'lobby'
                  ? 'LOBBY BALAPAN'
                  : showResults
                  ? 'BALAPAN SELESAI'
                  : 'BALAPAN DIMULAI!'}
              </h2>
              <p className="muted">
                {room.status === 'lobby'
                  ? 'Bagikan kode ini ke teman-teman.'
                  : `Kode room: ${room.code}`}
              </p>
            </div>
            <button
              className="code"
              onClick={() => navigator.clipboard?.writeText(room.code)}
            >
              {room.code} ⧉
            </button>
          </div>
          {room.status === 'lobby' ? (
            <>
              <p>
                Pemain siap: <b>{players.length}/10</b>
              </p>
              <div className="ruleChips">
                <span>Lintasan <b>{trackLen} m</b></span>
                <span>Waktu soal <b>{room.quiz_time_limit || 15} dtk</b></span>
                <span>
                  {needCorrect > 0 ? (
                    <>Wajib benar <b>{needCorrect} soal</b></>
                  ) : (
                    <>Tanpa syarat jawaban</>
                  )}
                </span>
              </div>
              <div className="playerGrid">
                {allPlayersRaw.map((p) => {
                  const isBot = String(p.id).startsWith('bot-');
                  return (
                    <div className="playerCard" key={p.id}>
                      <div className="lobbyCatFrame">
                        <Cat cat={p.cat} size={96} />
                      </div>
                      <b>{p.nickname}</b>
                      {p.user_id === room.host_id && <small>HOST</small>}
                      {isBot && <small>BOT</small>}
                      {p.user_id === uid && <small>KAMU</small>}
                    </div>
                  );
                })}
              </div>

              {!isGuest && dbReady && (
                <InvitePanel
                  friends={friends}
                  inRoomIds={inRoomIds}
                  invitedIds={invitedIds}
                  onInvite={inviteFriend}
                  disabled={busy}
                />
              )}

              <div className="howto-card">
                <div className="between">
                  <h3 style={{ margin: 0 }}>Cara Bermain</h3>
                  <button
                    className="ghost"
                    onClick={() => {
                      setShowHowTo(true);
                      fx('click');
                    }}
                  >
                    LIHAT PANDUAN
                  </button>
                </div>
                <p className="muted" style={{ margin: '8px 0 0' }}>
                  Tekan <span className="kbd">D</span> untuk lari, tahan{' '}
                  <span className="kbd">SHIFT</span> untuk sprint, dan jawab
                  kuis saat energi habis. Balapan dimulai dengan hitung mundur
                  3-2-1.
                </p>
              </div>

              {isHost ? (
                <button
                  disabled={busy || players.length < 1}
                  onClick={startGame}
                >
                  MULAI BALAPAN
                </button>
              ) : (
                <p className="muted">Menunggu host memulai...</p>
              )}
            </>
          ) : showResults && showCongrats ? (
            <div className="congrats-modal">
              <div className="congrats-confetti" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
              <h2 className="congrats-title">SELAMAT!</h2>
              <div className="congrats-cat">
                <Cat cat={me?.cat || cat} action="idle" size={110} />
              </div>
              <p className="congrats-desc">{congratsText}</p>
              <div className="congrats-stats">
                <div className="between">
                  <span>Peringkat</span>
                  <b>
                    {myPosition} dari {rankedPlayers.length}
                  </b>
                </div>
                <div className="between">
                  <span>Waktu</span>
                  <b>{formatTime(finalMs)}</b>
                </div>
                <div className="between">
                  <span>Jawaban benar</span>
                  <b>{me?.correct_count || 0}</b>
                </div>
              </div>
              <button
                style={{ marginTop: '20px', width: '100%' }}
                onClick={() => {
                  setShowCongrats(false);
                  fx('click');
                }}
              >
                LIHAT PODIUM
              </button>
            </div>
          ) : showResults ? (
            <div className="results-container">
              <h2 className="podium-title">Hasil Balapan</h2>
              <div className="podium-wrapper">
                {rankedPlayers[1] && (
                  <div className="podium-step step-2">
                    <div className="podium-cat">
                      <Cat cat={rankedPlayers[1].cat} size={64} />
                    </div>
                    <div className="podium-info">
                      <span className="medal m2">2</span>
                      <b>{rankedPlayers[1].nickname}</b>
                      <small>{Math.floor(rankedPlayers[1].distance)}m</small>
                    </div>
                  </div>
                )}
                {rankedPlayers[0] && (
                  <div className="podium-step step-1">
                    <div className="podium-cat">
                      <Cat cat={rankedPlayers[0].cat} size={80} />
                    </div>
                    <div className="podium-info">
                      <span className="medal m1">1</span>
                      <b>{rankedPlayers[0].nickname}</b>
                      <small>{Math.floor(rankedPlayers[0].distance)}m</small>
                    </div>
                  </div>
                )}
                {rankedPlayers[2] && (
                  <div className="podium-step step-3">
                    <div className="podium-cat">
                      <Cat cat={rankedPlayers[2].cat} size={56} />
                    </div>
                    <div className="podium-info">
                      <span className="medal m3">3</span>
                      <b>{rankedPlayers[2].nickname}</b>
                      <small>{Math.floor(rankedPlayers[2].distance)}m</small>
                    </div>
                  </div>
                )}
              </div>
              <div className="results-list">
                <h3>Peringkat Lainnya</h3>
                {rankedPlayers.slice(3).map((p, i) => (
                  <div className="result-row" key={p.id}>
                    <span>{i + 4}.</span>
                    <span>{p.nickname}</span>
                    <span>{Math.floor(p.distance)}m</span>
                  </div>
                ))}
                {rankedPlayers.length <= 3 && (
                  <p
                    style={{ textAlign: 'center', color: 'var(--text-muted)' }}
                  >
                    Tidak ada pemain lain.
                  </p>
                )}
              </div>
              <div className="podium-actions">
                <button
                  className="secondary"
                  onClick={openReview}
                  disabled={busy}
                >
                  {busy ? 'MEMUAT...' : 'LIHAT PEMBAHASAN'}
                </button>
                {isHost ? (
                  <button className="secondary" onClick={rematch} disabled={busy}>
                    MAIN LAGI (ROOM INI)
                  </button>
                ) : (
                  <small className="rematchNote">Host bisa mengajak main lagi di room yang sama.</small>
                )}
                <button
                  onClick={() => {
                    home();
                    fx('click');
                  }}
                >
                  KEMBALI KE MENU
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="raceStage">
                {/* HITUNG MUNDUR 3-2-1-GO */}
                {countdown !== null && (
                  <div className="countdown-overlay">
                    <div
                      key={countdown}
                      className={`countdown-text ${
                        countdown === 0 ? 'go' : ''
                      }`}
                    >
                      {countdown === 0 ? 'GO!' : countdown}
                    </div>
                  </div>
                )}

                <div className="raceTopHud">
                  <div className="hudPill">
                    <b>
                      {me?.correct_count || 0}
                      {needCorrect > 0 && <i className="hudNeed">/{needCorrect}</i>}
                    </b>
                    <small>BENAR</small>
                  </div>
                  <div className="hudPill">
                    <small>FINISH</small>
                    <b>{trackLen} m</b>
                  </div>
                  <div className="hudPill timerPill">
                    <small>WAKTU</small>
                    <RaceTimer
                      startTime={raceStartTime}
                      running={!showResults}
                    />
                  </div>
                  <div className="energyPill">
                    <small>ENERGI</small>
                    <div className={`energyBar ${energyClass}`}>
                      <i style={{ width: `${myEnergy}%` }} />
                    </div>
                  </div>
                  <div className="hudPill positionPill">
                    <small>POSISI</small>
                    <b>
                      {myPosition}/{rankedPlayers.length}
                    </b>
                  </div>
                </div>

                <div
                  className="raceScenery"
                  style={{
                    height: `${sceneryMinHeight}px`,
                    minHeight: `${sceneryMinHeight}px`,
                  }}
                >
                  <div className="mountainRange" />
                  <div className="sakuraTree treeOne" />
                  <div className="sakuraTree treeTwo" />
                  <div className="pagoda" />
                  <div className="fenceLine" />
                  <div
                    className="raceLanes"
                    style={{ top: geo.top, bottom: 8, gap: geo.gap }}
                  >
                    {lanePlayers.map((p) => {
                      const mine = p.user_id === uid;
                      const progress = Math.min(
                        88,
                        Math.max(isMobile ? 9 : 3, (Number(p.distance) / trackLen) * 88)
                      );
                      const moving = Number(p.distance) > 0;
                      const action = p.finished_at
                        ? 'idle'
                        : mine && sprinting && moving
                        ? 'dash'
                        : moving
                        ? 'run_1'
                        : 'idle';
                      return (
                        <div
                          className={`raceLane runnerLane ${
                            mine ? 'myRunnerLane' : ''
                          }`}
                          key={p.id}
                          style={{
                            flex: `0 0 ${geo.h}px`,
                            height: geo.h,
                            minHeight: geo.h,
                          }}
                        >
                          <div className="laneDecor" />
                          <span className="runnerTrackName">
                            {mine ? 'LINTASAN KAMU' : p.nickname}
                          </span>
                          <div
                            className={`raceCat ${
                              mine ? 'myRaceCat' : 'rivalCat'
                            }`}
                            style={{
                              left: `${progress}%`,
                              '--cat-size': `${mine ? geo.me : geo.cat}px`,
                            }}
                          >
                            {mine ? (
                              <div
                                className="youPointer"
                                style={{ bottom: geo.me - 4 }}
                              >
                                <span className="youTag">KAMU</span>
                                <span className="youArrow">▼</span>
                              </div>
                            ) : (
                              <div className="rivalName">{p.nickname}</div>
                            )}
                            <Cat
                              cat={p.cat}
                              action={action}
                              size={mine ? geo.me : geo.cat}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div
                    className="finishBanner"
                    style={{ top: geo.top, bottom: 8 }}
                  >
                  </div>
                </div>

                <div className="raceBottomHud">
                  <div className="controlKeys">
                    <button
                      className={`arcadeKey runKey ${
                        myEnergy <= 0 || !raceReady ? 'disabledKey' : ''
                      }`}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        pressRunKey();
                      }}
                      style={{ minWidth: '120px' }}
                    >
                      <b>D</b>
                      <small>LARI</small>
                    </button>
                    <button
                      className={`arcadeKey ${sprinting ? 'keyActive' : ''}`}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        moveRef.current.sprinting = true;
                        setSprinting(true);
                      }}
                      onPointerUp={() => {
                        moveRef.current.sprinting = false;
                        setSprinting(false);
                      }}
                      onPointerLeave={() => {
                        moveRef.current.sprinting = false;
                        setSprinting(false);
                      }}
                      onPointerCancel={() => {
                        moveRef.current.sprinting = false;
                        setSprinting(false);
                      }}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      <b>»</b>
                      <small>
                        SHIFT
                        <br />
                        SPRINT
                      </small>
                    </button>
                  </div>
                  <div className="distanceCard">
                    <small>JARAK SAAT INI</small>
                    <b>{Math.floor(Number(me?.distance || 0))} m</b>
                    <small>dari {trackLen} m</small>
                  </div>
                  <div className="miniProgress">
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          (Number(me?.distance || 0) / trackLen) * 100
                        )}%`,
                      }}
                    />
                    <span className="mpCat" />
                    <b className="mpFlag" />
                  </div>
                  <div className="woodTip">
                    Tekan D atau tahan
                    <br />
                    Jawab kuis jika energi habis!
                  </div>
                </div>
              </div>
              <div className="raceMeta">
                {players.length} pemain
                {localBots.length > 0 && ` + ${localBots.length} bot`}
                {' '}• TEKAN D: MAJU • SHIFT: SPRINT
                {localBots.length > 0 && (
                  <span style={{ display: 'block', marginTop: '4px', color: 'var(--terra)' }}>
                    ℹ Bot akan hilang otomatis jika ada pemain asli yang bergabung.
                  </span>
                )}
                <span className="stepHint">{stepHint}</span>
              </div>
            </>
          )}
        </section>
      )}

      {screen === 'review' && reviewData && (
        <section className="panel">
          <div className="between roomHeading">
            <div>
              <h2>Pembahasan Kuis</h2>
              <p className="muted">
                Kunci jawaban dan statistik akurasi pemain.
              </p>
            </div>
            <button className="ghost" onClick={home}>
              KEMBALI KE MENU
            </button>
          </div>
          <div className="review-layout">
            <div className="review-players">
              <h3>Akurasi Pemain</h3>
              <div className="player-stats-list">
                {rankedPlayers.map((p) => {
                  const totalQ = p.correct_count + p.wrong_count;
                  const acc =
                    totalQ > 0
                      ? Math.round((p.correct_count / totalQ) * 100)
                      : 0;
                  return (
                    <div className="player-stat-card" key={p.id}>
                      <div className="player-stat-header">
                        <b>{p.nickname}</b>
                        <span
                          className={`acc-badge ${
                            acc >= 70 ? 'high' : acc >= 40 ? 'mid' : 'low'
                          }`}
                        >
                          {acc}% Akurasi
                        </span>
                      </div>
                      <div className="player-stat-details">
                        <span>{p.correct_count} Benar</span>
                        <span>{p.wrong_count} Salah</span>
                        <span>{totalQ} Soal Dijawab</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="review-answers">
              <h3>Kunci Jawaban</h3>
              <div className="answers-list">
                {reviewData.map((q, i) => {
                  const correctAns = answerText(q);
                  return (
                    <div className="answer-card" key={q.id}>
                      <p className="q-prompt">
                        <b>Soal {i + 1}</b>{' '}
                        <span className="qTag">{QTYPE_BY_ID[q.type]?.label || 'Pilihan Ganda'}</span>{' '}
                        {q.type === 'chain' ? `Sambung kata dari ${q.prompt}` : q.prompt}
                      </p>
                      <p className="q-correct">
                        <b>Jawaban Benar:</b> <span>{correctAns}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PESAN SELAMAT DATANG */}
      {showWelcome && uid && screen === 'home' && !showTutorial && (
        <div className="overlay">
          <div className="instruction-modal welcome-modal">
            <div className="welcomeCats">
              {CATS.map((c) => (
                <Cat key={c} cat={c} size={60} />
              ))}
            </div>
            <h2>Selamat datang{name ? `, ${name}` : ''}!</h2>
            <p className="welcome-desc">
              {localStorage.getItem(`catdash_tutorial_seen_${uid}`)
                ? 'Senang melihatmu lagi! Mau lihat panduan cara bermain Cat Dash lagi?'
                : 'Sepertinya kamu baru di Cat Dash. Mau diajak keliling dulu supaya tidak bingung? Hanya sebentar kok!'}
            </p>
            <div className="actions" style={{ justifyContent: 'center' }}>
              <button onClick={() => closeWelcome(true)}>
                YA, MULAI TUTORIAL
              </button>
              <button className="ghost" onClick={() => closeWelcome(false)}>
                NANTI SAJA
              </button>
            </div>
            <label className="checkRow">
              <input
                type="checkbox"
                checked={hideWelcome}
                onChange={(e) => toggleHideWelcome(e.target.checked)}
              />
              <span>
                Jangan tampilkan lagi saat membuka aplikasi
                <small style={{ display: 'block' }}>
                  Bisa diaktifkan kembali di menu Profil.
                </small>
              </span>
            </label>
          </div>
        </div>
      )}

      {/* MODAL PANDUAN CARA MAIN */}
      {screen === 'room' && room?.status === 'lobby' && showHowTo && (
        <div className="overlay">
          <div className="instruction-modal">
            <h2>Cara Bermain Cat Dash</h2>
            {howToItems}
            <button style={{ width: '100%' }} onClick={closeHowTo}>
              MENGERTI, AYO MAIN!
            </button>
          </div>
        </div>
      )}

      {screen === 'room' &&
        room?.status === 'racing' &&
        me?.needs_quiz &&
        !showResults && (
          <div className="overlay">
            <div className={`quizModal ${atGate ? 'gate' : ''}`}>
              <h2>{atGate ? 'GARIS FINISH TERKUNCI' : 'ENERGI HABIS!'}</h2>
              <p className="quizLead">
                {atGate
                  ? `Jawab ${Math.max(0, needCorrect - myCorrect)} soal lagi dengan benar untuk melewati garis finish.`
                  : 'Jawab soal dengan benar untuk memulihkan energi dan lanjut berlari.'}
              </p>
              <div className="quizTimerRow">
                <span className="quizTimerLabel">WAKTU</span>
                <div className="quizTimerBarWrapper">
                  <div
                    className="quizTimerBar"
                    style={{
                      width: `${(quizSeconds / (room.quiz_time_limit || 15)) * 100}%`,
                      backgroundColor:
                        quizSeconds > (room.quiz_time_limit || 15) * 0.3
                          ? 'var(--green-moss)'
                          : 'var(--pink-soft)',
                    }}
                  />
                </div>
                <span className="quizTimerNum">{quizSeconds}s</span>
              </div>
              {question ? (
                <QuizPanel
                  question={question}
                  locked={!quizReady}
                  lockMs={QUIZ_LOCK_MS}
                  busy={busy}
                  onAnswer={answer}
                />
              ) : (
                <p>Memuat soal...</p>
              )}
            </div>
          </div>
        )}

      <footer>CAT DASH • Multiplayer Quiz Race</footer>
    </main>
  );
}
