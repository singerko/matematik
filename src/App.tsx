import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { App as CapApp } from '@capacitor/app';
import { getProfiles, setActiveProfileId, getActiveProfileId, saveProfile } from './lib/storage';
import { type Constraints, type PracticeStyle, type Problem, type Profile, type TrainingResult, type TutorialId, type TutorialScript } from './lib/types';
import ProfileSelector from './components/ProfileSelector';
import { SplashScreen } from './components/SplashScreen';
import { SingerLandLogo } from './components/SingerLandLogo';
import { resolveProfileConstraints } from './lib/profileConstraints';
import { getTutorialCatalogForGrade } from './lib/tutorials/catalog';
import { createFollowUpProblem } from './lib/adaptivePractice';
import { updateProfileProgress, createProblemsFromDiary } from './lib/progress';
import { createRecommendedProblemsForTopic, createRecommendedProblemsFromProgress, createRecommendedProblemsFromRecentAndProgress } from './lib/progress';

const SettingsForm = lazy(() => import('./components/SettingsForm'));
const GameSession = lazy(() => import('./components/GameSession'));
const GridPuzzleSession = lazy(() => import('./components/GridPuzzleSession'));
const Summary = lazy(() => import('./components/Summary'));
const MethodHelp = lazy(() => import('./components/MethodHelp'));
const TutorialLibrary = lazy(() => import('./components/TutorialLibrary'));
const ProgressDashboard = lazy(() => import('./components/ProgressDashboard'));
const ContentOverview = lazy(() => import('./components/ContentOverview'));

// Simple Route Enum
type Screen = 'PROFILE' | 'SETTINGS' | 'GAME' | 'SUMMARY' | 'TUTORIAL_LIBRARY' | 'TUTORIAL' | 'PROGRESS' | 'CONTENT';

function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [screen, setScreen] = useState<Screen>('PROFILE');
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [gameResults, setGameResults] = useState<TrainingResult[]>([]);
  const [problemCount, setProblemCount] = useState(10);
  const [tutorialScript, setTutorialScript] = useState<TutorialScript | null>(null);
  const [initialProblems, setInitialProblems] = useState<Problem[]>([]);
  const [practiceStyle, setPracticeStyle] = useState<PracticeStyle>('classic');
  const [gameSettings, setGameSettings] = useState<Constraints | null>(null);

  useEffect(() => {
    // Load last active profile
    const profiles = getProfiles();
    const activeId = getActiveProfileId();
    if (activeId) {
      const p = profiles.find(x => x.id === activeId);
      if (p) {
        setCurrentProfile(p);
      }
    }
  }, []);

  const handleProfileSelect = (profile: Profile) => {
    setCurrentProfile(profile);
    setActiveProfileId(profile.id);
    setScreen('SETTINGS'); // Go to settings/menu after profile
  };

  const handleStartGame = (count: number, style: PracticeStyle = 'classic', settingsForGame?: Constraints) => {
    setProblemCount(count);
    setPracticeStyle(style);
    setGameSettings(settingsForGame ?? null);
    setInitialProblems([]);
    setScreen('GAME');
    setGameResults([]);
  };

  const handleGameComplete = (results: TrainingResult[]) => {
    if (currentProfile && results.length > 0) {
      const updatedProfile = updateProfileProgress(currentProfile, results);
      saveProfile(updatedProfile);
      setCurrentProfile(updatedProfile);
    }

    setGameResults(results);
    setScreen('SUMMARY');
  };

  const handleBackToMenu = () => {
    setInitialProblems([]);
    setGameSettings(null);
    setScreen('SETTINGS');
  };

  const handlePracticeRecommended = (results: TrainingResult[]) => {
    const recommendedProblems = currentProfile
      ? createRecommendedProblemsFromRecentAndProgress(results, currentProfile.progress)
      : results
        .filter(result => !result.correct)
        .map(result => createFollowUpProblem(result.problem))
        .filter((problem): problem is Problem => Boolean(problem))
        .slice(0, 10);

    if (recommendedProblems.length === 0) return;

    setInitialProblems(recommendedProblems);
    setProblemCount(recommendedProblems.length);
    setPracticeStyle('classic');
    setGameSettings(null);
    setGameResults([]);
    setScreen('GAME');
  };

  const handlePracticeFromProgress = () => {
    if (!currentProfile) return;

    const recommendedProblems = createRecommendedProblemsFromProgress(currentProfile.progress);
    if (recommendedProblems.length === 0) return;

    setInitialProblems(recommendedProblems);
    setProblemCount(recommendedProblems.length);
    setPracticeStyle('classic');
    setGameSettings(null);
    setGameResults([]);
    setScreen('GAME');
  };

  const handlePracticeFromDiary = () => {
    if (!currentProfile) return;

    const diaryProblems = createProblemsFromDiary(currentProfile.progress);
    if (diaryProblems.length === 0) return;

    setInitialProblems(diaryProblems);
    setProblemCount(diaryProblems.length);
    setPracticeStyle('classic');
    setGameSettings(null);
    setGameResults([]);
    setScreen('GAME');
  };

  const handlePracticeTopic = (topic: string) => {
    const recommendedProblems = createRecommendedProblemsForTopic(topic);
    if (recommendedProblems.length === 0) return;

    setInitialProblems(recommendedProblems);
    setProblemCount(recommendedProblems.length);
    setPracticeStyle('classic');
    setGameSettings(null);
    setGameResults([]);
    setScreen('GAME');
  };

  const handleResetProgress = () => {
    if (!currentProfile) return;
    const updatedProfile = { ...currentProfile, progress: undefined };
    saveProfile(updatedProfile);
    setCurrentProfile(updatedProfile);
  };

  const handleLogout = () => {
    setCurrentProfile(null);
    setActiveProfileId('');
    setScreen('PROFILE');
  };

  const handleBack = useCallback(() => {
    if (screen === 'GAME') {
      setScreen('SETTINGS');
      return;
    }
    if (screen === 'SETTINGS') {
      setCurrentProfile(null);
      setActiveProfileId('');
      setScreen('PROFILE');
      return;
    }
    if (screen === 'TUTORIAL_LIBRARY') {
      setScreen('SETTINGS');
      return;
    }
    if (screen === 'TUTORIAL') {
      setScreen('TUTORIAL_LIBRARY');
      return;
    }
    if (screen === 'SUMMARY') {
      setScreen('SETTINGS');
      return;
    }
    if (screen === 'PROGRESS') {
      setScreen('SETTINGS');
      return;
    }
    if (screen === 'CONTENT') {
      setScreen('SETTINGS');
      return;
    }
    // PROFILE — ukončiť aplikáciu
    CapApp.exitApp();
  }, [screen]);

  useEffect(() => {
    CapApp.addListener('backButton', handleBack);
    return () => { CapApp.removeAllListeners(); };
  }, [handleBack]);

  const handleOpenTutorialLibrary = () => {
    if (!currentProfile) return;
    setScreen('TUTORIAL_LIBRARY');
  };

  const handleOpenTutorial = async (tutorialId: TutorialId) => {
    if (!currentProfile) return;

    const { buildTutorialById } = await import('./lib/tutorials');
    const script = buildTutorialById(currentProfile, tutorialId);
    setTutorialScript(script);
    setScreen('TUTORIAL');
  };

  const activeConstraints = currentProfile ? resolveProfileConstraints(currentProfile) : null;
  const activeGameSettings = gameSettings ?? (initialProblems.length > 0 ? (activeConstraints ?? currentProfile?.settings ?? null) : null);
  const tutorialCategories = currentProfile
    ? getTutorialCatalogForGrade(currentProfile.schoolSettings?.grade ?? 'grade4')
    : [];

  return (
    <div className="app-container">
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}

      {screen !== 'PROFILE' && (
        <header style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <SingerLandLogo subtitle="matematik" size="md" />
        </header>
      )}

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: screen === 'GAME' ? 'hidden' : 'auto' }}>
        <Suspense fallback={<div style={{ padding: '1rem', color: '#94a3b8' }}>Načítavam...</div>}>
          {screen === 'PROFILE' && (
            <ProfileSelector onSelect={handleProfileSelect} />
          )}
          {screen === 'SETTINGS' && currentProfile && (
            <SettingsForm
              profile={currentProfile}
              onSave={(p) => {
                saveProfile(p);
                setCurrentProfile(p);
              }}
              onStart={handleStartGame}
              onStartRecommended={handlePracticeFromProgress}
              onOpenProgress={() => setScreen('PROGRESS')}
              onOpenContent={() => setScreen('CONTENT')}
              onLogout={handleLogout}
              onOpenTutorialLibrary={handleOpenTutorialLibrary}
            />
          )}
          {screen === 'GAME' && currentProfile && activeGameSettings && (
            practiceStyle === 'grid_puzzle' && initialProblems.length === 0 ? (
              <GridPuzzleSession
                settings={activeGameSettings ?? currentProfile.settings}
                totalProblems={problemCount || activeGameSettings?.problemCount || 10}
                onComplete={handleGameComplete}
                onExit={handleBackToMenu}
              />
            ) : (
              <GameSession
                settings={activeGameSettings ?? currentProfile.settings}
                totalProblems={problemCount || activeGameSettings?.problemCount || 10}
                initialProblems={initialProblems}
                onComplete={handleGameComplete}
                onExit={handleBackToMenu}
              />
            )
          )}
          {screen === 'SUMMARY' && (
            <Summary
              results={gameResults}
              onBack={handleBackToMenu}
              onPracticeRecommended={handlePracticeRecommended}
            />
          )}
          {screen === 'TUTORIAL_LIBRARY' && currentProfile && (
            <TutorialLibrary
              grade={currentProfile.schoolSettings?.grade ?? 'grade4'}
              categories={tutorialCategories}
              onBack={handleBackToMenu}
              onOpenTutorial={handleOpenTutorial}
            />
          )}
          {screen === 'TUTORIAL' && tutorialScript && (
            <MethodHelp
              script={tutorialScript}
              onBack={() => setScreen('TUTORIAL_LIBRARY')}
            />
          )}
          {screen === 'PROGRESS' && currentProfile && (
            <ProgressDashboard
              profile={currentProfile}
              onBack={handleBackToMenu}
              onPracticeTopic={handlePracticeTopic}
              onResetProgress={handleResetProgress}
              onPracticeDiary={handlePracticeFromDiary}
            />
          )}
          {screen === 'CONTENT' && (
            <ContentOverview onBack={handleBackToMenu} />
          )}
        </Suspense>
      </div>
    </div>
  );
}

export default App;
