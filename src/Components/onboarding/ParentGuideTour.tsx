import { HelpCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../services/auth.services';
import GuideCard from './GuideCard';
import {
  findGuideElement,
  getCompletedKey,
  getGuideUserId,
  getSeenKey,
  getTargetRect,
  getVisibleSteps,
  type TargetRect,
} from './guideUtils';
import { findGuideConfig, type GuideStep } from './parentGuideSteps';

/**
 * The floating "Guide" button and the step-by-step tour it opens. The tour
 * opens by itself the first time a parent lands on a page that has one.
 *
 * @returns The button and, while a tour is open, its overlay and card.
 */
export default function ParentGuideTour() {
  const location = useLocation();
  const { user } = useAuth();
  const config = useMemo(() => findGuideConfig(location.pathname), [location.pathname]);
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<TargetRect | null>(null);
  const [steps, setSteps] = useState<GuideStep[]>([]);

  // The tour must not restart when the user object is replaced (an avatar or
  // phone change), only when the parent signs in or out.
  const hasUser = user !== null;
  const userId = getGuideUserId(user);
  const currentStep: GuideStep | undefined = steps[stepIndex];
  const currentTarget = currentStep?.target;

  useEffect(() => {
    setStepIndex(0);
    setRect(null);

    if (!config || !hasUser) {
      setIsOpen(false);
      setSteps([]);
      return undefined;
    }

    const completed = window.localStorage.getItem(getCompletedKey(config.id, userId)) === 'done';
    const seen = window.localStorage.getItem(getSeenKey(config.id, userId)) === 'done';

    // Wait a frame so the page's own elements are laid out before measuring.
    const frame = window.requestAnimationFrame(() => {
      setSteps(getVisibleSteps(config));
      setIsOpen(!completed && !seen);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [config, hasUser, userId]);

  useEffect(() => {
    if (!isOpen || !currentTarget) return;
    findGuideElement(currentTarget)?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  }, [isOpen, currentTarget]);

  useEffect(() => {
    if (!isOpen || !currentTarget) return undefined;

    let frame = 0;
    const update = (): void => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setRect(getTargetRect(currentTarget)));
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isOpen, currentTarget]);

  const configId = config?.id;
  const close = useCallback(
    (markDone: boolean): void => {
      if (!configId) return;
      window.localStorage.setItem(getSeenKey(configId, userId), 'done');
      if (markDone) window.localStorage.setItem(getCompletedKey(configId, userId), 'done');
      setIsOpen(false);
    },
    [configId, userId],
  );

  const lastIndex = steps.length - 1;

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close(false);
      if (event.key === 'ArrowRight') setStepIndex((value) => Math.min(value + 1, lastIndex));
      if (event.key === 'ArrowLeft') setStepIndex((value) => Math.max(value - 1, 0));
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, lastIndex, close]);

  if (!config || !hasUser) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSteps(getVisibleSteps(config));
          setStepIndex(0);
          setIsOpen(true);
        }}
        className="fixed bottom-5 right-5 z-[900] inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 py-3 text-sm font-bold text-[#003366] shadow-xl shadow-blue-950/10 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#F4B740] dark:border-white/10 dark:bg-[#0B1220]/90 dark:text-[#F4B740]"
      >
        <HelpCircle className="h-4 w-4" />
        Guide
      </button>

      {isOpen && currentStep && (
        <>
          <div className="fixed inset-0 z-[999] bg-[#030E18]/35 backdrop-blur-[1px]" />

          {rect && (
            <div
              className="pointer-events-none fixed z-[1000] rounded-[22px] border-2 border-[#F4B740] shadow-[0_0_0_9999px_rgba(3,14,24,0.28),0_0_34px_rgba(244,183,64,0.66)] transition-all duration-200"
              style={{
                top: Math.max(rect.top - 8, 8),
                left: Math.max(rect.left - 8, 8),
                width: rect.width + 16,
                height: rect.height + 16,
              }}
            />
          )}

          <GuideCard
            step={currentStep}
            current={stepIndex}
            total={steps.length}
            rect={rect}
            onBack={() => setStepIndex((value) => Math.max(value - 1, 0))}
            onNext={() => setStepIndex((value) => Math.min(value + 1, lastIndex))}
            onDone={() => close(true)}
            onClose={() => close(false)}
          />
        </>
      )}
    </>
  );
}
