import React, { createContext, useContext, useState } from 'react';
import { JLPTLevel, AdaptationMode, SuggestionsMode, SpeakingSpeed, Initiator } from '../types';

interface SettingsContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  defaultLevel: JLPTLevel;
  setDefaultLevel: (level: JLPTLevel) => void;
  furiganaEnabled: boolean;
  setFuriganaEnabled: (enabled: boolean) => void;
  adaptationMode: AdaptationMode;
  setAdaptationMode: (mode: AdaptationMode) => void;
  suggestionsMode: SuggestionsMode;
  setSuggestionsMode: (mode: SuggestionsMode) => void;
  speakingSpeed: SpeakingSpeed;
  setSpeakingSpeed: (speed: SpeakingSpeed) => void;
  initiator: Initiator;
  setInitiator: (initiator: Initiator) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKey, setApiKeyState] = useState<string>(() => {
    return localStorage.getItem('nihongo_api_key') || '';
  });

  const [defaultLevel, setDefaultLevelState] = useState<JLPTLevel>(() => {
    return (localStorage.getItem('nihongo_default_level') as JLPTLevel) || 'N4';
  });

  const [furiganaEnabled, setFuriganaState] = useState<boolean>(() => {
    return localStorage.getItem('nihongo_furigana') !== 'false';
  });

  const [adaptationMode, setAdaptationModeState] = useState<AdaptationMode>(() => {
    return (localStorage.getItem('nihongo_adaptation_mode') as AdaptationMode) || 'auto';
  });

  const [suggestionsMode, setSuggestionsModeState] = useState<SuggestionsMode>(() => {
    return (localStorage.getItem('nihongo_suggestions_mode') as SuggestionsMode) || 'auto';
  });

  const [speakingSpeed, setSpeakingSpeedState] = useState<SpeakingSpeed>(() => {
    return (localStorage.getItem('nihongo_speaking_speed') as SpeakingSpeed) || 'auto';
  });

  const [initiator, setInitiatorState] = useState<Initiator>(() => {
    return (localStorage.getItem('nihongo_initiator') as Initiator) || 'ai_first';
  });

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    localStorage.setItem('nihongo_api_key', key);
  };

  const setDefaultLevel = (level: JLPTLevel) => {
    setDefaultLevelState(level);
    localStorage.setItem('nihongo_default_level', level);
  };

  const setFuriganaEnabled = (enabled: boolean) => {
    setFuriganaState(enabled);
    localStorage.setItem('nihongo_furigana', String(enabled));
  };

  const setAdaptationMode = (mode: AdaptationMode) => {
    setAdaptationModeState(mode);
    localStorage.setItem('nihongo_adaptation_mode', mode);
  };

  const setSuggestionsMode = (mode: SuggestionsMode) => {
    setSuggestionsModeState(mode);
    localStorage.setItem('nihongo_suggestions_mode', mode);
  };

  const setSpeakingSpeed = (speed: SpeakingSpeed) => {
    setSpeakingSpeedState(speed);
    localStorage.setItem('nihongo_speaking_speed', speed);
  };

  const setInitiator = (init: Initiator) => {
    setInitiatorState(init);
    localStorage.setItem('nihongo_initiator', init);
  };

  return (
    <SettingsContext.Provider
      value={{
        apiKey,
        setApiKey,
        defaultLevel,
        setDefaultLevel,
        furiganaEnabled,
        setFuriganaEnabled,
        adaptationMode,
        setAdaptationMode,
        suggestionsMode,
        setSuggestionsMode,
        speakingSpeed,
        setSpeakingSpeed,
        initiator,
        setInitiator,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

