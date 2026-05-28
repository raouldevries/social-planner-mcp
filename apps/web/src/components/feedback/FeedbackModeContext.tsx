/**
 * Social Planner - Feedback Mode Context
 *
 * Provides feedback mode state and actions to the component tree.
 * When feedback mode is active, users can click on page sections to leave feedback.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface SelectedElement {
  selector: string;
  label: string | null;
  rect: DOMRect;
}

interface FeedbackModeContextValue {
  isFeedbackMode: boolean;
  selectedElement: SelectedElement | null;
  enterFeedbackMode: () => void;
  exitFeedbackMode: () => void;
  selectElement: (element: SelectedElement) => void;
  clearSelection: () => void;
}

const FeedbackModeContext = createContext<FeedbackModeContextValue | null>(null);

export function FeedbackModeProvider({ children }: { children: ReactNode }) {
  const [isFeedbackMode, setIsFeedbackMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);

  const enterFeedbackMode = useCallback(() => {
    setSelectedElement(null);
    setIsFeedbackMode(true);
  }, []);

  const exitFeedbackMode = useCallback(() => {
    setIsFeedbackMode(false);
  }, []);

  const selectElement = useCallback((element: SelectedElement) => {
    setSelectedElement(element);
    setIsFeedbackMode(false);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedElement(null);
  }, []);

  return (
    <FeedbackModeContext.Provider
      value={{
        isFeedbackMode,
        selectedElement,
        enterFeedbackMode,
        exitFeedbackMode,
        selectElement,
        clearSelection,
      }}
    >
      {children}
    </FeedbackModeContext.Provider>
  );
}

export function useFeedbackMode() {
  const context = useContext(FeedbackModeContext);
  if (!context) {
    throw new Error('useFeedbackMode must be used within a FeedbackModeProvider');
  }
  return context;
}
