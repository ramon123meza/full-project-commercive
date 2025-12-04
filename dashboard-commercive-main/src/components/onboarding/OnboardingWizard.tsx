"use client";
import {
  Dialog,
  DialogContent,
  Button,
  LinearProgress,
  Typography,
  Box,
} from "@mui/material";
import {
  IoCheckmark,
  IoRocket,
  IoStorefront,
  IoPeople,
  IoDownload,
  IoStar,
  IoClose,
} from "react-icons/io5";
import { useOnboarding } from "@/context/OnboardingContext";
import { useStoreContext } from "@/context/StoreContext";

// Step 1: Welcome
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6 p-8">
      <IoRocket size={80} className="text-purple-600" />
      <Typography variant="h3" fontWeight="bold">
        Welcome to Commercive!
      </Typography>
      <Typography variant="h6" color="textSecondary">
        Let's get your store set up in just a few quick steps
      </Typography>
      <ul className="text-left space-y-3 mt-4">
        <li className="flex items-center gap-3">
          <IoCheckmark className="text-green-500" size={24} />
          <span>Track inventory across all locations</span>
        </li>
        <li className="flex items-center gap-3">
          <IoCheckmark className="text-green-500" size={24} />
          <span>Forecast demand with AI-powered insights</span>
        </li>
        <li className="flex items-center gap-3">
          <IoCheckmark className="text-green-500" size={24} />
          <span>Analyze sales trends in real-time</span>
        </li>
      </ul>
      <Button variant="contained" size="large" onClick={onNext} className="mt-4">
        Get Started
      </Button>
    </div>
  );
}

// Step 2: Store Verification
function StoreVerificationStep({ onNext }: { onNext: () => void }) {
  const { selectedStore } = useStoreContext();

  return (
    <div className="flex flex-col items-center text-center gap-6 p-8">
      <IoStorefront size={80} className="text-purple-600" />
      <Typography variant="h4" fontWeight="bold">
        Verify Your Store
      </Typography>
      {selectedStore ? (
        <>
          <div className="bg-green-50 p-4 rounded-lg">
            <IoCheckmark className="text-green-500 mx-auto mb-2" size={40} />
            <Typography variant="h6">{selectedStore.store_name}</Typography>
            <Typography variant="body2" color="textSecondary">
              {selectedStore.store_url}
            </Typography>
          </div>
          <Typography variant="body1">
            Your Shopify store is connected and ready to go!
          </Typography>
        </>
      ) : (
        <Typography variant="body1" color="error">
          No store connected. Please connect your Shopify store first.
        </Typography>
      )}
      <Button
        variant="contained"
        size="large"
        onClick={onNext}
        disabled={!selectedStore}
      >
        Continue
      </Button>
    </div>
  );
}

// Step 3: Team Invitation
function TeamInvitationStep({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-6 p-8">
      <IoPeople size={80} className="text-purple-600" />
      <Typography variant="h4" fontWeight="bold">
        Invite Your Team
      </Typography>
      <Typography variant="body1" color="textSecondary">
        Collaborate with team members by inviting them to your dashboard
      </Typography>
      <Typography variant="body2">
        You can invite team members later from Settings → Roles & Permissions
      </Typography>
      <div className="flex gap-4 mt-4">
        <Button variant="outlined" onClick={onSkip}>
          Skip for Now
        </Button>
        <Button variant="contained" onClick={onNext}>
          Go to Team Settings
        </Button>
      </div>
    </div>
  );
}

// Step 4: Data Import Status
function DataImportStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6 p-8">
      <IoDownload size={80} className="text-purple-600" />
      <Typography variant="h4" fontWeight="bold">
        Syncing Your Data
      </Typography>
      <Typography variant="body1" color="textSecondary">
        We're importing your inventory and orders from Shopify
      </Typography>
      <Box className="w-full max-w-md">
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span>Products & Inventory</span>
            <span className="text-green-600">✓ Complete</span>
          </div>
          <LinearProgress variant="determinate" value={100} />
        </div>
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span>Orders & Fulfillments</span>
            <span className="text-green-600">✓ Complete</span>
          </div>
          <LinearProgress variant="determinate" value={100} />
        </div>
      </Box>
      <Typography variant="body2" className="text-green-600">
        All data synced successfully!
      </Typography>
      <Button variant="contained" size="large" onClick={onNext}>
        Continue
      </Button>
    </div>
  );
}

// Step 5: Feature Tour
function FeatureTourStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6 p-8">
      <IoStar size={80} className="text-purple-600" />
      <Typography variant="h4" fontWeight="bold">
        Key Features
      </Typography>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div className="p-4 bg-purple-50 rounded-lg">
          <Typography variant="h6" fontWeight="bold">
            📊 Dashboard
          </Typography>
          <Typography variant="body2">
            Real-time analytics and insights about your store
          </Typography>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <Typography variant="h6" fontWeight="bold">
            📦 Inventory
          </Typography>
          <Typography variant="body2">
            Track stock levels and manage products
          </Typography>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <Typography variant="h6" fontWeight="bold">
            📈 Forecast
          </Typography>
          <Typography variant="body2">
            AI-powered demand forecasting
          </Typography>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <Typography variant="h6" fontWeight="bold">
            💬 Support
          </Typography>
          <Typography variant="body2">
            Live chat with our team
          </Typography>
        </div>
      </div>
      <Button variant="contained" size="large" onClick={onNext}>
        Continue
      </Button>
    </div>
  );
}

// Step 6: Complete
function CompleteStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6 p-8">
      <div className="bg-green-100 p-6 rounded-full">
        <IoCheckmark size={80} className="text-green-600" />
      </div>
      <Typography variant="h3" fontWeight="bold">
        You're All Set!
      </Typography>
      <Typography variant="h6" color="textSecondary">
        Welcome to Commercive. Let's grow your business together.
      </Typography>
      <Button variant="contained" size="large" onClick={onComplete}>
        Go to Dashboard
      </Button>
    </div>
  );
}

// Main Wizard Component
export default function OnboardingWizard() {
  const {
    currentStep,
    isOnboarding,
    nextStep,
    previousStep,
    skipOnboarding,
    completeOnboarding,
  } = useOnboarding();

  const steps = [
    { component: WelcomeStep, title: "Welcome" },
    { component: StoreVerificationStep, title: "Store" },
    { component: TeamInvitationStep, title: "Team" },
    { component: DataImportStep, title: "Import" },
    { component: FeatureTourStep, title: "Features" },
    { component: CompleteStep, title: "Complete" },
  ];

  const CurrentStepComponent = steps[currentStep]?.component;

  return (
    <Dialog
      open={isOnboarding}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown
    >
      <DialogContent>
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <Typography variant="caption" color="textSecondary">
              Step {currentStep + 1} of {steps.length}
            </Typography>
            <Button
              size="small"
              onClick={skipOnboarding}
              startIcon={<IoClose />}
            >
              Skip
            </Button>
          </div>
          <LinearProgress
            variant="determinate"
            value={(currentStep / (steps.length - 1)) * 100}
          />
        </div>

        {/* Current step */}
        {CurrentStepComponent && (
          <CurrentStepComponent
            onNext={nextStep}
            onSkip={nextStep}
            onComplete={completeOnboarding}
          />
        )}

        {/* Navigation */}
        {currentStep > 0 && currentStep < steps.length - 1 && (
          <div className="flex justify-center mt-4">
            <Button onClick={previousStep}>Back</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
