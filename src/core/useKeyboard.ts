import { useEffect } from 'react';
import Mousetrap from 'mousetrap';

interface UseKeyboardProps {
  onToggleComments: () => void;
  onEscape: () => void;
  isVisible: boolean;
  shortcut?: string;
}

export const useKeyboard = ({ 
  onToggleComments, 
  onEscape, 
  isVisible,
  shortcut = 'c'
}: UseKeyboardProps) => {
  useEffect(() => {
    // Toggle comments with custom key
    Mousetrap.bind(shortcut, (e) => {
      e.preventDefault();
      onToggleComments();
    });

    // Close with Escape key (only when visible)
    Mousetrap.bind('escape', (e) => {
      if (isVisible) {
        e.preventDefault();
        onEscape();
      }
    });

    return () => {
      Mousetrap.unbind(shortcut);
      Mousetrap.unbind('escape');
    };
  }, [onToggleComments, onEscape, isVisible, shortcut]);
};

