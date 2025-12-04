"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { createClient } from "@/app/utils/supabase/client";
import { useStoreContext } from "./StoreContext";

interface OnboardingContextType {
  currentStep: number;
  totalSteps: number;
  isOnboarding: boolean;
  onboardingCompleted: boolean;
  nextStep: () => void;
  previousStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  startOnboarding: () => void;
}

// Default/disabled onboarding state for public pages or when onboarding is not available
const defaultOnboardingContext: OnboardingContextType = {
  currentStep: 0,
  totalSteps: 6,
  isOnboarding: false,
  onboardingCompleted: true, // Mark as completed so it doesn't trigger
  nextStep: () => {},
  previousStep: () => {},
  skipOnboarding: () => {},
  completeOnboarding: () => {},
  startOnboarding: () => {},
};

const OnboardingContext = createContext<OnboardingContextType>(
  defaultOnboardingContext
);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { userinfo } = useStoreContext();
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true); // Default to true
  const [isInitialized, setIsInitialized] = useState(false);
  const totalSteps = 6;

  const updateOnboardingStatus = useCallback(async (updates: Record<string, unknown>) => {
    if (!userinfo?.id) return;

    try {
      await supabase.from("user").update(updates).eq("id", userinfo.id);
    } catch (err) {
      // Silently fail - columns may not exist
      console.debug("Onboarding update skipped:", err);
    }
  }, [userinfo?.id, supabase]);

  const loadOnboardingStatus = useCallback(async () => {
    if (!userinfo?.id) {
      setIsInitialized(true);
      return;
    }

    try {
      // Check if onboarding columns exist by querying
      const { data, error } = await supabase
        .from("user")
        .select("onboarding_completed, onboarding_step, onboarding_skipped")
        .eq("id", userinfo.id)
        .maybeSingle();

      if (error) {
        // Error indicates missing columns or permissions
        if (
          error.code === "PGRST116" ||
          error.code === "PGRST200" ||
          error.message?.includes("column") ||
          error.message?.includes("does not exist")
        ) {
          console.info("Onboarding feature not available (database columns missing)");
        } else {
          console.warn("Error loading onboarding status:", error.message);
        }
        // Always mark as completed when error occurs
        setOnboardingCompleted(true);
        setIsOnboarding(false);
        setIsInitialized(true);
        return;
      }

      if (data) {
        setOnboardingCompleted(data.onboarding_completed ?? true);
        setCurrentStep(data.onboarding_step ?? 0);

        // Start onboarding if not completed and not skipped
        if (!data.onboarding_completed && !data.onboarding_skipped) {
          setIsOnboarding(true);
        }
      } else {
        // No data returned - mark as completed
        setOnboardingCompleted(true);
      }
      setIsInitialized(true);
    } catch (err) {
      // Fail gracefully - assume onboarding is completed
      console.warn("Unexpected error in onboarding:", err);
      setOnboardingCompleted(true);
      setIsOnboarding(false);
      setIsInitialized(true);
    }
  }, [userinfo?.id, supabase]);

  // Load onboarding status when user changes
  // IMPORTANT: This hook is called unconditionally, before any returns
  useEffect(() => {
    loadOnboardingStatus();
  }, [loadOnboardingStatus]);

  const nextStep = useCallback(async () => {
    const newStep = currentStep + 1;
    setCurrentStep(newStep);
    await updateOnboardingStatus({ onboarding_step: newStep });
  }, [currentStep, updateOnboardingStatus]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      updateOnboardingStatus({ onboarding_step: newStep });
    }
  }, [currentStep, updateOnboardingStatus]);

  const skipOnboarding = useCallback(async () => {
    setIsOnboarding(false);
    await updateOnboardingStatus({
      onboarding_skipped: true,
      onboarding_step: currentStep,
    });
  }, [currentStep, updateOnboardingStatus]);

  const completeOnboarding = useCallback(async () => {
    setIsOnboarding(false);
    setOnboardingCompleted(true);
    await updateOnboardingStatus({
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
      onboarding_step: totalSteps,
    });
  }, [totalSteps, updateOnboardingStatus]);

  const startOnboarding = useCallback(async () => {
    setIsOnboarding(true);
    setCurrentStep(0);
    await updateOnboardingStatus({
      onboarding_started_at: new Date().toISOString(),
      onboarding_step: 0,
      onboarding_skipped: false,
    });
  }, [updateOnboardingStatus]);

  // Now we can safely return early if no user - all hooks have been called
  if (!userinfo) {
    return (
      <OnboardingContext.Provider value={defaultOnboardingContext}>
        {children}
      </OnboardingContext.Provider>
    );
  }

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        totalSteps,
        isOnboarding,
        onboardingCompleted,
        nextStep,
        previousStep,
        skipOnboarding,
        completeOnboarding,
        startOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  // Always return context - it will have default values if provider is not properly set up
  return context || defaultOnboardingContext;
};
