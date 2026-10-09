/**
 * TourOfferChip — one-time, dismissible "take the tour" invitation.
 *
 * Shown after the first-visit welcome modal has been dealt with, only while
 * no tour is running, the student tour has never been completed, and the
 * offer has not been dismissed. Desktop/tablet only — phones already get the
 * mobile-suitability advisory and should not stack prompts.
 */

import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { useUiStore } from '../../store/uiStore';
import { dismissTourOffer, isTourDone, isTourOfferDismissed } from './storage';

export function TourOfferChip({ isPhone }: { isPhone: boolean }) {
  const welcomeOpen = useUiStore((s) => s.welcomeOpen);
  const mobileSuitabilityOpen = useUiStore((s) => s.mobileSuitabilityOpen);
  const tourId = useUiStore((s) => s.tourId);
  const [dismissed, setDismissed] = useState(() => isTourOfferDismissed() || isTourDone('student'));

  if (isPhone || dismissed || welcomeOpen || mobileSuitabilityOpen || tourId) return null;

  const dismiss = () => {
    dismissTourOffer();
    setDismissed(true);
  };

  return (
    <div className="workspace-tour-offer pointer-events-auto fixed top-28 right-16 z-40">
      <div className="flex items-center gap-1 rounded-full border border-sky-200 bg-white/95 py-1 pl-3 pr-1 shadow-xl ring-1 ring-slate-900/5 backdrop-blur dark:border-sky-900 dark:bg-slate-900/95 dark:ring-slate-700/50">
        <Sparkles aria-hidden="true" className="size-3.5 text-sky-500" />
        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">New here?</span>
        <button
          type="button"
          onClick={() => {
            dismiss();
            useUiStore.getState().startTour('student');
          }}
          className="rounded-full bg-sky-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-sky-700"
        >
          Take the 2-min tour
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss tour offer"
          className="grid size-6 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X aria-hidden="true" className="size-3" />
        </button>
      </div>
    </div>
  );
}
