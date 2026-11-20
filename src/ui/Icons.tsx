/**
 * Небольшие пиктограммы навигации. Наследуют цвет кнопки, скрыты от скринридера.
 * Кнопка задаёт собственное доступное имя. Все пути локальны и редактируемы.
 */
export type IconName =
  | 'play'
  | 'arrow'
  | 'back'
  | 'sound'
  | 'mute'
  | 'keys'
  | 'map'
  | 'target'
  | 'clock'
  | 'bot'
  | 'pause'
  | 'cross'
  | 'settings'
  | 'pulse';
const paths: Record<IconName, React.ReactNode> = {
  play: <path d="m8 4 12 8-12 8Z" fill="currentColor" stroke="none" />,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  back: <path d="M20 12H5m6-6-6 6 6 6" />,
  sound: (
    <>
      <path d="M3 9h4l5-4v14l-5-4H3z" />
      <path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
    </>
  ),
  mute: (
    <>
      <path d="M3 9h4l5-4v14l-5-4H3z" />
      <path d="m16 9 5 6m0-6-5 6" />
    </>
  ),
  keys: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M5 9h1m3 0h1m3 0h1m3 0h1M5 12h1m3 0h1m3 0h1m3 0h1m-11 4h9" />
    </>
  ),
  map: (
    <>
      <path d="m2 6 6-3 8 3 6-3v15l-6 3-8-3-6 3zM8 3v15m8-12v15" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 1v6m0 10v6M1 12h6m10 0h6" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  bot: (
    <>
      <path d="m4 8 3-3h10l3 3v9l-3 2H7l-3-2zM8 10h8m-7 5h6M12 3V1" />
    </>
  ),
  pause: <path d="M8 4v16m8-16v16" strokeWidth="4" />,
  cross: <path d="m5 5 14 14m0-14L5 19" />,
  settings: (
    <>
      <path d="M3 6h18M3 12h18M3 18h18" />
      <path d="M8 3v6m8 0v6m-7 0v6" strokeWidth="3" />
    </>
  ),
  pulse: <path d="M2 12h5l3-7 4 14 3-7h5" />,
};
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
export function Logo() {
  return (
    <svg className="brand-mark" aria-hidden="true" viewBox="0 0 50 40">
      <path fill="currentColor" d="M1 34 17 6h8L9 34zm14 0L31 6h8L23 34zm22 0h-9l8-14 9 14z" />
    </svg>
  );
}
