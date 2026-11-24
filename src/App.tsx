import { useState, useEffect, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { Button } from './components/ui/button';
import closedChest from './assets/treasure_closed.png';
import treasureChest from './assets/treasure_opened.png';
import skeletonChest from './assets/treasure_opened_skeleton.png';
import chestOpenSound from './audios/chest_open.mp3';
import evilLaughSound from './audios/chest_open_with_evil_laugh.mp3';
import keyCursor from './assets/key.png';
import { AuthPanel } from './components/AuthPanel';
import { getMe, getScores, saveScore, type User, type ScoreSummary } from './api';

interface Box {
  id: number;
  isOpen: boolean;
  hasTreasure: boolean;
}

type Result = 'win' | 'tie' | 'loss';

// Win if the final score is above 0, tie at 0, loss below 0
const getResult = (score: number): Result =>
  score > 0 ? 'win' : score === 0 ? 'tie' : 'loss';

const RESULT_LABELS: Record<Result, string> = {
  win: '🏆 Win',
  tie: '🤝 Tie',
  loss: '💀 Loss',
};

// Inline styles, because not all needed Tailwind colors exist in the precompiled index.css
const RESULT_STYLES: Record<Result, CSSProperties> = {
  win: { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' },
  tie: { backgroundColor: '#f3f4f6', color: '#1f2937', borderColor: '#d1d5db' },
  loss: { backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5' },
};

export default function App() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [score, setScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);

  const initializeGame = () => {
    // Randomly assign treasure to one box
    const treasureBoxIndex = Math.floor(Math.random() * 3);
    const newBoxes: Box[] = Array.from({ length: 3 }, (_, index) => ({
      id: index,
      isOpen: false,
      hasTreasure: index === treasureBoxIndex,
    }));
    
    setBoxes(newBoxes);
    setScore(0);
    setGameEnded(false);
  };

  // Initialize game automatically when component mounts
  useEffect(() => {
    initializeGame();
  }, []);

  // Signed-in user (null = guest) and their saved scores
  const [user, setUser] = useState<User | null>(null);
  const [scores, setScores] = useState<ScoreSummary | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const refreshScores = () =>
    getScores().then(setScores).catch(err => setApiError(err.message));

  const handleUserChange = (newUser: User | null) => {
    setUser(newUser);
    setScores(null);
    setApiError(null);
    if (newUser) refreshScores();
  };

  // Restore the session on page load. Failure just means playing as guest.
  useEffect(() => {
    getMe().then(handleUserChange).catch(() => {});
  }, []);

  // Save the final score when a signed-in user finishes a game. Guests save nothing.
  // Only re-run on gameEnded, so signing in after a guest game does not save that game.
  useEffect(() => {
    if (!gameEnded || !user) return;
    saveScore(score)
      .then(refreshScores)
      .catch(err => setApiError(`Score not saved: ${err.message}`));
  }, [gameEnded]);

  const openBox = (boxId: number) => {
    if (gameEnded) return;

    // Ignore clicks on chests that are already open
    const clickedBox = boxes.find(box => box.id === boxId);
    if (!clickedBox || clickedBox.isOpen) return;

    // Play the chest opening sound (evil laugh for a skeleton). Ignore errors if the browser blocks playback.
    new Audio(clickedBox.hasTreasure ? chestOpenSound : evilLaughSound).play().catch(() => {});

    const updatedBoxes = boxes.map(box =>
      box.id === boxId ? { ...box, isOpen: true } : box
    );
    setBoxes(updatedBoxes);
    setScore(prevScore => prevScore + (clickedBox.hasTreasure ? 150 : -50));

    // End the game if the treasure is found or all boxes are opened
    if (clickedBox.hasTreasure || updatedBoxes.every(box => box.isOpen)) {
      setGameEnded(true);
    }
  };

  const resetGame = () => {
    initializeGame();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex flex-col items-center justify-center p-8">
      <AuthPanel user={user} scores={scores} error={apiError} onUserChange={handleUserChange} />

      <div className="text-center mb-8">
        <h1 className="text-4xl mb-4 text-amber-900">🏴‍☠️ Treasure Hunt Game 🏴‍☠️</h1>
        <p className="text-amber-800 mb-4">
          Click on the treasure chests to discover what's inside!
        </p>
        <p className="text-amber-700 text-sm">
          💰 Treasure: +$150 | 💀 Skeleton: -$50
        </p>
      </div>

      <div className="mb-8 flex items-center gap-4">
        <div className="text-2xl text-center p-4 bg-amber-200/80 backdrop-blur-sm rounded-lg shadow-lg border-2 border-amber-400">
          <span className="text-amber-900">Current Score: </span>
          <span className={`${score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${score}
          </span>
        </div>

        {gameEnded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-2xl p-4 rounded-lg shadow-lg border-2"
            style={RESULT_STYLES[getResult(score)]}
          >
            {RESULT_LABELS[getResult(score)]}
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {boxes.map((box) => (
              <motion.div
                key={box.id}
                className="flex flex-col items-center"
                // Key cursor over unopened chests while playing; normal arrow otherwise
                style={{ cursor: box.isOpen || gameEnded ? 'default' : `url(${keyCursor}) 4 4, pointer` }}
                whileHover={{ scale: box.isOpen || gameEnded ? 1 : 1.05 }}
                whileTap={{ scale: box.isOpen || gameEnded ? 1 : 0.95 }}
                onClick={() => openBox(box.id)}
              >
                <motion.div
                  initial={{ rotateY: 0 }}
                  animate={{ 
                    rotateY: box.isOpen ? 180 : 0,
                    scale: box.isOpen ? 1.1 : 1
                  }}
                  transition={{ 
                    duration: 0.6,
                    ease: "easeInOut"
                  }}
                  className="relative"
                >
                  <img
                    src={box.isOpen 
                      ? (box.hasTreasure ? treasureChest : skeletonChest)
                      : closedChest
                    }
                    alt={box.isOpen 
                      ? (box.hasTreasure ? "Treasure!" : "Skeleton!")
                      : "Treasure Chest"
                    }
                    className="w-48 h-48 object-contain drop-shadow-lg"
                  />
                  
                  {box.isOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="absolute -top-8 left-1/2 transform -translate-x-1/2"
                    >
                      {box.hasTreasure ? (
                        <div className="text-2xl animate-bounce">✨💰✨</div>
                      ) : (
                        <div className="text-2xl animate-pulse">💀👻💀</div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
                
                <div className="mt-4 text-center">
                  {box.isOpen ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, duration: 0.3 }}
                      className={`text-lg p-2 rounded-lg ${
                        box.hasTreasure 
                          ? 'bg-green-100 text-green-800 border border-green-300' 
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}
                    >
                      {box.hasTreasure ? '+$150' : '-$50'}
                    </motion.div>
                  ) : (
                    // Hidden (but keeps its space) once the game ends, since the chest can no longer be opened
                    <div className="text-amber-700 p-2" style={{ visibility: gameEnded ? 'hidden' : 'visible' }}>
                      Click to open!
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
      </div>

      {gameEnded && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="mb-4 p-6 bg-amber-200/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-amber-400">
                <h2 className="text-2xl mb-2 text-amber-900">Game Over!</h2>
                <p className="text-lg text-amber-800">
                  Final Score: <span className={`${score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${score}
                  </span>
                </p>
                <p className="text-sm text-amber-600 mt-2">
                  {boxes.some(box => box.isOpen && box.hasTreasure) 
                    ? 'Treasure found! Well done, treasure hunter! 🎉' 
                    : 'No treasure found this time! Better luck next time! 💀'}
                </p>
              </div>
              
              <Button 
                onClick={resetGame}
                className="text-lg px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white"
              >
                Play Again
              </Button>
            </motion.div>
          )}
    </div>
  );
}
