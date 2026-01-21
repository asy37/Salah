/**
 * Email Confirmation Provider
 * Manages email confirmation reminder modal state
 * Shows modal on app start if email is not confirmed
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/auth/useAuth";
import EmailConfirmationModal from "./EmailConfirmationModal";
import { storage } from "@/lib/storage/mmkv";

const EMAIL_REMINDER_DISMISSED_KEY = "email_reminder_dismissed";
const EMAIL_REMINDER_COOLDOWN_DAYS = 1; // Show reminder once per day

export default function EmailConfirmationProvider() {
  const { user, isEmailConfirmed, isAnonymous, isLoading } = useAuth();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    // Don't show for anonymous users or if email is already confirmed
    if (isAnonymous || isEmailConfirmed || !user?.email) {
      return;
    }

    // Check if user has dismissed the reminder recently
    const checkReminderStatus = async () => {
      try {
        const dismissedAt = await storage.getString(EMAIL_REMINDER_DISMISSED_KEY);
        
        if (dismissedAt) {
          const dismissedDate = new Date(dismissedAt);
          const now = new Date();
          const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
          
          // Only show if it's been more than the cooldown period
          if (daysSinceDismissed < EMAIL_REMINDER_COOLDOWN_DAYS) {
            return;
          }
        }

        // Show modal after a short delay
        setTimeout(() => {
          setShowModal(true);
        }, 1000);
      } catch (error) {
        console.error("[EmailConfirmationProvider] Error checking reminder status:", error);
      }
    };

    checkReminderStatus();
  }, [isLoading, user, isEmailConfirmed, isAnonymous]);

  const handleClose = async () => {
    setShowModal(false);
    
    // Save dismissal timestamp
    try {
      await storage.set(EMAIL_REMINDER_DISMISSED_KEY, new Date().toISOString());
    } catch (error) {
      console.error("[EmailConfirmationProvider] Error saving dismissal:", error);
    }
  };

  return (
    <EmailConfirmationModal visible={showModal} onClose={handleClose} />
  );
}

