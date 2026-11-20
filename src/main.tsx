/**
 * Точка сборки приложения. Один Game владеет canvas, React получает публичный
 * GameClient. Соседние корни позволяют менять весь интерфейс независимо от сцены.
 * При горячей замене модуля старые обработчики и WebGL-ресурсы освобождаются.
 */
import { createRoot } from 'react-dom/client';
import { Game } from './core/Game.ts';
import { App } from './ui/App.tsx';
import './ui/styles/tokens.css';
import './ui/styles/menu.css';
import './ui/styles/hud.css';

const game = new Game(document.getElementById('world')!);
const root = createRoot(document.getElementById('root')!);
root.render(<App client={game} />);
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    root.unmount();
    game.dispose();
  });
