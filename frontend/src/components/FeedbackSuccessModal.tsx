import React, { useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeedbackSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitAgain: () => void;
}

export function FeedbackSuccessModal({ isOpen, onClose, onSubmitAgain }: FeedbackSuccessModalProps) {
  // Prevent background scrolling
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0px';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0px';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 animate-in fade-in duration-300" onClick={onClose}>
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-8 animate-in zoom-in-95 fade-in duration-300" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose}
          className="absolute top-4 right-4"
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Content */}
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Success Icon */}
          <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center">
            <Check className="h-12 w-12 text-white stroke-[3]" />
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900">Thank you...</h2>
            <p className="text-gray-600">Your feedback has been recorded</p>
          </div>

          {/* Submit Again Button */}
          <Button
            onClick={onSubmitAgain}
            className="px-8 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full"
          >
            Submit again
          </Button>
        </div>
      </div>
    </div>
  );
}
